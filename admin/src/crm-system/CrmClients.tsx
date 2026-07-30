import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Copy,
  Download,
  Eye,
  Phone,
  Bookmark,
} from 'lucide-react'
import { api } from '../api'
import { TablePagination, money } from '../layout'
import type { AdminUser } from '../auth'

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'BAD', label: 'BAD' },
  { id: 'CONVERSION', label: 'Conversion' },
  { id: 'FTD', label: 'FTD' },
  { id: 'NEW', label: 'New' },
  { id: 'ONLINE', label: 'Online' },
  { id: 'ONLINE_FTD', label: 'Online + FTD' },
  { id: 'POTENTIAL', label: 'Potential' },
  { id: 'PRACTICE', label: 'Practice' },
  { id: 'RETENTION', label: 'Retention' },
  { id: 'TEST', label: 'Test' },
] as const

type ClientRow = {
  id: string
  crmNumber: number | null
  name: string
  email: string
  phone: string | null
  country: string | null
  crmStatus: string
  crmCategory: string
  clientSource: string | null
  lastInteractionAt: string | null
  lastSeenAt?: string | null
  firstDepositAt?: string | null
  createdAt: string
  totalDeposits: number
  balance?: number
  online: boolean
  assignedTo: { id: string; name: string; email: string } | null
}

