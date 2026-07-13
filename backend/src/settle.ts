import { prisma } from './prisma.js'
import { calcPnl } from './trading.js'
import { recordEarning } from './earnings.js'
import { getSettingNumber } from './settings.js'
import type { Trade } from '@prisma/client'

export async function settleTradeClose(trade: Trade, exit: number, note: string) {
  const feePerLot = await getSettingNumber('trading_fee_per_lot', 7)
  const commission = Number((trade.volume * feePerLot).toFixed(2))
  const grossPnl = calcPnl(trade, exit)
  const netPnl = Number((grossPnl - commission).toFixed(2))

  await prisma.$transaction(async (tx) => {
    await tx.trade.update({
      where: { id: trade.id },
      data: {
        status: 'closed',
        closePrice: exit,
        currentPrice: exit,
        realizedPnl: netPnl,
        commission,
        closeTime: new Date(),
      },
    })
    await tx.account.update({
      where: { id: trade.accountId },
      data: {
        balance: { increment: netPnl },
        equity: { increment: netPnl },
      },
    })
    await tx.transaction.create({
      data: {
        userId: trade.userId,
        accountId: trade.accountId,
        type: 'trade_pnl',
        status: 'completed',
        amount: netPnl,
        fee: commission,
        payment: 'Trading',
        note,
      },
    })
    if (commission > 0) {
      await recordEarning(tx, {
        type: 'trading_fee',
        amount: commission,
        description: `Trading fee on #${trade.id.slice(-8)} (${trade.volume} lot)`,
        userId: trade.userId,
        meta: trade.symbol,
      })
    }
    await tx.notification.create({
      data: {
        userId: trade.userId,
        title: 'Trade closed',
        body: `${note} · Net PnL ${netPnl.toFixed(2)} (fee ${commission.toFixed(2)})`,
      },
    })
  })

  return { netPnl, commission, grossPnl }
}
