import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Coins,
  Landmark,
  LineChart,
  Users,
  Wallet,
  Wifi,
  CandlestickChart,
  Clock3,
} from 'lucide-react'
import { api } from './api'
import { Card, PageHeader, Panel, money } from './layout'
import { setActiveCurrency, useCurrency } from './currency'

const CHART = {
  deposit: '#22a06b',
  withdraw: '#e5484d',
  earnings: '#60a5fa',
  users: '#a78bfa',
  grid: 'rgba(42, 48, 58, 0.85)',
  axis: '#9aa3b2',
  cursor: 'rgba(252, 213, 53, 0.08)',
}

const PIE_COLORS = ['#fcd535', '#22a06b', '#60a5fa', '#a78bfa', '#e5484d', '#9aa3b2', '#f79009']

function formatShort(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-[#1a2030] px-3.5 py-2.5 text-xs shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
      <div className="mb-2 border-b border-border/70 pb-1.5 font-semibold text-text">{label}</div>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-8 tabular-nums">
            <span className="inline-flex items-center gap-2 text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold text-text">
              {typeof p.value === 'number' && (p.dataKey === 'newUsers' || p.dataKey === 'trades')
                ? p.value
                : money(Number(p.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { code: currencyCode } = useCurrency()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api('/api/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  useEffect(() => {
    if (data?.stats?.currency) setActiveCurrency(data.stats.currency)
  }, [data?.stats?.currency])

  const series = data?.chartSeries || []
  const pieData = useMemo(
    () =>
      (data?.earningsByType || []).map((r: any) => ({
        name: String(r.type).replaceAll('_', ' '),
        value: Number(r.amount || 0),
        count: r.count,
      })),
    [data?.earningsByType],
  )

  const pieTotal = useMemo(() => pieData.reduce((s: number, r: any) => s + r.value, 0), [pieData])

  if (error) {
    return (
      <div className="rounded-2xl border border-sell/30 bg-sell/10 px-4 py-3 text-sm text-sell">{error}</div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-muted/60" />
      </div>
    )
  }

  const s = data.stats
  const cur = s.currency || currencyCode || 'USD'
  const periodDeposits = series.reduce((a: number, d: any) => a + d.deposits, 0)
  const periodWithdrawals = series.reduce((a: number, d: any) => a + d.withdrawals, 0)
  const periodEarnings = series.reduce((a: number, d: any) => a + d.earnings, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${s.platformName || 'NitajFX'} · last 14 days · ${cur}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-buy/30 bg-buy/15 px-3 py-1 text-xs font-semibold text-buy">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-buy" />
            </span>
            <Wifi size={12} /> {s.onlineUsers ?? 0} online
          </span>
          <Link
            to="/earnings"
            className="rounded-xl bg-[#fcd535] px-3.5 py-2 text-sm font-semibold text-[#202630] shadow-sm transition hover:bg-[#ceaf30]"
          >
            Earnings
          </Link>
          <Link
            to="/transactions"
            className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium text-text hover:bg-muted"
          >
            Money ops
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Platform earnings"
          value={money(s.platformEarnings)}
          sub={`${s.earningEntries || 0} ledger entries`}
          icon={Coins}
          tone="good"
        />
        <Card
          title="Net cash flow"
          value={money(s.netFlow)}
          sub="Deposits − withdrawals"
          icon={s.netFlow >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={s.netFlow >= 0 ? 'good' : 'bad'}
        />
        <Card
          title="Client balances"
          value={money(s.totalBalances)}
          sub="All accounts"
          icon={Wallet}
          tone="info"
        />
        <Card
          title="Users"
          value={String(s.users)}
          sub={`${s.fundedUsers || 0} funded · ${s.onlineUsers ?? 0} online`}
          icon={Users}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Cash flow"
          subtitle="Approved deposits & withdrawals · 14 days"
          action={
            <div className="flex flex-wrap gap-3 text-[11px] font-medium text-secondary">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-buy/10 px-2.5 py-1 text-buy">
                <span className="h-1.5 w-1.5 rounded-full bg-buy" /> Deposits {money(periodDeposits)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sell/10 px-2.5 py-1 text-sell">
                <span className="h-1.5 w-1.5 rounded-full bg-sell" /> Withdrawals {money(periodWithdrawals)}
              </span>
            </div>
          }
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="gDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.deposit} stopOpacity={0.45} />
                    <stop offset="55%" stopColor={CHART.deposit} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={CHART.deposit} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWithdraw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.withdraw} stopOpacity={0.35} />
                    <stop offset="55%" stopColor={CHART.withdraw} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={CHART.withdraw} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 8" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tickFormatter={formatShort}
                  tick={{ fill: CHART.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#fcd535', strokeWidth: 1, strokeDasharray: '4 4', fill: CHART.cursor }}
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Deposits"
                  stroke={CHART.deposit}
                  fill="url(#gDeposit)"
                  strokeWidth={2.5}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#161a21', fill: CHART.deposit }}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  name="Withdrawals"
                  stroke={CHART.withdraw}
                  fill="url(#gWithdraw)"
                  strokeWidth={2.5}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#161a21', fill: CHART.withdraw }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Earnings mix"
          subtitle="By ledger type"
          action={<span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">{money(periodEarnings)} / 14d</span>}
        >
          <div className="relative h-[200px] w-full">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-secondary">No earnings yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={4}
                      stroke="#161a21"
                      strokeWidth={3}
                    >
                      {pieData.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => money(Number(v || 0))}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: '#2a303a',
                        background: '#1a2030',
                        color: '#e8eaed',
                        fontSize: 12,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Total</div>
                  <div className="text-sm font-bold tabular-nums text-text">{money(pieTotal)}</div>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {pieData.slice(0, 5).map((r: any, i: number) => {
              const pct = pieTotal > 0 ? (r.value / pieTotal) * 100 : 0
              return (
                <div key={r.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 capitalize text-secondary">
                      <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {r.name}
                    </span>
                    <span className="font-semibold tabular-nums text-text">{money(r.value)}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Activity"
          subtitle="New users & trades opened · 14 days"
          action={
            <div className="flex gap-3 text-[11px] font-medium text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-violet" /> Users
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-sky" /> Trades
              </span>
            </div>
          }
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 4 }} barGap={6} barCategoryGap="18%">
                <defs>
                  <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.users} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART.users} stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="gTrades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.earnings} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART.earnings} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 8" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: CHART.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
                <Bar dataKey="newUsers" name="New users" fill="url(#gUsers)" radius={[7, 7, 2, 2]} maxBarSize={22} />
                <Bar dataKey="trades" name="Trades" fill="url(#gTrades)" radius={[7, 7, 2, 2]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card title="Open trades" value={String(s.openTrades)} sub={`${s.pendingTrades || 0} pending · ${s.closedTrades || 0} closed`} icon={CandlestickChart} tone="info" />
          <Card title="Pending KYC" value={String(s.pendingKyc)} sub={`${s.pendingDeposits ?? 0} dep · ${s.pendingWithdrawals ?? 0} wd`} icon={BadgeCheck} tone="warn" />
          <Card title="Trading fees" value={money(s.tradingFees)} sub="From closed trades" icon={LineChart} tone="good" />
          <Card title="Traded volume" value={`${Number(s.tradedVolume || 0).toFixed(2)} lots`} sub={`Client PnL ${money(s.clientRealizedPnl)}`} icon={Landmark} tone="neutral" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent earnings" action={<Link to="/earnings" className="text-xs font-semibold text-link hover:underline">View all</Link>}>
          <div className="space-y-0.5">
            {(data.recentEarnings || []).length === 0 ? (
              <p className="text-sm text-secondary">No recent entries.</p>
            ) : (
              data.recentEarnings.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-muted">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text">{e.user?.name || 'Platform'}</div>
                    <div className="truncate text-xs capitalize text-secondary">{String(e.type).replaceAll('_', ' ')}</div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-buy">{money(e.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Recent users" action={<Link to="/users" className="text-xs font-semibold text-link hover:underline">View all</Link>}>
          <div className="space-y-0.5">
            {data.recentUsers.map((u: any) => (
              <Link key={u.id} to={`/users/${u.id}`} className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate font-medium text-text">{u.name}</div>
                  <div className="truncate text-xs text-secondary">{u.email}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${u.funded ? 'bg-buy/15 text-buy' : 'bg-muted text-secondary'}`}>
                  {u.funded ? 'Funded' : 'Demo'}
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Recent transactions" action={<Link to="/transactions" className="text-xs font-semibold text-link hover:underline">View all</Link>}>
          <div className="space-y-0.5">
            {data.recentTx.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate font-medium text-text">{t.user.name}</div>
                  <div className="flex items-center gap-1.5 text-xs capitalize text-secondary">
                    <Clock3 size={11} /> {t.type} · {t.status}
                  </div>
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${t.amount >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {money(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { to: '/kyc', label: `KYC queue (${s.pendingKyc})` },
          { to: '/crm/online', label: 'Online clients' },
          { to: '/crm/performance', label: 'Winners / losers' },
          { to: '/settings', label: 'Settings' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium text-text transition-colors hover:border-accent/30 hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
