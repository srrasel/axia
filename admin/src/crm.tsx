import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth'
import { Card, PageHeader, money } from './layout'
import { getActiveCurrency } from './currency'

function isManagerRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

/** CRM — all client transactions */
export function CrmTransactionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (q) params.set('q', q)
    void api<{ transactions: any[] }>(`/api/admin/crm/transactions?${params}`)
      .then((r) => setRows(r.transactions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => {
    load()
  }, [status, type])

  return (
    <div>
      <PageHeader title="CRM · Client transactions">
        <div className="flex flex-wrap gap-2">
          <input
            className="h-10 rounded-md border border-border px-3 text-sm"
            placeholder="Search client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select className="h-10 rounded border border-border px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="bonus">Bonus</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="trade_pnl">Trade PnL</option>
            <option value="fee">Fee</option>
          </select>
          <select className="h-10 rounded border border-border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" className="h-10 rounded bg-brand px-3 text-sm font-semibold text-white" onClick={load}>
            Refresh
          </button>
        </div>
      </PageHeader>
      {error ? <p className="mb-3 text-sell">{error}</p> : null}
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Fee</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">
                  <Link className="text-link" to={`/crm/desk/${t.user.id}`}>
                    {t.user.name}
                  </Link>
                  <div className="text-xs text-secondary">{t.user.email}</div>
                </td>
                <td className="px-3 py-2 text-secondary">{t.user.assignedTo?.name || '—'}</td>
                <td className="px-3 py-2 capitalize">{t.type}</td>
                <td className={`px-3 py-2 font-medium ${t.amount >= 0 ? 'text-buy' : 'text-sell'}`}>{money(t.amount)}</td>
                <td className="px-3 py-2">{money(t.fee || 0)}</td>
                <td className="px-3 py-2 capitalize">{t.status}</td>
                <td className="px-3 py-2 max-w-[180px] truncate">{t.note || t.payment}</td>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-secondary">
                  No transactions
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** CRM — client desk list + detail */
export function CrmDeskPage() {
  const [clients, setClients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (mine) params.set('mine', '1')
    void api<{ clients: any[] }>(`/api/admin/crm/clients?${params}`).then((r) => setClients(r.clients))
  }

  useEffect(() => {
    load()
    void api<{ staff: any[] }>('/api/admin/crm/staff').then((r) => setStaff(r.staff))
  }, [mine])

  return (
    <div>
      <PageHeader title="CRM · Client desk">
        <div className="flex flex-wrap gap-2">
          <input
            className="h-10 rounded-md border border-border px-3 text-sm"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <label className="flex h-10 items-center gap-2 rounded border border-border px-3 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            My clients
          </label>
          <button type="button" className="h-10 rounded bg-brand px-3 text-sm font-semibold text-white" onClick={load}>
            Search
          </button>
        </div>
      </PageHeader>
      <p className="mb-4 text-sm text-secondary">
        Open a client to view trades & transactions, log contacts, award bonuses, and control exit prices.
      </p>
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Assigned to</th>
              <th className="px-3 py-2">Floating</th>
              <th className="px-3 py-2">Realized</th>
              <th className="px-3 py-2">Open</th>
              <th className="px-3 py-2">Assign</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">
                  <button type="button" className="text-left text-link" onClick={() => navigate(`/crm/desk/${c.id}`)}>
                    {c.name}
                  </button>
                  <div className="text-xs text-secondary">{c.email}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={c.online ? 'text-buy' : 'text-secondary'}>{c.online ? 'Online' : 'Offline'}</span>
                  {c.funded ? <span className="ml-2 text-xs text-secondary">Funded</span> : null}
                </td>
                <td className="px-3 py-2">{c.assignedTo?.name || '—'}</td>
                <td className={`px-3 py-2 ${c.floatingPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{money(c.floatingPnl)}</td>
                <td className={`px-3 py-2 ${c.realizedPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{money(c.realizedPnl)}</td>
                <td className="px-3 py-2">{c.openTrades}</td>
                <td className="px-3 py-2">
                  <select
                    className="h-9 rounded border border-border px-2 text-xs"
                    value={c.assignedTo?.id || ''}
                    onChange={async (e) => {
                      await api(`/api/admin/crm/clients/${c.id}/assign`, {
                        method: 'PATCH',
                        body: JSON.stringify({ assignedToId: e.target.value || null }),
                      })
                      load()
                    }}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CrmClientDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const manager = isManagerRole(user?.role)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [bonus, setBonus] = useState({ accountId: '', amount: 100, note: 'Loyalty bonus' })
  const [adjust, setAdjust] = useState({ accountId: '', amount: 50, note: '' })
  const [exitPrices, setExitPrices] = useState<Record<string, string>>({})
  const [markPrices, setMarkPrices] = useState<Record<string, string>>({})

  const load = () =>
    void api<{ client: any; floatingPnl: number; realizedPnl: number; online: boolean }>(`/api/admin/crm/clients/${id}`)
      .then((r) => {
        setData(r)
        const acc = r.client.accounts[0]?.id || ''
        setBonus((b) => ({ ...b, accountId: b.accountId || acc }))
        setAdjust((a) => ({ ...a, accountId: a.accountId || acc }))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))

  useEffect(() => {
    load()
  }, [id])

  if (error) return <p className="text-sell">{error}</p>
  if (!data) return <p className="text-secondary">Loading client…</p>
  const c = data.client

  return (
    <div>
      <PageHeader title={`${c.name}`}>
        <Link to="/crm/desk" className="text-sm text-link">
          ← Back to desk
        </Link>
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Status" value={data.online ? 'Online' : 'Offline'} sub={c.email} />
        <Card title="Floating PnL" value={money(data.floatingPnl)} />
        <Card title="Realized PnL" value={money(data.realizedPnl)} />
        <Card title="Assigned" value={c.assignedTo?.name || '—'} sub={c.kycStatus} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">Accounts</h2>
          <div className="space-y-2 text-sm">
            {c.accounts.map((a: any) => (
              <div key={a.id} className="flex justify-between">
                <span>
                  {a.number} · {a.type}
                </span>
                <span className="font-semibold">{money(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-semibold">Log contact</h2>
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault()
              await api('/api/admin/crm/contacts', {
                method: 'POST',
                body: JSON.stringify({ clientId: c.id, note }),
              })
              setNote('')
              load()
            }}
          >
            <textarea
              className="min-h-[72px] rounded border border-border px-3 py-2 text-sm"
              placeholder="Call notes, WhatsApp, email…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
            />
            <button type="submit" className="h-10 self-start rounded bg-brand px-4 text-sm font-semibold text-white">
              Save contact
            </button>
          </form>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
            {(c.contactsAsClient || []).map((x: any) => (
              <div key={x.id} className="rounded bg-muted/50 px-2 py-1.5">
                <div className="text-xs text-secondary">
                  {x.staff.name} · {new Date(x.createdAt).toLocaleString()}
                </div>
                {x.note}
              </div>
            ))}
          </div>
        </div>
      </div>

      {manager ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <form
            className="rounded-xl border border-border bg-panel p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              await api('/api/admin/crm/bonus', { method: 'POST', body: JSON.stringify(bonus) })
              load()
            }}
          >
            <h2 className="mb-3 font-semibold">Award bonus</h2>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded border border-border px-2 text-sm"
                value={bonus.accountId}
                onChange={(e) => setBonus({ ...bonus, accountId: e.target.value })}
              >
                {c.accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.number} ({a.type})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="h-10 w-28 rounded border border-border px-2"
                value={bonus.amount}
                onChange={(e) => setBonus({ ...bonus, amount: Number(e.target.value) })}
              />
              <input
                className="h-10 flex-1 rounded border border-border px-2"
                value={bonus.note}
                onChange={(e) => setBonus({ ...bonus, note: e.target.value })}
              />
              <button type="submit" className="h-10 rounded bg-buy px-4 text-sm font-semibold text-white">
                Credit bonus
              </button>
            </div>
          </form>

          <form
            className="rounded-xl border border-border bg-panel p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              await api('/api/admin/crm/adjust', { method: 'POST', body: JSON.stringify(adjust) })
              load()
            }}
          >
            <h2 className="mb-3 font-semibold">Add / remove amount</h2>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded border border-border px-2 text-sm"
                value={adjust.accountId}
                onChange={(e) => setAdjust({ ...adjust, accountId: e.target.value })}
              >
                {c.accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.number} ({a.type})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="h-10 w-28 rounded border border-border px-2"
                value={adjust.amount}
                onChange={(e) => setAdjust({ ...adjust, amount: Number(e.target.value) })}
              />
              <input
                className="h-10 flex-1 rounded border border-border px-2"
                placeholder="Note"
                value={adjust.note}
                onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              />
              <button type="submit" className="h-10 rounded bg-brand px-4 text-sm font-semibold text-white">
                Apply
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <h2 className="mb-2 font-semibold">Open / recent trades</h2>
      <div className="mb-5 overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Vol</th>
              <th className="px-3 py-2">Open</th>
              <th className="px-3 py-2">Current</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">PnL</th>
              {manager ? <th className="px-3 py-2">Manager controls</th> : null}
            </tr>
          </thead>
          <tbody>
            {c.trades.map((t: any) => {
              const pnl = t.status === 'closed' ? t.realizedPnl || 0 : calcLocalPnl(t)
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.symbol}</td>
                  <td className="px-3 py-2 uppercase">{t.side}</td>
                  <td className="px-3 py-2">{t.volume}</td>
                  <td className="px-3 py-2">{t.openPrice}</td>
                  <td className="px-3 py-2">{t.currentPrice}</td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className={`px-3 py-2 ${pnl >= 0 ? 'text-buy' : 'text-sell'}`}>{money(pnl)}</td>
                  {manager && t.status === 'open' ? (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <input
                          className="h-8 w-24 rounded border border-border px-1 text-xs"
                          placeholder="Mark price"
                          value={markPrices[t.id] ?? ''}
                          onChange={(e) => setMarkPrices({ ...markPrices, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs"
                          onClick={async () => {
                            const currentPrice = Number(markPrices[t.id])
                            if (!currentPrice) return
                            await api(`/api/admin/crm/trades/${t.id}/price`, {
                              method: 'PATCH',
                              body: JSON.stringify({ currentPrice }),
                            })
                            load()
                          }}
                        >
                          Set price
                        </button>
                        <input
                          className="h-8 w-24 rounded border border-border px-1 text-xs"
                          placeholder="Exit"
                          value={exitPrices[t.id] ?? ''}
                          onChange={(e) => setExitPrices({ ...exitPrices, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          className="rounded bg-sell/10 px-2 py-1 text-xs text-sell"
                          onClick={async () => {
                            const exitPrice = Number(exitPrices[t.id])
                            await api(`/api/admin/crm/trades/${t.id}/close`, {
                              method: 'POST',
                              body: JSON.stringify(exitPrice ? { exitPrice } : {}),
                            })
                            load()
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </td>
                  ) : manager ? (
                    <td className="px-3 py-2 text-secondary">—</td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-semibold">Transactions</h2>
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {c.transactions.map((t: any) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 capitalize">{t.type}</td>
                <td className={`px-3 py-2 ${t.amount >= 0 ? 'text-buy' : 'text-sell'}`}>{money(t.amount)}</td>
                <td className="px-3 py-2 capitalize">{t.status}</td>
                <td className="px-3 py-2">{t.note || t.payment}</td>
                <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function calcLocalPnl(t: {
  side: string
  volume: number
  openPrice: number
  currentPrice: number
  category?: string
  swap?: number
}) {
  const direction = t.side === 'buy' ? 1 : -1
  const diff = (t.currentPrice - t.openPrice) * direction
  const cat = t.category || 'forex'
  let size = t.volume
  if (cat === 'forex') size = t.volume * 100000
  else if (cat === 'crypto') size = t.volume
  else if (cat === 'commodity') size = t.volume * 100
  else size = t.volume
  return Number((diff * size + (t.swap || 0)).toFixed(2))
}

/** Online clients */
export function CrmOnlinePage() {
  const [data, setData] = useState<any>(null)
  const load = () => void api('/api/admin/crm/online').then(setData)
  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  if (!data) return <p className="text-secondary">Loading online clients…</p>

  return (
    <div>
      <PageHeader title="CRM · Online now">
        <span className="rounded-full bg-buy/15 px-3 py-1 text-sm font-semibold text-buy">{data.count} connected</span>
      </PageHeader>
      <p className="mb-4 text-sm text-secondary">Clients active in the last {Math.round(data.onlineMs / 1000)} seconds (trading app open).</p>
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Last seen</th>
              <th className="px-3 py-2">Open trades</th>
              <th className="px-3 py-2">Floating</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">
                  <Link to={`/crm/desk/${u.id}`} className="text-link">
                    {u.name}
                  </Link>
                  <div className="text-xs text-secondary">{u.email}</div>
                </td>
                <td className="px-3 py-2">{u.assignedTo?.name || '—'}</td>
                <td className="px-3 py-2">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleTimeString() : '—'}</td>
                <td className="px-3 py-2">
                  {u.trades.map((t: any) => `${t.symbol} ${t.side}`).join(', ') || '—'}
                </td>
                <td className={`px-3 py-2 ${u.floatingPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{money(u.floatingPnl)}</td>
              </tr>
            ))}
            {data.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-secondary">
                  Nobody online right now — open the trading app as a client to appear here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Significant winners / losers */
export function CrmPerformancePage() {
  const [threshold, setThreshold] = useState(50)
  const [data, setData] = useState<any>(null)

  const load = () => void api(`/api/admin/crm/performance?threshold=${threshold}`).then(setData)
  useEffect(() => {
    load()
  }, [])

  if (!data) return <p className="text-secondary">Loading performance…</p>
  const { symbol } = getActiveCurrency()

  const Table = ({ rows, title }: { rows: any[]; title: string }) => (
    <div className="rounded-xl border border-border bg-panel">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-xs text-secondary">
          <tr>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Staff</th>
            <th className="px-3 py-2">Total PnL</th>
            <th className="px-3 py-2">Floating</th>
            <th className="px-3 py-2">Realized</th>
            <th className="px-3 py-2">Online</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">
                <Link to={`/crm/desk/${r.id}`} className="text-link">
                  {r.name}
                </Link>
              </td>
              <td className="px-3 py-2">{r.assignedTo?.name || '—'}</td>
              <td className={`px-3 py-2 font-semibold ${r.totalPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{money(r.totalPnl)}</td>
              <td className="px-3 py-2">{money(r.floatingPnl)}</td>
              <td className="px-3 py-2">{money(r.realizedPnl)}</td>
              <td className="px-3 py-2">{r.online ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-secondary">
                No clients above threshold
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <PageHeader title="CRM · Winners & losers">
        <div className="flex gap-2">
          <input
            type="number"
            className="h-10 w-28 rounded border border-border px-2 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <button type="button" className="h-10 rounded bg-brand px-4 text-sm font-semibold text-white" onClick={load}>
            Apply {symbol} threshold
          </button>
        </div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Table rows={data.winners} title={`Significant profits (≥ ${symbol}${data.threshold})`} />
        <Table rows={data.losers} title={`Significant losses (≥ ${symbol}${data.threshold})`} />
      </div>
    </div>
  )
}

/** Market price control */
export function CrmPricesPage() {
  const { user } = useAuth()
  const manager = isManagerRole(user?.role)
  const [data, setData] = useState<any>(null)
  const [forms, setForms] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)

  const load = () => void api('/api/admin/crm/prices').then(setData)
  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [])

  if (!data) return <p className="text-secondary">Loading prices…</p>

  return (
    <div>
      <PageHeader title="CRM · Market price control" />
      {!manager ? (
        <p className="mb-4 rounded bg-muted px-3 py-2 text-sm">View only — managers and admins can set forced prices.</p>
      ) : (
        <p className="mb-4 text-sm text-secondary">
          Forced prices override live quotes for all clients (open trade marks update immediately).
        </p>
      )}
      {msg ? <p className="mb-3 text-sm">{msg}</p> : null}
      <div className="overflow-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Live / forced</th>
              <th className="px-3 py-2">Bid / Ask</th>
              <th className="px-3 py-2">Override</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.quotes.map((q: any) => {
              const ov = data.overrides.find((o: any) => o.symbol === q.symbol && o.active)
              return (
                <tr key={q.symbol} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {q.symbol}
                    <div className="text-xs text-secondary">{q.name}</div>
                  </td>
                  <td className="px-3 py-2">
                    {q.price}
                    {ov ? <span className="ml-2 text-xs text-sell">FORCED</span> : null}
                  </td>
                  <td className="px-3 py-2 text-secondary">
                    {Number(q.bid).toFixed(5)} / {Number(q.ask).toFixed(5)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="h-9 w-32 rounded border border-border px-2"
                      disabled={!manager}
                      placeholder={String(q.price)}
                      value={forms[q.symbol] ?? ''}
                      onChange={(e) => setForms({ ...forms, [q.symbol]: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    {manager ? (
                      <>
                        <button
                          type="button"
                          className="text-link"
                          onClick={async () => {
                            const price = Number(forms[q.symbol] || q.price)
                            await api(`/api/admin/crm/prices/${q.symbol}`, {
                              method: 'PUT',
                              body: JSON.stringify({ price, active: true, note: 'CRM override' }),
                            })
                            setMsg(`Forced ${q.symbol} @ ${price}`)
                            load()
                          }}
                        >
                          Force
                        </button>
                        {ov ? (
                          <button
                            type="button"
                            className="text-sell"
                            onClick={async () => {
                              await api(`/api/admin/crm/prices/${q.symbol}`, { method: 'DELETE' })
                              setMsg(`Cleared ${q.symbol}`)
                              load()
                            }}
                          >
                            Clear
                          </button>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
