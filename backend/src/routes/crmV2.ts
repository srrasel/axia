import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import {
  adminRequired,
  assertAssignedClient,
  isAdmin,
  isCrmStaff,
  isManager,
  publicUser,
  staffRequired,
} from '../auth.js'
import { calcPnl, initialsFromName, referralCode } from '../trading.js'
import {
  CRM_CATEGORIES,
  buildClientListWhere,
  enrichClientRow,
  ensureCrmNumber,
  logCrmActivity,
  nextCrmNumber,
  ONLINE_MS,
} from '../crmHelpers.js'
import { currencySymbol, getCurrencyCode } from '../settings.js'
import { notifyStaff } from '../crmNotify.js'

export const crmV2Router = Router()
crmV2Router.use(staffRequired)

/** CRM dashboard KPIs */
crmV2Router.get('/dashboard', async (req, res) => {
  const scope = isCrmStaff(req.user?.role) ? { assignedToId: req.user!.id } : {}
  const clientWhere = { role: 'USER' as const, ...scope }
  const sinceOnline = new Date(Date.now() - ONLINE_MS)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    totalClients,
    activeClients,
    newLeads,
    ftd,
    online,
    deposits,
    withdrawals,
    closedPnl,
    byCountry,
    bySource,
  ] = await Promise.all([
    prisma.user.count({ where: clientWhere }),
    prisma.user.count({ where: { ...clientWhere, active: true } }),
    prisma.user.count({ where: { ...clientWhere, createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { ...clientWhere, funded: true } }),
    prisma.user.count({ where: { ...clientWhere, lastSeenAt: { gte: sinceOnline } } }),
    prisma.transaction.aggregate({
      where: { type: 'deposit', status: { in: ['completed', 'approved'] }, user: clientWhere },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'withdraw', status: { in: ['completed', 'approved'] }, user: clientWhere },
      _sum: { amount: true },
    }),
    prisma.trade.aggregate({
      where: { status: 'closed', user: clientWhere },
      _sum: { realizedPnl: true },
    }),
    prisma.user.groupBy({
      by: ['country'],
      where: clientWhere,
      _count: true,
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    }),
    prisma.user.groupBy({
      by: ['clientSource'],
      where: clientWhere,
      _count: true,
      orderBy: { _count: { clientSource: 'desc' } },
      take: 10,
    }),
  ])

  const categoryCounts: Record<string, number> = {}
  for (const cat of CRM_CATEGORIES) {
    if (cat === 'ALL') {
      categoryCounts.ALL = totalClients
      continue
    }
    categoryCounts[cat] = await prisma.user.count({
      where: buildClientListWhere(req, { category: cat }),
    })
  }

  const dep = deposits._sum.amount ?? 0
  const wd = Math.abs(withdrawals._sum.amount ?? 0)

  return res.json({
    kpis: {
      totalClients,
      activeClients,
      newLeads,
      conversionsFtd: ftd,
      online,
      deposits: Number(dep.toFixed(2)),
      withdrawals: Number(wd.toFixed(2)),
      netDeposit: Number((dep - wd).toFixed(2)),
      profitLoss: Number((closedPnl._sum.realizedPnl ?? 0).toFixed(2)),
    },
    byCountry: byCountry.map((r) => ({ country: r.country || 'Unknown', count: r._count })),
    bySource: bySource.map((r) => ({ source: r.clientSource || 'Direct', count: r._count })),
    categoryCounts,
    currency: await getCurrencyCode(),
  })
})

