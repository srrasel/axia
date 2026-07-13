import type { Candle, Quote } from '../types'

const API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY as string | undefined
const BASE = 'https://api.twelvedata.com'

export const WATCHLIST_SYMBOLS: Array<{
  symbol: string
  name: string
  category: Quote['category']
  tdSymbol: string
  region?: 'arabian'
  base: number
}> = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', tdSymbol: 'EUR/USD', base: 1.1438 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'forex', tdSymbol: 'GBP/USD', base: 1.2684 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex', tdSymbol: 'USD/JPY', base: 149.32 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'forex', tdSymbol: 'AUD/USD', base: 0.662 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex', tdSymbol: 'USD/CHF', base: 0.885 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex', tdSymbol: 'USD/CAD', base: 1.368 },
  { symbol: 'GOLD', name: 'Gold', category: 'commodity', tdSymbol: 'XAU/USD', base: 2348.5 },
  { symbol: 'SILVER', name: 'Silver', category: 'commodity', tdSymbol: 'XAG/USD', base: 29.42 },
  { symbol: 'OIL', name: 'Crude Oil WTI', category: 'commodity', tdSymbol: 'WTI/USD', base: 78.4 },
  { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', category: 'crypto', tdSymbol: 'BTC/USD', base: 64250 },
  { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', category: 'crypto', tdSymbol: 'ETH/USD', base: 3420 },
  { symbol: 'US30', name: 'Dow Jones 30', category: 'index', tdSymbol: 'DJI', base: 39850 },
  { symbol: 'DAX40', name: 'Germany DAX 40', category: 'index', tdSymbol: 'DAX', base: 25087 },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'index', tdSymbol: 'NDX', base: 18240 },
  { symbol: 'UK100', name: 'FTSE 100', category: 'index', tdSymbol: 'FTSE', base: 8245 },
  { symbol: 'TESLA', name: 'Tesla Inc', category: 'stock', tdSymbol: 'TSLA', base: 248.5 },
  { symbol: 'AAPL', name: 'Apple Inc', category: 'stock', tdSymbol: 'AAPL', base: 212.3 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'stock', tdSymbol: 'NVDA', base: 118.4 },
  { symbol: 'SPACEX', name: 'SpaceX (OTC proxy)', category: 'stock', tdSymbol: 'TSLA', base: 142.5 },
  { symbol: 'TASI', name: 'Tadawul All Share', category: 'index', tdSymbol: 'TASI', base: 11840, region: 'arabian' },
  { symbol: 'ARAMCO', name: 'Saudi Aramco', category: 'stock', tdSymbol: '2222.SR', base: 28.6, region: 'arabian' },
  { symbol: 'ALRAJHI', name: 'Al Rajhi Bank', category: 'stock', tdSymbol: '1120.SR', base: 84.2, region: 'arabian' },
  { symbol: 'SABIC', name: 'SABIC', category: 'stock', tdSymbol: '2010.SR', base: 72.8, region: 'arabian' },
]

export const NITAJFX_FAVORITES = ['EURUSD', 'GOLD', 'DAX40', 'SILVER', 'US30', 'TESLA', 'SPACEX', 'ARAMCO']
/** @deprecated use NITAJFX_FAVORITES */
export const SEEKAPA_FAVORITES = NITAJFX_FAVORITES
export const ARABIAN_SYMBOLS = WATCHLIST_SYMBOLS.filter((s) => s.region === 'arabian').map((s) => s.symbol)

const BASE_PRICES: Record<string, number> = Object.fromEntries(WATCHLIST_SYMBOLS.map((s) => [s.symbol, s.base]))

function hasValidKey() {
  return Boolean(API_KEY && API_KEY !== 'your_api_key_here')
}

function jitter(price: number, pct = 0.0008) {
  const delta = price * pct * (Math.random() * 2 - 1)
  return Number((price + delta).toFixed(price >= 100 ? 2 : 5))
}

export function generateMockQuotes(): Quote[] {
  return WATCHLIST_SYMBOLS.map((s) => {
    const base = BASE_PRICES[s.symbol] ?? 100
    const price = jitter(base)
    const change = price - base
    const percentChange = (change / base) * 100
    const spread = price * 0.00012
    return {
      symbol: s.symbol,
      name: s.name,
      price,
      change,
      percentChange,
      bid: price - spread / 2,
      ask: price + spread / 2,
      category: s.category,
      closed: s.category === 'stock' && new Date().getUTCDay() === 0,
    }
  })
}

