import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth'
import { Card, PageHeader, money, StatusBadge, btnPrimary, inputClass } from './layout'
import { getActiveCurrency } from './currency'

function isManagerRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

function pnlClass(n: number) {
  return n >= 0 ? 'text-buy' : 'text-sell'
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
      <PageHeader title="Client transactions" subtitle="Search and filter all client money movements.">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <input
            className={inputClass}
            placeholder="Search client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="bonus">Bonus</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="trade_pnl">Trade PnL</option>
            <option value="fee">Fee</option>
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" className={btnPrimary} onClick={load}>
            Refresh
          </button>
        </div>
      </PageHeader>
      {error ? <p className="mb-3 text-sell">{error}</p> : null}

      <div className="hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Assigned</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Fee</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <Link className="text-link" to={`/crm/desk/${t.user.id}`}>
                    {t.user.name}
                  </Link>
                  <div className="text-xs text-secondary">{t.user.email}</div>
                </td>
                <td className="px-3 py-2.5 text-secondary">{t.user.assignedTo?.name || '—'}</td>
                <td className="px-3 py-2.5 capitalize">{t.type}</td>
                <td className={`px-3 py-2.5 font-medium ${pnlClass(t.amount)}`}>{money(t.amount)}</td>
                <td className="px-3 py-2.5">{money(t.fee || 0)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={t.status} />
                </td>
                <td className="max-w-[180px] truncate px-3 py-2.5">{t.note || t.payment}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-secondary">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
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

      <div className="space-y-2 md:hidden">
        {rows.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="font-medium text-link" to={`/crm/desk/${t.user.id}`}>
                  {t.user.name}
                </Link>
                <div className="truncate text-xs text-secondary">{t.user.email}</div>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Type</div>
                <div className="capitalize">{t.type}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Amount</div>
                <div className={`font-semibold ${pnlClass(t.amount)}`}>{money(t.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Fee</div>
                <div>{money(t.fee || 0)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Assigned</div>
                <div className="text-secondary">{t.user.assignedTo?.name || '—'}</div>
              </div>
            </div>
            {(t.note || t.payment) && (
              <div className="mt-2 truncate text-xs text-secondary">{t.note || t.payment}</div>
            )}
            <div className="mt-2 text-xs text-secondary">{new Date(t.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center text-sm text-secondary">
            No transactions
          </div>
        ) : null}
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
      <PageHeader
        title="Client desk"
        subtitle="Open a client to view trades & transactions, log contacts, award bonuses, and control exit prices."
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <input
            className={inputClass}
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            My clients
          </label>
          <button type="button" className={btnPrimary} onClick={load}>
            Search
          </button>
        </div>
      </PageHeader>

      <div className="hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Assigned to</th>
              <th className="px-3 py-2.5">Floating</th>
              <th className="px-3 py-2.5">Realized</th>
              <th className="px-3 py-2.5">Open</th>
              <th className="px-3 py-2.5">Assign</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <button type="button" className="text-left text-link" onClick={() => navigate(`/crm/desk/${c.id}`)}>
                    {c.name}
                  </button>
                  <div className="text-xs text-secondary">{c.email}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={c.online ? 'Online' : 'Offline'} />
                    {c.funded ? <span className="text-xs text-secondary">Funded</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2.5">{c.assignedTo?.name || '—'}</td>
                <td className={`px-3 py-2.5 ${pnlClass(c.floatingPnl)}`}>{money(c.floatingPnl)}</td>
                <td className={`px-3 py-2.5 ${pnlClass(c.realizedPnl)}`}>{money(c.realizedPnl)}</td>
                <td className="px-3 py-2.5">{c.openTrades}</td>
                <td className="px-3 py-2.5">
                  <select
                    className="h-9 rounded-xl border border-border bg-panel px-2 text-xs"
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
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-secondary">
                  No clients found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {clients.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => navigate(`/crm/desk/${c.id}`)}
              >
                <div className="font-medium text-link">{c.name}</div>
                <div className="truncate text-xs text-secondary">{c.email}</div>
              </button>
              <StatusBadge status={c.online ? 'Online' : 'Offline'} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Floating</div>
                <div className={`font-semibold ${pnlClass(c.floatingPnl)}`}>{money(c.floatingPnl)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Realized</div>
                <div className={`font-semibold ${pnlClass(c.realizedPnl)}`}>{money(c.realizedPnl)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Open</div>
                <div>{c.openTrades}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Assigned</div>
                <div className="text-secondary">{c.assignedTo?.name || '—'}</div>
              </div>
            </div>
            <select
              className={`${inputClass} mt-3 w-full`}
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
          </div>
        ))}
        {clients.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center text-sm text-secondary">
            No clients found
          </div>
        ) : null}
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
      <PageHeader title={c.name} subtitle={c.email}>
        <Link to="/crm/desk" className="text-sm text-link">
          ← Back to desk
        </Link>
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Status" value={data.online ? 'Online' : 'Offline'} sub={c.email} tone={data.online ? 'good' : 'neutral'} />
        <Card title="Floating PnL" value={money(data.floatingPnl)} tone={data.floatingPnl >= 0 ? 'good' : 'bad'} />
        <Card title="Realized PnL" value={money(data.realizedPnl)} tone={data.realizedPnl >= 0 ? 'good' : 'bad'} />
        <Card title="Assigned" value={c.assignedTo?.name || '—'} sub={c.kycStatus} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">Accounts</h2>
          <div className="space-y-2 text-sm">
            {c.accounts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <span className="text-secondary">
                  {a.number} · {a.type}
                </span>
                <span className="font-semibold tabular-nums">{money(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
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
              className="min-h-[72px] w-full rounded-xl border border-border bg-panel px-3 py-2 text-sm outline-none placeholder:text-secondary hover:border-white/40 focus:border-accent"
              placeholder="Call notes, WhatsApp, email…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
            />
            <button type="submit" className={`${btnPrimary} self-start`}>
              Save contact
            </button>
          </form>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
            {(c.contactsAsClient || []).map((x: any) => (
              <div key={x.id} className="rounded-xl bg-muted/50 px-3 py-2">
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
            className="rounded-2xl border border-border bg-panel p-4 sm:p-5"
            onSubmit={async (e) => {
              e.preventDefault()
              await api('/api/admin/crm/bonus', { method: 'POST', body: JSON.stringify(bonus) })
              load()
            }}
          >
            <h2 className="mb-3 font-semibold">Award bonus</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                className={inputClass}
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
                className={`${inputClass} sm:w-28`}
                value={bonus.amount}
                onChange={(e) => setBonus({ ...bonus, amount: Number(e.target.value) })}
              />
              <input
                className={`${inputClass} sm:min-w-[140px] sm:flex-1`}
                value={bonus.note}
                onChange={(e) => setBonus({ ...bonus, note: e.target.value })}
              />
              <button type="submit" className="h-10 rounded-xl bg-buy px-4 text-sm font-semibold text-white">
                Credit bonus
              </button>
            </div>
          </form>

          <form
            className="rounded-2xl border border-border bg-panel p-4 sm:p-5"
            onSubmit={async (e) => {
              e.preventDefault()
              await api('/api/admin/crm/adjust', { method: 'POST', body: JSON.stringify(adjust) })
              load()
            }}
          >
            <h2 className="mb-3 font-semibold">Add / remove amount</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                className={inputClass}
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
                className={`${inputClass} sm:w-28`}
                value={adjust.amount}
                onChange={(e) => setAdjust({ ...adjust, amount: Number(e.target.value) })}
              />
              <input
                className={`${inputClass} sm:min-w-[140px] sm:flex-1`}
                placeholder="Note"
                value={adjust.note}
                onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              />
              <button type="submit" className={btnPrimary}>
                Apply
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <h2 className="mb-2 font-semibold">Open / recent trades</h2>
      <div className="mb-5 hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Side</th>
              <th className="px-3 py-2.5">Vol</th>
              <th className="px-3 py-2.5">Open</th>
              <th className="px-3 py-2.5">Current</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">PnL</th>
              {manager ? <th className="px-3 py-2.5">Manager controls</th> : null}
            </tr>
          </thead>
          <tbody>
            {c.trades.map((t: any) => {
              const pnl = t.status === 'closed' ? t.realizedPnl || 0 : calcLocalPnl(t)
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                  <td className="px-3 py-2.5 uppercase">{t.side}</td>
                  <td className="px-3 py-2.5">{t.volume}</td>
                  <td className="px-3 py-2.5">{t.openPrice}</td>
                  <td className="px-3 py-2.5">{t.currentPrice}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className={`px-3 py-2.5 font-medium ${pnlClass(pnl)}`}>{money(pnl)}</td>
                  {manager && t.status === 'open' ? (
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <input
                          className="h-8 w-24 rounded-lg border border-border bg-panel px-1 text-xs"
                          placeholder="Mark price"
                          value={markPrices[t.id] ?? ''}
                          onChange={(e) => setMarkPrices({ ...markPrices, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
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
                          className="h-8 w-24 rounded-lg border border-border bg-panel px-1 text-xs"
                          placeholder="Exit"
                          value={exitPrices[t.id] ?? ''}
                          onChange={(e) => setExitPrices({ ...exitPrices, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          className="rounded-lg bg-sell/10 px-2 py-1 text-xs text-sell"
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
                    <td className="px-3 py-2.5 text-secondary">—</td>
                  ) : null}
                </tr>
              )
            })}
            {c.trades.length === 0 ? (
              <tr>
                <td colSpan={manager ? 8 : 7} className="px-3 py-8 text-center text-secondary">
                  No trades
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mb-5 space-y-2 md:hidden">
        {c.trades.map((t: any) => {
          const pnl = t.status === 'closed' ? t.realizedPnl || 0 : calcLocalPnl(t)
          return (
            <div key={t.id} className="rounded-2xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{t.symbol}</div>
                  <div className="text-xs uppercase text-secondary">
                    {t.side} · vol {t.volume}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-secondary">Open</div>
                  <div>{t.openPrice}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-secondary">Current</div>
                  <div>{t.currentPrice}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase tracking-wide text-secondary">PnL</div>
                  <div className={`font-semibold ${pnlClass(pnl)}`}>{money(pnl)}</div>
                </div>
              </div>
              {manager && t.status === 'open' ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={inputClass}
                      placeholder="Mark price"
                      value={markPrices[t.id] ?? ''}
                      onChange={(e) => setMarkPrices({ ...markPrices, [t.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      className="h-10 rounded-xl border border-border px-3 text-sm hover:bg-muted"
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
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={inputClass}
                      placeholder="Exit"
                      value={exitPrices[t.id] ?? ''}
                      onChange={(e) => setExitPrices({ ...exitPrices, [t.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      className="h-10 rounded-xl bg-sell/10 px-3 text-sm font-semibold text-sell"
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
                </div>
              ) : null}
            </div>
          )
        })}
        {c.trades.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center text-sm text-secondary">
            No trades
          </div>
        ) : null}
      </div>

      <h2 className="mb-2 font-semibold">Transactions</h2>
      <div className="hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {c.transactions.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2.5 capitalize">{t.type}</td>
                <td className={`px-3 py-2.5 font-medium ${pnlClass(t.amount)}`}>{money(t.amount)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-3 py-2.5">{t.note || t.payment}</td>
                <td className="px-3 py-2.5 text-secondary">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {c.transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-secondary">
                  No transactions
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {c.transactions.map((t: any) => (
          <div key={t.id} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="capitalize font-medium">{t.type}</div>
              <StatusBadge status={t.status} />
            </div>
            <div className={`mt-2 text-lg font-semibold ${pnlClass(t.amount)}`}>{money(t.amount)}</div>
            {(t.note || t.payment) && <div className="mt-1 text-sm text-secondary">{t.note || t.payment}</div>}
            <div className="mt-2 text-xs text-secondary">{new Date(t.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {c.transactions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center text-sm text-secondary">
            No transactions
          </div>
        ) : null}
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
      <PageHeader
        title="Online now"
        subtitle={`Clients active in the last ${Math.round(data.onlineMs / 1000)} seconds (trading app open).`}
      >
        <span className="inline-flex rounded-full border border-buy/25 bg-buy/15 px-3 py-1 text-sm font-semibold text-buy">
          {data.count} connected
        </span>
      </PageHeader>

      <div className="hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Assigned</th>
              <th className="px-3 py-2.5">Last seen</th>
              <th className="px-3 py-2.5">Open trades</th>
              <th className="px-3 py-2.5">Floating</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <Link to={`/crm/desk/${u.id}`} className="text-link">
                    {u.name}
                  </Link>
                  <div className="text-xs text-secondary">{u.email}</div>
                </td>
                <td className="px-3 py-2.5">{u.assignedTo?.name || '—'}</td>
                <td className="px-3 py-2.5">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleTimeString() : '—'}</td>
                <td className="px-3 py-2.5">
                  {u.trades.map((t: any) => `${t.symbol} ${t.side}`).join(', ') || '—'}
                </td>
                <td className={`px-3 py-2.5 font-medium ${pnlClass(u.floatingPnl)}`}>{money(u.floatingPnl)}</td>
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

      <div className="space-y-2 md:hidden">
        {data.users.map((u: any) => (
          <div key={u.id} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/crm/desk/${u.id}`} className="font-medium text-link">
                  {u.name}
                </Link>
                <div className="truncate text-xs text-secondary">{u.email}</div>
              </div>
              <StatusBadge status="Online" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Last seen</div>
                <div>{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleTimeString() : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Floating</div>
                <div className={`font-semibold ${pnlClass(u.floatingPnl)}`}>{money(u.floatingPnl)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Assigned</div>
                <div className="text-secondary">{u.assignedTo?.name || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Open trades</div>
                <div className="text-secondary">
                  {u.trades.map((t: any) => `${t.symbol} ${t.side}`).join(', ') || '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {data.users.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center text-sm text-secondary">
            Nobody online right now — open the trading app as a client to appear here.
          </div>
        ) : null}
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

  const PerformanceList = ({ rows, title }: { rows: any[]; title: string }) => (
    <div className="rounded-2xl border border-border bg-panel">
      <div className="border-b border-border px-4 py-3 font-semibold">{title}</div>

      <div className="hidden overflow-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Staff</th>
              <th className="px-3 py-2.5">Total PnL</th>
              <th className="px-3 py-2.5">Floating</th>
              <th className="px-3 py-2.5">Realized</th>
              <th className="px-3 py-2.5">Online</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <Link to={`/crm/desk/${r.id}`} className="text-link">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5">{r.assignedTo?.name || '—'}</td>
                <td className={`px-3 py-2.5 font-semibold ${pnlClass(r.totalPnl)}`}>{money(r.totalPnl)}</td>
                <td className={`px-3 py-2.5 ${pnlClass(r.floatingPnl)}`}>{money(r.floatingPnl)}</td>
                <td className={`px-3 py-2.5 ${pnlClass(r.realizedPnl)}`}>{money(r.realizedPnl)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.online ? 'Yes' : 'No'} />
                </td>
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

      <div className="space-y-2 p-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/crm/desk/${r.id}`} className="font-medium text-link">
                {r.name}
              </Link>
              <StatusBadge status={r.online ? 'Online' : 'Offline'} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Total PnL</div>
                <div className={`font-semibold ${pnlClass(r.totalPnl)}`}>{money(r.totalPnl)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Staff</div>
                <div className="text-secondary">{r.assignedTo?.name || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Floating</div>
                <div className={pnlClass(r.floatingPnl)}>{money(r.floatingPnl)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-secondary">Realized</div>
                <div className={pnlClass(r.realizedPnl)}>{money(r.realizedPnl)}</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-secondary">No clients above threshold</div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Winners & losers" subtitle="Clients with significant profit or loss vs threshold.">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            type="number"
            className={`${inputClass} sm:w-28`}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <button type="button" className={btnPrimary} onClick={load}>
            Apply {symbol} threshold
          </button>
        </div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceList rows={data.winners} title={`Significant profits (≥ ${symbol}${data.threshold})`} />
        <PerformanceList rows={data.losers} title={`Significant losses (≥ ${symbol}${data.threshold})`} />
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

  const forcePrice = async (q: any) => {
    const price = Number(forms[q.symbol] || q.price)
    await api(`/api/admin/crm/prices/${q.symbol}`, {
      method: 'PUT',
      body: JSON.stringify({ price, active: true, note: 'CRM override' }),
    })
    setMsg(`Forced ${q.symbol} @ ${price}`)
    load()
  }

  const clearPrice = async (symbol: string) => {
    await api(`/api/admin/crm/prices/${symbol}`, { method: 'DELETE' })
    setMsg(`Cleared ${symbol}`)
    load()
  }

  return (
    <div>
      <PageHeader title="Market prices" />
      {!manager ? (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          View only — managers and admins can set forced prices.
        </p>
      ) : (
        <p className="mb-4 text-sm text-secondary">
          Forced prices override live quotes for all clients (open trade marks update immediately).
        </p>
      )}
      {msg ? <p className="mb-3 rounded-xl border border-buy/30 bg-buy/10 px-3 py-2 text-sm text-buy">{msg}</p> : null}

      <div className="hidden overflow-auto rounded-2xl border border-border bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-secondary">
            <tr>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Live / forced</th>
              <th className="px-3 py-2.5">Bid / Ask</th>
              <th className="px-3 py-2.5">Override</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.quotes.map((q: any) => {
              const ov = data.overrides.find((o: any) => o.symbol === q.symbol && o.active)
              return (
                <tr key={q.symbol} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">
                    {q.symbol}
                    <div className="text-xs text-secondary">{q.name}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="tabular-nums">{q.price}</span>
                    {ov ? (
                      <span className="ml-2">
                        <StatusBadge status="Forced" />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-secondary">
                    {Number(q.bid).toFixed(5)} / {Number(q.ask).toFixed(5)}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      className={`${inputClass} sm:w-32`}
                      disabled={!manager}
                      placeholder={String(q.price)}
                      value={forms[q.symbol] ?? ''}
                      onChange={(e) => setForms({ ...forms, [q.symbol]: e.target.value })}
                    />
                  </td>
                  <td className="space-x-2 px-3 py-2.5">
                    {manager ? (
                      <>
                        <button type="button" className="text-link" onClick={() => void forcePrice(q)}>
                          Force
                        </button>
                        {ov ? (
                          <button
                            type="button"
                            className="text-sell"
                            onClick={() => void clearPrice(q.symbol)}
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

      <div className="space-y-2 md:hidden">
        {data.quotes.map((q: any) => {
          const ov = data.overrides.find((o: any) => o.symbol === q.symbol && o.active)
          return (
            <div key={q.symbol} className="rounded-2xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{q.symbol}</div>
                  <div className="text-xs text-secondary">{q.name}</div>
                </div>
                {ov ? <StatusBadge status="Forced" /> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-secondary">Price</div>
                  <div className="font-medium tabular-nums">{q.price}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-secondary">Bid / Ask</div>
                  <div className="tabular-nums text-secondary">
                    {Number(q.bid).toFixed(5)} / {Number(q.ask).toFixed(5)}
                  </div>
                </div>
              </div>
              {manager ? (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    className={inputClass}
                    placeholder={String(q.price)}
                    value={forms[q.symbol] ?? ''}
                    onChange={(e) => setForms({ ...forms, [q.symbol]: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} onClick={() => void forcePrice(q)}>
                      Force
                    </button>
                    {ov ? (
                      <button
                        type="button"
                        className="h-10 rounded-xl border border-sell/30 bg-sell/10 px-4 text-sm font-semibold text-sell"
                        onClick={() => void clearPrice(q.symbol)}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
