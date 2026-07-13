import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { formatMoney, formatPrice } from '../../data/mock'
import { dayKey, tradeDayKey } from './tradeDates'
import type { Trade } from '../../types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Monday-based weekday index 0–6 */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7
}

export function TradingCalendar({ title = 'Trading Calendar' }: { title?: string }) {
  const { trades, activeAccountId } = useApp()
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(() => dayKey(new Date()))

  const closed = useMemo(
    () => trades.filter((t) => t.accountId === activeAccountId && t.status === 'closed'),
    [trades, activeAccountId],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: Trade[] }>()
    closed.forEach((t) => {
      const key = tradeDayKey(t)
      if (!key) return
      const cur = map.get(key) ?? { pnl: 0, trades: [] }
      cur.pnl += t.realizedPnl ?? 0
      cur.trades.push(t)
      map.set(key, cur)
    })
    return map
  }, [closed])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = startOfMonth(cursor)
    const startPad = mondayIndex(first)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const total = Math.ceil((startPad + daysInMonth) / 7) * 7
    const list: Array<{ date: Date | null; key: string | null }> = []
    for (let i = 0; i < total; i++) {
      const dayNum = i - startPad + 1
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push({ date: null, key: null })
      } else {
        const date = new Date(year, month, dayNum)
        list.push({ date, key: dayKey(date) })
      }
    }
    return list
  }, [cursor])

  const monthLabel = cursor.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const monthPnl = useMemo(() => {
    let sum = 0
    let days = 0
    byDay.forEach((v, key) => {
      if (key.startsWith(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)) {
        sum += v.pnl
        days += 1
      }
    })
    return { sum, days }
  }, [byDay, cursor])

  const selected = selectedDay ? byDay.get(selectedDay) : undefined
  const todayKey = dayKey(new Date())

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-text-secondary">Daily realized PnL from closed trades.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[9.5rem] text-center text-sm font-semibold">{monthLabel}</div>
          <button
            type="button"
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="ml-1 h-9 rounded-lg border border-border px-3 text-sm hover:bg-muted"
            onClick={() => {
              const now = new Date()
              setCursor(startOfMonth(now))
              setSelectedDay(dayKey(now))
            }}
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Month PnL" value={formatMoney(monthPnl.sum)} tone={monthPnl.sum >= 0 ? 'pos' : 'neg'} />
        <Stat label="Trading days" value={String(monthPnl.days)} />
        <Stat label="Closed trades" value={String(closed.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-border bg-panel">
          <div className="grid grid-cols-7 border-b border-border bg-muted">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-1 py-2 text-center text-[11px] font-medium text-text-secondary">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell.date || !cell.key) {
                return <div key={`empty-${i}`} className="min-h-[4.5rem] border-b border-r border-border/50 bg-muted/30" />
              }
              const entry = byDay.get(cell.key)
              const pnl = entry?.pnl
              const isSelected = selectedDay === cell.key
              const isToday = cell.key === todayKey
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDay(cell.key)}
                  className={clsx(
                    'flex min-h-[4.5rem] flex-col items-stretch border-b border-r border-border/50 p-1.5 text-left transition-colors hover:bg-muted sm:min-h-[5.25rem]',
                    isSelected && 'bg-sidebar-active ring-1 ring-inset ring-border',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-brand text-on-brand',
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  {pnl != null ? (
                    <span
                      className={clsx(
                        'mt-auto truncate text-[10px] font-semibold tabular-nums sm:text-[11px]',
                        pnl >= 0 ? 'positive' : 'negative',
                      )}
                    >
                      {formatMoney(pnl)}
                    </span>
                  ) : (
                    <span className="mt-auto text-[10px] text-transparent">—</span>
                  )}
                  {entry && entry.trades.length > 1 ? (
                    <span className="text-[9px] text-text-secondary">{entry.trades.length} trades</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-4">
          <h2 className="text-sm font-semibold">
            {selectedDay
              ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Select a day'}
          </h2>
          <div className="mt-1 text-sm text-text-secondary">
            {selected ? (
              <>
                Day PnL:{' '}
                <span className={clsx('font-semibold', selected.pnl >= 0 ? 'positive' : 'negative')}>
                  {formatMoney(selected.pnl)}
                </span>
              </>
            ) : (
              'No closed trades on this day.'
            )}
          </div>
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
            {selected?.trades.map((t) => {
              const pnl = t.realizedPnl ?? 0
              return (
                <div key={t.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{t.symbol}</span>
                    <span className={clsx('text-sm font-semibold tabular-nums', pnl >= 0 ? 'positive' : 'negative')}>
                      {formatMoney(pnl)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
                    <span className="capitalize">{t.side}</span>
                    <span>{t.volume} lot</span>
                    <span>
                      {formatPrice(t.openPrice, t.symbol)} →{' '}
                      {t.closePrice != null ? formatPrice(t.closePrice, t.symbol) : '—'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-text-secondary">{t.closeTime ?? t.openTime}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
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