const INTERVAL_SECONDS: Record<string, number> = {
  '1M': 60,
  '5M': 300,
  '15M': 900,
  '30M': 1800,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
  '1W': 604800,
  '1Mo': 2592000,
}

export function generateMockCandles(symbol: string, timeframe = '5M', bars = 120): Candle[] {
  const base = BASE_PRICES[symbol] ?? 100
  const now = Math.floor(Date.now() / 1000)
  const interval = INTERVAL_SECONDS[timeframe] ?? 300
  let price = base * 0.992
  const candles: Candle[] = []
  const volatility = timeframe === '1M' || timeframe === '5M' ? 0.0008 : 0.0015

  for (let i = bars; i >= 0; i--) {
    const open = price
    const drift = (Math.random() - 0.48) * base * volatility
    const close = open + drift
    const high = Math.max(open, close) + Math.random() * base * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * base * volatility * 0.5
    candles.push({
      time: now - i * interval,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
    })
    price = close
  }
  return candles
}

async function tdFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  if (!hasValidKey()) return null
  const url = new URL(`${BASE}${path}`)
  Object.entries({ ...params, apikey: API_KEY! }).forEach(([k, v]) => url.searchParams.set(k, v))
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 'error') {
      console.warn('Twelve Data error:', data.message)
      return null
    }
    return data as T
  } catch (err) {
    console.warn('Twelve Data fetch failed, using mock data', err)
    return null
  }
}

interface QuoteResponse {
  symbol?: string
  name?: string
  close?: string
  percent_change?: string
  change?: string
  bid?: string
  ask?: string
}

export async function fetchQuotes(): Promise<Quote[]> {
  if (!hasValidKey()) return generateMockQuotes()

  const liquid = WATCHLIST_SYMBOLS.filter((s) => !s.region && s.symbol !== 'SPACEX' && s.symbol !== 'OIL')
  const symbols = liquid.map((s) => s.tdSymbol).join(',')
  const data = await tdFetch<Record<string, QuoteResponse> | QuoteResponse>('/quote', {
    symbol: symbols,
  })

  if (!data) return generateMockQuotes()

  const map =
    'symbol' in data && typeof data.symbol === 'string'
      ? { [data.symbol]: data as QuoteResponse }
      : (data as Record<string, QuoteResponse>)

  return WATCHLIST_SYMBOLS.map((s) => {
    const q = map[s.tdSymbol] ?? map[s.symbol]
    const fallback = generateMockQuotes().find((x) => x.symbol === s.symbol)!
    if (!q?.close) return fallback
    const price = Number(q.close)
    const change = Number(q.change ?? 0)
    const percentChange = Number(q.percent_change ?? 0)
    const bid = q.bid ? Number(q.bid) : price * 0.99994
    const ask = q.ask ? Number(q.ask) : price * 1.00006
    return {
      symbol: s.symbol,
      name: q.name ?? s.name,
      price,
      change,
      percentChange,
      bid,
      ask,
      category: s.category,
    }
  })
}

interface TimeSeriesResponse {
  values?: Array<{
    datetime: string
    open: string
    high: string
    low: string
    close: string
  }>
}

const INTERVAL_MAP: Record<string, string> = {
  '1M': '1min',
  '5M': '5min',
  '15M': '15min',
  '30M': '30min',
  '1H': '1h',
  '4H': '4h',
  '1D': '1day',
  '1W': '1week',
  '1Mo': '1month',
}

export async function fetchCandles(symbol: string, timeframe = '5M'): Promise<Candle[]> {
  const meta = WATCHLIST_SYMBOLS.find((s) => s.symbol === symbol)
  if (!hasValidKey() || !meta || meta.region || meta.symbol === 'SPACEX') {
    return generateMockCandles(symbol, timeframe)
  }

  const data = await tdFetch<TimeSeriesResponse>('/time_series', {
    symbol: meta.tdSymbol,
    interval: INTERVAL_MAP[timeframe] ?? '5min',
    outputsize: '120',
  })

  if (!data?.values?.length) return generateMockCandles(symbol, timeframe)

  return data.values
    .map((v) => ({
      time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .filter((c) => !Number.isNaN(c.time))
    .sort((a, b) => a.time - b.time)
}

export function isUsingLiveData() {
  return hasValidKey()
}
