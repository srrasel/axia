import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { assignedClientsFilter, isCrmStaff } from './auth.js'
import { calcPnl } from './trading.js'

export const CRM_CATEGORIES = [
  'ALL',
  'BAD',
  'CONVERSION',
  'FTD',
  'NEW',
  'ONLINE',
  'ONLINE_FTD',
  'POTENTIAL',
  'PRACTICE',
  'RETENTION',
  'TEST',
] as const

export type CrmCategoryFilter = (typeof CRM_CATEGORIES)[number]

const ONLINE_MS = 2 * 60 * 1000

export async function logCrmActivity(opts: {
  clientId: string
  staffId?: string | null
  action: string
  detail?: string
  req?: Request
}) {
  const ip =
    (opts.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    opts.req?.socket?.remoteAddress ||
    null
  const device = opts.req?.headers['user-agent']?.toString().slice(0, 180) || null
  await prisma.crmActivity.create({
    data: {
      clientId: opts.clientId,
      staffId: opts.staffId || null,
      action: opts.action,
      detail: opts.detail,
      ip,
      device,
    },
  })
  await prisma.user.update({
    where: { id: opts.clientId },
    data: { lastInteractionAt: new Date() },
  })
}

export function clientScopeWhere(req: { user?: { id: string; role: string; email?: string } }) {
  const scope = assignedClientsFilter(req as any)
  return { role: 'USER' as const, ...scope }
}

export async function nextCrmNumber() {
  const last = await prisma.user.findFirst({
    where: { crmNumber: { not: null } },
    orderBy: { crmNumber: 'desc' },
    select: { crmNumber: true },
  })
  return (last?.crmNumber || 10000) + 1
}

export function buildClientListWhere(
  req: { user?: { id: string; role: string } },
  q: {
    search?: string
    category?: string
    country?: string
    employeeId?: string
    status?: string
    source?: string
    accountType?: string
    language?: string
    campaign?: string
    registeredFrom?: string
    registeredTo?: string
    lastInteractionFrom?: string
    lastInteractionTo?: string
    depositMin?: string
    depositMax?: string
  },
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { ...clientScopeWhere(req) }

  if (q.search?.trim()) {
    const s = q.search.trim()
    const or: Prisma.UserWhereInput[] = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ]
    if (Number.isFinite(Number(s)) && s.length > 0) {
      or.push({ crmNumber: Number(s) })
    }
    where.OR = or
  }

  if (q.country) where.country = q.country
  if (q.language) where.language = q.language
  if (q.status) where.crmStatus = q.status as any
  if (q.source) where.clientSource = q.source
  if (q.campaign) where.campaign = { contains: q.campaign, mode: 'insensitive' }
  if (q.employeeId) where.assignedToId = q.employeeId
  if (q.depositMin || q.depositMax) {
    where.totalDeposited = {
      ...(q.depositMin ? { gte: Number(q.depositMin) } : {}),
      ...(q.depositMax ? { lte: Number(q.depositMax) } : {}),
    }
  }
  if (q.registeredFrom || q.registeredTo) {
    where.createdAt = {
      ...(q.registeredFrom ? { gte: new Date(q.registeredFrom) } : {}),
      ...(q.registeredTo ? { lte: new Date(q.registeredTo) } : {}),
    }
  }
  if (q.lastInteractionFrom || q.lastInteractionTo) {
    where.lastInteractionAt = {
      ...(q.lastInteractionFrom ? { gte: new Date(q.lastInteractionFrom) } : {}),
      ...(q.lastInteractionTo ? { lte: new Date(q.lastInteractionTo) } : {}),
    }
  }
  if (q.accountType === 'demo' || q.accountType === 'live') {
    where.accounts = { some: { type: q.accountType } }
  }

  const cat = (q.category || 'ALL').toUpperCase()
  const sinceOnline = new Date(Date.now() - ONLINE_MS)
  if (cat === 'ONLINE') where.lastSeenAt = { gte: sinceOnline }
  else if (cat === 'ONLINE_FTD') {
    where.lastSeenAt = { gte: sinceOnline }
    where.funded = true
  } else if (cat === 'FTD') where.funded = true
  else if (cat === 'NEW') where.crmCategory = 'NEW'
  else if (cat !== 'ALL' && CRM_CATEGORIES.includes(cat as any)) {
    where.crmCategory = cat as any
  }

  return where
}

