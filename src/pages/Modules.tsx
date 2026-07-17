import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { calcPnl, formatMoney, formatPrice } from '../data/mock'
import { PremiumPage } from './Account'
import { TradingCalendar } from '../components/portfolio/TradingCalendar'
import { MobileMoreBackShell } from '../components/layout/MobileMoreBackShell'

export function SignalsPage() {
  const { isPremium } = useApp()
  if (!isPremium) return <PremiumPage />
  return (
    <MobileMoreBackShell title="Signals">
      <h1 className="hidden text-xl font-semibold md:block">Market Signals</h1>
      <p className="mt-0 text-sm text-text-secondary md:mt-1">AI-assisted setups refreshed with live quotes.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['EURUSD', 'Buy', 78],
          ['GBPUSD', 'Sell', 66],
          ['GOLD', 'Buy', 72],
          ['BTCUSD', 'Buy', 61],
          ['TESLA', 'Sell', 58],
          ['USDJPY', 'Buy', 69],
        ].map(([symbol, side, conf]) => (
          <div key={String(symbol)} className="rounded-lg border border-border p-4">
            <div className="flex justify-between">
              <span className="font-semibold">{symbol}</span>
              <span className={side === 'Buy' ? 'positive' : 'negative'}>{side}</span>
            </div>
            <div className="mt-2 text-sm text-text-secondary">Confidence {conf}%</div>
            <Link to="/member" className="mt-3 inline-block text-sm font-medium text-link">
              Open chart →
            </Link>
          </div>
        ))}
      </div>
    </MobileMoreBackShell>
  )
}

