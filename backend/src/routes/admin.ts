import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { authRequired, isManager, publicUser, staffRequired } from '../auth.js'
import { initialsFromName, referralCode } from '../trading.js'
import { settleTradeClose } from '../settle.js'
import { recordEarning } from '../earnings.js'
import {
  getPremiumThreshold,
  getSettingNumber,
  loadSettings,
  SETTING_DEFS,
  ensureDefaultSettings,
  getCurrencyCode,
  currencySymbol,
  syncAccountCurrencies,
  maskSecretSettings,
  resolveSecretWrites,
} from '../settings.js'
import { testNowPaymentsConnection } from '../payments.js'
import { convertPlatformCurrency, fxMatrix } from '../fx.js'
import { fetchQuotes } from '../market.js'

export const adminRouter = Router()
adminRouter.use(authRequired, staffRequired)

adminRouter.get('/dashboard', async (_req, res) => {
  const [
    users,
    fundedUsers,
    trades,
    deposits,
    withdrawals,
    pendingKyc,
    openTrades,
    pendingTrades,
    closedTrades,
    volume,
    pendingDeposits,
    pendingWithdrawals,
    earningsAgg,
    clientPnl,
    earningsByType,
    accounts,
    settings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', funded: true } }),
    prisma.trade.count(),
    prisma.transaction.aggregate({
      where: { type: 'deposit', status: { in: ['completed', 'approved'] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'withdraw', status: { in: ['completed', 'approved'] } },
      _sum: { amount: true },
    }),
    prisma.kycDocument.count({ where: { status: 'pending' } }),
    prisma.trade.count({ where: { status: 'open' } }),
    prisma.trade.count({ where: { status: 'pending' } }),
    prisma.trade.count({ where: { status: 'closed' } }),
    prisma.trade.aggregate({ _sum: { volume: true } }),
    prisma.transaction.count({ where: { type: 'deposit', status: 'pending' } }),
    prisma.transaction.count({ where: { type: 'withdraw', status: 'pending' } }),
    prisma.platformEarning.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.trade.aggregate({
      where: { status: 'closed' },
      _sum: { realizedPnl: true, commission: true },
    }),
    prisma.platformEarning.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: true,
    }),
    prisma.account.aggregate({ _sum: { balance: true } }),
    loadSettings(true),
  ])

  const recentUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true, funded: true, kycStatus: true },
  })

  const recentTx = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { user: { select: { name: true, email: true } }, account: { select: { number: true } } },
  })

  const recentEarnings = await prisma.platformEarning.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { user: { select: { name: true } } },
  })

  const days = 14
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const [seriesTx, seriesEarnings, seriesUsers, seriesTrades, onlineUsers] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: ['completed', 'approved'] },
        type: { in: ['deposit', 'withdraw'] },
      },
      select: { type: true, amount: true, createdAt: true },
    }),
    prisma.platformEarning.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: 'USER', createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.trade.findMany({
      where: { openTime: { gte: since } },
      select: { volume: true, openTime: true, status: true },
    }),
    prisma.user.count({
      where: { role: 'USER', lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    }).catch(() => 0),
  ])

  const dayKeys: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    dayKeys.push(d.toISOString().slice(0, 10))
  }

  const emptyDay = () => ({
    deposits: 0,
    withdrawals: 0,
    earnings: 0,
    newUsers: 0,
    volume: 0,
    trades: 0,
  })
  const byDay: Record<string, ReturnType<typeof emptyDay>> = Object.fromEntries(dayKeys.map((k) => [k, emptyDay()]))

  for (const t of seriesTx) {
    const key = t.createdAt.toISOString().slice(0, 10)
    if (!byDay[key]) continue
    if (t.type === 'deposit') byDay[key].deposits += t.amount
    else byDay[key].withdrawals += Math.abs(t.amount)
  }
  for (const e of seriesEarnings) {
    const key = e.createdAt.toISOString().slice(0, 10)
    if (byDay[key]) byDay[key].earnings += e.amount
  }
  for (const u of seriesUsers) {
    const key = u.createdAt.toISOString().slice(0, 10)
    if (byDay[key]) byDay[key].newUsers += 1
  }
  for (const t of seriesTrades) {
    const key = t.openTime.toISOString().slice(0, 10)
    if (!byDay[key]) continue
    byDay[key].volume += t.volume
    byDay[key].trades += 1
  }

  const chartSeries = dayKeys.map((date) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ...byDay[date],
    net: byDay[date].deposits - byDay[date].withdrawals,
  }))

  const totalDeposits = deposits._sum.amount ?? 0
  const totalWithdrawals = Math.abs(withdrawals._sum.amount ?? 0)
  const pendingTx = pendingDeposits + pendingWithdrawals

  return res.json({
    stats: {
      users,
      fundedUsers,
      trades,
      openTrades,
      pendingTrades,
      closedTrades,
      pendingKyc,
      pendingTx,
      pendingDeposits,
      pendingWithdrawals,
      totalDeposits,
      totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals,
      platformEarnings: earningsAgg._sum.amount ?? 0,
      earningEntries: earningsAgg._count,
      tradingFees: clientPnl._sum.commission ?? 0,
      clientRealizedPnl: clientPnl._sum.realizedPnl ?? 0,
      tradedVolume: volume._sum.volume ?? 0,
      totalBalances: accounts._sum.balance ?? 0,
      premiumThreshold: await getPremiumThreshold(),
      platformName: settings.platform_name,
      currency: settings.currency,
      onlineUsers,
    },
    earningsByType: earningsByType.map((r) => ({
      type: r.type,
      amount: r._sum.amount ?? 0,
      count: r._count,
    })),
    chartSeries,
    recentUsers,
    recentTx,
    recentEarnings,
  })
})