/** Create client account (Manager / Team Leader / Admin) — assigned to creator by default */
crmV2Router.post('/clients-v2', async (req, res) => {
  if (!isManager(req.user?.role)) {
    return res.status(403).json({ error: 'Manager or admin only' })
  }

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional(),
    country: z.string().optional(),
    nationality: z.string().optional(),
    clientSource: z.string().optional(),
    assignedToId: z.string().nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payload' })

  const email = parsed.data.email.toLowerCase()
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

  let assignedToId: string | null = req.user!.id
  if (isAdmin(req.user?.role)) {
    if (parsed.data.assignedToId === null) assignedToId = null
    else if (parsed.data.assignedToId) {
      const staff = await prisma.user.findFirst({
        where: { id: parsed.data.assignedToId, role: { not: 'USER' } },
      })
      if (!staff) return res.status(400).json({ error: 'Invalid assignee' })
      assignedToId = staff.id
    }
  }

  const country = parsed.data.country?.trim() || 'Saudi Arabia'
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      initials: initialsFromName(parsed.data.name),
      referralCode: referralCode(parsed.data.name),
      role: 'USER',
      phone: parsed.data.phone?.trim() || null,
      country,
      nationality: parsed.data.nationality?.trim() || country,
      language: 'en',
      crmNumber: await nextCrmNumber(),
      crmCategory: 'NEW',
      crmStatus: 'NEW',
      clientSource: parsed.data.clientSource?.trim() || 'CRM',
      assignedToId,
      lastInteractionAt: new Date(),
      accounts: {
        create: [
          {
            number: String(5000000 + Math.floor(Math.random() * 900000)),
            type: 'live',
            balance: 0,
            equity: 0,
          },
          {
            number: String(6000000 + Math.floor(Math.random() * 900000)),
            type: 'demo',
            balance: 24767.36,
            equity: 24767.36,
          },
        ],
      },
      notifications: {
        create: {
          title: 'Welcome to NitajFX',
          body: 'Your demo and live accounts are ready. Fund your live account to trade real markets.',
        },
      },
    },
    include: { accounts: true, assignedTo: { select: { id: true, name: true, email: true } } },
  })

  await logCrmActivity({
    clientId: user.id,
    staffId: req.user!.id,
    action: 'client_created',
    detail: `Created by CRM desk (${req.user!.email})`,
    req,
  })

  await notifyStaff({
    type: 'new_lead',
    title: 'Client created',
    body: `${user.name} (${user.email}) created via CRM`,
    clientId: user.id,
    recipientId: assignedToId && assignedToId !== req.user!.id ? assignedToId : null,
  })

  return res.status(201).json({ client: publicUser(user) })
})

/** Clients list — filters, categories, pagination */
crmV2Router.get('/clients-v2', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10))
  const sort = String(req.query.sort || 'createdAt')
  const dir = String(req.query.dir || req.query.order || 'desc') === 'asc' ? 'asc' : 'desc'

  const q = {
    search: req.query.search
      ? String(req.query.search)
      : req.query.q
        ? String(req.query.q)
        : undefined,
    category: req.query.category ? String(req.query.category) : 'ALL',
    country: req.query.country ? String(req.query.country) : undefined,
    employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    source: req.query.source ? String(req.query.source) : undefined,
    accountType: req.query.accountType ? String(req.query.accountType) : undefined,
    language: req.query.language ? String(req.query.language) : undefined,
    campaign: req.query.campaign ? String(req.query.campaign) : undefined,
    registeredFrom: req.query.registeredFrom ? String(req.query.registeredFrom) : undefined,
    registeredTo: req.query.registeredTo ? String(req.query.registeredTo) : undefined,
    lastInteractionFrom: req.query.lastInteractionFrom ? String(req.query.lastInteractionFrom) : undefined,
    lastInteractionTo: req.query.lastInteractionTo ? String(req.query.lastInteractionTo) : undefined,
    lastLoginFrom: req.query.lastLoginFrom ? String(req.query.lastLoginFrom) : undefined,
    lastLoginTo: req.query.lastLoginTo ? String(req.query.lastLoginTo) : undefined,
    firstDepositFrom: req.query.firstDepositFrom ? String(req.query.firstDepositFrom) : undefined,
    firstDepositTo: req.query.firstDepositTo ? String(req.query.firstDepositTo) : undefined,
    depositMin: req.query.depositMin ? String(req.query.depositMin) : undefined,
    depositMax: req.query.depositMax ? String(req.query.depositMax) : undefined,
    balanceMin: req.query.balanceMin ? String(req.query.balanceMin) : undefined,
    balanceMax: req.query.balanceMax ? String(req.query.balanceMax) : undefined,
  }

  const where = buildClientListWhere(req, q)
  const orderField =
    sort === 'totalDeposits' || sort === 'totalDeposited'
      ? 'totalDeposited'
      : ['createdAt', 'name', 'lastInteractionAt', 'crmNumber'].includes(sort)
        ? sort
        : 'createdAt'
  const orderBy: any = { [orderField]: dir }

  const [total, clients] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        accounts: { select: { id: true, number: true, type: true, balance: true, equity: true, credit: true, leverage: true, platform: true, active: true } },
        _count: { select: { trades: true, transactions: true, contactsAsClient: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  for (const c of clients) {
    if (!c.crmNumber) await ensureCrmNumber(c.id)
  }

  const rows = []
  for (const c of clients) {
    const { passwordHash: _, totpSecret: __, totpTempSecret: ___, ...safe } = c as any
    rows.push(await enrichClientRow(safe))
  }

  const categoryCounts: Record<string, number> = {}
  for (const cat of CRM_CATEGORIES) {
    if (cat === 'ALL') {
      categoryCounts.ALL = await prisma.user.count({ where: buildClientListWhere(req, { ...q, category: 'ALL' }) })
      continue
    }
    categoryCounts[cat] = await prisma.user.count({
      where: buildClientListWhere(req, { category: cat }),
    })
  }

  const filterMeta = {
    countries: await prisma.user.findMany({
      where: { role: 'USER' },
      distinct: ['country'],
      select: { country: true },
      take: 100,
    }),
    sources: await prisma.user.findMany({
      where: { role: 'USER', clientSource: { not: null } },
      distinct: ['clientSource'],
      select: { clientSource: true },
      take: 100,
    }),
    categories: CRM_CATEGORIES,
  }

  return res.json({
    clients: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categoryCounts,
    filterMeta,
  })
})

