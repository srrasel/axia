import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { calcPnl, formatMoney, formatPrice } from '../../data/mock'
import clsx from 'clsx'

export function TradesTable() {
  const { trades, closeTrade, cancelPending, updateTradeLevels, activeAccountId } = useApp()
  const [tab, setTab] = useState<'open' | 'pending' | 'closed'>('open')
  const [editing, setEditing] = useState<string | null>(null)
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')

  const accountTrades = trades.filter((t) => t.accountId === activeAccountId)
  const filtered = accountTrades.filter((t) => t.status === tab)
  const openCount = accountTrades.filter((t) => t.status === 'open').length
  const pendingCount = accountTrades.filter((t) => t.status === 'pending').length

  return (
    <div className="panel hidden h-32 shrink-0 flex-col border-t sm:h-36 md:flex md:h-40 lg:h-44">
      <div className="flex items-center gap-3 overflow-x-auto border-b border-border px-3 sm:gap-4 sm:px-4">
        {(
          [
            ['open', `Open (${openCount})`],
            ['pending', `Pending (${pendingCount})`],
            ['closed', 'History'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'shrink-0 border-b-2 py-2 text-sm font-medium sm:py-2.5',
              tab === key
                ? 'tab-label-active border-brand'
                : 'tab-label-inactive border-transparent',
            )}
            style={{ color: tab === key ? '#ffffff' : '#707A8A' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] text-left text-[12px] sm:text-sm">
          <thead className="sticky top-0 z-10 bg-[#29313d] text-[12px] text-text-secondary sm:text-[14px]">
            <tr>
              <th className="border-0 px-3 py-2 font-medium">Order</th>
              <th className="border-0 px-3 py-2 font-medium">Asset</th>
              <th className="border-0 px-3 py-2 font-medium">Type</th>
              <th className="border-0 px-3 py-2 font-medium">Volume</th>
              <th className="border-0 px-3 py-2 font-medium">Open</th>
              <th className="border-0 px-3 py-2 font-medium">Current</th>
              <th className="border-0 px-3 py-2 font-medium">SL / TP</th>
              <th className="border-0 px-3 py-2 font-medium">PnL</th>
              <th className="border-0 px-3 py-2 font-medium">Swap</th>
              <th className="border-0 px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-text-secondary">
                  No {tab} trades
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const pnl = t.status === 'closed' ? (t.realizedPnl ?? 0) : calcPnl(t)
                return (
                  <tr key={t.id} className="border-t border-border/70">
                    <td className="px-3 py-2">
                      <div className="font-medium">#{t.id}</div>
                      <div className="text-[12px] text-text-secondary sm:text-[11px]">{t.openTime}</div>
                      {t.triggerPrice != null && t.status === 'pending' ? (
                        <div className="text-[12px] text-link sm:text-[11px]">
                          Trigger {formatPrice(t.triggerPrice, t.symbol)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-semibold">{t.symbol}</td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          'rounded px-2 py-0.5 text-[12px] font-semibold capitalize sm:text-xs',
                          t.side === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell',
                        )}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.volume} Lot</td>
                    <td className="px-3 py-2 tabular-nums">{formatPrice(t.openPrice, t.symbol)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {t.status === 'closed'
                        ? formatPrice(t.closePrice ?? t.currentPrice, t.symbol)
                        : formatPrice(t.currentPrice, t.symbol)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-text-secondary sm:text-xs">
                      {editing === t.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={sl}
                            onChange={(e) => setSl(e.target.value)}
                            placeholder="SL"
                            className="w-16 rounded border border-border px-1 py-0.5 text-[12px]"
                          />
                          <input
                            value={tp}
                            onChange={(e) => setTp(e.target.value)}
                            placeholder="TP"
                            className="w-16 rounded border border-border px-1 py-0.5 text-[12px]"
                          />
                          <button
                            type="button"
                            className="text-link"
                            onClick={async () => {
                              await updateTradeLevels(
                                t.id,
                                sl ? Number(sl) : undefined,
                                tp ? Number(tp) : undefined,
                              )
                              setEditing(null)
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="hover:text-brand-ink"
                          onClick={() => {
                            setEditing(t.id)
                            setSl(t.stopLoss?.toString() ?? '')
                            setTp(t.takeProfit?.toString() ?? '')
                          }}
                          disabled={t.status === 'closed'}
                        >
                          {t.stopLoss ?? '—'} / {t.takeProfit ?? '—'}
                        </button>
                      )}
                    </td>
                    <td className={clsx('px-3 py-2 font-semibold tabular-nums', pnl >= 0 ? 'positive' : 'negative')}>
                      {formatMoney(pnl)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(t.swap)}</td>
                    <td className="px-3 py-2">
                      {t.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => void closeTrade(t.id)}
                          className="rounded border border-border px-2 py-1 text-[12px] font-medium hover:bg-muted sm:text-xs"
                        >
                          Close
                        </button>
                      ) : t.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void cancelPending(t.id)}
                          className="rounded border border-border px-2 py-1 text-[12px] font-medium hover:bg-muted sm:text-xs"
                        >
                          Cancel
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
