import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calcPnl, formatMoney, formatPrice } from '../data/mock'
import { TradingJournal } from '../components/portfolio/TradingJournal'
import { TradingCalendar } from '../components/portfolio/TradingCalendar'
import clsx from 'clsx'
import type { Quote, Trade } from '../types'

type Section = 'portfolio' | 'journal' | 'calendar'

const PAGE_SIZE = 10

function CategoryTradesTable({ list, quotes }: { list: Trade[]; quotes: Quote[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const listKey = useMemo(() => list.map((t) => t.id).join(','), [list])

  useEffect(() => {
    setPage(1)
  }, [listKey])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, page])

  const from = list.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, list.length)

  const pageButtons = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = new Set(
      [1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages),
    )
    return Array.from(pages).sort((a, b) => a - b)
  }, [page, totalPages])

  return (
    <>
      <div className="overflow-x-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-transparent text-[14px] text-text-secondary">
            <tr>
              <th className="border-0 px-4 py-2 text-left font-medium">Symbol</th>
              <th className="border-0 px-4 py-2 text-left font-medium">Order ID</th>
              <th className="border-0 px-4 py-2 text-left font-medium">Open Time</th>
              <th className="border-0 px-4 py-2 text-left font-medium">Type</th>
              <th className="border-0 px-4 py-2 text-left font-medium">Volume</th>
              <th className="border-0 px-4 py-2 text-right font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => {
              const q = quotes.find((x) => x.symbol === t.symbol)
              const pnl = calcPnl(t)
              const pct = q?.percentChange ?? 0
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="overflow-hidden px-4 py-2">
                    <div className="truncate font-semibold">{t.symbol}</div>
                    <div
                      className={clsx(
                        'truncate text-[11px] tabular-nums',
                        pct >= 0 ? 'positive' : 'negative',
                      )}
                    >
                      {formatPrice(t.currentPrice, t.symbol)} ({pct >= 0 ? '+' : ''}
                      {pct.toFixed(2)}%)
                    </div>
                  </td>
                  <td className="truncate px-4 py-2 tabular-nums">#{t.id}</td>
                  <td className="truncate px-4 py-2 tabular-nums">{t.openTime}</td>
                  <td className="px-4 py-2">
                    <span
                      className={clsx(
                        'rounded px-2 py-0.5 text-xs font-semibold capitalize',
                        t.side === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell',
                      )}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{t.volume} Lot</td>
                  <td
                    className={clsx(
                      'px-4 py-2 text-right font-semibold tabular-nums',
                      pnl >= 0 ? 'positive' : 'negative',
                    )}
                  >
                    {formatMoney(pnl)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {list.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs tabular-nums text-text-secondary">
            Showing <span className="font-medium text-text">{from}</span>–
            <span className="font-medium text-text">{to}</span> of{' '}
            <span className="font-medium text-text">{list.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[#29313d] hover:text-text disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {pageButtons.map((p, i) => {
              const prev = pageButtons[i - 1]
              const showEllipsis = prev != null && p - prev > 1
              return (
                <span key={p} className="contents">
                  {showEllipsis ? <span className="px-1 text-xs text-text-secondary">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    className={clsx(
                      'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition-colors',
                      p === page
                        ? 'bg-[#29313d] text-text'
                        : 'text-text-secondary hover:bg-[#29313d] hover:text-text',
                    )}
                  >
                    {p}
                  </button>
                </span>
              )
            })}
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[#29313d] hover:text-text disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function PortfolioPage() {
  const [section, setSection] = useState<Section>('portfolio')
  const { trades, quotes, activeAccountId } = useApp()
  const open = trades.filter((t) => t.status === 'open' && t.accountId === activeAccountId)
  const [source, setSource] = useState<'all' | 'self' | 'social'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ forex: true, stock: true })

  const filteredOpen = useMemo(() => {
    if (source === 'all') return open
    return open.filter((t) => t.source === source)
  }, [open, source])

  const byCategory = useMemo(() => {
    const map: Record<string, typeof filteredOpen> = {}
    filteredOpen.forEach((t) => {
      map[t.category] = map[t.category] ?? []
      map[t.category].push(t)
    })
    return map
  }, [filteredOpen])

  const allocation = useMemo(() => {
    const total = filteredOpen.length || 1
    const cats = ['forex', 'stock', 'commodity', 'crypto', 'index'] as const
    const colors = ['#f5c518', '#2563eb', '#22a06b', '#a855f7', '#64748b']
    const labels = ['Forex', 'Stocks', 'Commodities', 'Crypto', 'Indices']
    return cats.map((c, i) => ({
      name: labels[i],
      value: ((byCategory[c]?.length ?? 0) / total) * 100,
      color: colors[i],
    }))
  }, [byCategory, filteredOpen.length])

  const performance = useMemo(() => {
    return Object.entries(byCategory).map(([cat, list]) => ({
      name: cat,
      pnl: list.reduce((s, t) => s + calcPnl(t), 0),
      fill:
        cat === 'forex'
          ? '#f5c518'
          : cat === 'stock'
            ? '#2563eb'
            : cat === 'crypto'
              ? '#a855f7'
              : cat === 'commodity'
                ? '#22a06b'
                : '#64748b',
    }))
  }, [byCategory])

  const selfPct = open.length ? (open.filter((t) => t.source === 'self').length / open.length) * 100 : 100

  const nav = [
    { id: 'portfolio' as const, label: 'Portfolio' },
    { id: 'journal' as const, label: 'Trading Journal' },
    { id: 'calendar' as const, label: 'Calendar' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="panel flex shrink-0 flex-row overflow-x-auto border-b md:w-52 md:flex-col md:border-b-0 md:border-r">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={clsx(
              'mx-1 my-2 shrink-0 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors md:mx-2 md:my-0 md:mt-1 first:md:mt-3',
              section === item.id
                ? 'bg-sidebar-active text-brand-ink'
                : 'text-text-secondary hover:bg-muted hover:text-brand-ink',
            )}
          >
            {item.label}
          </button>
        ))}
        <div className="mt-auto hidden border-t border-border p-3 text-[11px] text-text-secondary md:block">
          Data reflects GMT + 3 time zone (Server time).
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-clip overflow-y-auto p-4 sm:p-5 [scrollbar-gutter:stable]">
        {section === 'journal' ? (
          <TradingJournal />
        ) : section === 'calendar' ? (
          <TradingCalendar />
        ) : (
          <>
            <h1 className="text-xl font-semibold">Portfolio</h1>
            <p className="text-sm text-text-secondary">Explore your open orders by market.</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_180px]">
              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border border-border bg-panel p-4">
                  <div className="mb-2 text-sm font-semibold">Trades source ratio</div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    <div className="bg-link" style={{ width: `${100 - selfPct}%` }} />
                    <div className="bg-brand" style={{ width: `${selfPct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] tabular-nums text-text-secondary">
                    <span>Discover Social {(100 - selfPct).toFixed(0)}%</span>
                    <span>Self {selfPct.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-panel p-4">
                  <div className="mb-2 text-sm font-semibold">Trades Allocation</div>
                  <div className="relative mx-auto h-40 w-40 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" debounce={80}>
                      <PieChart>
                        <Pie
                          data={allocation}
                          dataKey="value"
                          innerRadius={48}
                          outerRadius={70}
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {allocation.map((a) => (
                            <Cell key={a.name} fill={a.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-xs font-semibold">
                      {filteredOpen.length} Open
                      <br />
                      Trades
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {allocation.map((a) => (
                      <div key={a.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                          {a.name}
                        </span>
                        <span className="tabular-nums">{a.value.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-panel p-4">
                <div className="mb-3 text-sm font-semibold">Performance by category</div>
                <div className="h-64 w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" debounce={80}>
                    <BarChart data={performance}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis width={48} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {performance.map((p) => (
                          <Cell key={p.name} fill={p.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-panel p-4">
                <div className="mb-3 text-sm font-semibold">Trade source</div>
                {(['all', 'self', 'social'] as const).map((s) => (
                  <label key={s} className="mb-2 flex items-center gap-2 text-sm capitalize">
                    <input type="radio" name="source" checked={source === s} onChange={() => setSource(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {Object.entries(byCategory).map(([cat, list]) => (
                <div key={cat} className="overflow-hidden rounded-lg border border-border bg-panel">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[16px] font-semibold capitalize"
                    onClick={() => setExpanded((e) => ({ ...e, [cat]: !e[cat] }))}
                  >
                    {expanded[cat] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {cat} ({list.length} Trades)
                  </button>
                  {expanded[cat] ? <CategoryTradesTable list={list} quotes={quotes} /> : null}
                </div>
              ))}
              {filteredOpen.length === 0 ? (
                <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-text-secondary">
                  No open trades for this filter.
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