adminRouter.get('/users', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase()
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      OR: q
        ? [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: {
      accounts: true,
      _count: { select: { trades: true, transactions: true, kycDocuments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({
    users: users.map((u) => {
      const { passwordHash: _, ...rest } = u
      return rest
    }),
  })
})

adminRouter.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      accounts: true,
      trades: { orderBy: { openTime: 'desc' }, take: 50 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      kycDocuments: { orderBy: { createdAt: 'desc' } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ user: publicUser(user) })
})

adminRouter.post('/users', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['USER', 'ADMIN']).optional(),
    demoBalance: z.number().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (exists) return res.status(400).json({ error: 'Email already exists' })

  const demoBalance = parsed.data.demoBalance ?? 24767.36
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      initials: initialsFromName(parsed.data.name),
      referralCode: referralCode(parsed.data.name),
      role: parsed.data.role ?? 'USER',
      accounts: {
        create: [
          { number: String(5000000 + Math.floor(Math.random() * 900000)), type: 'live', balance: 0, equity: 0 },
          {
            number: String(6000000 + Math.floor(Math.random() * 900000)),
            type: 'demo',
            balance: demoBalance,
            equity: demoBalance,
          },
        ],
      },
    },
    include: { accounts: true },
  })
  return res.json({ user: publicUser(user) })
})

adminRouter.patch('/users/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    nationality: z.string().optional(),
    active: z.boolean().optional(),
    verified: z.boolean().optional(),
    funded: z.boolean().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    questionnaireDone: z.boolean().optional(),
    totalDeposited: z.number().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.name) data.initials = initialsFromName(parsed.data.name)

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { accounts: true, kycDocuments: true },
  })
  return res.json({ user: publicUser(user) })
})

adminRouter.post('/users/:id/password', async (req, res) => {
  const schema = z.object({ password: z.string().min(6) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid password' })
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  })
  return res.json({ ok: true })
})

adminRouter.post('/accounts/:id/adjust', async (req, res) => {
  if (!isManager(req.user?.role)) {
    return res.status(403).json({ error: 'Manager or admin only' })
  }
  const schema = z.object({
    amount: z.number(),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const account = await prisma.account.findUnique({ where: { id: req.params.id } })
  if (!account) return res.status(404).json({ error: 'Account not found' })

  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: {
        balance: { increment: parsed.data.amount },
        equity: { increment: parsed.data.amount },
      },
    }),
    prisma.transaction.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        type: parsed.data.amount >= 0 ? 'credit' : 'debit',
        status: 'completed',
        amount: parsed.data.amount,
        payment: 'Admin',
        note: parsed.data.note || 'Admin balance adjustment',
      },
    }),
    prisma.notification.create({
      data: {
        userId: account.userId,
        title: 'Account adjusted',
        body: `Admin adjusted your balance by ${parsed.data.amount.toFixed(2)}`,
      },
    }),
  ])

  return res.json({ ok: true })
})

