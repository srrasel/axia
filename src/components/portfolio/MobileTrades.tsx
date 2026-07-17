import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  ChevronDown,
  MoveDownRight,
  MoveUpRight,
  MoreVertical,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { calcPnl, contractSize, formatMoney } from '../../data/mock'
import type { Trade } from '../../types'

type Tab = 'open' | 'pending' | 'closed'

const AVATAR_TONES = [
  'bg-[#fcd535]/20 text-[#fcd535]',
  'bg-buy/15 text-buy',
  'bg-sell/15 text-sell',
  'bg-link/15 text-link',
  'bg-muted text-text-secondary',
]

function avatarTone(symbol: string) {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) hash = (hash + symbol.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

function symbolInitials(symbol: string) {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '')
  if (clean.length <= 2) return clean.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

function tradePnl(t: Trade) {
  return t.status === 'closed' ? (t.realizedPnl ?? 0) : calcPnl(t)
}

function volumeLabel(t: Trade) {
  if (t.category === 'forex') {
    const base = t.symbol.slice(0, 3)
    const units = t.volume * contractSize(t.category, t.symbol)
    return `${units.toLocaleString('en-US')} ${base}`
  }
  return `${t.volume} Lot`
}

type SymbolGroup = {
  symbol: string
  category: Trade['category']
  trades: Trade[]
  pnl: number
}

function groupBySymbol(list: Trade[]): SymbolGroup[] {
  const map = new Map<string, SymbolGroup>()
  for (const t of list) {
    const existing = map.get(t.symbol)
    if (existing) {
      existing.trades.push(t)
      existing.pnl += tradePnl(t)
    } else {
      map.set(t.symbol, {
        symbol: t.symbol,
        category: t.category,
        trades: [t],
        pnl: tradePnl(t),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export function MobileTrades({
  onOpenJournal,
  onOpenCalendar,
}: {
  onOpenJournal: () => void
  onOpenCalendar: () => void
}) {
  const { trades, activeAccountId, closeTrade, cancelPending, setSelectedSymbol } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const showChart = (symbol: string) => {
    setSelectedSymbol(symbol)
    navigate('/member')
  }

  const closeGroup = async (group: SymbolGroup) => {
    for (const t of group.trades) {
      if (t.status === 'open') await closeTrade(t.id)
      else if (t.status === 'pending') await cancelPending(t.id)
    }
  }

  const accountTrades = useMemo(
    () => trades.filter((t) => t.accountId === activeAccountId),
    [trades, activeAccountId],
  )

  const openCount = accountTrades.filter((t) => t.status === 'open').length
  const pendingCount = accountTrades.filter((t) => t.status === 'pending').length

  const filtered = useMemo(
    () => accountTrades.filter((t) => t.status === tab),
    [accountTrades, tab],
  )

  const groups = useMemo(() => groupBySymbol(filtered), [filtered])

  const totalPnl = useMemo(() => {
    if (tab === 'closed') {
      return filtered.reduce((s, t) => s + (t.realizedPnl ?? 0), 0)
    }
    return filtered.reduce((s, t) => s + calcPnl(t), 0)
  }, [filtered, tab])

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'open', label: 'Open Positions', count: openCount },
    { key: 'pending', label: 'Pending Orders', count: pendingCount },
    { key: 'closed', label: 'History' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel md:hidden">
      <div className="shrink-0 px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">Trades</h1>
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-muted hover:text-text"
            >
              <SlidersHorizontal size={20} strokeWidth={1.75} />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-panel shadow-lg">
                  <button
                    type="button"
                    className="flex w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenJournal()
                    }}
                  >
                    Trading Journal
                  </button>
                  <button
                    type="button"
                    className="flex w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenCalendar()
                    }}
                  >
                    Calendar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-[10px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key)
                  setExpanded(null)
                }}
                className={clsx(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-white text-[#202630]'
                    : 'bg-muted text-text-secondary hover:bg-sidebar-active hover:text-text',
                )}
              >
                {t.label}
                {t.count != null && t.count > 0 ? (
                  <span
                    className={clsx(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums',
                      active ? 'bg-[#fcd535] text-[#202630]' : 'bg-[#fcd535] text-[#202630]',
                    )}
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-text-secondary">
              <ArrowLeftRight size={18} strokeWidth={1.75} />
            </span>
            <div>
              <div className="text-[12px] font-medium text-text-secondary">PnL</div>
              <div
                className={clsx(
                  'text-[15px] font-semibold tabular-nums',
                  totalPnl >= 0 ? 'positive' : 'negative',
                )}
              >
                {formatMoney(totalPnl)}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Trade actions"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-muted hover:text-text"
          >
            <MoreVertical size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 [-webkit-overflow-scrolling:touch]">
        {groups.length === 0 ? (
          <div className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-text-secondary">
            No {tab === 'open' ? 'open positions' : tab === 'pending' ? 'pending orders' : 'history'} yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {groups.map((g) => {
              const isOpen = expanded === g.symbol
              return (
                <div key={g.symbol} className="overflow-hidden rounded-2xl bg-muted">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : g.symbol)}
                    className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
                  >
                    <span
                      className={clsx(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        avatarTone(g.symbol),
                      )}
                    >
                      {symbolInitials(g.symbol)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-text">{g.symbol}</span>
                        {g.trades.length > 1 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-link/20 px-1 text-[11px] font-bold tabular-nums text-link">
                            {g.trades.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[11px] capitalize text-text-secondary">{g.category}</div>
                    </div>
                    <div
                      className={clsx(
                        'shrink-0 text-[15px] font-semibold tabular-nums',
                        g.pnl >= 0 ? 'positive' : 'negative',
                      )}
                    >
                      {formatMoney(g.pnl)}
                    </div>
                    <ChevronDown
                      size={18}
                      className={clsx(
                        'shrink-0 text-text-secondary transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-border/50 px-3 pb-3 pt-1">
                      <div>
                        {g.trades.map((t) => {
                          const pnl = tradePnl(t)
                          const isBuy = t.side === 'buy'
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0"
                            >
                              <span
                                className={clsx(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                  avatarTone(t.symbol),
                                )}
                              >
                                {symbolInitials(t.symbol)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-text">{t.symbol}</div>
                                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-text-secondary">
                                  {isBuy ? (
                                    <MoveUpRight size={13} className="shrink-0 text-buy" />
                                  ) : (
                                    <MoveDownRight size={13} className="shrink-0 text-sell" />
                                  )}
                                  <span className="truncate tabular-nums">{volumeLabel(t)}</span>
                                </div>
                              </div>
                              <div
                                className={clsx(
                                  'shrink-0 text-sm font-semibold tabular-nums',
                                  pnl >= 0 ? 'positive' : 'negative',
                                )}
                              >
                                {formatMoney(pnl)}
                              </div>
                              {t.status === 'open' || t.status === 'pending' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    t.status === 'open'
                                      ? void closeTrade(t.id)
                                      : void cancelPending(t.id)
                                  }
                                  aria-label={t.status === 'open' ? 'Close trade' : 'Cancel order'}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#29313d] text-text-secondary transition-colors hover:text-sell"
                                >
                                  <X size={16} />
                                </button>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>

                      {tab === 'closed' ? null : (
                        <div className="mt-3 space-y-2">
                          <button
                            type="button"
                            onClick={() => showChart(g.symbol)}
                            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-panel text-sm font-semibold text-text transition-colors hover:bg-muted"
                          >
                            Show Chart
                          </button>
                          <button
                            type="button"
                            onClick={() => void closeGroup(g)}
                            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#29313d] text-sm font-semibold text-text transition-colors hover:bg-[#323b4a]"
                          >
                            {tab === 'pending' ? 'Cancel All Orders' : 'Close All Trades'}:{' '}
                            <span className={clsx('ml-1', g.pnl >= 0 ? 'positive' : 'negative')}>
                              {formatMoney(g.pnl)}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
