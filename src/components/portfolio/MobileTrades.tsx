import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  ChevronDown,
  MoveDownRight,
  MoveUpRight,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { calcPnl, contractSize, formatMoney } from '../../data/mock'
import { parseTradeDate } from './tradeDates'
import type { Trade } from '../../types'

type Tab = 'open' | 'pending' | 'closed'
type HistoryPeriod = 'today' | '7d' | '1m' | 'all'
type MarketFilter = 'gold' | 'euro' | 'forex' | 'commodity' | 'crypto' | 'stock' | 'index'

const HISTORY_PERIODS: Array<{ value: HistoryPeriod; label: string }> = [
  { value: 'all', label: 'All History' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '1m', label: 'Last 1 Month' },
]

const MARKET_OPTIONS: Array<{ value: MarketFilter; label: string }> = [
  { value: 'gold', label: 'Gold' },
  { value: 'euro', label: 'Euro' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodity', label: 'Commodities' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'stock', label: 'Stocks' },
  { value: 'index', label: 'Indices' },
]

function inHistoryPeriod(t: Trade, period: HistoryPeriod) {
  if (period === 'all') return true
  const d = parseTradeDate(t.closeTime ?? t.openTime)
  if (!d) return false
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'today') return d >= start
  if (period === '7d') {
    const from = new Date(start)
    from.setDate(from.getDate() - 6)
    return d >= from
  }
  const from = new Date(start)
  from.setMonth(from.getMonth() - 1)
  return d >= from
}

function matchesOneMarket(t: Trade, market: MarketFilter) {
  const sym = t.symbol.toUpperCase()
  if (market === 'gold') return sym.includes('XAU') || sym.includes('GOLD')
  if (market === 'euro') return sym.includes('EUR')
  return t.category === market
}

function matchesMarkets(t: Trade, markets: MarketFilter[]) {
  if (markets.length === 0) return true
  return markets.some((m) => matchesOneMarket(t, m))
}

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
  const { trades, activeAccountId, closeTrade, closeTrades, cancelPending, cancelPendings, setSelectedSymbol } =
    useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('open')
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('all')
  const [marketFilters, setMarketFilters] = useState<MarketFilter[]>([])
  const [marketOpen, setMarketOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const showChart = (symbol: string) => {
    setSelectedSymbol(symbol)
    navigate('/member')
  }

  const closeGroup = async (group: SymbolGroup) => {
    const openIds = group.trades.filter((t) => t.status === 'open').map((t) => t.id)
    const pendingIds = group.trades.filter((t) => t.status === 'pending').map((t) => t.id)
    if (openIds.length) await closeTrades(openIds)
    else if (pendingIds.length) await cancelPendings(pendingIds)
  }

  const accountTrades = useMemo(
    () => trades.filter((t) => t.accountId === activeAccountId),
    [trades, activeAccountId],
  )

  const openCount = accountTrades.filter((t) => t.status === 'open').length
  const pendingCount = accountTrades.filter((t) => t.status === 'pending').length

  const filtered = useMemo(() => {
    const byStatus = accountTrades.filter((t) => t.status === tab)
    if (tab !== 'closed') return byStatus
    return byStatus.filter((t) => inHistoryPeriod(t, historyPeriod) && matchesMarkets(t, marketFilters))
  }, [accountTrades, tab, historyPeriod, marketFilters])

  const marketLabel =
    marketFilters.length === 0
      ? 'All Markets'
      : marketFilters.length === 1
        ? (MARKET_OPTIONS.find((m) => m.value === marketFilters[0])?.label ?? '1 Market')
        : `${marketFilters.length} Markets`

  const toggleMarket = (value: MarketFilter) => {
    setMarketFilters((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    )
    setExpanded(null)
  }

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
                  setMarketOpen(false)
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
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-text-secondary">
              <ArrowLeftRight size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
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
          {tab === 'closed' ? (
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <select
                  className="h-10 max-w-[8.5rem] appearance-none rounded-md border border-border bg-panel py-2 pl-3 pr-7 text-sm outline-none"
                  value={historyPeriod}
                  onChange={(e) => {
                    setHistoryPeriod(e.target.value as HistoryPeriod)
                    setExpanded(null)
                  }}
                  aria-label="History period"
                >
                  {HISTORY_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
                  aria-hidden
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Market filter"
                  aria-expanded={marketOpen}
                  onClick={() => setMarketOpen((v) => !v)}
                  className="flex h-10 max-w-[9.5rem] items-center gap-1 rounded-md border border-border bg-panel py-2 pl-3 pr-2 text-left text-sm text-text"
                >
                  <span className="min-w-0 flex-1 truncate">{marketLabel}</span>
                  <ChevronDown
                    size={14}
                    className={clsx(
                      'shrink-0 text-text-secondary transition-transform',
                      marketOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
                {marketOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-20 cursor-default"
                      aria-label="Close market filter"
                      onClick={() => setMarketOpen(false)}
                    />
                    <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-border bg-panel py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setMarketFilters([])
                          setExpanded(null)
                        }}
                        className={clsx(
                          'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                          marketFilters.length === 0 ? 'text-[#fcd535]' : 'text-text',
                        )}
                      >
                        <span
                          className={clsx(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
                            marketFilters.length === 0
                              ? 'border-[#fcd535] bg-[#fcd535] text-[#202630]'
                              : 'border-border',
                          )}
                        >
                          {marketFilters.length === 0 ? '✓' : ''}
                        </span>
                        All Markets
                      </button>
                      {MARKET_OPTIONS.map((m) => {
                        const checked = marketFilters.includes(m.value)
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => toggleMarket(m.value)}
                            className={clsx(
                              'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                              checked ? 'text-[#fcd535]' : 'text-text',
                            )}
                          >
                            <span
                              className={clsx(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
                                checked
                                  ? 'border-[#fcd535] bg-[#fcd535] text-[#202630]'
                                  : 'border-border',
                              )}
                            >
                              {checked ? '✓' : ''}
                            </span>
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 [-webkit-overflow-scrolling:touch]">
        {groups.length === 0 ? (
          <div className="flex min-h-[min(52vh,28rem)] flex-col items-center justify-center px-4 text-center">
            <p className="text-[14px] text-text-secondary">Nothing here yet!</p>
            <button
              type="button"
              onClick={() => navigate('/markets')}
              className="mt-5 h-12 rounded-xl border border-[#2a303a] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/5"
            >
              Open a position
            </button>
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
                    <div className="border-t border-border/50 px-3 pb-3 pt-3">
                      {tab === 'closed' ? null : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => void closeGroup(g)}
                            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#e5484d] text-sm font-semibold text-white transition-colors hover:bg-[#c93d42]"
                          >
                            {tab === 'pending' ? 'Cancel All Orders' : 'Close All Trades'}:{' '}
                            <span className="ml-1 text-white">
                              {formatMoney(g.pnl)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => showChart(g.symbol)}
                            className="flex h-12 w-full items-center justify-center rounded-xl border border-[#404752] bg-transparent text-sm font-semibold text-text transition-colors hover:bg-muted/40"
                          >
                            Show Chart
                          </button>
                        </div>
                      )}

                      <div className="mt-1">
                        {g.trades.map((t) => {
                          const pnl = tradePnl(t)
                          const isBuy = t.side === 'buy'
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 border-b border-[#404752] py-3 last:border-b-0"
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
