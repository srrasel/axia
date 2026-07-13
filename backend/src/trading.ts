import type { AssetCategory, Trade } from '@prisma/client'

export function contractSize(category: AssetCategory, symbol: string): number {
  if (category === 'forex') return 100000
  if (category === 'crypto') return 1
  if (category === 'commodity') {
    if (symbol === 'GOLD') return 100
    if (symbol === 'OIL') return 100
    return 5000
  }
  if (category === 'index') return 1
  return 10
}

export function parseLeverage(leverage: string): number {
  const n = Number(leverage.split(':')[1])
  return Number.isFinite(n) && n > 0 ? n : 100
}

export function calcMargin(
  trade: { volume: number; openPrice: number; category: AssetCategory; symbol: string },
  leverage: string,
): number {
  const notional = trade.volume * contractSize(trade.category, trade.symbol) * trade.openPrice
  const fxAdj =
    trade.category === 'forex' && trade.symbol.startsWith('USD')
      ? 1 / Math.max(trade.openPrice, 0.0001)
      : 1
  return Number(((notional * fxAdj) / parseLeverage(leverage)).toFixed(2))
}

export function calcPnl(
  trade: Pick<Trade, 'side' | 'volume' | 'openPrice' | 'category' | 'symbol' | 'swap'>,
  exitPrice: number,
): number {
  const direction = trade.side === 'buy' ? 1 : -1
  const diff = (exitPrice - trade.openPrice) * direction
  const size = trade.volume * contractSize(trade.category, trade.symbol)
  return Number((diff * size + trade.swap).toFixed(2))
}

export function calcUsedMargin(
  trades: Array<{ volume: number; openPrice: number; category: AssetCategory; symbol: string }>,
  leverage: string,
): number {
  return Number(trades.reduce((sum, t) => sum + calcMargin(t, leverage), 0).toFixed(2))
}

export function shouldTriggerSlTp(
  trade: Pick<Trade, 'side' | 'status' | 'stopLoss' | 'takeProfit'>,
  bid: number,
  ask: number,
): 'sl' | 'tp' | null {
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

export function shouldFillPending(
  trade: Pick<Trade, 'side' | 'status' | 'triggerPrice'>,
  bid: number,
  ask: number,
): boolean {
  if (trade.status !== 'pending' || trade.triggerPrice == null) return false
  if (trade.side === 'buy') return ask <= trade.triggerPrice
  return bid >= trade.triggerPrice
}

export function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function referralCode(name: string) {
  return `NITAJFX-${name.slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`
}
