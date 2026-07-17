import type { AssetCategory } from '@prisma/client'

const API_KEY = process.env.TWELVE_DATA_API_KEY
const BASE = 'https://api.twelvedata.com'

export const WATCHLIST = [
  // Forex
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex' as AssetCategory, td: 'EUR/USD', base: 1.1438 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'forex' as AssetCategory, td: 'GBP/USD', base: 1.2684 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex' as AssetCategory, td: 'USD/JPY', base: 149.32 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'forex' as AssetCategory, td: 'AUD/USD', base: 0.662 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex' as AssetCategory, td: 'USD/CHF', base: 0.885 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex' as AssetCategory, td: 'USD/CAD', base: 1.368 },
  // Commodities
  { symbol: 'GOLD', name: 'Gold', category: 'commodity' as AssetCategory, td: 'XAU/USD', base: 2348.5 },
  { symbol: 'SILVER', name: 'Silver', category: 'commodity' as AssetCategory, td: 'XAG/USD', base: 29.42 },
  { symbol: 'OIL', name: 'Crude Oil WTI', category: 'commodity' as AssetCategory, td: 'WTI/USD', base: 78.4 },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', category: 'crypto' as AssetCategory, td: 'BTC/USD', base: 64250 },
  { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', category: 'crypto' as AssetCategory, td: 'ETH/USD', base: 3420 },
  // Indices
  { symbol: 'US30', name: 'Dow Jones 30', category: 'index' as AssetCategory, td: 'DJI', base: 39850 },
  { symbol: 'DAX40', name: 'Germany DAX 40', category: 'index' as AssetCategory, td: 'DAX', base: 25087 },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'index' as AssetCategory, td: 'NDX', base: 18240 },
  { symbol: 'UK100', name: 'FTSE 100', category: 'index' as AssetCategory, td: 'FTSE', base: 8245 },
  // Stocks
  { symbol: 'TESLA', name: 'Tesla Inc', category: 'stock' as AssetCategory, td: 'TSLA', base: 248.5 },
  { symbol: 'AAPL', name: 'Apple Inc', category: 'stock' as AssetCategory, td: 'AAPL', base: 212.3 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'stock' as AssetCategory, td: 'NVDA', base: 118.4 },
  { symbol: 'SPACEX', name: 'SpaceX (OTC proxy)', category: 'stock' as AssetCategory, td: 'TSLA', base: 142.5 },
  // Arabian Markets (stored as stock/index for Prisma enum)
  { symbol: 'TASI', name: 'Tadawul All Share', category: 'index' as AssetCategory, td: 'TASI', base: 11840, region: 'arabian' },
  { symbol: 'ARAMCO', name: 'Saudi Aramco', category: 'stock' as AssetCategory, td: '2222.SR', base: 28.6, region: 'arabian' },
  { symbol: 'ALRAJHI', name: 'Al Rajhi Bank', category: 'stock' as AssetCategory, td: '1120.SR', base: 84.2, region: 'arabian' },
  { symbol: 'SABIC', name: 'SABIC', category: 'stock' as AssetCategory, td: '2010.SR', base: 72.8, region: 'arabian' },
] as Array<{
  symbol: string
  name: string
  category: AssetCategory
  td: string
  base: number
  region?: string
}>

/** Curated NitajFX Favorites list */
export const NITAJFX_FAVORITES = ['EURUSD', 'GOLD', 'DAX40', 'SILVER', 'US30', 'TESLA', 'SPACEX', 'ARAMCO']
/** @deprecated use NITAJFX_FAVORITES */
export const SEEKAPA_FAVORITES = NITAJFX_FAVORITES

export const ARABIAN_SYMBOLS = WATCHLIST.filter((s) => s.region === 'arabian').map((s) => s.symbol)

export type Quote = {
  symbol: string
  name: string
  price: number
  change: number
  percentChange: number
  bid: number
  ask: number
  category: AssetCategory
  closed?: boolean
  region?: string
}

function hasKey() {
  return Boolean(API_KEY && API_KEY !== 'your_api_key_here')
}

function jitter(price: number, pct = 0.0008) {
  return Number((price + price * pct * (Math.random() * 2 - 1)).toFixed(price >= 100 ? 2 : 5))
}

function isMarketClosed(category: AssetCategory, region?: string) {
  const day = new Date().getUTCDay()
  const hour = new Date().getUTCHours()
  if (category === 'forex' || category === 'crypto') return false
  if (day === 0 || day === 6) return true
  if (region === 'arabian') {
    // Rough Riyadh cash session window in UTC
    return hour < 6 || hour > 13
  }
  return category === 'stock' && (hour < 13 || hour > 21)
}

export function mockQuotes(): Quote[] {
  return WATCHLIST.map((s) => {
    const price = jitter(s.base)
    const change = price - s.base
    const spread = price * 0.00012
    return {
      symbol: s.symbol,
      name: s.name,
      price,
      change,
      percentChange: (change / s.base) * 100,
      bid: price - spread / 2,
      ask: price + spread / 2,
      category: s.category,
      closed: isMarketClosed(s.category, s.region),
      region: s.region,
    }
  })
}

