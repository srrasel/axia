import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { authRequired, loadUser, publicUser } from '../auth.js'
import { calcMargin, calcPnl, calcUsedMargin, initialsFromName } from '../trading.js'
import { fetchCandles, fetchQuotes } from '../market.js'
import { getPremiumThreshold, getSettingNumber, getCurrencyCode, currencySymbol } from '../settings.js'
import { fxMatrix } from '../fx.js'
import { settleTradeClose } from '../settle.js'

export const userRouter = Router()
userRouter.use(authRequired)

userRouter.get('/bootstrap', async (req, res) => {
  // Presence heartbeat for CRM Online page
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { lastSeenAt: new Date() },
  })

  const user = await loadUser(req.user!.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const accountId = String(req.query.accountId || user.accounts.find((a) => a.type === 'demo')?.id || user.accounts[0]?.id)
  const account = user.accounts.find((a) => a.id === accountId) || user.accounts[0]
  if (!account) return res.status(400).json({ error: 'No trading account' })

  const [trades, transactions, notifications, market] = await Promise.all([
    prisma.trade.findMany({ where: { accountId: account.id }, orderBy: { openTime: 'desc' } }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    fetchQuotes(),
  ])

  const open = trades.filter((t) => t.status === 'open')
  const totalPnl = open.reduce((s, t) => s + calcPnl(t, t.currentPrice), 0)
  const usedFunds = calcUsedMargin(open, account.leverage)
  const equity = Number((account.balance + totalPnl).toFixed(2))
  const freeMargin = Number((equity - usedFunds).toFixed(2))
  const marginLevel = usedFunds > 0 ? Number(((equity / usedFunds) * 100).toFixed(2)) : 0

  const threshold = await getPremiumThreshold()
  const currency = await getCurrencyCode()
  const fx = await fxMatrix()

  const referrals = await prisma.user.findMany({
    where: { referredById: user.id },
    select: { id: true, name: true, email: true, funded: true, totalDeposited: true, createdAt: true },
  })

  return res.json({
    user: publicUser(user),
    accounts: user.accounts,
    activeAccountId: account.id,
    trades,
    transactions,
    notifications,
    quotes: market.quotes,
    liveData: market.live,
    metrics: {
      balance: account.balance,
      equity,
      freeMargin,
      usedFunds,
      totalPnl,
      marginLevel,
    },
    isPremium: user.totalDeposited >= threshold,
    premiumThreshold: threshold,
    currency,
    currencySymbol: currencySymbol(currency),
    fx: {
      source: fx.source,
      date: fx.date,
      matrix: fx.matrix,
      ratesFromAccount: fx.matrix[currency] || {},
    },
    referrals: {
      signedUp: referrals.length,
      qualified: referrals.filter((r) => r.funded || r.totalDeposited > 0).length,
      items: referrals,
    },
  })
})

userRouter.patch('/profile', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    nationality: z.string().min(2).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const data: { name?: string; nationality?: string; initials?: string } = { ...parsed.data }
  if (data.name) data.initials = initialsFromName(data.name)

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    include: { accounts: true, kycDocuments: true },
  })
  return res.json({ user: publicUser(user) })
})

userRouter.post('/password', async (req, res) => {
  const schema = z.object({
    current: z.string().min(1),
    next: z.string().min(6),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  const ok = await bcrypt.compare(parsed.data.current, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  })
  return res.json({ ok: true })
})

userRouter.get('/quotes', async (_req, res) => {
  const market = await fetchQuotes()
  return res.json(market)
})

userRouter.get('/candles', async (req, res) => {
  const symbol = String(req.query.symbol || 'EURUSD')
  const timeframe = String(req.query.timeframe || '5M')
  const candles = await fetchCandles(symbol, timeframe)
  return res.json({ candles })
})

userRouter.post('/trades', async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    symbol: z.string(),
    side: z.enum(['buy', 'sell']),
    volume: z.number().positive(),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
    pending: z.boolean().optional(),
    triggerPrice: z.number().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid order' })

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: req.user!.id },
  })
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const { quotes } = await fetchQuotes()
  const quote = quotes.find((q) => q.symbol === parsed.data.symbol)
  if (!quote) return res.status(400).json({ error: 'Unknown symbol' })
  if (quote.closed) return res.status(400).json({ error: 'Market is closed for this instrument' })

  const isPending = Boolean(parsed.data.pending && parsed.data.triggerPrice)
  const price = isPending
    ? parsed.data.triggerPrice!
    : parsed.data.side === 'buy'
      ? quote.ask
      : quote.bid

  if (!isPending) {
    const open = await prisma.trade.findMany({ where: { accountId: account.id, status: 'open' } })
    const used = calcUsedMargin(open, account.leverage)
    const floating = open.reduce((s, t) => s + calcPnl(t, t.currentPrice), 0)
    const free = account.balance + floating - used
    const required = calcMargin(
      { volume: parsed.data.volume, openPrice: price, category: quote.category, symbol: quote.symbol },
      account.leverage,
    )
    if (required > free) {
      return res.status(400).json({
        error: `Insufficient free margin. Need ${required.toFixed(2)}, have ${free.toFixed(2)}`,
      })
    }
  }

  const trade = await prisma.trade.create({
    data: {
      userId: req.user!.id,
      accountId: account.id,
      symbol: quote.symbol,
      side: parsed.data.side,
      volume: parsed.data.volume,
      openPrice: price,
      currentPrice: quote.price,
      status: isPending ? 'pending' : 'open',
      stopLoss: parsed.data.stopLoss,
      takeProfit: parsed.data.takeProfit,
      triggerPrice: isPending ? parsed.data.triggerPrice : null,
      category: quote.category,
      source: 'self',
    },
  })

  return res.json({ trade })
})