adminRouter.get('/trades', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const trades = await prisma.trade.findMany({
    where: status ? { status: status as 'open' | 'pending' | 'closed' } : undefined,
    include: {
      user: { select: { name: true, email: true } },
      account: { select: { number: true, type: true } },
    },
    orderBy: { openTime: 'desc' },
    take: 200,
  })
  return res.json({ trades })
})

adminRouter.post('/trades/:id/close', async (req, res) => {
  if (!isManager(req.user?.role)) {
    return res.status(403).json({ error: 'Manager or admin only' })
  }
  const schema = z.object({ exitPrice: z.number().positive().optional() })
  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const trade = await prisma.trade.findUnique({ where: { id: req.params.id } })
  if (!trade || trade.status !== 'open') return res.status(404).json({ error: 'Open trade not found' })

  let exit = parsed.data.exitPrice
  if (exit == null) {
    const { quotes } = await fetchQuotes()
    const quote = quotes.find((q) => q.symbol === trade.symbol)
    exit = quote ? (trade.side === 'buy' ? quote.bid : quote.ask) : trade.currentPrice
  }
  const result = await settleTradeClose(trade, exit, `Admin close #${trade.id.slice(-8)}`)
  return res.json({ ok: true, ...result })
})

adminRouter.get('/transactions', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const type = req.query.type ? String(req.query.type) : undefined
  const transactions = await prisma.transaction.findMany({
    where: {
      ...(status ? { status: status as 'pending' | 'approved' | 'rejected' | 'completed' } : {}),
      ...(type ? { type: type as 'deposit' | 'withdraw' | 'trade_pnl' | 'credit' | 'debit' | 'fee' | 'commission' } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      account: { select: { number: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return res.json({ transactions })
})

adminRouter.patch('/transactions/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['approved', 'rejected', 'completed']),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' })

  const existing = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: { user: true, account: true },
  })
  if (!existing) return res.status(404).json({ error: 'Transaction not found' })
  if (existing.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending transactions can be reviewed' })
  }

  if (parsed.data.status === 'rejected') {
    const tx = await prisma.transaction.update({
      where: { id: existing.id },
      data: { status: 'rejected', note: `${existing.note || ''} · Rejected by admin`.trim() },
    })
    await prisma.notification.create({
      data: {
        userId: existing.userId,
        title: `${existing.type} rejected`,
        body: `Your ${existing.type} request was rejected by admin.`,
      },
    })
    return res.json({ transaction: tx })
  }

  // approve / completed
  if (existing.type === 'deposit') {
    const { completePendingDeposit } = await import('../payments.js')
    try {
      await completePendingDeposit(existing.id, 'Approved by admin')
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Approve failed' })
    }
    const tx = await prisma.transaction.findUnique({ where: { id: existing.id } })
    return res.json({ transaction: tx })
  } else if (existing.type === 'withdraw') {
    const gross = Math.abs(existing.amount)
    const totalDebit = Number((gross + existing.fee).toFixed(2))
    const account = await prisma.account.findUnique({ where: { id: existing.accountId } })
    if (!account || account.balance < totalDebit) {
      return res.status(400).json({ error: 'Insufficient balance to approve withdrawal' })
    }
    const sym = currencySymbol(await getCurrencyCode())
    await prisma.$transaction(async (db) => {
      await db.account.update({
        where: { id: existing.accountId },
        data: { balance: { decrement: totalDebit }, equity: { decrement: totalDebit } },
      })
      await db.transaction.update({
        where: { id: existing.id },
        data: { status: 'completed', note: 'Withdrawal approved' },
      })
      if (existing.fee > 0) {
        await recordEarning(db, {
          type: 'withdraw_fee',
          amount: existing.fee,
          description: `Withdraw fee on ${gross}`,
          userId: existing.userId,
        })
      }
      await db.notification.create({
        data: {
          userId: existing.userId,
          title: 'Withdrawal approved',
          body: `${sym}${gross.toFixed(2)} sent via ${existing.payment}${existing.fee ? ` (fee ${sym}${existing.fee.toFixed(2)})` : ''}.`,
        },
      })
    })
  } else {
    await prisma.transaction.update({
      where: { id: existing.id },
      data: { status: parsed.data.status === 'approved' ? 'completed' : parsed.data.status },
    })
  }

  const tx = await prisma.transaction.findUnique({ where: { id: existing.id } })
  return res.json({ transaction: tx })
})