/** Full client profile */
crmV2Router.get('/clients-v2/:id', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })

  await ensureCrmNumber(id)

  const client = await prisma.user.findFirst({
    where: { id, role: 'USER' },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      accounts: true,
      trades: { orderBy: { openTime: 'desc' }, take: 100 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      kycDocuments: { orderBy: { createdAt: 'desc' } },
      contactsAsClient: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { staff: { select: { id: true, name: true } } },
      },
      crmComments: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { staff: { select: { id: true, name: true } } },
      },
      crmActivities: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { staff: { select: { id: true, name: true } } },
      },
    },
  })
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const { passwordHash: _, totpSecret: __, totpTempSecret: ___, ...safe } = client as any
  if (Array.isArray(safe.kycDocuments)) {
    safe.kycDocuments = safe.kycDocuments.map((d: any) => {
      const { fileData, ...rest } = d
      return { ...rest, hasFile: Boolean(fileData) }
    })
  }
  const enriched = await enrichClientRow(safe)

  // Timeline: merge events
  const timeline: { at: string; type: string; title: string; detail?: string }[] = []
  timeline.push({ at: client.createdAt.toISOString(), type: 'registration', title: 'Client registered' })
  for (const t of client.transactions.slice(0, 40)) {
    timeline.push({
      at: t.createdAt.toISOString(),
      type: t.type,
      title: `${t.type} ${t.status}`,
      detail: String(t.amount),
    })
  }
  for (const x of client.contactsAsClient.slice(0, 20)) {
    timeline.push({
      at: x.createdAt.toISOString(),
      type: 'communication',
      title: `${x.channel} note`,
      detail: x.note.slice(0, 120),
    })
  }
  for (const a of client.crmActivities.slice(0, 40)) {
    timeline.push({
      at: a.createdAt.toISOString(),
      type: 'activity',
      title: a.action,
      detail: a.detail || undefined,
    })
  }
  timeline.sort((a, b) => +new Date(b.at) - +new Date(a.at))

  return res.json({
    client: enriched,
    timeline: timeline.slice(0, 80),
    currency: await getCurrencyCode(),
    symbol: currencySymbol(await getCurrencyCode()),
  })
})

