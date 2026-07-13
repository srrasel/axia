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
  deposit: '#059669',
  withdraw: '#e11d48',
  earnings: '#0ea5e9',
  users: '#7c3aed',
  grid: '#e6ebf2',
  axis: '#94a3b8',
}

const PIE_COLORS = ['#0ea5e9', '#059669', '#e8b923', '#7c3aed', '#e11d48', '#64748b', '#f97316']

function formatShort(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(0)
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-text">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 tabular-nums">
          <span className="text-secondary">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {typeof p.value === 'number' && (p.dataKey === 'newUsers' || p.dataKey === 'trades')
              ? p.value
              : money(Number(p.value || 0))}
          </span>
        </div>
      ))}
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

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-sell">{error}</div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    )
  }

  const s = data.stats
  const cur = s.currency || currencyCode || 'EUR'
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-buy">
            <Wifi size={12} /> {s.onlineUsers ?? 0} online
          </span>
          <Link
            to="/earnings"
            className="rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-soft"
          >
            Earnings
          </Link>
          <Link
            to="/transactions"
            className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium hover:bg-muted"
          >
            Money ops
          </Link>
        </div>
      </PageHeader>

      {/* Hero KPIs */}
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

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Cash flow"
          subtitle="Approved deposits & withdrawals · 14 days"
          action={
            <div className="flex gap-3 text-[11px] font-medium text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-buy" /> Deposits {money(periodDeposits)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sell" /> Withdrawals {money(periodWithdrawals)}
              </span>
            </div>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.deposit} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART.deposit} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gWithdraw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.withdraw} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART.withdraw} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={formatShort}
                  tick={{ fill: CHART.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Deposits"
                  stroke={CHART.deposit}
                  fill="url(#gDeposit)"
                  strokeWidth={2.25}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  name="Withdrawals"
                  stroke={CHART.withdraw}
                  fill="url(#gWithdraw)"
                  strokeWidth={2.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Earnings mix" subtitle="By ledger type" action={<span className="text-xs text-secondary">{money(periodEarnings)} / 14d</span>}>
          <div className="h-[220px] w-full">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-secondary">No earnings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => money(Number(v || 0))}
                    contentStyle={{ borderRadius: 12, borderColor: '#e6ebf2', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-1 space-y-2">
            {pieData.slice(0, 5).map((r: any, i: number) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 capitalize text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {r.name}
                </span>
                <span className="font-semibold tabular-nums">{money(r.value)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Activity" subtitle="New users & trades opened · 14 days">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="newUsers" name="New users" fill={CHART.users} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="trades" name="Trades" fill={CHART.earnings} radius={[6, 6, 0, 0]} maxBarSize={18} />
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

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent earnings" action={<Link to="/earnings" className="text-xs font-semibold text-link">View all</Link>}>
          <div className="space-y-1">
            {(data.recentEarnings || []).length === 0 ? (
              <p className="text-sm text-secondary">No recent entries.</p>
            ) : (
              data.recentEarnings.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm hover:bg-muted">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.user?.name || 'Platform'}</div>
                    <div className="truncate text-xs capitalize text-secondary">{String(e.type).replaceAll('_', ' ')}</div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-buy">{money(e.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Recent users" action={<Link to="/users" className="text-xs font-semibold text-link">View all</Link>}>
          <div className="space-y-1">
            {data.recentUsers.map((u: any) => (
              <Link key={u.id} to={`/users/${u.id}`} className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-secondary">{u.email}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${u.funded ? 'bg-emerald-50 text-buy' : 'bg-slate-100 text-secondary'}`}>
                  {u.funded ? 'Funded' : 'Demo'}
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Recent transactions" action={<Link to="/transactions" className="text-xs font-semibold text-link">View all</Link>}>
          <div className="space-y-1">
            {data.recentTx.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.user.name}</div>
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
        <Link to="/kyc" className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium hover:bg-muted">
          KYC queue ({s.pendingKyc})
        </Link>
        <Link to="/crm/online" className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium hover:bg-muted">
          Online clients
        </Link>
        <Link to="/crm/performance" className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium hover:bg-muted">
          Winners / losers
        </Link>
        <Link to="/settings" className="rounded-xl border border-border bg-panel px-3.5 py-2 text-sm font-medium hover:bg-muted">
          Settings
        </Link>
      </div>
    </div>
  )
}
