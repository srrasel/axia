import { prisma } from './prisma.js'
import { CURRENCY_SYMBOLS, loadSettings } from './settings.js'

export type FxBundle = {
  base: string
  date: string
  rates: Record<string, number>
  /** quote → how many units of quote per 1 base, plus inverse helpers */
  updatedAt: string
  source: string
}

let cache: FxBundle | null = null
let cacheAt = 0

const FALLBACK: Record<string, Record<string, number>> = {
  EUR: { EUR: 1, USD: 1.08, GBP: 0.86 },
  USD: { USD: 1, EUR: 0.93, GBP: 0.79 },
  GBP: { GBP: 1, EUR: 1.16, USD: 1.27 },
}

function normalizeCode(code: string) {
  const c = code.toUpperCase()
  return CURRENCY_SYMBOLS[c] ? c : 'USD'
}

/** Fetch live USD / EUR / GBP cross rates (Frankfurter / ECB). */
export async function fetchFxRates(force = false): Promise<FxBundle> {
  if (!force && cache && Date.now() - cacheAt < 60_000) return cache

  const bases = ['EUR', 'USD', 'GBP'] as const
  const rates: Record<string, number> = {
    'EUR_EUR': 1,
    'USD_USD': 1,
    'GBP_GBP': 1,
  }

  let date = new Date().toISOString().slice(0, 10)
  let source = 'fallback'

  try {
    // Frankfurter: free ECB-based rates, no API key
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP')
    if (res.ok) {
      const data = (await res.json()) as { date?: string; rates?: Record<string, number> }
      date = data.date || date
      const usd = Number(data.rates?.USD)
      const gbp = Number(data.rates?.GBP)
      if (usd > 0 && gbp > 0) {
        rates['EUR_USD'] = usd
        rates['EUR_GBP'] = gbp
        rates['USD_EUR'] = 1 / usd
        rates['GBP_EUR'] = 1 / gbp
        rates['USD_GBP'] = gbp / usd
        rates['GBP_USD'] = usd / gbp
        source = 'frankfurter.app (ECB)'
      }
    }
  } catch {
    /* use fallback */
  }

  if (source === 'fallback') {
    for (const from of bases) {
      for (const to of bases) {
        rates[`${from}_${to}`] = FALLBACK[from][to]
      }
    }
  }

  cache = { base: 'EUR', date, rates, updatedAt: new Date().toISOString(), source }
  cacheAt = Date.now()
  return cache
}

export async function getRate(from: string, to: string): Promise<number> {
  const a = normalizeCode(from)
  const b = normalizeCode(to)
  if (a === b) return 1
  const fx = await fetchFxRates()
  const key = `${a}_${b}`
  const r = fx.rates[key]
  if (r && r > 0) return r
  // derive via EUR if needed
  const aEur = fx.rates[`${a}_EUR`] ?? FALLBACK[a]?.EUR ?? 1
  const eurB = fx.rates[`EUR_${b}`] ?? FALLBACK.EUR?.[b] ?? 1
  return aEur * eurB
}

export function convertAmount(amount: number, rate: number) {
  return Number((amount * rate).toFixed(2))
}

export type ConvertResult = {
  from: string
  to: string
  rate: number
  source: string
  date: string
  accounts: number
  users: number
  transactions: number
  earnings: number
  trades: number
  settings: string[]
}

/**
 * Convert all platform money fields when admin switches currency (real FX rate).
 */
export async function convertPlatformCurrency(fromRaw: string, toRaw: string): Promise<ConvertResult> {
  const from = normalizeCode(fromRaw)
  const to = normalizeCode(toRaw)
  if (from === to) {
    await prisma.account.updateMany({ data: { currency: to } })
    return {
      from,
      to,
      rate: 1,
      source: 'none',
      date: new Date().toISOString().slice(0, 10),
      accounts: 0,
      users: 0,
      transactions: 0,
      earnings: 0,
      trades: 0,
      settings: [],
    }
  }

  const fx = await fetchFxRates(true)
  const rate = await getRate(from, to)

  const accounts = await prisma.account.findMany()
  for (const a of accounts) {
    await prisma.account.update({
      where: { id: a.id },
      data: {
        currency: to,
        balance: convertAmount(a.balance, rate),
        equity: convertAmount(a.equity, rate),
        credit: convertAmount(a.credit, rate),
      },
    })
  }

  const users = await prisma.user.findMany({ where: { role: 'USER' } })
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { totalDeposited: convertAmount(u.totalDeposited, rate) },
    })
  }

  const txs = await prisma.transaction.findMany()
  for (const t of txs) {
    await prisma.transaction.update({
      where: { id: t.id },
      data: {
        amount: convertAmount(t.amount, rate),
        fee: convertAmount(t.fee, rate),
      },
    })
  }

  const earnings = await prisma.platformEarning.findMany()
  for (const e of earnings) {
    await prisma.platformEarning.update({
      where: { id: e.id },
      data: {
        amount: convertAmount(e.amount, rate),
        currency: to,
      },
    })
  }

  const trades = await prisma.trade.findMany()
  for (const t of trades) {
    await prisma.trade.update({
      where: { id: t.id },
      data: {
        commission: convertAmount(t.commission, rate),
        swap: convertAmount(t.swap, rate),
        realizedPnl: t.realizedPnl == null ? null : convertAmount(t.realizedPnl, rate),
      },
    })
  }

  // Money-denominated settings
  const moneyKeys = [
    'premium_threshold',
    'trading_fee_per_lot',
    'min_deposit',
    'min_withdraw',
    'default_demo_balance',
  ]
  const settings = await loadSettings(true)
  const convertedKeys: string[] = []
  for (const key of moneyKeys) {
    const raw = settings[key]
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    const next = String(convertAmount(n, rate))
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: next },
      update: { value: next },
    })
    convertedKeys.push(key)
  }

  await prisma.setting.upsert({
    where: { key: 'currency' },
    create: { key: 'currency', value: to },
    update: { value: to },
  })
  await loadSettings(true)

  return {
    from,
    to,
    rate,
    source: fx.source,
    date: fx.date,
    accounts: accounts.length,
    users: users.length,
    transactions: txs.length,
    earnings: earnings.length,
    trades: trades.length,
    settings: convertedKeys,
  }
}

/** Pretty matrix for admin UI */
export async function fxMatrix() {
  const fx = await fetchFxRates()
  const codes = ['USD', 'EUR', 'GBP'] as const
  const matrix: Record<string, Record<string, number>> = {}
  for (const from of codes) {
    matrix[from] = {}
    for (const to of codes) {
      matrix[from][to] = Number((await getRate(from, to)).toFixed(6))
    }
  }
  return { ...fx, matrix, symbols: CURRENCY_SYMBOLS }
}
