import { prisma } from './prisma.js'
import { fetchQuotes } from './market.js'
import { shouldFillPending, shouldTriggerSlTp } from './trading.js'
import { settleTradeClose } from './settle.js'

export async function runMarketTick() {
  const { quotes } = await fetchQuotes()
  const openOrPending = await prisma.trade.findMany({
    where: { status: { in: ['open', 'pending'] } },
  })

  for (const trade of openOrPending) {
    const quote = quotes.find((q) => q.symbol === trade.symbol)
    if (!quote) continue

    if (trade.status === 'pending' && shouldFillPending(trade, quote.bid, quote.ask)) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: 'open',
          openPrice: trade.side === 'buy' ? quote.ask : quote.bid,
          currentPrice: quote.price,
          openTime: new Date(),
        },
      })
      continue
    }

    if (trade.status === 'open') {
      const hit = shouldTriggerSlTp(trade, quote.bid, quote.ask)
      if (hit) {
        const exit = hit === 'sl' ? trade.stopLoss! : trade.takeProfit!
        await settleTradeClose(trade, exit, `${hit.toUpperCase()} #${trade.id.slice(-8)}`)
      } else {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { currentPrice: quote.price },
        })
      }
    }
  }
}