adminRouter.get('/earnings', async (req, res) => {
  const type = req.query.type ? String(req.query.type) : undefined
  const [summary, byType, recent, settings] = await Promise.all([
    prisma.platformEarning.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.platformEarning.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: true,
    }),
    prisma.platformEarning.findMany({
      where: type ? { type: type as any } : undefined,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    loadSettings(true),
  ])

  const closedPnl = await prisma.trade.aggregate({
    where: { status: 'closed' },
    _sum: { realizedPnl: true, commission: true },
  })

  return res.json({
    summary: {
      totalEarnings: summary._sum.amount ?? 0,
      entries: summary._count,
      clientRealizedPnl: closedPnl._sum.realizedPnl ?? 0,
      tradingFeesCollected: closedPnl._sum.commission ?? 0,
    },
    byType: byType.map((r) => ({
      type: r.type,
      amount: r._sum.amount ?? 0,
      count: r._count,
    })),
    recent,
    feeSettings: {
      trading_fee_per_lot: settings.trading_fee_per_lot,
      deposit_fee_percent: settings.deposit_fee_percent,
      withdraw_fee_percent: settings.withdraw_fee_percent,
      referral_commission_percent: settings.referral_commission_percent,
    },
    currency: settings.currency || 'EUR',
    currencySymbol: currencySymbol(settings.currency),
  })
})

