import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { api } from './api'
import { AuthProvider, useAuth } from './auth'
import { LoginPage, ForgotPasswordPage } from './auth-pages'
import { AdminLayout, Card, PageHeader, money, usePagination, TablePagination, canAccessPath, isCrmStaffRole } from './layout'
import { setActiveCurrency } from './currency'
import { Dashboard } from './dashboard'
import { CrmPricesPage, CrmStaffPage } from './crm'
import {
  CrmClientProfilePage,
  CrmClientsPage,
  CrmDashboardPage,
  CrmRolesPage,
  CrmNotificationsPage,
  CrmAnalyticsPage,
  CrmSecurityPage,
  CrmSystemSettingsPage,
} from './crm-system'
import { BankAccountsPage } from './bank-accounts'
import { SettingsPage } from './settings'

function CrmClientsRoute() {
  const { user } = useAuth()
  if (!user) return null
  return <CrmClientsPage me={user} />
}

function CrmClientProfileRoute() {
  const { user } = useAuth()
  if (!user) return null
  return <CrmClientProfilePage me={user} />
}

function CrmDeskRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/crm/clients/${id}` : '/crm/clients'} replace />
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-full items-center justify-center text-secondary">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user && isCrmStaffRole(user.role)) {
    if (location.pathname === '/' || location.pathname === '') {
      return <Navigate to="/crm" replace />
    }
    if (!canAccessPath(user.role, location.pathname)) {
      return <Navigate to="/crm" replace />
    }
  }
  return children
}

function EarningsPage() {
  const { user } = useAuth()
  const crmOnly = isCrmStaffRole(user?.role)
  const [data, setData] = useState<any>(null)
  const [type, setType] = useState('')
  const [manual, setManual] = useState({ amount: 50, description: 'Manual adjustment' })
  const [error, setError] = useState<string | null>(null)
  const recentPager = usePagination((data?.recent as any[]) || [])

  const load = () =>
    void api(`/api/admin/earnings${type ? `?type=${type}` : ''}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))

  useEffect(() => {
    load()
  }, [type])

  useEffect(() => {
    if (data?.currency) setActiveCurrency(data.currency)
  }, [data?.currency])

  if (error) return <p className="text-sell">{error}</p>
  if (!data) return <p className="text-secondary">Loading earnings…</p>

  return (
    <div>
      <PageHeader
        title={crmOnly ? 'My earnings' : 'Platform Earnings'}
        subtitle={crmOnly ? 'Earnings and fees from your assigned clients only.' : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">{data.currency || 'USD'}</span>
          <select className="h-10 rounded-xl border border-border bg-panel px-2 text-sm outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="trading_fee">Trading fee</option>
          <option value="deposit_fee">Deposit fee</option>
          <option value="withdraw_fee">Withdraw fee</option>
          <option value="referral_commission">Referral</option>
          <option value="spread">Spread</option>
          <option value="other">Other</option>
        </select>
        </div>
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Total earnings" value={money(data.summary.totalEarnings)} />
        <Card title="Ledger entries" value={String(data.summary.entries)} />
        <Card title="Trading fees" value={money(data.summary.tradingFeesCollected)} />
        <Card title="Client PnL" value={money(data.summary.clientRealizedPnl)} sub="Closed trades net" />
      </div>

      <div className={`mb-5 grid gap-4 ${crmOnly || !data.feeSettings ? '' : 'lg:grid-cols-2'}`}>
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">By type</h2>
          <div className="space-y-2">
            {data.byType.map((r: any) => (
              <div key={r.type} className="flex justify-between text-sm">
                <span className="capitalize">{r.type.replace('_', ' ')} ({r.count})</span>
                <span className="font-semibold text-buy">{money(r.amount)}</span>
              </div>
            ))}
            {data.byType.length === 0 ? <p className="text-sm text-secondary">No earnings yet for your clients.</p> : null}
          </div>
        </div>
        {!crmOnly && data.feeSettings ? (
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">Fee settings (live)</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(data.feeSettings).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-secondary">{k}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-secondary">Change these under Settings — they apply immediately.</p>
        </div>
        ) : null}
      </div>

      {!crmOnly ? (
      <form
        className="mb-5 flex flex-wrap gap-2 rounded-xl border border-border bg-panel p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          await api('/api/admin/earnings/manual', { method: 'POST', body: JSON.stringify(manual) })
          setManual({ amount: 50, description: 'Manual adjustment' })
          load()
        }}
      >
        <div className="text-sm font-semibold w-full mb-1">Record manual earning</div>
        <input
          type="number"
          className="h-10 w-28 rounded-xl border border-border bg-panel px-3 text-sm outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]"
          value={manual.amount}
          onChange={(e) => setManual({ ...manual, amount: Number(e.target.value) })}
        />
        <input
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-panel px-3 text-sm outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]"
          value={manual.description}
          onChange={(e) => setManual({ ...manual, description: e.target.value })}
        />
        <button type="submit" className="h-10 rounded-xl bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]">Add</button>
      </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPager.pageItems.map((e: any) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2 capitalize">{e.type.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-2 font-semibold text-buy">{money(e.amount)}</td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="px-3 py-2">{e.user?.name || '—'}</td>
                  <td className="px-3 py-2">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {recentPager.total === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-secondary">No earnings entries</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={recentPager.page}
          totalPages={recentPager.totalPages}
          total={recentPager.total}
          from={recentPager.from}
          to={recentPager.to}
          onPageChange={recentPager.setPage}
        />
      </div>
    </div>
  )
}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: 'demo123' })
  const pager = usePagination(users)

  const load = () => void api<{ users: any[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users))
  useEffect(() => { load() }, [q])

  return (
    <div>
      <PageHeader title="Users">
        <div className="flex gap-2">
          <input className="h-10 rounded-md border border-border px-3 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="h-10 rounded-md bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]" onClick={() => setShowCreate(true)}>
            Create user
          </button>
        </div>
      </PageHeader>
      {showCreate ? (
        <form
          className="mb-4 grid gap-2 rounded-xl border border-border bg-panel p-4 sm:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault()
            await api('/api/admin/users', { method: 'POST', body: JSON.stringify(form) })
            setShowCreate(false)
            setForm({ name: '', email: '', password: 'demo123' })
            load()
          }}
        >
          <input className="h-10 rounded border border-border px-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="h-10 rounded border border-border px-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="h-10 rounded border border-border px-2" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit" className="h-10 rounded bg-[#fcd535] text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]">Save</button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">KYC</th>
                <th className="px-3 py-2">Funded</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Trades</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2"><Link className="font-medium text-link" to={`/users/${u.id}`}>{u.name}</Link></td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 capitalize">{u.kycStatus}</td>
                  <td className="px-3 py-2">{u.funded ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{u.active ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{u._count?.trades ?? 0}</td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-secondary">No users found</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          from={pager.from}
          to={pager.to}
          onPageChange={pager.setPage}
        />
      </div>
    </div>
  )
}

function UserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [adjust, setAdjust] = useState({ accountId: '', amount: 100, note: '' })
  const accountsPager = usePagination((user?.accounts as any[]) || [])
  const tradesPager = usePagination((user?.trades as any[]) || [])
  const load = () => void api<{ user: any }>(`/api/admin/users/${id}`).then((r) => {
    setUser(r.user)
    setAdjust((a) => ({ ...a, accountId: r.user.accounts[0]?.id || '' }))
  })
  useEffect(() => { load() }, [id])
  if (!user) return <p>Loading…</p>

  return (
    <div>
      <PageHeader title={user.name}>
        <Link to="/users" className="text-sm text-link">← Back</Link>
      </PageHeader>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card title="Email" value={user.email} />
        <Card title="Deposited" value={money(user.totalDeposited)} />
        <Card title="KYC" value={user.kycStatus} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={async () => { await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) }); load() }}>
          {user.active ? 'Disable' : 'Enable'} user
        </button>
        <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={async () => { await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ verified: !user.verified }) }); load() }}>
          Toggle verified
        </button>
        <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={async () => { await api(`/api/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password: 'reset123' }) }); alert('Password set to reset123') }}>
          Reset password
        </button>
      </div>
      <div className="mb-6 rounded-xl border border-border bg-panel p-4">
        <h2 className="mb-3 font-semibold">Adjust balance</h2>
        <div className="flex flex-wrap gap-2">
          <select className="h-10 rounded border border-border px-2" value={adjust.accountId} onChange={(e) => setAdjust({ ...adjust, accountId: e.target.value })}>
            {user.accounts.map((a: any) => <option key={a.id} value={a.id}>{a.type} #{a.number} · {money(a.balance)}</option>)}
          </select>
          <input type="number" className="h-10 w-28 rounded border border-border px-2" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: Number(e.target.value) })} />
          <input className="h-10 flex-1 rounded border border-border px-2" placeholder="Note" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
          <button type="button" className="h-10 rounded bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]" onClick={async () => { await api(`/api/admin/accounts/${adjust.accountId}/adjust`, { method: 'POST', body: JSON.stringify({ amount: adjust.amount, note: adjust.note }) }); load() }}>
            Apply
          </button>
        </div>
      </div>
      <h2 className="mb-2 font-semibold">Accounts</h2>
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2 text-left">Number</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Balance</th><th className="px-3 py-2 text-left">Equity</th></tr></thead>
            <tbody>{accountsPager.pageItems.map((a: any) => <tr key={a.id} className="border-t border-border"><td className="px-3 py-2">{a.number}</td><td className="px-3 py-2">{a.type}</td><td className="px-3 py-2">{money(a.balance)}</td><td className="px-3 py-2">{money(a.equity)}</td></tr>)}</tbody>
          </table>
        </div>
        <TablePagination page={accountsPager.page} totalPages={accountsPager.totalPages} total={accountsPager.total} from={accountsPager.from} to={accountsPager.to} onPageChange={accountsPager.setPage} />
      </div>
      <h2 className="mb-2 font-semibold">Recent trades</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2 text-left">Symbol</th><th className="px-3 py-2 text-left">Side</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Volume</th><th className="px-3 py-2 text-left">PnL</th></tr></thead>
            <tbody>{tradesPager.pageItems.map((t: any) => <tr key={t.id} className="border-t border-border"><td className="px-3 py-2">{t.symbol}</td><td className="px-3 py-2">{t.side}</td><td className="px-3 py-2">{t.status}</td><td className="px-3 py-2">{t.volume}</td><td className="px-3 py-2">{t.realizedPnl != null ? money(t.realizedPnl) : '—'}</td></tr>)}</tbody>
          </table>
        </div>
        <TablePagination page={tradesPager.page} totalPages={tradesPager.totalPages} total={tradesPager.total} from={tradesPager.from} to={tradesPager.to} onPageChange={tradesPager.setPage} />
      </div>
    </div>
  )
}

function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const pager = usePagination(accounts)
  useEffect(() => { void api<{ accounts: any[] }>('/api/admin/accounts').then((r) => setAccounts(r.accounts)) }, [])
  return (
    <div>
      <PageHeader title="Accounts" />
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Number</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">Leverage</th></tr></thead>
            <tbody>
              {pager.pageItems.map((a) => <tr key={a.id} className="border-t border-border"><td className="px-3 py-2">{a.user.name}</td><td className="px-3 py-2">{a.number}</td><td className="px-3 py-2">{a.type}</td><td className="px-3 py-2">{money(a.balance)}</td><td className="px-3 py-2">{a.leverage}</td></tr>)}
              {pager.total === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-secondary">No accounts</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={pager.page} totalPages={pager.totalPages} total={pager.total} from={pager.from} to={pager.to} onPageChange={pager.setPage} />
      </div>
    </div>
  )
}

function TradesPage() {
  const [trades, setTrades] = useState<any[]>([])
  const [status, setStatus] = useState('open')
  const [edits, setEdits] = useState<Record<string, { openPrice: string; currentPrice: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const pager = usePagination(trades)
  const load = () =>
    void api<{ trades: any[] }>(`/api/admin/trades${status ? `?status=${status}` : ''}`).then((r) => {
      setTrades(r.trades)
      const next: Record<string, { openPrice: string; currentPrice: string }> = {}
      for (const t of r.trades) {
        next[t.id] = {
          openPrice: String(t.openPrice),
          currentPrice: String(t.currentPrice),
        }
      }
      setEdits(next)
    })
  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [status])

  async function savePrice(t: any) {
    const openPrice = Number(edits[t.id]?.openPrice)
    const currentPrice = Number(edits[t.id]?.currentPrice)
    if (!Number.isFinite(openPrice) || openPrice <= 0) return
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return
    setBusy(t.id)
    setMsg(null)
    try {
      await api(`/api/admin/trades/${t.id}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ openPrice, currentPrice, lockMark: true }),
      })
      setMsg(`Updated ${t.symbol} open=${openPrice} mark=${currentPrice} (locked)`)
      load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="Trades" subtitle="Change open (entry) or mark price in real time — client pages refresh live.">
        <select className="h-10 rounded border border-border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </PageHeader>
      {msg && <p className="mb-3 text-sm text-accent">{msg}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Vol</th>
                <th className="px-3 py-2">Open (entry)</th>
                <th className="px-3 py-2">Current (mark)</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">{t.user.name}</td>
                  <td className="px-3 py-2 font-medium">{t.symbol}</td>
                  <td className="px-3 py-2">{t.side}</td>
                  <td className="px-3 py-2">
                    {t.status}
                    {t.markLocked ? <span className="ml-1 text-[10px] text-accent">locked</span> : null}
                  </td>
                  <td className="px-3 py-2">{t.volume}</td>
                  <td className="px-3 py-2">
                    {t.status === 'open' || t.status === 'pending' ? (
                      <input
                        className="h-8 w-28 rounded border border-border bg-muted/30 px-2 text-xs tabular-nums outline-none hover:border-[#fcd535]/70 focus:border-[#fcd535]"
                        value={edits[t.id]?.openPrice ?? ''}
                        onChange={(e) =>
                          setEdits((s) => ({
                            ...s,
                            [t.id]: { ...(s[t.id] || { openPrice: '', currentPrice: '' }), openPrice: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      t.openPrice
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {t.status === 'open' || t.status === 'pending' ? (
                      <input
                        className="h-8 w-28 rounded border border-border bg-muted/30 px-2 text-xs tabular-nums outline-none hover:border-[#fcd535]/70 focus:border-[#fcd535]"
                        value={edits[t.id]?.currentPrice ?? ''}
                        onChange={(e) =>
                          setEdits((s) => ({
                            ...s,
                            [t.id]: { ...(s[t.id] || { openPrice: '', currentPrice: '' }), currentPrice: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      t.currentPrice
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {t.status === 'open' || t.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy === t.id}
                          className="text-xs font-semibold text-[#fcd535] disabled:opacity-50"
                          onClick={() => void savePrice(t)}
                        >
                          Apply price
                        </button>
                        {t.status === 'open' ? (
                          <button
                            type="button"
                            className="text-xs text-link"
                            onClick={async () => {
                              await api(`/api/admin/trades/${t.id}/close`, { method: 'POST' })
                              load()
                            }}
                          >
                            Force close
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-secondary">
                    No trades
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={pager.page} totalPages={pager.totalPages} total={pager.total} from={pager.from} to={pager.to} onPageChange={pager.setPage} />
      </div>
    </div>
  )
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [status, setStatus] = useState('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pager = usePagination(transactions)

  const load = () =>
    void api<{ transactions: any[] }>(`/api/admin/transactions${status ? `?status=${status}` : ''}`)
      .then((r) => setTransactions(r.transactions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))

  useEffect(() => {
    load()
  }, [status])

  const review = async (id: string, next: 'approved' | 'rejected') => {
    setBusy(id)
    setError(null)
    try {
      await api(`/api/admin/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="Transactions">
        <select className="h-10 rounded border border-border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </PageHeader>
      {error ? <p className="mb-3 text-sm text-sell">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">{t.user.name}</td>
                  <td className="px-3 py-2 capitalize">{t.type}</td>
                  <td className={`px-3 py-2 ${t.amount >= 0 ? 'text-buy' : 'text-sell'}`}>{money(t.amount)}</td>
                  <td className="px-3 py-2">{money(t.fee || 0)}</td>
                  <td className="px-3 py-2 capitalize">{t.status}</td>
                  <td className="px-3 py-2">
                    <div>{t.payment}</div>
                    {String(t.payment || '').toLowerCase().includes('bank') ? (
                      <div className="text-[10px] font-semibold text-sell">Needs bank approval</div>
                    ) : null}
                    {String(t.payment || '').toLowerCase().includes('crypto') &&
                    !String(t.payment || '').toLowerCase().includes('now') ? (
                      <div className="text-[10px] font-semibold text-sell">Needs crypto approval</div>
                    ) : null}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-secondary" title={t.note || ''}>
                    {t.note || '—'}
                  </td>
                  <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 space-x-2">
                    {t.status === 'pending' && (t.type === 'deposit' || t.type === 'withdraw') ? (
                      <>
                        <button type="button" disabled={busy === t.id} className="text-buy disabled:opacity-50" onClick={() => void review(t.id, 'approved')}>
                          Approve
                        </button>
                        <button type="button" disabled={busy === t.id} className="text-sell disabled:opacity-50" onClick={() => void review(t.id, 'rejected')}>
                          Reject
                        </button>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-secondary">
                    No transactions for this filter
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={pager.page} totalPages={pager.totalPages} total={pager.total} from={pager.from} to={pager.to} onPageChange={pager.setPage} />
      </div>
    </div>
  )
}

function KycPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const pager = usePagination(documents)
  const load = () => void api<{ documents: any[] }>('/api/admin/kyc').then((r) => setDocuments(r.documents))
  useEffect(() => { load() }, [])
  return (
    <div>
      <PageHeader title="KYC Reviews" />
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Doc</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {pager.pageItems.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-2">{d.user.name}</td>
                  <td className="px-3 py-2">{d.kind}</td>
                  <td className="px-3 py-2">{d.docType}</td>
                  <td className="px-3 py-2">{d.fileName}</td>
                  <td className="px-3 py-2 capitalize">{d.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    {d.status === 'pending' ? (
                      <>
                        <button type="button" className="text-buy" onClick={async () => { await api(`/api/admin/kyc/${d.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }); load() }}>Approve</button>
                        <button type="button" className="text-sell" onClick={async () => { await api(`/api/admin/kyc/${d.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', note: 'Please re-upload a clearer document' }) }); load() }}>Reject</button>
                      </>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-secondary">No KYC documents</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={pager.page} totalPages={pager.totalPages} total={pager.total} from={pager.from} to={pager.to} onPageChange={pager.setPage} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          element={
            <Protected>
              <RoleGate>
                <AdminLayout />
              </RoleGate>
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/crm" element={<CrmDashboardPage />} />
          <Route path="/crm/clients" element={<CrmClientsRoute />} />
          <Route path="/crm/clients/:id" element={<CrmClientProfileRoute />} />
          <Route path="/crm/notifications" element={<CrmNotificationsPage />} />
          <Route path="/crm/analytics" element={<CrmAnalyticsPage />} />
          <Route path="/crm/security" element={<CrmSecurityPage />} />
          <Route path="/crm/roles" element={<CrmRolesPage />} />
          <Route path="/crm/system" element={<CrmSystemSettingsPage />} />
          <Route path="/crm/transactions" element={<Navigate to="/crm/clients" replace />} />
          <Route path="/crm/desk" element={<Navigate to="/crm/clients" replace />} />
          <Route path="/crm/desk/:id" element={<CrmDeskRedirect />} />
          <Route path="/crm/online" element={<Navigate to="/crm/clients?category=ONLINE" replace />} />
          <Route path="/crm/performance" element={<Navigate to="/crm" replace />} />
          <Route path="/crm/prices" element={<CrmPricesPage />} />
          <Route path="/crm/staff" element={<CrmStaffPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/kyc" element={<KycPage />} />
          <Route path="/bank-accounts" element={<BankAccountsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