const INTERVAL: Record<string, { td: string; sec: number }> = {
  '1M': { td: '1min', sec: 60 },
  '5M': { td: '5min', sec: 300 },
  '15M': { td: '15min', sec: 900 },
  '30M': { td: '30min', sec: 1800 },
  '1H': { td: '1h', sec: 3600 },
  '4H': { td: '4h', sec: 14400 },
  '1D': { td: '1day', sec: 86400 },
  '1W': { td: '1week', sec: 604800 },
  '1Mo': { td: '1month', sec: 2592000 },
  '3Mo': { td: '1month', sec: 7776000 },
  '1Y': { td: '1month', sec: 31536000 },
}

export function mockCandles(symbol: string, timeframe = '5M', bars = 120) {
  const meta = WATCHLIST.find((s) => s.symbol === symbol)
  const base = meta?.base ?? 100
  const now = Math.floor(Date.now() / 1000)
  const interval = INTERVAL[timeframe]?.sec ?? 300
  let price = base * 0.992
  const out = []
  for (let i = bars; i >= 0; i--) {
    const open = price
    const close = open + (Math.random() - 0.48) * base * 0.001
    out.push({
      time: now - i * interval,
      open: Number(open.toFixed(5)),
      high: Number((Math.max(open, close) + Math.random() * base * 0.0004).toFixed(5)),
      low: Number((Math.min(open, close) - Math.random() * base * 0.0004).toFixed(5)),
      close: Number(close.toFixed(5)),
    })
    price = close
  }
  return out
}

export async function fetchQuotes(): Promise<{ quotes: Quote[]; live: boolean }> {
  const raw = await fetchQuotesRaw()
  const quotes = await applyPriceOverrides(raw.quotes)
  return { quotes, live: raw.live }
}

async function fetchQuotesRaw(): Promise<{ quotes: Quote[]; live: boolean }> {
  if (!hasKey()) return { quotes: mockQuotes(), live: false }
  try {
    // Prefer liquid symbols for Twelve Data; mock the rest
    const liquid = WATCHLIST.filter((s) => !s.region && s.symbol !== 'SPACEX' && s.symbol !== 'OIL')
    const symbols = liquid.map((s) => s.td).join(',')
    const url = `${BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${API_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 'error') return { quotes: mockQuotes(), live: false }
    const map = data.symbol ? { [data.symbol]: data } : data
    const mock = mockQuotes()
    const quotes = WATCHLIST.map((s) => {
      const q = map[s.td] ?? map[s.symbol]
      if (!q?.close) return mock.find((x) => x.symbol === s.symbol)!
      const price = Number(q.close)
      const change = Number(q.change ?? 0)
      return {
        symbol: s.symbol,
        name: q.name ?? s.name,
        price,
        change,
        percentChange: Number(q.percent_change ?? 0),
        bid: q.bid ? Number(q.bid) : price * 0.99994,
        ask: q.ask ? Number(q.ask) : price * 1.00006,
        category: s.category,
        closed: isMarketClosed(s.category, s.region),
        region: s.region,
      }
    })
    return { quotes, live: true }
  } catch {
    return { quotes: mockQuotes(), live: false }
  }
}

async function applyPriceOverrides(quotes: Quote[]): Promise<Quote[]> {
  try {
    const { prisma } = await import('./prisma.js')
    const overrides = await prisma.priceOverride.findMany({ where: { active: true } })
    if (!overrides.length) return quotes
    const map = new Map(overrides.map((o) => [o.symbol, o]))
    return quotes.map((q) => {
      const o = map.get(q.symbol)
      if (!o) return q
      const price = o.price
      const spread = Math.max(price * 0.00012, 0.00001)
      return {
        ...q,
        price,
        bid: o.bid ?? price - spread / 2,
        ask: o.ask ?? price + spread / 2,
        change: 0,
        percentChange: 0,
      }
    })
  } catch {
    return quotes
  }
}

export async function fetchCandles(symbol: string, timeframe = '5M') {
  const meta = WATCHLIST.find((s) => s.symbol === symbol)
  if (!hasKey() || !meta || meta.region || meta.symbol === 'SPACEX') return mockCandles(symbol, timeframe)
  try {
    const url = `${BASE}/time_series?symbol=${encodeURIComponent(meta.td)}&interval=${INTERVAL[timeframe]?.td ?? '5min'}&outputsize=120&apikey=${API_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data?.values?.length) return mockCandles(symbol, timeframe)
    return data.values
      .map((v: { datetime: string; open: string; high: string; low: string; close: string }) => ({
        time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
      }))
      .filter((c: { time: number }) => !Number.isNaN(c.time))
      .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
  } catch {
    return mockCandles(symbol, timeframe)
  }
}
