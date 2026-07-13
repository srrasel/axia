import type { Quote, Trade, TradingAccount, User } from '../types'

export const DEMO_USER: User = {
  id: 'u1',
  name: 'Mohammed naser',
  email: 'mohammed.naser@example.com',
  password: 'demo123',
  nationality: 'Saudi Arabia',
  initials: 'MN',
  verified: true,
  funded: false,
  totalDeposited: 0,
  questionnaireDone: false,
  referralCode: 'NITAJFX-MN26',
  kyc: {},
}

export const ACCOUNTS: TradingAccount[] = [
  {
    id: '5611305',
    type: 'live',
    platform: 'MT5',
    leverage: '1:400',
    currency: 'EUR',
    equity: 0,
    balance: 0,
    credit: 0,
  },
  {
    id: '6611306',
    type: 'demo',
    platform: 'MT5',
    leverage: '1:400',
    currency: 'EUR',
    equity: 24767.36,
    balance: 24767.36,
    credit: 0,
  },
]

export const INITIAL_TRADES: Trade[] = [
  {
    id: '20093090',
    accountId: '6611306',
    symbol: 'EURUSD',
    side: 'buy',
    volume: 1,
    openPrice: 1.14381,
    currentPrice: 1.1412,
    openTime: '10/07/26 21:23:17',
    status: 'open',
    swap: -2.4,
    category: 'forex',
    source: 'self',
  },
  {
    id: '20093091',
    accountId: '6611306',
    symbol: 'EURUSD',
    side: 'buy',
    volume: 0.5,
    openPrice: 1.1452,
    currentPrice: 1.1412,
    openTime: '10/07/26 18:11:02',
    status: 'open',
    swap: -1.1,
    category: 'forex',
    source: 'self',
  },
  {
    id: '20093092',
    accountId: '6611306',
    symbol: 'GBPUSD',
    side: 'sell',
    volume: 0.8,
    openPrice: 1.271,
    currentPrice: 1.2684,
    openTime: '09/07/26 14:02:44',
    status: 'open',
    swap: 0.6,
    category: 'forex',
    source: 'self',
  },
  {
    id: '20093093',
    accountId: '6611306',
    symbol: 'TESLA',
    side: 'buy',
    volume: 1,
    openPrice: 255.2,
    currentPrice: 248.5,
    openTime: '08/07/26 16:40:10',
    status: 'open',
    swap: -4.2,
    category: 'stock',
    source: 'self',
  },
]

/** Notional contract size per 1 lot */
export function contractSize(category: Quote['category'], symbol: string): number {
  if (category === 'forex') return 100000
  if (category === 'crypto') return 1
  if (category === 'commodity') {
    if (symbol === 'GOLD' || symbol === 'OIL') return 100
    return 5000
  }
  if (category === 'index') return 1
  return 10 // stocks CFD
}

export function parseLeverage(leverage: string): number {
  const n = Number(leverage.split(':')[1])
  return Number.isFinite(n) && n > 0 ? n : 100
}

export function calcMargin(trade: Pick<Trade, 'volume' | 'openPrice' | 'category' | 'symbol'>, leverage: string): number {
  const notional = trade.volume * contractSize(trade.category, trade.symbol) * trade.openPrice
  // Forex EUR-quoted pairs approximated in account currency
  const fxAdj = trade.category === 'forex' && trade.symbol.startsWith('USD') ? 1 / Math.max(trade.openPrice, 0.0001) : 1
  return Number(((notional * fxAdj) / parseLeverage(leverage)).toFixed(2))
}

export function calcPnl(trade: Trade, exitPrice = trade.currentPrice): number {
  const direction = trade.side === 'buy' ? 1 : -1
  const diff = (exitPrice - trade.openPrice) * direction
  const size = trade.volume * contractSize(trade.category, trade.symbol)
  let pnl = diff * size
  // Convert rough USD PnL for forex to EUR-ish account (approx)
  if (trade.category === 'forex' && trade.symbol.endsWith('USD')) {
    pnl = pnl // already in USD ≈ EUR for demo
  }
  return Number((pnl + trade.swap).toFixed(2))
}

