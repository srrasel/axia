import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { AuthProvider, useAuth } from './auth'
import { AdminLayout, Card, PageHeader, money } from './layout'
import { setActiveCurrency, useCurrency } from './currency'
import { BrandLogo } from './BrandLogo'
import { Dashboard } from './dashboard'
import {
  CrmClientDetailPage,
  CrmDeskPage,
  CrmOnlinePage,
  CrmPerformancePage,
  CrmPricesPage,
  CrmTransactionsPage,
} from './crm'

function Login() {
  const { login, verify2fa, user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@seekapa.com')
  const [password, setPassword] = useState('admin123')
  const [code, setCode] = useState('')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        className="w-full max-w-md rounded-2xl border border-border bg-panel/95 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          setError(null)
          if (tempToken) {
            const err = await verify2fa(tempToken, code)
            if (err) setError(err)
            else navigate('/')
            return
          }
          const result = await login(email, password)
          if (!result) {
            navigate('/')
            return
          }
          if (result.requires2fa && result.tempToken) {
            setTempToken(result.tempToken)
            return
          }
          setError(result.error || 'Login failed')
        }}
      >
        <div className="mb-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <BrandLogo variant="light" className="h-12" />
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">CRM</span>
          </div>
          <p className="mt-2 text-sm text-secondary">
            {tempToken ? 'Enter Google Authenticator code' : 'Manager · Employee · Admin desk'}
          </p>
        </div>
        {error ? <p className="mb-3 rounded bg-sell/10 px-3 py-2 text-sm text-sell">{error}</p> : null}
        {!tempToken ? (
          <>
            <label className="mb-3 block text-sm">
              Email
              <input
                className="mt-1 h-11 w-full rounded-md border border-border px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="mb-4 block text-sm">
              Password
              <input
                type="password"
                className="mt-1 h-11 w-full rounded-md border border-border px-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="mb-4 block text-sm">
            Authenticator code
            <input
              className="mt-1 h-11 w-full rounded-md border border-border px-3 tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="000000"
              autoFocus
            />
          </label>
        )}
        <button type="submit" className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-white">
          {tempToken ? 'Verify & sign in' : 'Sign in'}
        </button>
        {tempToken ? (
          <button
            type="button"
            className="mt-3 h-9 w-full text-sm text-secondary"
            onClick={() => {
              setTempToken(null)
              setCode('')
              setError(null)
            }}
          >
            ← Back
          </button>
        ) : null}
      </form>
    </div>
  )
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-full items-center justify-center text-secondary">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function EarningsPage() {
  const [data, setData] = useState<any>(null)
  const [type, setType] = useState('')
  const [manual, setManual] = useState({ amount: 50, description: 'Manual adjustment' })
  const [error, setError] = useState<string | null>(null)

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
      <PageHeader title="Platform Earnings">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">{data.currency || 'EUR'}</span>
          <select className="h-10 rounded border border-border px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
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

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">By type</h2>
          <div className="space-y-2">
            {data.byType.map((r: any) => (
              <div key={r.type} className="flex justify-between text-sm">
                <span className="capitalize">{r.type.replace('_', ' ')} ({r.count})</span>
                <span className="font-semibold text-buy">{money(r.amount)}</span>
              </div>
            ))}
            {data.byType.length === 0 ? <p className="text-sm text-secondary">No earnings yet — approve deposits or close trades.</p> : null}
          </div>
        </div>
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
      </div>

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
        <input type="number" className="h-10 w-28 rounded border border-border px-2" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: Number(e.target.value) })} />
        <input className="h-10 flex-1 rounded border border-border px-2" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} />
        <button type="submit" className="h-10 rounded bg-brand px-4 text-sm font-semibold text-white">Add</button>
      </form>

      <div className="overflow-auto rounded-xl border border-border bg-panel">
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
            {data.recent.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2 capitalize">{e.type.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2 font-semibold text-buy">{money(e.amount)}</td>
                <td className="px-3 py-2">{e.description}</td>
                <td className="px-3 py-2">{e.user?.name || '—'}</td>
                <td className="px-3 py-2">{new Date(e.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: 'demo123' })

  const load = () => void api<{ users: any[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users))
  useEffect(() => { load() }, [q])

  return (
    <div>
      <PageHeader title="Users">
        <div className="flex gap-2">
          <input className="h-10 rounded-md border border-border px-3 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white" onClick={() => setShowCreate(true)}>
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
          <button type="submit" className="h-10 rounded bg-brand text-sm font-semibold text-white">Save</button>
        </form>
      ) : null}
      <div className="overflow-auto rounded-xl border border-border bg-panel">
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
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-3 py-2"><Link className="font-medium text-link" to={`/users/${u.id}`}>{u.name}</Link></td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.kycStatus}</td>
                <td className="px-3 py-2">{u.funded ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{u.active ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{u._count?.trades ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [adjust, setAdjust] = useState({ accountId: '', amount: 100, note: '' })
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
          <button type="button" className="h-10 rounded bg-brand px-4 text-sm font-semibold text-white" onClick={async () => { await api(`/api/admin/accounts/${adjust.accountId}/adjust`, { method: 'POST', body: JSON.stringify({ amount: adjust.amount, note: adjust.note }) }); load() }}>
            Apply
          </button>
        </div>
      </div>
      <h2 className="mb-2 font-semibold">Accounts</h2>
      <div className="mb-6 overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2 text-left">Number</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Balance</th><th className="px-3 py-2 text-left">Equity</th></tr></thead>
          <tbody>{user.accounts.map((a: any) => <tr key={a.id} className="border-t"><td className="px-3 py-2">{a.number}</td><td className="px-3 py-2">{a.type}</td><td className="px-3 py-2">{money(a.balance)}</td><td className="px-3 py-2">{money(a.equity)}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 className="mb-2 font-semibold">Recent trades</h2>
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2 text-left">Symbol</th><th className="px-3 py-2 text-left">Side</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Volume</th><th className="px-3 py-2 text-left">PnL</th></tr></thead>
          <tbody>{user.trades.map((t: any) => <tr key={t.id} className="border-t"><td className="px-3 py-2">{t.symbol}</td><td className="px-3 py-2">{t.side}</td><td className="px-3 py-2">{t.status}</td><td className="px-3 py-2">{t.volume}</td><td className="px-3 py-2">{t.realizedPnl != null ? money(t.realizedPnl) : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  useEffect(() => { void api<{ accounts: any[] }>('/api/admin/accounts').then((r) => setAccounts(r.accounts)) }, [])
  return (
    <div>
      <PageHeader title="Accounts" />
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Number</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">Leverage</th></tr></thead>
          <tbody>{accounts.map((a) => <tr key={a.id} className="border-t"><td className="px-3 py-2">{a.user.name}</td><td className="px-3 py-2">{a.number}</td><td className="px-3 py-2">{a.type}</td><td className="px-3 py-2">{money(a.balance)}</td><td className="px-3 py-2">{a.leverage}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

function TradesPage() {
  const [trades, setTrades] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const load = () => void api<{ trades: any[] }>(`/api/admin/trades${status ? `?status=${status}` : ''}`).then((r) => setTrades(r.trades))
  useEffect(() => { load() }, [status])
  return (
    <div>
      <PageHeader title="Trades">
        <select className="h-10 rounded border border-border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </PageHeader>
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Symbol</th><th className="px-3 py-2">Side</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Vol</th><th className="px-3 py-2">Open</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">Action</th></tr></thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.user.name}</td>
                <td className="px-3 py-2">{t.symbol}</td>
                <td className="px-3 py-2">{t.side}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.volume}</td>
                <td className="px-3 py-2">{t.openPrice}</td>
                <td className="px-3 py-2">{t.currentPrice}</td>
                <td className="px-3 py-2">
                  {t.status === 'open' ? (
                    <button type="button" className="text-link" onClick={async () => { await api(`/api/admin/trades/${t.id}/close`, { method: 'POST' }); load() }}>Force close</button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [status, setStatus] = useState('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      <div className="overflow-auto rounded-xl border border-border bg-panel">
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
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
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
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-secondary">
                  No transactions for this filter
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KycPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const load = () => void api<{ documents: any[] }>('/api/admin/kyc').then((r) => setDocuments(r.documents))
  useEffect(() => { load() }, [])
  return (
    <div>
      <PageHeader title="KYC Reviews" />
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Doc</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t">
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
          </tbody>
        </table>
      </div>
    </div>
  )
}

type SettingDef = {
  key: string
  label: string
  description: string
  type: 'text' | 'number' | 'percent' | 'boolean' | 'select' | 'secret'
  group: string
  options?: string[]
  defaultValue: string
}

function SettingsPage() {
  const { refresh } = useCurrency()
  const [defs, setDefs] = useState<SettingDef[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [fx, setFx] = useState<any>(null)
  const [convertOnSave, setConvertOnSave] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingNow, setTestingNow] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [originalCurrency, setOriginalCurrency] = useState('EUR')

  const load = () =>
    void api<{ definitions: SettingDef[]; values: Record<string, string>; fx: any }>('/api/admin/settings')
      .then((r) => {
        setDefs(r.definitions || [])
        setValues(r.values || {})
        setFx(r.fx || null)
        const cur = r.values?.currency || 'EUR'
        setOriginalCurrency(cur)
        setActiveCurrency(cur)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))

  useEffect(() => {
    load()
  }, [])

  const groups = Array.from(new Set(defs.map((d) => d.group)))

  const setVal = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  if (error) return <p className="text-sell">{error}</p>
  if (!defs.length) return <p className="text-secondary">Loading settings…</p>

  const nextCur = values.currency || 'EUR'
  const ratePreview =
    fx?.matrix?.[originalCurrency]?.[nextCur] != null ? Number(fx.matrix[originalCurrency][nextCur]) : null

  return (
    <div>
      <PageHeader title="Settings">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={testingNow}
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            onClick={async () => {
              setTestingNow(true)
              setMsg(null)
              try {
                const r = await api<{
                  ok: boolean
                  sandbox?: boolean
                  apiStatus?: string
                  error?: string
                  sampleMinBtcUsd?: number
                }>('/api/admin/payments/nowpayments/test', { method: 'POST' })
                setMsg(
                  r.ok
                    ? `NOWPayments OK${r.sandbox ? ' (sandbox)' : ''} · ${r.apiStatus || 'connected'}${r.sampleMinBtcUsd != null ? ` · min BTC→USD ${r.sampleMinBtcUsd}` : ''}`
                    : `NOWPayments failed: ${r.error || 'unknown'}`,
                )
              } catch (e) {
                setMsg(e instanceof Error ? e.message : 'NOWPayments test failed')
              } finally {
                setTestingNow(false)
              }
            }}
          >
            {testingNow ? 'Testing…' : 'Test NOWPayments'}
          </button>
          <button
            type="button"
            disabled={saving}
            className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
            onClick={async () => {
              setSaving(true)
              setMsg(null)
              try {
                const r = await api<{ conversion?: any; values?: { currency?: string } }>(
                  '/api/admin/settings',
                  {
                    method: 'PUT',
                    body: JSON.stringify({ settings: values, convertCurrency: convertOnSave }),
                  },
                )
                const savedCurrency = r.values?.currency || values.currency || 'EUR'
                setActiveCurrency(savedCurrency)
                await refresh()
                if (r.conversion && r.conversion.rate !== 1) {
                  setMsg(
                    `Converted ${r.conversion.from} → ${r.conversion.to} at rate ${r.conversion.rate.toFixed(6)} (${r.conversion.source}, ${r.conversion.date}). Updated ${r.conversion.accounts} accounts, ${r.conversion.earnings} earnings, ${r.conversion.transactions} transactions.`,
                  )
                } else {
                  setMsg(`All settings saved · currency ${savedCurrency}`)
                }
                load()
              } catch (e) {
                setMsg(e instanceof Error ? e.message : 'Save failed')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </PageHeader>
      <p className="mb-4 text-sm text-secondary">
        Change currency to convert all balances, earnings, fees and limits using live ECB FX rates (USD / EUR / GBP).
      </p>
      {msg ? <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">{msg}</p> : null}

      {fx ? (
        <section className="mb-6 rounded-xl border border-border bg-panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Live FX rates (real price)</h2>
            <span className="text-xs text-secondary">
              {fx.source} · {fx.date}
              <button
                type="button"
                className="ml-2 text-link"
                onClick={() => void api('/api/admin/fx').then(setFx)}
              >
                Refresh
              </button>
            </span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs text-secondary">
                <tr>
                  <th className="px-3 py-2">From \\ To</th>
                  {['USD', 'EUR', 'GBP'].map((c) => (
                    <th key={c} className="px-3 py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['USD', 'EUR', 'GBP'].map((from) => (
                  <tr key={from} className="border-t">
                    <td className="px-3 py-2 font-medium">{from}</td>
                    {['USD', 'EUR', 'GBP'].map((to) => (
                      <td key={to} className="px-3 py-2 tabular-nums">
                        {Number(fx.matrix?.[from]?.[to] ?? 0).toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={convertOnSave} onChange={(e) => setConvertOnSave(e.target.checked)} />
              Convert balances with real FX when currency changes
            </label>
            {nextCur !== originalCurrency && ratePreview != null ? (
              <span className="rounded bg-buy/10 px-2 py-1 text-buy">
                Preview: 1 {originalCurrency} = {ratePreview.toFixed(4)} {nextCur}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group} className="rounded-xl border border-border bg-panel p-4">
            <h2 className="mb-4 text-base font-semibold">{group}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {defs
                .filter((d) => d.group === group)
                .map((d) => {
                  const v = values[d.key] ?? d.defaultValue
                  return (
                    <label key={d.key} className="block rounded-lg border border-border/60 bg-muted/30 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{d.label}</span>
                        <span className="text-[10px] uppercase text-secondary">{d.key}</span>
                      </div>
                      <p className="mb-2 text-xs text-secondary">{d.description}</p>
                      {d.type === 'boolean' ? (
                        <select
                          className="h-10 w-full rounded-md border border-border bg-panel px-2 text-sm"
                          value={v === 'true' ? 'true' : 'false'}
                          onChange={(e) => setVal(d.key, e.target.value)}
                        >
                          <option value="true">Enabled (true)</option>
                          <option value="false">Disabled (false)</option>
                        </select>
                      ) : d.type === 'select' && d.options ? (
                        <select
                          className="h-10 w-full rounded-md border border-border bg-panel px-2 text-sm"
                          value={v}
                          onChange={(e) => setVal(d.key, e.target.value)}
                        >
                          {d.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : d.type === 'secret' ? (
                        <input
                          type="password"
                          autoComplete="new-password"
                          className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm font-mono"
                          value={v}
                          placeholder="Paste API key / secret"
                          onChange={(e) => setVal(d.key, e.target.value)}
                          onFocus={() => {
                            if (v === '••••••••') setVal(d.key, '')
                          }}
                        />
                      ) : (
                        <input
                          type={d.type === 'number' || d.type === 'percent' ? 'number' : 'text'}
                          step={d.type === 'percent' ? '0.01' : undefined}
                          className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm"
                          value={v}
                          onChange={(e) => setVal(d.key, e.target.value)}
                        />
                      )}
                    </label>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <AdminLayout />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/crm/transactions" element={<CrmTransactionsPage />} />
          <Route path="/crm/desk" element={<CrmDeskPage />} />
          <Route path="/crm/desk/:id" element={<CrmClientDetailPage />} />
          <Route path="/crm/online" element={<CrmOnlinePage />} />
          <Route path="/crm/performance" element={<CrmPerformancePage />} />
          <Route path="/crm/prices" element={<CrmPricesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/kyc" element={<KycPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