export async function enrichClientRow(client: any) {
  const openTrades = await prisma.trade.findMany({
    where: { userId: client.id, status: 'open' },
  })
  const floatingPnl = openTrades.reduce((s, t) => s + calcPnl(t, t.currentPrice), 0)
  const closed = await prisma.trade.aggregate({
    where: { userId: client.id, status: 'closed' },
    _sum: { realizedPnl: true },
    _count: true,
  })
  const tradeCount = await prisma.trade.count({ where: { userId: client.id } })
  const firstTrade = await prisma.trade.findFirst({
    where: { userId: client.id },
    orderBy: { openTime: 'asc' },
    select: { openTime: true },
  })
  const lastTrade = await prisma.trade.findFirst({
    where: { userId: client.id },
    orderBy: { openTime: 'desc' },
    select: { openTime: true },
  })
  const depAgg = await prisma.transaction.aggregate({
    where: { userId: client.id, type: 'deposit', status: { in: ['completed', 'approved'] } },
    _sum: { amount: true },
    _count: true,
  })
  const wdAgg = await prisma.transaction.aggregate({
    where: { userId: client.id, type: 'withdraw', status: { in: ['completed', 'approved'] } },
    _sum: { amount: true },
    _count: true,
  })
  const firstDeposit = await prisma.transaction.findFirst({
    where: { userId: client.id, type: 'deposit', status: { in: ['completed', 'approved'] } },
    orderBy: { createdAt: 'asc' },
  })
  const lastDeposit = await prisma.transaction.findFirst({
    where: { userId: client.id, type: 'deposit', status: { in: ['completed', 'approved'] } },
    orderBy: { createdAt: 'desc' },
  })
  const lastWithdrawal = await prisma.transaction.findFirst({
    where: { userId: client.id, type: 'withdraw', status: { in: ['completed', 'approved'] } },
    orderBy: { createdAt: 'desc' },
  })
  const balance = (client.accounts || []).reduce((s: number, a: any) => s + a.balance, 0)
  const equity = (client.accounts || []).reduce((s: number, a: any) => s + a.equity, 0)
  const credit = (client.accounts || []).reduce((s: number, a: any) => s + a.credit, 0)
  const deposits = depAgg._sum.amount ?? client.totalDeposited ?? 0
  const withdrawals = Math.abs(wdAgg._sum.amount ?? 0)
  const online = client.lastSeenAt ? Date.now() - new Date(client.lastSeenAt).getTime() < ONLINE_MS : false
  const liveAccounts = (client.accounts || []).filter((a: any) => a.type === 'live' && a.active !== false).length
  const docs = client.kycDocuments || []
  const docsApproved = docs.filter((d: any) => d.status === 'approved').length
  const docsNew = docs.filter((d: any) => d.status === 'pending').length
  const docsRejected = docs.filter((d: any) => d.status === 'rejected').length

  return {
    ...client,
    online,
    liveAccounts,
    floatingPnl: Number(floatingPnl.toFixed(2)),
    closedPnl: Number((closed._sum.realizedPnl ?? 0).toFixed(2)),
    balance: Number(balance.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    credit: Number(credit.toFixed(2)),
    freeMargin: Number((equity - Math.max(0, -floatingPnl)).toFixed(2)),
    openPnl: Number(floatingPnl.toFixed(2)),
    deposits: Number(deposits.toFixed(2)),
    totalDeposits: Number(deposits.toFixed(2)),
    depositCount: depAgg._count,
    withdrawals: Number(withdrawals.toFixed(2)),
    withdrawalCount: wdAgg._count,
    netDeposit: Number((deposits - withdrawals).toFixed(2)),
    openTrades: openTrades.length,
    tradeCount,
    ftdAmount: firstDeposit ? Number(firstDeposit.amount) : 0,
    firstDepositAt: firstDeposit?.createdAt || null,
    lastDepositAt: lastDeposit?.createdAt || null,
    lastWithdrawalAt: lastWithdrawal?.createdAt || null,
    firstTradeAt: firstTrade?.openTime || null,
    lastTradeAt: lastTrade?.openTime || null,
    docsApproved,
    docsNew,
    docsRejected,
    commentsCount: client.crmComments?.length ?? client._count?.crmComments ?? 0,
  }
}

export async function ensureCrmNumber(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { crmNumber: true } })
  if (u?.crmNumber) return u.crmNumber
  const n = await nextCrmNumber()
  await prisma.user.update({ where: { id: userId }, data: { crmNumber: n } })
  return n
}

export { ONLINE_MS, isCrmStaff }
