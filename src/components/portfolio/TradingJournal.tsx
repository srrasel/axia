import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { formatMoney, formatPrice } from '../../data/mock'
import { parseTradeDate } from './tradeDates'

const NOTES_KEY = 'seekapa_journal_notes'

function loadNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveNotes(notes: Record<string, string>) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

export function TradingJournal() {
  const { trades, activeAccountId } = useApp()
  const [q, setQ] = useState('')
  const [side, setSide] = useState<'all' | 'buy' | 'sell'>('all')
  const [result, setResult] = useState<'all' | 'win' | 'loss'>('all')
  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState<Record<string, string>>(() => loadNotes())
  const [editing, setEditing] = useState<string | null>(null)
  const PAGE_SIZE = 10

  const closed = useMemo(
    () =>
      trades
        .filter((t) => t.accountId === activeAccountId && t.status === 'closed')
        .sort((a, b) => {
          const da = parseTradeDate(a.closeTime ?? a.openTime)?.getTime() ?? 0
          const db = parseTradeDate(b.closeTime ?? b.openTime)?.getTime() ?? 0
          return db - da
        }),
    [trades, activeAccountId],
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return closed.filter((t) => {
      const pnl = t.realizedPnl ?? 0
      if (side !== 'all' && t.side !== side) return false
      if (result === 'win' && pnl <= 0) return false
      if (result === 'loss' && pnl >= 0) return false
      if (!term) return true
      const note = (notes[t.id] ?? '').toLowerCase()
      return (
        t.symbol.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        note.includes(term)
      )
    })
  }, [closed, q, side, result, notes])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, filtered.length)
  const pages = pageWindow(page, totalPages)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [q, side, result])

  const stats = useMemo(() => {
    const wins = closed.filter((t) => (t.realizedPnl ?? 0) > 0)
    const losses = closed.filter((t) => (t.realizedPnl ?? 0) < 0)
    const totalPnl = closed.reduce((s, t) => s + (t.realizedPnl ?? 0), 0)
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / wins.length : 0
    const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / losses.length : 0
    return { totalPnl, winRate, wins: wins.length, losses: losses.length, avgWin, avgLoss, count: closed.length }
  }, [closed])

  const setNote = (id: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [id]: value }
      if (!value.trim()) delete next[id]
      saveNotes(next)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Trading Journal</h1>
        <p className="text-sm text-text-secondary">Review closed trades, filter results, and add notes.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Closed trades" value={String(stats.count)} />
        <Stat label="Realized PnL" value={formatMoney(stats.totalPnl)} tone={stats.totalPnl >= 0 ? 'pos' : 'neg'} />
        <Stat label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
        <Stat
          label="Avg win / loss"
          value={`${formatMoney(stats.avgWin)} / ${formatMoney(stats.avgLoss)}`}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol, order ID, or note…"
            className="h-10 w-full rounded-lg border border-border bg-panel pl-9 pr-3 text-sm outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
          />
        </div>
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as typeof side)}
          className="h-10 rounded-lg border border-border bg-panel px-3 text-sm outline-none"
        >
          <option value="all">All sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as typeof result)}
          className="h-10 rounded-lg border border-border bg-panel px-3 text-sm outline-none"
        >
          <option value="all">All results</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-transparent text-[14px] text-text-secondary">
              <tr>
                <th className="border-0 px-3 py-2.5 font-medium">Closed</th>
                <th className="border-0 px-3 py-2.5 font-medium">Symbol</th>
                <th className="border-0 px-3 py-2.5 font-medium">Side</th>
                <th className="border-0 px-3 py-2.5 font-medium">Volume</th>
                <th className="border-0 px-3 py-2.5 font-medium">Open</th>
                <th className="border-0 px-3 py-2.5 font-medium">Close</th>
                <th className="border-0 px-3 py-2.5 font-medium">PnL</th>
                <th className="border-0 px-3 py-2.5 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-text-secondary">
                    {closed.length === 0
                      ? 'No closed trades yet. Close a position to start your journal.'
                      : 'No trades match your filters.'}
                  </td>
                </tr>
              ) : (
                pageItems.map((t) => {
                  const pnl = t.realizedPnl ?? 0
                  return (
                    <tr key={t.id} className="border-t border-border/70 align-top">
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-text-secondary">{t.closeTime ?? t.openTime}</div>
                        <div className="text-[11px] text-text-secondary">#{t.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">{t.symbol}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            'rounded px-2 py-0.5 text-xs font-semibold capitalize',
                            t.side === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell',
                          )}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{t.volume}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatPrice(t.openPrice, t.symbol)}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {t.closePrice != null ? formatPrice(t.closePrice, t.symbol) : '—'}
                      </td>
                      <td
                        className={clsx(
                          'px-3 py-2.5 font-semibold tabular-nums',
                          pnl >= 0 ? 'positive' : 'negative',
                        )}
                      >
                        {formatMoney(pnl)}
                      </td>
                      <td className="px-3 py-2.5">
                        {editing === t.id ? (
                          <textarea
                            autoFocus
                            rows={2}
                            defaultValue={notes[t.id] ?? ''}
                            className="w-full min-w-[160px] rounded border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-brand"
                            onBlur={(e) => {
                              setNote(t.id, e.target.value)
                              setEditing(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditing(null)
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(t.id)}
                            className="max-w-[220px] text-left text-xs text-text-secondary hover:text-brand-ink"
                          >
                            {notes[t.id] ? (
                              <span className="line-clamp-2 text-text">{notes[t.id]}</span>
                            ) : (
                              'Add note…'
                            )}
                          </button>
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
      {filtered.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            Showing <span className="font-medium text-text">{from}</span>–
            <span className="font-medium text-text">{to}</span> of{' '}
            <span className="font-medium text-text">{filtered.length}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-40"
            >
              Prev
            </button>
            {pages.map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-1 text-xs text-text-secondary">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={clsx(
                    'min-w-7 rounded border px-2 py-1 text-xs',
                    p === page
                      ? 'border-[#F0B90B]/60 bg-[#F0B90B]/15 text-[#F0B90B]'
                      : 'border-border text-text-secondary hover:bg-muted',
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <div className="text-xs text-text-secondary">{label}</div>
      <div
        className={clsx(
          'mt-1 text-base font-semibold tabular-nums',
          tone === 'pos' && 'positive',
          tone === 'neg' && 'negative',
        )}
      >
        {value}
      </div>
    </div>
  )
}
