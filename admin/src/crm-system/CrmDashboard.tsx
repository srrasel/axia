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
} from 'lucide-react'
import { api } from '../api'
import { Card, PageHeader, Panel, money } from '../layout'

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

export function CrmDashboardPage() {
  const [data, setData] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api<Dash>('/api/admin/crm/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  if (error) return <p className="text-sell">{error}</p>
  if (!data) return <p className="text-secondary">Loading CRM dashboard…</p>

  const k = data.kpis

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM Dashboard"
        subtitle="Clients, conversions, deposits, and marketing performance."
      >
        <Link
          to="/crm/clients"
          className="inline-flex h-10 items-center rounded-xl bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] hover:bg-[#ceaf30]"
        >
          Open clients
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Total clients" value={String(k.totalClients)} icon={Users} tone="neutral" />
        <Card title="Active clients" value={String(k.activeClients)} icon={Users} tone="info" />
        <Card title="New leads" value={String(k.newLeads)} sub="This month" icon={UserPlus} tone="warn" />
        <Card title="Conversions (FTD)" value={String(k.conversionsFtd)} icon={ArrowUpRight} tone="good" />
        <Card title="Deposits" value={money(k.deposits)} icon={Wallet} tone="good" />
        <Card title="Withdrawals" value={money(k.withdrawals)} icon={ArrowDownRight} tone="bad" />
        <Card
          title="Profit / Loss"
          value={money(k.profitLoss)}
          icon={k.profitLoss >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={k.profitLoss >= 0 ? 'good' : 'bad'}
        />
        <Card title="Online now" value={String(k.online)} icon={Wifi} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Client categories" subtitle="Quick counts by CRM category">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.categoryCounts).map(([cat, count]) => (
              <Link
                key={cat}
                to={`/crm/clients?category=${cat}`}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm transition-colors hover:border-accent/30"
              >
                <span className="text-secondary">{cat.replaceAll('_', ' + ')}</span>
                <span className="font-semibold tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Country statistics" subtitle="Top countries">
          <div className="space-y-2">
            {data.byCountry.length === 0 ? (
              <p className="text-sm text-secondary">No data</p>
            ) : (
              data.byCountry.map((r) => (
                <div key={r.country} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-secondary">
                    <Globe2 size={14} /> {r.country}
                  </span>
                  <span className="font-semibold tabular-nums">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Marketing sources" subtitle="Client acquisition">
          <div className="space-y-2">
            {data.bySource.length === 0 ? (
              <p className="text-sm text-secondary">No data</p>
            ) : (
              data.bySource.map((r) => (
                <div key={r.source} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-secondary">
                    <Megaphone size={14} /> {r.source}
                  </span>
                  <span className="font-semibold tabular-nums">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
