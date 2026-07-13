export type AccountType = 'demo' | 'live'

export interface User {
  id: string
  name: string
  email: string
  password: string
  nationality: string
  initials: string
  verified: boolean
  funded: boolean
  totalDeposited: number
  questionnaireDone: boolean
  referralCode: string
  totpEnabled?: boolean
  kyc: {
    identity?: string
    residence?: string
    identityFile?: string
    residenceFile?: string
  }
}

export interface TradingAccount {
  id: string
  number?: string
  type: AccountType
  platform: string
  leverage: string
  currency: string
  equity: number
  balance: number
  credit: number
}

export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  percentChange: number
  bid: number
  ask: number
  category: 'forex' | 'crypto' | 'commodity' | 'stock' | 'index'
  closed?: boolean
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type TradeSide = 'buy' | 'sell'
export type TradeStatus = 'open' | 'pending' | 'closed'
export type TradeSource = 'self' | 'social'

export interface Trade {
  id: string
  accountId: string
  symbol: string
  side: TradeSide
  volume: number
  openPrice: number
  currentPrice: number
  closePrice?: number
  openTime: string
  closeTime?: string
  status: TradeStatus
  stopLoss?: number
  takeProfit?: number
  triggerPrice?: number
  realizedPnl?: number
  swap: number
  category: Quote['category']
  source: TradeSource
}

export interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'trade_pnl' | 'credit'
  accountId: string
  date: string
  amount: number
  payment: string
  note?: string
  status?: 'pending' | 'approved' | 'rejected' | 'completed'
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

export interface AccountMetrics {
  freeMargin: number
  usedFunds: number
  equity: number
  totalPnl: number
  marginLevel: number
  balance: number
}

export interface PlaceTradeInput {
  side: TradeSide
  volume: number
  stopLoss?: number
  takeProfit?: number
  pending?: boolean
  triggerPrice?: number
}

export const PREMIUM_THRESHOLD = 5000