export function NotificationsPage() {
  const { notifications, markNotificationsRead } = useApp()
  return (
    <MobileMoreBackShell
      title="Notifications"
      right={
        <button type="button" onClick={markNotificationsRead} className="text-sm font-medium text-link">
          Mark read
        </button>
      }
    >
      <div className="mb-4 hidden items-center justify-between md:flex">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <button type="button" onClick={markNotificationsRead} className="text-sm text-link">
          Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg border border-border p-4 ${n.read ? 'opacity-60' : 'bg-sidebar-active'}`}
          >
            <div className="flex justify-between gap-3">
              <div className="font-semibold">{n.title}</div>
              <div className="text-xs text-text-secondary">{n.time}</div>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{n.body}</p>
          </div>
        ))}
      </div>
    </MobileMoreBackShell>
  )
}

export function CalendarPage() {
  return (
    <MobileMoreBackShell title="Calendar" className="p-4 sm:p-6">
      <TradingCalendar />
    </MobileMoreBackShell>
  )
}

export function AnalyticsPage() {
  const { trades, quotes, activeAccountId, metrics } = useApp()
  const open = trades.filter((t) => t.accountId === activeAccountId && t.status === 'open')
  const closed = trades.filter((t) => t.accountId === activeAccountId && t.status === 'closed')
  const wins = closed.filter((t) => (t.realizedPnl ?? 0) > 0).length
  const winRate = closed.length ? (wins / closed.length) * 100 : 0

  return (
    <MobileMoreBackShell title="Analytics">
      <h1 className="hidden text-xl font-semibold md:block">Analytics</h1>
      <div className="mt-0 grid gap-3 sm:grid-cols-2 md:mt-5 lg:grid-cols-4">
        <Stat label="Open trades" value={String(open.length)} />
        <Stat label="Closed trades" value={String(closed.length)} />
        <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
        <Stat label="Floating PnL" value={formatMoney(metrics.totalPnl)} />
      </div>
      <div className="mt-6 rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Watchlist movers</h2>
        <div className="space-y-2">
          {[...quotes]
            .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
            .slice(0, 5)
            .map((q) => (
              <div key={q.symbol} className="flex justify-between text-sm">
                <span className="font-medium">{q.symbol}</span>
                <span className={q.percentChange >= 0 ? 'positive' : 'negative'}>
                  {formatPrice(q.price, q.symbol)} ({q.percentChange.toFixed(2)}%)
                </span>
              </div>
            ))}
        </div>
      </div>
    </MobileMoreBackShell>
  )
}

export function LeaderboardPage() {
  const rows = [
    { name: 'Alex Trader', pnl: 12450, win: 68 },
    { name: 'Sara FX', pnl: 9820, win: 61 },
    { name: 'You', pnl: 0, win: 50 },
    { name: 'Omar Pro', pnl: -1200, win: 44 },
  ]
  return (
    <div className="h-full overflow-auto bg-panel p-6">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <p className="mt-1 text-sm text-text-secondary">Demo rankings for social trading</p>
      <div className="mt-5 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-transparent text-[14px] text-text-secondary">
            <tr>
              <th className="border-0 px-4 py-2 font-medium">Rank</th>
              <th className="border-0 px-4 py-2 font-medium">Trader</th>
              <th className="border-0 px-4 py-2 font-medium">PnL</th>
              <th className="border-0 px-4 py-2 font-medium">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-t border-border">
                <td className="px-4 py-3">#{i + 1}</td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className={`px-4 py-3 ${r.pnl >= 0 ? 'positive' : 'negative'}`}>{formatMoney(r.pnl)}</td>
                <td className="px-4 py-3">{r.win}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const { trades, transactions, activeAccountId, metrics } = useApp()
  const accountTrades = trades.filter((t) => t.accountId === activeAccountId)
  const realized = accountTrades
    .filter((t) => t.status === 'closed')
    .reduce((s, t) => s + (t.realizedPnl ?? 0), 0)
  const deposits = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)

  return (
    <MobileMoreBackShell title="Reports">
      <h1 className="hidden text-xl font-semibold md:block">Reports</h1>
      <div className="mt-0 grid gap-3 md:mt-5 md:grid-cols-3">
        <Stat label="Balance" value={formatMoney(metrics.balance)} />
        <Stat label="Realized PnL" value={formatMoney(realized)} />
        <Stat label="Total deposits" value={formatMoney(deposits)} />
      </div>
      <button
        type="button"
        className="mt-5 h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
        onClick={() => {
          const rows = accountTrades.map(
            (t) =>
              `${t.id},${t.symbol},${t.side},${t.volume},${t.openPrice},${t.closePrice ?? ''},${t.realizedPnl ?? calcPnl(t)},${t.status}`,
          )
          const csv = ['id,symbol,side,volume,open,close,pnl,status', ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'nitajfx-trades.csv'
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        Export trades CSV
      </button>
    </MobileMoreBackShell>
  )
}

export function AiAssistantPage() {
  const [q, setQ] = useState('What is my floating PnL?')
  const [answer, setAnswer] = useState('')
  const { metrics, selectedSymbol, quotes } = useApp()
  const quote = quotes.find((x) => x.symbol === selectedSymbol)

  return (
    <MobileMoreBackShell title="AI Assistant" className="mx-auto flex max-w-2xl flex-col p-4 sm:p-6">
      <h1 className="hidden text-xl font-semibold md:block">AI Assistant</h1>
      <p className="mt-0 text-sm text-text-secondary md:mt-1">
        Ask about your account or the selected market.
      </p>
      <div className="mt-4 min-h-[12rem] flex-1 overflow-auto rounded-lg border border-border p-4 text-sm">
        {answer || 'Ask a question to get started.'}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = q.toLowerCase()
          if (text.includes('pnl') || text.includes('profit')) {
            setAnswer(`Your floating PnL is ${formatMoney(metrics.totalPnl)} with equity ${formatMoney(metrics.equity)}.`)
          } else if (text.includes('margin')) {
            setAnswer(
              `Free margin ${formatMoney(metrics.freeMargin)}, used ${formatMoney(metrics.usedFunds)}, level ${metrics.marginLevel.toFixed(2)}%.`,
            )
          } else if (text.includes('price') || text.includes(selectedSymbol.toLowerCase())) {
            setAnswer(
              `${selectedSymbol} is trading at ${formatPrice(quote?.price ?? 0, selectedSymbol)} (${(quote?.percentChange ?? 0).toFixed(2)}%).`,
            )
          } else {
            setAnswer(
              'I can help with PnL, margin, and symbol prices. Try: “What is my floating PnL?” or “EURUSD price”.',
            )
          }
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 flex-1 rounded-md border border-border px-3 text-sm outline-none"
        />
        <button type="submit" className="h-11 rounded-md btn-brand px-4 text-sm font-semibold">
          Ask
        </button>
      </form>
    </MobileMoreBackShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