userRouter.post('/trades/:id/close', async (req, res) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id, status: 'open' },
  })
  if (!trade) return res.status(404).json({ error: 'Trade not found' })

  const { quotes } = await fetchQuotes()
  const quote = quotes.find((q) => q.symbol === trade.symbol)
  const exit = quote ? (trade.side === 'buy' ? quote.bid : quote.ask) : trade.currentPrice
  const result = await settleTradeClose(trade, exit, `Close #${trade.id.slice(-8)}`)
  const updated = await prisma.trade.findUnique({ where: { id: trade.id } })
  return res.json({ trade: updated, pnl: result.netPnl, commission: result.commission })
})

userRouter.delete('/trades/:id', async (req, res) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id, status: 'pending' },
  })
  if (!trade) return res.status(404).json({ error: 'Pending order not found' })
  await prisma.trade.delete({ where: { id: trade.id } })
  return res.json({ ok: true })
})

userRouter.patch('/trades/:id/levels', async (req, res) => {
  const schema = z.object({
    stopLoss: z.number().nullable().optional(),
    takeProfit: z.number().nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id, status: { in: ['open', 'pending'] } },
  })
  if (!trade) return res.status(404).json({ error: 'Trade not found' })

  const updated = await prisma.trade.update({
    where: { id: trade.id },
    data: {
      stopLoss: parsed.data.stopLoss === undefined ? trade.stopLoss : parsed.data.stopLoss,
      takeProfit: parsed.data.takeProfit === undefined ? trade.takeProfit : parsed.data.takeProfit,
    },
  })
  return res.json({ trade: updated })
})

userRouter.post('/deposit', async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    amount: z.number().positive(),
    payment: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: req.user!.id },
  })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  if (account.type === 'demo') return res.status(400).json({ error: 'Deposit is unavailable for demo account' })

  const minDeposit = await getSettingNumber('min_deposit', 50)
  const sym = currencySymbol(await getCurrencyCode())
  if (parsed.data.amount < minDeposit) {
    return res.status(400).json({ error: `Minimum deposit is ${sym}${minDeposit}` })
  }

  const feePct = await getSettingNumber('deposit_fee_percent', 0)
  const fee = Number(((parsed.data.amount * feePct) / 100).toFixed(2))

  await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      accountId: account.id,
      type: 'deposit',
      status: 'pending',
      amount: parsed.data.amount,
      fee,
      payment: parsed.data.payment,
      note: 'Deposit request',
    },
  })
  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: 'Deposit pending',
      body: `Your deposit of ${sym}${parsed.data.amount.toFixed(2)} is awaiting admin approval.`,
    },
  })

  return res.json({ ok: true, pending: true, fee })
})

userRouter.post('/withdraw', async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    amount: z.number().positive(),
    payment: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: req.user!.id },
  })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  if (account.type === 'demo') return res.status(400).json({ error: 'Withdrawals unavailable on demo accounts' })

  const minWithdraw = await getSettingNumber('min_withdraw', 20)
  const sym = currencySymbol(await getCurrencyCode())
  if (parsed.data.amount < minWithdraw) {
    return res.status(400).json({ error: `Minimum withdrawal is ${sym}${minWithdraw}` })
  }

  const open = await prisma.trade.findMany({ where: { accountId: account.id, status: 'open' } })
  const used = calcUsedMargin(open, account.leverage)
  const pendingWithdraws = await prisma.transaction.aggregate({
    where: { accountId: account.id, type: 'withdraw', status: 'pending' },
    _sum: { amount: true },
  })
  const pendingAmt = Math.abs(pendingWithdraws._sum.amount ?? 0)
  const available = account.balance - used - pendingAmt
  if (parsed.data.amount > available) {
    return res.status(400).json({ error: `Only ${sym}${available.toFixed(2)} available to withdraw` })
  }

  const feePct = await getSettingNumber('withdraw_fee_percent', 1.5)
  const fee = Number(((parsed.data.amount * feePct) / 100).toFixed(2))

  await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      accountId: account.id,
      type: 'withdraw',
      status: 'pending',
      amount: -parsed.data.amount,
      fee,
      payment: parsed.data.payment,
      note: 'Withdrawal request',
    },
  })
  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: 'Withdrawal pending',
      body: `Your withdrawal of ${sym}${parsed.data.amount.toFixed(2)} is awaiting admin approval.`,
    },
  })

  return res.json({ ok: true, pending: true, fee })
})

userRouter.post('/kyc', async (req, res) => {
  const schema = z.object({
    kind: z.enum(['identity', 'residence']),
    docType: z.string().min(1),
    fileName: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  await prisma.kycDocument.create({
    data: {
      userId: req.user!.id,
      kind: parsed.data.kind,
      docType: parsed.data.docType,
      fileName: parsed.data.fileName,
      status: 'pending',
    },
  })

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { kycStatus: 'pending' },
  })

  return res.json({ ok: true })
})

userRouter.post('/questionnaire', async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { questionnaireDone: true },
  })
  return res.json({ ok: true })
})

userRouter.post('/notifications/read', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  })
  return res.json({ ok: true })
})
