import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { managerRequired, staffRequired } from '../auth.js'
import { calcPnl } from '../trading.js'
import { fetchQuotes, WATCHLIST } from '../market.js'
import { settleTradeClose } from '../settle.js'
import { currencySymbol, getCurrencyCode } from '../settings.js'

export const crmRouter = Router()
crmRouter.use(staffRequired)

const ONLINE_MS = 2 * 60 * 1000

/** All client money + trade-related transactions */
crmRouter.get('/transactions', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const type = req.query.type ? String(req.query.type) : undefined
  const q = String(req.query.q || '').trim()
  const take = Math.min(Number(req.query.take) || 300, 500)

  const transactions = await prisma.transaction.findMany({
    where: {
      user: { role: 'USER' },
      ...(status ? { status: status as 'pending' | 'approved' | 'rejected' | 'completed' } : {}),
      ...(type
        ? {
            type: type as
              | 'deposit'
              | 'withdraw'
              | 'trade_pnl'
              | 'credit'
              | 'debit'
              | 'fee'
              | 'commission'
              | 'bonus',
          }
        : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { note: { contains: q, mode: 'insensitive' } },
              { payment: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          assignedTo: { select: { id: true, name: true } },
        },
      },
      account: { select: { number: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
  return res.json({ transactions })
})

/** Clients list for desk — who is assigned, PnL snapshot */
crmRouter.get('/clients', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const assignedToId = req.query.assignedToId ? String(req.query.assignedToId) : undefined
  const mine = req.query.mine === '1'

  const clients = await prisma.user.findMany({
    where: {
      role: 'USER',
      ...(mine ? { assignedToId: req.user!.id } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      funded: true,
      active: true,
      lastSeenAt: true,
      kycStatus: true,
      totalDeposited: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      accounts: { select: { id: true, number: true, type: true, balance: true, equity: true } },
      _count: { select: { trades: true, transactions: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  const openTrades = await prisma.trade.findMany({
    where: { status: 'open', userId: { in: clients.map((c) => c.id) } },
  })
  const floatingByUser = new Map<string, number>()
  for (const t of openTrades) {
    floatingByUser.set(t.userId, (floatingByUser.get(t.userId) || 0) + calcPnl(t, t.currentPrice))
  }

  const closedAgg = await prisma.trade.groupBy({
    by: ['userId'],
    where: { status: 'closed', userId: { in: clients.map((c) => c.id) } },
    _sum: { realizedPnl: true },
  })
  const realizedByUser = new Map(closedAgg.map((r) => [r.userId, r._sum.realizedPnl ?? 0]))

  const now = Date.now()
  return res.json({
    clients: clients.map((c) => ({
      ...c,
      online: c.lastSeenAt ? now - c.lastSeenAt.getTime() < ONLINE_MS : false,
      floatingPnl: Number((floatingByUser.get(c.id) || 0).toFixed(2)),
      realizedPnl: Number((realizedByUser.get(c.id) || 0).toFixed(2)),
      openTrades: openTrades.filter((t) => t.userId === c.id).length,
    })),
  })
})

/** Single client desk: trades, txs, contacts, controls */
crmRouter.get('/clients/:id', async (req, res) => {
  const client = await prisma.user.findFirst({
    where: { id: req.params.id, role: 'USER' },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      accounts: true,
      trades: { orderBy: { openTime: 'desc' }, take: 100 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      contactsAsClient: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { staff: { select: { id: true, name: true, email: true } } },
      },
    },
  })
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const { passwordHash: _, ...safe } = client
  const open = client.trades.filter((t) => t.status === 'open')
  const floatingPnl = open.reduce((s, t) => s + calcPnl(t, t.currentPrice), 0)
  const realizedPnl = client.trades
    .filter((t) => t.status === 'closed')
    .reduce((s, t) => s + (t.realizedPnl || 0), 0)

  const { quotes } = await fetchQuotes()

  return res.json({
    client: safe,
    floatingPnl: Number(floatingPnl.toFixed(2)),
    realizedPnl: Number(realizedPnl.toFixed(2)),
    online: client.lastSeenAt ? Date.now() - client.lastSeenAt.getTime() < ONLINE_MS : false,
    quotes,
  })
})

crmRouter.patch('/clients/:id/assign', async (req, res) => {
  const schema = z.object({ assignedToId: z.string().nullable() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  if (parsed.data.assignedToId) {
    const staff = await prisma.user.findFirst({
      where: { id: parsed.data.assignedToId, role: { in: ['ADMIN', 'MANAGER', 'EMPLOYEE'] } },
    })
    if (!staff) return res.status(400).json({ error: 'Staff member not found' })
  }

  const client = await prisma.user.update({
    where: { id: req.params.id },
    data: { assignedToId: parsed.data.assignedToId },
    select: {
      id: true,
      name: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  })
  return res.json({ client })
})

crmRouter.post('/contacts', async (req, res) => {
  const schema = z.object({
    clientId: z.string(),
    note: z.string().min(1),
    channel: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const client = await prisma.user.findFirst({ where: { id: parsed.data.clientId, role: 'USER' } })
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const contact = await prisma.contactLog.create({
    data: {
      clientId: parsed.data.clientId,
      staffId: req.user!.id,
      note: parsed.data.note,
      channel: parsed.data.channel || 'phone',
    },
    include: {
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })
  return res.json({ contact })
})

crmRouter.get('/contacts', async (req, res) => {
  const clientId = req.query.clientId ? String(req.query.clientId) : undefined
  const staffId = req.query.staffId ? String(req.query.staffId) : undefined
  const contacts = await prisma.contactLog.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(staffId ? { staffId } : {}),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      staff: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return res.json({ contacts })
})

/** Who is connected (online) right now */
crmRouter.get('/online', async (_req, res) => {
  const since = new Date(Date.now() - ONLINE_MS)
  const users = await prisma.user.findMany({
    where: { role: 'USER', lastSeenAt: { gte: since } },
    select: {
      id: true,
      name: true,
      email: true,
      lastSeenAt: true,
      funded: true,
      assignedTo: { select: { id: true, name: true } },
      accounts: { select: { number: true, type: true, balance: true } },
      trades: {
        where: { status: 'open' },
        select: { id: true, symbol: true, side: true, volume: true, openPrice: true, currentPrice: true },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
  })

  return res.json({
    onlineMs: ONLINE_MS,
    count: users.length,
    users: users.map((u) => ({
      ...u,
      floatingPnl: Number(
        u.trades.reduce((s, t) => s + calcPnl(t as any, t.currentPrice), 0).toFixed(2),
      ),
    })),
  })
})

/** Significant winners / losers */
crmRouter.get('/performance', async (req, res) => {
  const threshold = Number(req.query.threshold) || 100
  const clients = await prisma.user.findMany({
    where: { role: 'USER' },
    select: {
      id: true,
      name: true,
      email: true,
      lastSeenAt: true,
      funded: true,
      assignedTo: { select: { id: true, name: true } },
      accounts: { select: { balance: true, type: true } },
    },
  })

  const openTrades = await prisma.trade.findMany({ where: { status: 'open' } })
  const closed = await prisma.trade.groupBy({
    by: ['userId'],
    where: { status: 'closed' },
    _sum: { realizedPnl: true },
    _count: true,
  })
  const realizedMap = new Map(closed.map((c) => [c.userId, { pnl: c._sum.realizedPnl ?? 0, trades: c._count }]))
  const floatingMap = new Map<string, number>()
  for (const t of openTrades) {
    floatingMap.set(t.userId, (floatingMap.get(t.userId) || 0) + calcPnl(t, t.currentPrice))
  }

  const now = Date.now()
  const rows = clients
    .map((c) => {
      const realized = realizedMap.get(c.id)?.pnl || 0
      const floating = floatingMap.get(c.id) || 0
      const total = realized + floating
      return {
        ...c,
        online: c.lastSeenAt ? now - c.lastSeenAt.getTime() < ONLINE_MS : false,
        realizedPnl: Number(realized.toFixed(2)),
        floatingPnl: Number(floating.toFixed(2)),
        totalPnl: Number(total.toFixed(2)),
        closedTrades: realizedMap.get(c.id)?.trades || 0,
        openTrades: openTrades.filter((t) => t.userId === c.id).length,
        balance: c.accounts.reduce((s, a) => s + a.balance, 0),
      }
    })
    .filter((r) => Math.abs(r.totalPnl) >= threshold)
    .sort((a, b) => b.totalPnl - a.totalPnl)

  return res.json({
    threshold,
    winners: rows.filter((r) => r.totalPnl > 0),
    losers: rows.filter((r) => r.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl),
    all: rows,
  })
})

crmRouter.get('/staff', async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER', 'EMPLOYEE'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { assignedClients: true } },
    },
    orderBy: { name: 'asc' },
  })
  return res.json({ staff })
})

/** Market price overrides */
crmRouter.get('/prices', async (_req, res) => {
  const { quotes } = await fetchQuotes()
  const overrides = await prisma.priceOverride.findMany({ orderBy: { symbol: 'asc' } })
  return res.json({
    watchlist: WATCHLIST.map((w) => ({ symbol: w.symbol, name: w.name, category: w.category, base: w.base })),
    quotes,
    overrides,
  })
})

crmRouter.put('/prices/:symbol', managerRequired, async (req, res) => {
  const schema = z.object({
    price: z.number().positive(),
    bid: z.number().positive().optional(),
    ask: z.number().positive().optional(),
    active: z.boolean().optional(),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const symbol = String(req.params.symbol).toUpperCase()
  if (!WATCHLIST.some((w) => w.symbol === symbol)) {
    return res.status(400).json({ error: 'Unknown symbol' })
  }

  const override = await prisma.priceOverride.upsert({
    where: { symbol },
    create: {
      symbol,
      price: parsed.data.price,
      bid: parsed.data.bid,
      ask: parsed.data.ask,
      active: parsed.data.active ?? true,
      note: parsed.data.note,
      createdById: req.user!.id,
    },
    update: {
      price: parsed.data.price,
      bid: parsed.data.bid,
      ask: parsed.data.ask,
      active: parsed.data.active ?? true,
      note: parsed.data.note,
      createdById: req.user!.id,
    },
  })

  // Push override into open trades immediately
  await prisma.trade.updateMany({
    where: { symbol, status: { in: ['open', 'pending'] } },
    data: { currentPrice: override.price },
  })

  return res.json({ override })
})

crmRouter.delete('/prices/:symbol', managerRequired, async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase()
  await prisma.priceOverride.deleteMany({ where: { symbol } })
  return res.json({ ok: true })
})

/** Close trade with optional forced exit price */
crmRouter.post('/trades/:id/close', managerRequired, async (req, res) => {
  const schema = z.object({ exitPrice: z.number().positive().optional() })
  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const trade = await prisma.trade.findUnique({ where: { id: String(req.params.id) } })
  if (!trade || trade.status !== 'open') return res.status(404).json({ error: 'Open trade not found' })

  let exit = parsed.data.exitPrice
  if (exit == null) {
    const { quotes } = await fetchQuotes()
    const quote = quotes.find((q) => q.symbol === trade.symbol)
    exit = quote ? (trade.side === 'buy' ? quote.bid : quote.ask) : trade.currentPrice
  }

  const result = await settleTradeClose(trade, exit, `CRM close #${trade.id.slice(-8)} @ ${exit}`)
  return res.json({ ok: true, ...result })
})

/** Set live mark price on an open trade (manager) */
crmRouter.patch('/trades/:id/price', managerRequired, async (req, res) => {
  const schema = z.object({ currentPrice: z.number().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const trade = await prisma.trade.findUnique({ where: { id: String(req.params.id) } })
  if (!trade || trade.status !== 'open') return res.status(404).json({ error: 'Open trade not found' })

  const updated = await prisma.trade.update({
    where: { id: trade.id },
    data: { currentPrice: parsed.data.currentPrice },
  })
  return res.json({ trade: updated, floatingPnl: calcPnl(updated, updated.currentPrice) })
})

/** Award bonus / add amount to client account */
crmRouter.post('/bonus', managerRequired, async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    amount: z.number().positive(),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const account = await prisma.account.findUnique({ where: { id: parsed.data.accountId } })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  const sym = currencySymbol(await getCurrencyCode())

  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: {
        balance: { increment: parsed.data.amount },
        equity: { increment: parsed.data.amount },
        credit: { increment: parsed.data.amount },
      },
    }),
    prisma.transaction.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        type: 'bonus',
        status: 'completed',
        amount: parsed.data.amount,
        payment: 'CRM Bonus',
        note: parsed.data.note || `Bonus by ${req.user!.email}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: account.userId,
        title: 'Bonus credited',
        body: `You received a bonus of ${sym}${parsed.data.amount.toFixed(2)}. ${parsed.data.note || ''}`.trim(),
      },
    }),
  ])

  return res.json({ ok: true })
})

/** Add / remove amount (credit or debit) */
crmRouter.post('/adjust', managerRequired, async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    amount: z.number(),
    note: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  if (parsed.data.amount === 0) return res.status(400).json({ error: 'Amount required' })

  const account = await prisma.account.findUnique({ where: { id: parsed.data.accountId } })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  const sym = currencySymbol(await getCurrencyCode())

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
        payment: 'CRM',
        note: parsed.data.note || `Adjustment by ${req.user!.email}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: account.userId,
        title: 'Balance updated',
        body: `Your balance was adjusted by ${sym}${parsed.data.amount.toFixed(2)}.`,
      },
    }),
  ])

  return res.json({ ok: true })
})