/** Update client profile / CRM fields */
crmV2Router.patch('/clients-v2/:id', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })

  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    nationality: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    dateOfBirth: z.string().nullable().optional(),
    crmCategory: z.enum(['BAD', 'CONVERSION', 'FTD', 'NEW', 'ONLINE', 'ONLINE_FTD', 'POTENTIAL', 'PRACTICE', 'RETENTION', 'TEST']).optional(),
    crmStatus: z.enum(['NEW', 'ACTIVE', 'INACTIVE', 'POTENTIAL', 'BAD', 'RETENTION', 'BLOCKED']).optional(),
    clientSource: z.string().nullable().optional(),
    campaign: z.string().nullable().optional(),
    campaignId: z.string().nullable().optional(),
    campaignType: z.string().nullable().optional(),
    mediaSource: z.string().nullable().optional(),
    adGroup: z.string().nullable().optional(),
    creative: z.string().nullable().optional(),
    keyword: z.string().nullable().optional(),
    landingPage: z.string().nullable().optional(),
    utmSource: z.string().nullable().optional(),
    utmMedium: z.string().nullable().optional(),
    utmCampaign: z.string().nullable().optional(),
    utmContent: z.string().nullable().optional(),
    utmTerm: z.string().nullable().optional(),
    clickId: z.string().nullable().optional(),
    assignedToId: z.string().nullable().optional(),
    active: z.boolean().optional(),
    tradingRestricted: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    addressVerified: z.boolean().optional(),
    identityVerified: z.boolean().optional(),
    amlStatus: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
    kycStatus: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  if (parsed.data.assignedToId !== undefined && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admin can reassign' })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.name) data.initials = initialsFromName(parsed.data.name)

  const user = await prisma.user.update({ where: { id }, data })
  await logCrmActivity({
    clientId: id,
    staffId: req.user!.id,
    action: 'Profile updated',
    detail: Object.keys(parsed.data).join(', '),
    req,
  })
  const { passwordHash: _, ...safe } = user as any
  return res.json({ client: safe })
})