adminRouter.post('/earnings/manual', async (req, res) => {
  const schema = z.object({
    amount: z.number().positive(),
    description: z.string().min(2),
    type: z.enum(['trading_fee', 'deposit_fee', 'withdraw_fee', 'spread', 'swap', 'referral_commission', 'other']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const row = await recordEarning(prisma, {
    type: parsed.data.type ?? 'other',
    amount: parsed.data.amount,
    description: parsed.data.description,
  })
  return res.json({ earning: row })
})

adminRouter.get('/kyc', async (_req, res) => {
  const docs = await prisma.kycDocument.findMany({
    include: { user: { select: { id: true, name: true, email: true, kycStatus: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({ documents: docs })
})

adminRouter.patch('/kyc/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const doc = await prisma.kycDocument.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status, note: parsed.data.note },
  })

  const docs = await prisma.kycDocument.findMany({ where: { userId: doc.userId } })
  const approved = docs.filter((d) => d.status === 'approved')
  const hasIdentity = approved.some((d) => d.kind === 'identity')
  const hasResidence = approved.some((d) => d.kind === 'residence')

  await prisma.user.update({
    where: { id: doc.userId },
    data: {
      kycStatus: parsed.data.status === 'rejected' ? 'rejected' : hasIdentity && hasResidence ? 'approved' : 'pending',
      verified: hasIdentity && hasResidence,
    },
  })

  await prisma.notification.create({
    data: {
      userId: doc.userId,
      title: `KYC ${parsed.data.status}`,
      body: parsed.data.note || `Your ${doc.kind} document was ${parsed.data.status}.`,
    },
  })

  return res.json({ document: doc })
})

adminRouter.get('/settings', async (_req, res) => {
  await ensureDefaultSettings()
  const values = await loadSettings(true)
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
  const fx = await fxMatrix()
  return res.json({
    definitions: SETTING_DEFS,
    values: maskSecretSettings(values),
    settings: rows.map((r) =>
      SETTING_DEFS.some((d) => d.key === r.key && d.type === 'secret') && r.value.trim()
        ? { ...r, value: '••••••••' }
        : r,
    ),
    fx,
  })
})

adminRouter.post('/payments/nowpayments/test', async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }
  const result = await testNowPaymentsConnection()
  return res.status(result.ok ? 200 : 400).json(result)
})

adminRouter.get('/fx', async (_req, res) => {
  return res.json(await fxMatrix())
})

adminRouter.post('/fx/convert', async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }
  const schema = z.object({
    to: z.enum(['EUR', 'USD', 'GBP']),
    from: z.enum(['EUR', 'USD', 'GBP']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid currency' })

  const current = await getCurrencyCode()
  const from = parsed.data.from || current
  const to = parsed.data.to
  if (from === to) {
    await syncAccountCurrencies(to)
    return res.json({ ok: true, skipped: true, from, to, rate: 1 })
  }

  const result = await convertPlatformCurrency(from, to)
  return res.json({ ok: true, ...result })
})

adminRouter.put('/settings', async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }
  // single key
  if (req.body?.key && req.body?.value !== undefined && !req.body?.settings) {
    const schema = z.object({ key: z.string(), value: z.string(), convert: z.boolean().optional() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

    let conversion = null
    if (parsed.data.key === 'currency') {
      const current = await getCurrencyCode()
      const next = parsed.data.value.toUpperCase()
      if (parsed.data.convert !== false && current !== next) {
        conversion = await convertPlatformCurrency(current, next)
      } else {
        await prisma.setting.upsert({
          where: { key: 'currency' },
          create: { key: 'currency', value: next },
          update: { value: next },
        })
        await syncAccountCurrencies(next)
        await loadSettings(true)
      }
      const setting = await prisma.setting.findUnique({ where: { key: 'currency' } })
      return res.json({ setting, conversion })
    }

    const existing = await loadSettings(true)
    const resolved = resolveSecretWrites(
      { [parsed.data.key]: parsed.data.value },
      existing,
    )
    const value = resolved[parsed.data.key] ?? parsed.data.value

    const setting = await prisma.setting.upsert({
      where: { key: parsed.data.key },
      create: { key: parsed.data.key, value },
      update: { value },
    })
    await loadSettings(true)
    return res.json({ setting: { ...setting, value: SETTING_DEFS.some((d) => d.key === setting.key && d.type === 'secret') && setting.value ? '••••••••' : setting.value } })
  }

  // bulk update
  const schema = z.object({
    settings: z.record(z.string(), z.string()),
    convertCurrency: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const allowed = new Set(SETTING_DEFS.map((d) => d.key))
  const existing = await loadSettings(true)
  const toWrite = resolveSecretWrites(parsed.data.settings, existing)
  // Always persist currency as uppercase EUR/USD/GBP
  if (toWrite.currency) {
    const normalized = toWrite.currency.toUpperCase()
    toWrite.currency = ['EUR', 'USD', 'GBP'].includes(normalized) ? normalized : existing.currency || 'EUR'
  }
  const nextCurrency = toWrite.currency
  const current = await getCurrencyCode()
  let conversion = null

  // Convert money first if currency is changing (before writing other settings that may already be in new units)
  if (nextCurrency && nextCurrency !== current && parsed.data.convertCurrency !== false) {
    conversion = await convertPlatformCurrency(current, nextCurrency)
    // convertPlatformCurrency already wrote money settings + currency; merge remaining non-money keys
    const moneyKeys = new Set([
      'currency',
      'premium_threshold',
      'trading_fee_per_lot',
      'min_deposit',
      'min_withdraw',
      'default_demo_balance',
    ])
    await prisma.$transaction(
      Object.entries(toWrite)
        .filter(([key]) => allowed.has(key) && !moneyKeys.has(key))
        .map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        ),
    )
    // Ensure currency stuck even if convert path had a race
    await prisma.setting.upsert({
      where: { key: 'currency' },
      create: { key: 'currency', value: nextCurrency },
      update: { value: nextCurrency },
    })
    await syncAccountCurrencies(nextCurrency)
  } else {
    await prisma.$transaction(
      Object.entries(toWrite)
        .filter(([key]) => allowed.has(key))
        .map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        ),
    )
    if (nextCurrency) await syncAccountCurrencies(nextCurrency)
  }

  const values = await loadSettings(true)
  return res.json({ ok: true, values: maskSecretSettings(values), conversion })
})

adminRouter.get('/accounts', async (_req, res) => {
  const accounts = await prisma.account.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({ accounts })
})
