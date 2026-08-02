import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Globe2,
  Megaphone,
  UserPlus,
  Users,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '../api'
import { PageHeader, money } from '../layout'

type Dash = {
  kpis: {
    totalClients: number
    activeClients: number
    newLeads: number
    conversionsFtd: number
    online: number
    deposits: number
    withdrawals: number
    netDeposit: number
    profitLoss: number
  }
  byCountry: { country: string; count: number }[]
  bySource: { source: string; count: number }[]
  categoryCounts: Record<string, number>
}

function BigKpi({
  title,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info'
}) {
  const toneMap = {
    neutral: 'bg-muted text-secondary',
    good: 'bg-buy/15 text-buy',
    bad: 'bg-sell/15 text-sell',
    warn: 'bg-accent/15 text-accent',
    info: 'bg-sky/15 text-sky',
  }
  return (
    <div className="rounded-2xl border border-border bg-[#161a21] p-5 transition-colors hover:border-accent/30 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold capitalize tracking-[0.14em] text-secondary sm:text-sm">
          {title}
        </div>
        <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', toneMap[tone])}>
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight tabular-nums text-text sm:text-3xl">
        {value}
      </div>
      {sub ? <div className="mt-2 text-sm text-secondary">{sub}</div> : null}
    </div>
  )
}

export function CrmDashboardPage() {
  const [data, setData] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api<Dash>('/api/admin/crm/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  if (error) return <p className="text-base text-sell">{error}</p>
  if (!data) return <p className="text-base text-secondary">Loading CRM dashboard…</p>

  const k = data.kpis

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title="CRM Dashboard"
        subtitle="Clients, conversions, deposits, and marketing performance."
      >
        <Link
          to="/crm/clients"
          className="inline-flex h-11 items-center rounded-xl bg-[#fcd535] px-5 text-base font-semibold text-[#202630] hover:bg-[#ceaf30]"
        >
          Open clients
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <BigKpi title="Total clients" value={String(k.totalClients)} icon={Users} tone="neutral" />
        <BigKpi title="Active clients" value={String(k.activeClients)} icon={Users} tone="info" />
        <BigKpi title="New leads" value={String(k.newLeads)} sub="This month" icon={UserPlus} tone="warn" />
        <BigKpi title="Conversions (FTD)" value={String(k.conversionsFtd)} icon={ArrowUpRight} tone="good" />
        <BigKpi title="Deposits" value={money(k.deposits)} icon={Wallet} tone="good" />
        <BigKpi title="Withdrawals" value={money(k.withdrawals)} icon={ArrowDownRight} tone="bad" />
        <BigKpi
          title="Profit / Loss"
          value={money(k.profitLoss)}
          icon={k.profitLoss >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={k.profitLoss >= 0 ? 'good' : 'bad'}
        />
        <BigKpi title="Online now" value={String(k.online)} icon={Wifi} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <section className="rounded-2xl border border-border bg-[#161a21] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text">Client categories</h2>
          <p className="mt-1 text-sm text-secondary">Quick counts by CRM category</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {Object.entries(data.categoryCounts).map(([cat, count]) => (
              <Link
                key={cat}
                to={`/crm/clients?category=${cat}`}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-sm transition-colors hover:border-accent/40 sm:text-base"
              >
                <span className="font-medium capitalize text-secondary">
                  {cat.replaceAll('_', ' + ').toLowerCase()}
                </span>
                <span className="text-base font-bold tabular-nums text-text">{count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-[#161a21] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text">Country statistics</h2>
          <p className="mt-1 text-sm text-secondary">Top countries</p>
          <div className="mt-4 space-y-3">
            {data.byCountry.length === 0 ? (
              <p className="text-base text-secondary">No data</p>
            ) : (
              data.byCountry.map((r) => (
                <div key={r.country} className="flex items-center justify-between text-base">
                  <span className="inline-flex items-center gap-2.5 font-medium text-secondary">
                    <Globe2 size={18} /> {r.country}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-text">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-[#161a21] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text">Marketing sources</h2>
          <p className="mt-1 text-sm text-secondary">Client acquisition</p>
          <div className="mt-4 space-y-3">
            {data.bySource.length === 0 ? (
              <p className="text-base text-secondary">No data</p>
            ) : (
              data.bySource.map((r) => (
                <div key={r.source} className="flex items-center justify-between text-base">
                  <span className="inline-flex items-center gap-2.5 font-medium text-secondary">
                    <Megaphone size={18} /> {r.source}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-text">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