/** Edit financial KPIs from CRM (balance, credit, equity, P&L, deposits, withdrawals) */
crmV2Router.patch('/clients-v2/:id/finance', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })

  const schema = z.object({
    accountId: z.string().optional(),
    balance: z.number().optional(),
    credit: z.number().optional(),
    equity: z.number().optional(),
    freeMargin: z.number().optional(),
    openPnl: z.number().optional(),
    closedPnl: z.number().optional(),
    deposits: z.number().optional(),
    withdrawals: z.number().optional(),
    netDeposit: z.number().optional(),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const accounts = await prisma.account.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'asc' },
  })
  if (accounts.length === 0) return res.status(400).json({ error: 'No trading account' })

  const account =
    (parsed.data.accountId
      ? accounts.find((a) => a.id === parsed.data.accountId)
      : null) ||
    accounts.find((a) => a.type === 'live') ||
    accounts[0]

  const current = await enrichClientRow({
    id,
    accounts,
    totalDeposited: (await prisma.user.findUnique({ where: { id }, select: { totalDeposited: true } }))
      ?.totalDeposited,
  })

  const changed: string[] = []
  const accountData: Record<string, number> = {}
  let bal = account.balance
  let cred = account.credit
  let eq = account.equity

  if (parsed.data.balance !== undefined) {
    bal = parsed.data.balance
    accountData.balance = bal
    changed.push(`balance=${bal}`)
  }
  if (parsed.data.credit !== undefined) {
    cred = parsed.data.credit
    accountData.credit = cred
    changed.push(`credit=${cred}`)
  }

  // Derive equity from open P&L if provided: equity ≈ balance + credit + openPnl
  if (parsed.data.openPnl !== undefined) {
    eq = bal + cred + parsed.data.openPnl
    accountData.equity = eq
    changed.push(`openPnl=${parsed.data.openPnl}`)
  } else if (parsed.data.equity !== undefined) {
    eq = parsed.data.equity
    accountData.equity = eq
    changed.push(`equity=${eq}`)
  } else if (parsed.data.freeMargin !== undefined) {
    // In this platform free margin ≈ equity when margin usage is not tracked separately
    eq = parsed.data.freeMargin
    accountData.equity = eq
    changed.push(`freeMargin=${parsed.data.freeMargin}`)
  } else if (parsed.data.balance !== undefined || parsed.data.credit !== undefined) {
    // Keep equity in sync with balance+credit + existing open pnl
    const open = current.openPnl || 0
    eq = bal + cred + open
    accountData.equity = eq
  }

  if (Object.keys(accountData).length) {
    await prisma.account.update({ where: { id: account.id }, data: accountData })
  }

  // Closed P&L: bridge via a closed manual trade
  if (parsed.data.closedPnl !== undefined) {
    const diff = parsed.data.closedPnl - (current.closedPnl || 0)
    if (Math.abs(diff) > 0.0001) {
      await prisma.trade.create({
        data: {
          symbol: 'CRM.ADJ',
          side: diff >= 0 ? 'buy' : 'sell',
          volume: 0.01,
          openPrice: 1,
          currentPrice: 1,
          closePrice: 1,
          openTime: new Date(),
          closeTime: new Date(),
          status: 'closed',
          realizedPnl: diff,
          category: 'forex',
          source: 'self',
          userId: id,
          accountId: account.id,
        },
      })
      changed.push(`closedPnl=${parsed.data.closedPnl}`)
    }
  }

  // Deposits / withdrawals / net deposit via ledger transactions
  let targetDeposits = current.deposits
  let targetWithdrawals = current.withdrawals

  if (parsed.data.deposits !== undefined) targetDeposits = parsed.data.deposits
  if (parsed.data.withdrawals !== undefined) targetWithdrawals = parsed.data.withdrawals
  if (parsed.data.netDeposit !== undefined) {
    // Prefer keeping withdrawals, adjust deposits to match net
    if (parsed.data.deposits === undefined) {
      targetDeposits = parsed.data.netDeposit + targetWithdrawals
    } else if (parsed.data.withdrawals === undefined) {
      targetWithdrawals = Math.max(0, targetDeposits - parsed.data.netDeposit)
    }
  }

  const depDiff = targetDeposits - (current.deposits || 0)
  if (Math.abs(depDiff) > 0.0001) {
    await prisma.transaction.create({
      data: {
        userId: id,
        accountId: account.id,
        type: depDiff >= 0 ? 'deposit' : 'debit',
        status: 'completed',
        amount: depDiff >= 0 ? depDiff : -Math.abs(depDiff),
        payment: 'CRM',
        note: parsed.data.note || `CRM deposit adjust by ${req.user!.email}`,
      },
    })
    changed.push(`deposits=${targetDeposits}`)
  }

  const wdDiff = targetWithdrawals - (current.withdrawals || 0)
  if (Math.abs(wdDiff) > 0.0001) {
    await prisma.transaction.create({
      data: {
        userId: id,
        accountId: account.id,
        type: wdDiff >= 0 ? 'withdraw' : 'credit',
        status: 'completed',
        amount: wdDiff >= 0 ? -Math.abs(wdDiff) : Math.abs(wdDiff),
        payment: 'CRM',
        note: parsed.data.note || `CRM withdrawal adjust by ${req.user!.email}`,
      },
    })
    changed.push(`withdrawals=${targetWithdrawals}`)
  }

  if (parsed.data.deposits !== undefined || parsed.data.netDeposit !== undefined || Math.abs(depDiff) > 0.0001) {
    await prisma.user.update({
      where: { id },
      data: {
        totalDeposited: targetDeposits,
        funded: targetDeposits > 0,
      },
    })
  }

  await logCrmActivity({
    clientId: id,
    staffId: req.user!.id,
    action: 'Finance updated',
    detail: changed.join(', ') || 'no change',
    req,
  })

  const refreshed = await prisma.user.findFirst({
    where: { id, role: 'USER' },
    include: {
      accounts: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  })
  const { passwordHash: __, totpSecret: ___, totpTempSecret: ____, ...safe } = refreshed as any
  return res.json({ client: await enrichClientRow(safe), ok: true })
})