export function calcUsedMargin(trades: Trade[], leverage: string): number {
  return Number(
    trades
      .filter((t) => t.status === 'open')
      .reduce((sum, t) => sum + calcMargin(t, leverage), 0)
      .toFixed(2),
  )
}

export function shouldTriggerSlTp(trade: Trade, bid: number, ask: number): 'sl' | 'tp' | null {
  if (trade.status !== 'open') return null
  const price = trade.side === 'buy' ? bid : ask
  if (trade.stopLoss != null) {
    if (trade.side === 'buy' && price <= trade.stopLoss) return 'sl'
    if (trade.side === 'sell' && price >= trade.stopLoss) return 'sl'
  }
  if (trade.takeProfit != null) {
    if (trade.side === 'buy' && price >= trade.takeProfit) return 'tp'
    if (trade.side === 'sell' && price <= trade.takeProfit) return 'tp'
  }
  return null
}

export function shouldFillPending(trade: Trade, bid: number, ask: number): boolean {
  if (trade.status !== 'pending' || trade.triggerPrice == null) return false
  if (trade.side === 'buy') return ask <= trade.triggerPrice
  return bid >= trade.triggerPrice
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

const CURRENCY_STORAGE_KEY = 'seekapa_platform_currency'

function readStoredPlatformCurrency() {
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY)?.toUpperCase()
    if (raw && CURRENCY_SYMBOLS[raw]) return raw
  } catch {
    /* ignore */
  }
  return 'EUR'
}

let platformCurrencyCode = typeof localStorage !== 'undefined' ? readStoredPlatformCurrency() : 'EUR'
let platformCurrencySymbol = CURRENCY_SYMBOLS[platformCurrencyCode] || '€'

export function setPlatformCurrency(codeOrSymbol?: string) {
  if (!codeOrSymbol) return
  const up = codeOrSymbol.toUpperCase()
  if (CURRENCY_SYMBOLS[up]) {
    platformCurrencyCode = up
    platformCurrencySymbol = CURRENCY_SYMBOLS[up]
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, platformCurrencyCode)
    } catch {
      /* ignore */
    }
  } else if (codeOrSymbol.length <= 2) {
    // Symbol-only update — also map known symbols back to codes
    platformCurrencySymbol = codeOrSymbol
    const matched = Object.entries(CURRENCY_SYMBOLS).find(([, sym]) => sym === codeOrSymbol)?.[0]
    if (matched) {
      platformCurrencyCode = matched
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, matched)
      } catch {
        /* ignore */
      }
    }
  }
}

export function getPlatformCurrency() {
  return { code: platformCurrencyCode, symbol: platformCurrencySymbol }
}

export function formatMoney(value: number, currency?: string) {
  let sym = platformCurrencySymbol
  if (currency) {
    const up = currency.toUpperCase()
    sym = CURRENCY_SYMBOLS[up] || (currency.length <= 2 ? currency : `${currency} `)
  }
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `-${sym}${abs}` : `${sym}${abs}`
}

export function formatPrice(value: number, symbol?: string) {
  if (!symbol) return value.toFixed(5)
  if (
    ['BTCUSD', 'ETHUSD', 'US30', 'DAX40', 'NAS100', 'UK100', 'TASI', 'GOLD', 'SILVER', 'OIL', 'TESLA', 'AAPL', 'NVDA', 'SPACEX', 'ARAMCO', 'ALRAJHI', 'SABIC'].includes(
      symbol,
    )
  ) {
    return value.toFixed(2)
  }
  return value.toFixed(5)
}

export function nowStamp() {
  return new Date().toLocaleString('en-GB').replace(',', '')
}

export function uid(prefix = '') {
  return `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`
}
