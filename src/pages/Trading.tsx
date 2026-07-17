import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Watchlist } from '../components/trading/Watchlist'
import { TradingChart } from '../components/trading/TradingChart'
import { OrderPanel } from '../components/trading/OrderPanel'
import { TradesTable } from '../components/trading/TradesTable'
import { useApp } from '../context/AppContext'
import { formatMoney, formatPrice } from '../data/mock'
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export function TradingPage() {
  const [tab, setTab] = useState<'chart' | 'info' | 'signals'>('chart')
  const [sheet, setSheet] = useState(false)
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy')
  const { selectedSymbol, quotes, isPremium, trades, activeAccountId } = useApp()
  const quote = quotes.find((q) => q.symbol === selectedSymbol)
  const openCount = trades.filter(
    (t) => t.status === 'open' && t.accountId === activeAccountId && t.symbol === selectedSymbol,
  ).length

  const openTrade = (side: 'buy' | 'sell') => {
    setTradeSide(side)
    setSheet(true)
  }

  return (
    <div className="relative flex h-full flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-[5.25rem] lg:pb-0">
      <div className="panel hidden items-center gap-1 overflow-x-auto border-b px-2 sm:gap-4 sm:px-4 md:flex">
        {(
          [
            ['chart', 'Trading Chart'],
            ['info', 'Information'],
            ['signals', 'Signals'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'shrink-0 border-b-2 px-2 py-2.5 text-sm font-medium sm:px-0',
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

      {tab === 'chart' ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 min-w-0 flex-1">
              <div className="hidden h-full min-h-0 md:block">
                <Watchlist className="h-full w-56 border-r lg:w-64" />
              </div>
              <TradingChart />
              <div className="hidden h-full min-h-0 lg:flex">
                <OrderPanel />
              </div>
            </div>
          </div>
          <TradesTable />

          {/* Mobile / tablet trade action bar */}
          <div className="panel fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-stretch gap-2 border-t px-3 pt-3 pb-[18px] md:bottom-0 lg:hidden">
            <button
              type="button"
              onClick={() => openTrade('sell')}
              className="flex h-[58px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-sell px-3 text-white"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide leading-none opacity-95">
                Sell
              </span>
              <span className="truncate text-base font-bold tabular-nums leading-none">
                {quote ? formatPrice(quote.bid, selectedSymbol) : '—'}
              </span>
            </button>
            {openCount > 0 ? (
              <Link
                to="/portfolio"
                className="flex h-[58px] w-9 shrink-0 items-center justify-center self-center rounded-lg bg-muted text-sm font-bold tabular-nums text-text"
                aria-label={`${openCount} open positions`}
              >
                {openCount}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => openTrade('buy')}
              className="flex h-[58px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-buy px-3 text-white"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide leading-none opacity-95">
                Buy
              </span>
              <span className="truncate text-base font-bold tabular-nums leading-none">
                {quote ? formatPrice(quote.ask, selectedSymbol) : '—'}
              </span>
            </button>
          </div>

          {sheet ? (
            <MobileSheet title={`Trade · ${selectedSymbol}`} onClose={() => setSheet(false)}>
              <OrderPanel
                key={tradeSide}
                className="h-full min-h-0 w-full border-0"
                initialSide={tradeSide}
                onPlaced={() => setSheet(false)}
              />
            </MobileSheet>
          ) : null}
        </>
      ) : tab === 'info' ? (
        <div className="flex flex-1 overflow-auto bg-panel p-4 sm:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <h2 className="text-xl font-semibold">{selectedSymbol}</h2>
            <p className="text-sm text-text-secondary">{quote?.name}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Info label="Price" value={formatPrice(quote?.price ?? 0, selectedSymbol)} />
              <Info
                label="Change"
                value={`${(quote?.percentChange ?? 0).toFixed(2)}%`}
                className={(quote?.percentChange ?? 0) >= 0 ? 'positive' : 'negative'}
              />
              <Info label="Bid" value={formatPrice(quote?.bid ?? 0, selectedSymbol)} />
              <Info label="Ask" value={formatPrice(quote?.ask ?? 0, selectedSymbol)} />
            </div>
            <div className="rounded-lg border border-border p-4 text-sm text-text-secondary">
              Category: <span className="font-medium capitalize text-text">{quote?.category}</span>
              <br />
              Market status: {quote?.closed ? 'Closed' : 'Open'}
              <br />
              Data source: Twelve Data (live) or simulated quotes when no API key is set.
            </div>
          </div>
        </div>
      ) : isPremium ? (
        <SignalsPanel />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-panel px-4 text-center">
          <div>
            <h2 className="text-lg font-semibold">Signals locked</h2>
            <p className="mt-2 text-sm text-text-secondary">Deposit $5000+ to unlock trading signals.</p>
            <Link
              to="/account/deposit"
              className="mt-4 inline-flex h-10 items-center rounded-md btn-brand px-5 text-sm font-semibold"
            >
              Deposit
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,100%)] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-panel shadow-2xl pb-[max(5px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[20px] font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Close sheet"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

function Info({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${className}`}>{value}</div>
    </div>
  )
}

function SignalsPanel() {
  const signals = useMemo(
    () => [
      { symbol: 'EURUSD', side: 'Buy', entry: '1.1410', tp: '1.1480', sl: '1.1370', conf: 78 },
      { symbol: 'GOLD', side: 'Sell', entry: '2345', tp: '2320', sl: '2360', conf: 71 },
      { symbol: 'BTCUSD', side: 'Buy', entry: '64000', tp: '66500', sl: '62800', conf: 64 },
    ],
    [],
  )
  return (
    <div className="flex-1 overflow-auto bg-panel p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">Premium Signals</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {signals.map((s) => (
          <div key={s.symbol} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.symbol}</span>
              <span className={s.side === 'Buy' ? 'positive' : 'negative'}>{s.side}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-text-secondary">
              <div>Entry: {s.entry}</div>
              <div>TP: {s.tp}</div>
              <div>SL: {s.sl}</div>
              <div>Confidence: {s.conf}%</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-secondary">
        Educational signals only — not financial advice. PnL context {formatMoney(0)}.
      </p>
    </div>
  )
}