/** Bulk update */
crmV2Router.post('/clients-v2/bulk', async (req, res) => {
  const schema = z.object({
    ids: z.array(z.string()).min(1),
    action: z.enum(['assign', 'category', 'status', 'restrict', 'disable', 'enable']),
    assignedToId: z.string().nullable().optional(),
    crmCategory: z.string().optional(),
    crmStatus: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  if (parsed.data.action === 'assign' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }

  let updated = 0
  for (const id of parsed.data.ids) {
    if (!(await assertAssignedClient(req, id))) continue
    const data: Record<string, unknown> = {}
    if (parsed.data.action === 'assign') data.assignedToId = parsed.data.assignedToId
    if (parsed.data.action === 'category' && parsed.data.crmCategory) data.crmCategory = parsed.data.crmCategory
    if (parsed.data.action === 'status' && parsed.data.crmStatus) data.crmStatus = parsed.data.crmStatus
    if (parsed.data.action === 'restrict') data.tradingRestricted = true
    if (parsed.data.action === 'disable') data.active = false
    if (parsed.data.action === 'enable') data.active = true
    await prisma.user.update({ where: { id }, data })
    await logCrmActivity({
      clientId: id,
      staffId: req.user!.id,
      action: `Bulk ${parsed.data.action}`,
      req,
    })
    updated++
  }
  return res.json({ ok: true, updated })
})

/** Comments */
crmV2Router.post('/clients-v2/:id/comments', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })
  const schema = z.object({ body: z.string().min(1), attachment: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const comment = await prisma.crmComment.create({
    data: {
      clientId: id,
      staffId: req.user!.id,
      body: parsed.data.body,
      attachment: parsed.data.attachment,
    },
    include: { staff: { select: { id: true, name: true } } },
  })
  await logCrmActivity({ clientId: id, staffId: req.user!.id, action: 'Comment added', req })
  return res.json({ comment })
})

crmV2Router.patch('/comments/:id', async (req, res) => {
  const schema = z.object({ body: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const existing = await prisma.crmComment.findUnique({ where: { id: String(req.params.id) } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (!(await assertAssignedClient(req, existing.clientId))) return res.status(403).json({ error: 'Forbidden' })
  if (existing.staffId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Can only edit own comments' })
  }
  const comment = await prisma.crmComment.update({
    where: { id: existing.id },
    data: { body: parsed.data.body },
    include: { staff: { select: { id: true, name: true } } },
  })
  return res.json({ comment })
})

crmV2Router.delete('/comments/:id', async (req, res) => {
  const existing = await prisma.crmComment.findUnique({ where: { id: String(req.params.id) } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (!(await assertAssignedClient(req, existing.clientId))) return res.status(403).json({ error: 'Forbidden' })
  if (existing.staffId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Can only delete own comments' })
  }
  await prisma.crmComment.delete({ where: { id: existing.id } })
  return res.json({ ok: true })
})

/** Communication log (extends ContactLog channels) */
crmV2Router.post('/clients-v2/:id/comms', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })
  const schema = z.object({
    note: z.string().min(1),
    channel: z.enum(['phone', 'sms', 'email', 'whatsapp', 'push', 'call', 'im']),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const contact = await prisma.contactLog.create({
    data: {
      clientId: id,
      staffId: req.user!.id,
      note: parsed.data.note,
      channel: parsed.data.channel,
    },
    include: { staff: { select: { id: true, name: true } } },
  })
  await logCrmActivity({
    clientId: id,
    staffId: req.user!.id,
    action: `Communication (${parsed.data.channel})`,
    detail: parsed.data.note.slice(0, 100),
    req,
  })
  return res.json({ contact })
})

/** CRM actions */
crmV2Router.post('/clients-v2/:id/actions', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })

  const schema = z.object({
    action: z.enum([
      'popup_alert',
      'change_password',
      'restrict_trading',
      'unrestrict_trading',
      'disable_account',
      'enable_account',
      'change_email',
      'duplicate_check',
      'find_similar',
    ]),
    password: z.string().min(6).optional(),
    email: z.string().email().optional(),
    message: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const client = await prisma.user.findFirst({ where: { id, role: 'USER' } })
  if (!client) return res.status(404).json({ error: 'Not found' })

  if (parsed.data.action === 'change_password') {
    if (!parsed.data.password) return res.status(400).json({ error: 'Password required' })
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
    })
    await logCrmActivity({ clientId: id, staffId: req.user!.id, action: 'Password reset', req })
    return res.json({ ok: true })
  }

  if (parsed.data.action === 'change_email') {
    if (!parsed.data.email) return res.status(400).json({ error: 'Email required' })
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (exists) return res.status(400).json({ error: 'Email already in use' })
    await prisma.user.update({ where: { id }, data: { email: parsed.data.email.toLowerCase() } })
    await logCrmActivity({
      clientId: id,
      staffId: req.user!.id,
      action: 'Email changed',
      detail: parsed.data.email,
      req,
    })
    return res.json({ ok: true })
  }

  if (parsed.data.action === 'restrict_trading' || parsed.data.action === 'unrestrict_trading') {
    await prisma.user.update({
      where: { id },
      data: { tradingRestricted: parsed.data.action === 'restrict_trading' },
    })
    await logCrmActivity({ clientId: id, staffId: req.user!.id, action: parsed.data.action, req })
    return res.json({ ok: true })
  }

  if (parsed.data.action === 'disable_account' || parsed.data.action === 'enable_account') {
    await prisma.user.update({
      where: { id },
      data: { active: parsed.data.action === 'enable_account' },
    })
    await logCrmActivity({ clientId: id, staffId: req.user!.id, action: parsed.data.action, req })
    return res.json({ ok: true })
  }

  if (parsed.data.action === 'popup_alert') {
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Message from CRM',
        body: parsed.data.message || 'Please contact support.',
      },
    })
    await logCrmActivity({
      clientId: id,
      staffId: req.user!.id,
      action: 'Pop-up alert',
      detail: parsed.data.message,
      req,
    })
    return res.json({ ok: true })
  }

  if (parsed.data.action === 'duplicate_check' || parsed.data.action === 'find_similar') {
    const similar = await prisma.user.findMany({
      where: {
        role: 'USER',
        id: { not: id },
        OR: [
          { email: { contains: client.email.split('@')[0], mode: 'insensitive' } },
          ...(client.phone ? [{ phone: client.phone }] : []),
          { name: { contains: client.name.split(' ')[0], mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true, crmNumber: true, country: true },
      take: 20,
    })
    return res.json({ similar })
  }

  return res.status(400).json({ error: 'Unknown action' })
})

/** Document review from CRM */
crmV2Router.get('/documents/:id/file', async (req, res) => {
  const doc = await prisma.kycDocument.findUnique({
    where: { id: String(req.params.id) },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      fileData: true,
      docType: true,
      kind: true,
      status: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!doc) return res.status(404).json({ error: 'Not found' })
  if (!(await assertAssignedClient(req, doc.userId))) return res.status(403).json({ error: 'Forbidden' })
  if (!doc.fileData) return res.status(404).json({ error: 'No file uploaded for this document' })
  const { userId: _, ...rest } = doc
  return res.json({ document: rest })
})

crmV2Router.patch('/documents/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['approved', 'rejected', 'pending']),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const doc = await prisma.kycDocument.findUnique({ where: { id: String(req.params.id) } })
  if (!doc) return res.status(404).json({ error: 'Not found' })
  if (!(await assertAssignedClient(req, doc.userId))) return res.status(403).json({ error: 'Forbidden' })

  const updated = await prisma.kycDocument.update({
    where: { id: doc.id },
    data: { status: parsed.data.status, note: parsed.data.note },
  })

  const docs = await prisma.kycDocument.findMany({ where: { userId: doc.userId } })
  const approved = docs.filter((d) => d.status === 'approved')
  const hasIdentity = approved.some((d) => d.kind === 'identity')
  const hasResidence = approved.some((d) => d.kind === 'residence')

  await prisma.user.update({
    where: { id: doc.userId },
    data: {
      kycStatus:
        parsed.data.status === 'rejected'
          ? 'rejected'
          : hasIdentity && hasResidence
            ? 'approved'
            : 'pending',
      verified: hasIdentity && hasResidence,
      identityVerified: hasIdentity,
      addressVerified: hasResidence,
    },
  })

  await logCrmActivity({
    clientId: doc.userId,
    staffId: req.user!.id,
    action: `Document ${parsed.data.status}`,
    detail: `${doc.kind} / ${doc.docType}`,
    req,
  })
  return res.json({ document: { ...updated, fileData: undefined } })
})

/** Create document placeholder (upload metadata) */
crmV2Router.post('/clients-v2/:id/documents', async (req, res) => {
  const id = String(req.params.id)
  if (!(await assertAssignedClient(req, id))) return res.status(403).json({ error: 'Not your client' })
  const schema = z.object({
    kind: z.string(),
    docType: z.string(),
    fileName: z.string(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const document = await prisma.kycDocument.create({
    data: {
      userId: id,
      kind: parsed.data.kind,
      docType: parsed.data.docType,
      fileName: parsed.data.fileName,
      status: 'pending',
    },
  })
  await logCrmActivity({
    clientId: id,
    staffId: req.user!.id,
    action: 'Document uploaded',
    detail: parsed.data.fileName,
    req,
  })
  return res.json({ document })
})

export { nextCrmNumber }