type ListRes = {
  clients: ClientRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  categoryCounts: Record<string, number>
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function exportCsv(rows: ClientRow[]) {
  const headers = [
    'CRM ID',
    'Name',
    'Country',
    'Status',
    'First Deposit',
    'Last Login',
    'Last Interaction',
    'Balance',
    'Assigned To',
    'Email',
    'Phone',
  ]
  const lines = rows.map((c) =>
    [
      c.crmNumber ?? '',
      c.name,
      c.country ?? '',
      c.crmStatus,
      c.firstDepositAt ?? '',
      c.lastSeenAt ?? '',
      c.lastInteractionAt ?? '',
      c.balance ?? c.totalDeposits,
      c.assignedTo?.name ?? '',
      c.email,
      c.phone ?? '',
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `crm-clients-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const colFilterClass =
  'mt-1 h-7 w-full min-w-[90px] rounded border border-border bg-[#12151a] px-1.5 text-[11px] outline-none hover:border-accent/50 focus:border-accent'

export function CrmClientsPage({ me }: { me: AdminUser }) {
  const [params] = useSearchParams()
  const [category, setCategory] = useState(params.get('category') || 'ALL')
  const [data, setData] = useState<ListRes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [bulkAssign, setBulkAssign] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [col, setCol] = useState({
    name: '',
    country: '',
    status: '',
    assigned: '',
  })

  const query = useMemo(() => {
    const q = new URLSearchParams()
    q.set('page', String(page))
    q.set('pageSize', String(pageSize))
    q.set('sort', 'createdAt')
    q.set('order', 'desc')
    if (category && category !== 'ALL') q.set('category', category)
    if (col.name.trim()) q.set('search', col.name.trim())
    if (col.country.trim()) q.set('country', col.country.trim())
    if (col.status.trim()) q.set('status', col.status.trim())
    if (col.assigned.trim()) q.set('employeeId', col.assigned.trim())
    return q.toString()
  }, [category, col, page])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api<ListRes>(`/api/admin/crm/clients-v2?${query}`)
      setData(res)
      setSelected(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [query])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (me.role !== 'ADMIN') return
    void api<{ staff: { id: string; name: string }[] }>('/api/admin/crm/staff')
      .then((r) => setStaff(r.staff.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [me.role])

  const clients = data?.clients ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const allSelected = clients.length > 0 && clients.every((c) => selected.has(c.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(clients.map((c) => c.id)))
  }

  function toggleOne(cid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  async function runBulkAssign() {
    if (selected.size === 0 || !bulkAssign) return
    setBusy(true)
    try {
      await api('/api/admin/crm/clients-v2/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: [...selected],
          action: 'assign',
          assignedToId: bulkAssign === 'none' ? null : bulkAssign,
        }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-1 space-y-3 lg:-mx-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-text">Clients</h1>
        <div className="flex flex-wrap items-center gap-2">
          {me.role === 'ADMIN' && (
            <>
              <select
                value={bulkAssign}
                onChange={(e) => setBulkAssign(e.target.value)}
                className="h-8 rounded-lg border border-border bg-[#161a21] px-2 text-[11px] outline-none hover:border-accent/50 focus:border-accent"
              >
                <option value="">Mass Assign…</option>
                <option value="none">Unassign</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || selected.size === 0 || !bulkAssign}
                onClick={() => void runBulkAssign()}
                className="h-8 rounded-lg bg-accent px-3 text-[11px] font-semibold text-[#202630] hover:bg-[#ceaf30] disabled:opacity-40"
              >
                Mass Assign ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="flex min-w-max">
          {CATEGORIES.map((cat) => {
            const count = data?.categoryCounts?.[cat.id]
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id)
                  setPage(1)
                }}
                className={`border-b-2 px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-transparent text-secondary hover:bg-[#1c222c] hover:text-text'
                }`}
              >
                {cat.label}
                {typeof count === 'number' ? (
                  <span className="ml-1 text-[10px] opacity-70">({count})</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { icon: Bookmark, title: 'Flag' },
          { icon: Phone, title: 'Call' },
          { icon: Eye, title: 'View' },
          { icon: Download, title: 'Export', onClick: () => exportCsv(clients) },
          {
            icon: Copy,
            title: 'Copy IDs',
            onClick: () => {
              const ids = clients.filter((c) => selected.has(c.id)).map((c) => c.crmNumber ?? c.id)
              void navigator.clipboard.writeText(ids.join('\n'))
            },
          },
        ].map(({ icon: Icon, title, onClick }) => (
          <button
            key={title}
            type="button"
            title={title}
            onClick={onClick}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#161a21] text-secondary hover:border-accent/50 hover:text-accent"
          >
            <Icon size={14} />
          </button>
        ))}
        <span className="ml-2 text-[11px] text-secondary">
          Tip: use Shift + mouse wheel to scroll horizontally
        </span>
      </div>

      {error && <p className="text-sm text-sell">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <table className="w-full min-w-[1200px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-border bg-[#12151a]/80 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              <th className="px-2 py-2 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-2 py-2 min-w-[160px]">
                Client Name
                <input
                  className={colFilterClass}
                  placeholder="Filter…"
                  value={col.name}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, name: e.target.value }))
                    setPage(1)
                  }}
                />
              </th>
              <th className="px-2 py-2 min-w-[120px]">
                Country
                <input
                  className={colFilterClass}
                  placeholder="Filter…"
                  value={col.country}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, country: e.target.value }))
                    setPage(1)
                  }}
                />
              </th>
              <th className="px-2 py-2 min-w-[130px]">
                Client Status
                <input
                  className={colFilterClass}
                  placeholder="Filter…"
                  value={col.status}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, status: e.target.value }))
                    setPage(1)
                  }}
                />
              </th>
              <th className="px-2 py-2 min-w-[140px]">First Deposit Date</th>
              <th className="px-2 py-2 min-w-[140px]">Last Login Date</th>
              <th className="px-2 py-2 min-w-[140px]">Last Interaction</th>
              <th className="px-2 py-2 min-w-[100px] text-right">Balance</th>
              <th className="px-2 py-2 min-w-[120px]">
                Assigned To
                {me.role === 'ADMIN' ? (
                  <select
                    className={colFilterClass}
                    value={col.assigned}
                    onChange={(e) => {
                      setCol((s) => ({ ...s, assigned: e.target.value }))
                      setPage(1)
                    }}
                  >
                    <option value="">All</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </th>
              <th className="px-2 py-2 w-12">More</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-[#1c222c]/80"
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                  />
                </td>
                <td className="px-2 py-2">
                  <Link
                    to={`/crm/clients/${c.id}`}
                    className="font-semibold text-text hover:text-accent"
                  >
                    {c.name}
                  </Link>
                  <div className="text-[10px] text-secondary">
                    #{c.crmNumber ?? '—'} · {c.email}
                  </div>
                </td>
                <td className="px-2 py-2 text-secondary">{c.country || '—'}</td>
                <td className="px-2 py-2">
                  <span className="rounded border border-border bg-[#12151a] px-1.5 py-0.5 text-[10px] font-medium">
                    {c.crmStatus}
                  </span>
                </td>
                <td className="px-2 py-2 text-[11px] text-secondary">{fmt(c.firstDepositAt)}</td>
                <td className="px-2 py-2 text-[11px] text-secondary">{fmt(c.lastSeenAt)}</td>
                <td className="px-2 py-2 text-[11px] text-secondary">{fmt(c.lastInteractionAt)}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {money(c.balance ?? c.totalDeposits)}
                </td>
                <td className="px-2 py-2 text-secondary">{c.assignedTo?.name || '—'}</td>
                <td className="px-2 py-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                      c.online ? 'bg-buy/25 text-buy' : 'bg-muted text-secondary'
                    }`}
                    title={c.online ? 'Online' : 'Offline'}
                  >
                    L
                  </span>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-secondary">
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          from={from}
          to={to}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
