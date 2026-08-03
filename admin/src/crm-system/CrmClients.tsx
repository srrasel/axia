import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Phone,
  Bookmark,
  Plus,
  UserPlus,
} from 'lucide-react'
import { api } from '../api'
import { TablePagination, money } from '../layout'
import type { AdminUser } from '../auth'

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'BAD', label: 'Bad' },
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

const CREATE_ROLES = new Set(['ADMIN', 'MANAGER', 'TEAM_LEADER'])

const createInputClass =
  'h-10 w-full rounded-xl border border-border bg-[#12151a] px-3 text-sm outline-none hover:border-accent/50 focus:border-accent'

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
  filterMeta?: {
    countries?: { country: string | null }[]
    sources?: { clientSource: string | null }[]
  }
}

const DEFAULT_COUNTRIES = [
  'Saudi Arabia',
  'UAE',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Egypt',
  'United States',
  'United Kingdom',
  'India',
  'Pakistan',
  'Bangladesh',
  'Turkey',
  'Morocco',
  'Tunisia',
  'Algeria',
  'Lebanon',
  'Iraq',
  'Yemen',
]

function fmt(iso: string | null | undefined) {
  if (!iso) return '-'
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
  'h-9 w-full min-w-[110px] rounded-lg border border-border bg-[#12151a] px-2.5 text-sm outline-none hover:border-accent/50 focus:border-accent'
const colSelectStyle = {
  backgroundColor: '#12151a',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px 14px',
} as const
const colSelectClass =
  `${colFilterClass} cursor-pointer appearance-none pr-9`
const thClass = 'align-bottom px-3 py-3 text-left'
const thLabelClass = 'mb-1.5 block whitespace-nowrap text-[14px] font-semibold capitalize tracking-wide text-secondary'
const tdClass = 'align-middle px-3 py-3.5'

export function CrmClientsPage({ me }: { me: AdminUser }) {
  const navigate = useNavigate()
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
  const canCreate = CREATE_ROLES.has(me.role)
  const [showCreate, setShowCreate] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [createMsg, setCreateMsg] = useState<string | null>(null)
  const [toolbarMsg, setToolbarMsg] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    country: 'Saudi Arabia',
    clientSource: 'CRM',
    assignedToId: '',
  })

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

  const countryOptions = useMemo(() => {
    const fromDb = (data?.filterMeta?.countries || [])
      .map((c) => c.country)
      .filter((c): c is string => Boolean(c && c.trim()))
    return [...new Set([...DEFAULT_COUNTRIES, ...fromDb])].sort((a, b) => a.localeCompare(b))
  }, [data?.filterMeta?.countries])

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

  function selectedRows() {
    return clients.filter((c) => selected.has(c.id))
  }

  function needSelection(min = 1) {
    if (selected.size < min) {
      setToolbarMsg(min === 1 ? 'Select at least one client first' : `Select ${min} clients first`)
      setError(null)
      return false
    }
    setToolbarMsg(null)
    return true
  }

  async function flagSelected() {
    if (!needSelection()) return
    setBusy(true)
    setError(null)
    try {
      await api('/api/admin/crm/clients-v2/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: [...selected],
          action: 'category',
          crmCategory: 'POTENTIAL',
        }),
      })
      setToolbarMsg(`Flagged ${selected.size} client(s) as Potential`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flag failed')
    } finally {
      setBusy(false)
    }
  }

  async function callSelected() {
    if (!needSelection()) return
    const rows = selectedRows()
    if (rows.length !== 1) {
      setToolbarMsg('Select exactly one client to call')
      return
    }
    const c = rows[0]
    setBusy(true)
    setError(null)
    try {
      await api(`/api/admin/crm/clients-v2/${c.id}/comms`, {
        method: 'POST',
        body: JSON.stringify({
          channel: 'call',
          note: c.phone ? `Outbound call to ${c.phone}` : 'Outbound call attempted (no phone on file)',
        }),
      })
      if (c.phone) {
        window.location.href = `tel:${c.phone.replace(/[^\d+]/g, '')}`
        setToolbarMsg(`Calling ${c.name}...`)
      } else {
        setToolbarMsg(`No phone for ${c.name} - opened profile`)
        navigate(`/crm/clients/${c.id}`)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Call log failed')
    } finally {
      setBusy(false)
    }
  }

  function viewSelected() {
    if (!needSelection()) return
    const rows = selectedRows()
    navigate(`/crm/clients/${rows[0].id}`)
  }

  function exportSelected() {
    const rows = selected.size > 0 ? selectedRows() : clients
    if (rows.length === 0) {
      setToolbarMsg('No clients to export')
      return
    }
    exportCsv(rows)
    setToolbarMsg(`Exported ${rows.length} client(s)`)
  }

  async function copySelectedIds() {
    if (!needSelection()) return
    const ids = selectedRows().map((c) => String(c.crmNumber ?? c.id))
    try {
      await navigator.clipboard.writeText(ids.join('\n'))
      setToolbarMsg(`Copied ${ids.length} CRM ID(s)`)
    } catch {
      setToolbarMsg('Could not copy to clipboard')
    }
  }

  async function createClient(e: FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setBusy(true)
    setError(null)
    setCreateMsg(null)
    try {
      const body: Record<string, unknown> = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined,
        country: createForm.country.trim() || undefined,
        clientSource: createForm.clientSource.trim() || 'CRM',
      }
      if (me.role === 'ADMIN' && createForm.assignedToId) {
        body.assignedToId = createForm.assignedToId === 'none' ? null : createForm.assignedToId
      }
      const res = await api<{ client: { id: string; name: string } }>('/api/admin/crm/clients-v2', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setCreateMsg(`Created ${res.client.name}`)
      setShowCreate(false)
      setShowCreatePassword(false)
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        country: 'Saudi Arabia',
        clientSource: 'CRM',
        assignedToId: '',
      })
      await load()
      navigate(`/crm/clients/${res.client.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-1 space-y-4 lg:-mx-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">Clients</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setShowCreate((v) => !v)
                setCreateMsg(null)
                setShowCreatePassword(false)
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-[#202630] hover:bg-[#ceaf30]"
            >
              {showCreate ? (
                'Cancel'
              ) : (
                <>
                  <UserPlus size={16} />
                  Add Client
                </>
              )}
            </button>
          )}
          {me.role === 'ADMIN' && (
            <>
              <select
                value={bulkAssign}
                onChange={(e) => setBulkAssign(e.target.value)}
                className="h-10 rounded-xl border border-border bg-[#161a21] px-3 text-sm outline-none hover:border-accent/50 focus:border-accent"
              >
                <option value="">Mass Assign...</option>
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
                className="h-10 rounded-xl border border-border bg-[#161a21] px-4 text-sm font-semibold text-text hover:border-accent/50 disabled:opacity-40"
              >
                Mass Assign ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      {createMsg ? (
        <p className="rounded-xl border border-buy/30 bg-buy/15 px-3 py-2 text-sm text-buy">{createMsg}</p>
      ) : null}

      {showCreate && canCreate ? (
        <form
          onSubmit={(e) => void createClient(e)}
          className="grid gap-3 rounded-2xl border border-border bg-[#161a21] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <p className="text-sm font-semibold text-text">New client account</p>
            <p className="mt-0.5 text-xs text-secondary">
              {me.role === 'ADMIN'
                ? 'Creates a trading login with live + demo accounts. Optionally assign to a desk user.'
                : 'Creates a trading login with live + demo accounts, assigned to you.'}
            </p>
          </div>
          <label className="block text-xs text-secondary">
            Full name
            <input
              className={`${createInputClass} mt-1`}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Client name"
              required
              minLength={2}
            />
          </label>
          <label className="block text-xs text-secondary">
            Email
            <input
              type="email"
              className={`${createInputClass} mt-1`}
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="client@email.com"
              required
            />
          </label>
          <label className="block text-xs text-secondary">
            Password
            <div className="relative mt-1">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                className={`${createInputClass} pr-11`}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowCreatePassword((v) => !v)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-transparent p-0.5 text-secondary transition-colors hover:text-accent"
              >
                {showCreatePassword ? (
                  <EyeOff size={18} strokeWidth={1.75} />
                ) : (
                  <Eye size={18} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </label>
          <label className="block text-xs text-secondary">
            Phone
            <input
              className={`${createInputClass} mt-1`}
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="block text-xs text-secondary">
            Country
            <select
              className={`${createInputClass} mt-1`}
              value={createForm.country}
              onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
              required
            >
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-secondary">
            Source
            <input
              className={`${createInputClass} mt-1`}
              value={createForm.clientSource}
              onChange={(e) => setCreateForm({ ...createForm, clientSource: e.target.value })}
              placeholder="CRM"
            />
          </label>
          {me.role === 'ADMIN' ? (
            <label className="block text-xs text-secondary">
              Assign to
              <select
                className={`${createInputClass} mt-1`}
                value={createForm.assignedToId}
                onChange={(e) => setCreateForm({ ...createForm, assignedToId: e.target.value })}
              >
                <option value="">Me (admin)</option>
                <option value="none">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-[#202630] hover:bg-[#ceaf30] disabled:opacity-60"
            >
              <Plus size={16} />
              {busy ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Category tabs */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-[#161a21]">
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
                className={`border-b-[3px] px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors sm:text-base ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-transparent text-secondary hover:bg-[#1c222c] hover:text-text'
                }`}
              >
                {cat.label}
                {typeof count === 'number' ? (
                  <span className="ml-1.5 text-xs opacity-70 sm:text-sm">({count})</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            icon: Bookmark,
            title: 'Flag as Potential',
            onClick: () => void flagSelected(),
            needsSelection: true,
          },
          {
            icon: Phone,
            title: 'Call selected',
            onClick: () => void callSelected(),
            needsSelection: true,
          },
          {
            icon: Eye,
            title: 'View profile',
            onClick: viewSelected,
            needsSelection: true,
          },
          {
            icon: Download,
            title: selected.size > 0 ? `Export selected (${selected.size})` : 'Export page',
            onClick: exportSelected,
            needsSelection: false,
          },
          {
            icon: Copy,
            title: 'Copy CRM IDs',
            onClick: () => void copySelectedIds(),
            needsSelection: true,
          },
        ].map(({ icon: Icon, title, onClick, needsSelection }) => (
          <button
            key={title}
            type="button"
            title={title}
            disabled={busy || (needsSelection && selected.size === 0)}
            onClick={onClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-[#161a21] text-secondary hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon size={18} />
          </button>
        ))}
        <span className="ml-2 text-sm text-secondary">
          {selected.size > 0 ? `${selected.size} selected` : 'Tip: select clients, then use the icons'}
        </span>
      </div>

      {toolbarMsg ? <p className="text-sm text-buy">{toolbarMsg}</p> : null}
      {error && <p className="text-base text-sell">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-[#161a21]">
        <table className="w-full min-w-[1280px] table-fixed text-left text-sm sm:text-base">
          <colgroup>
            <col className="w-10" />
            <col className="w-[220px]" />
            <col className="w-[150px]" />
            <col className="w-[150px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-[#12151a]/80">
              <th className={`${thClass} w-10`}>
                <span className={thLabelClass}>&nbsp;</span>
                <div className="flex h-9 items-center">
                  <input
                    type="checkbox"
                    className="auth-checkbox h-4 w-4 cursor-pointer rounded border border-[#2b3139]"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </div>
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Client Name</span>
                <input
                  className={colFilterClass}
                  placeholder="Filter name..."
                  value={col.name}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, name: e.target.value }))
                    setPage(1)
                  }}
                />
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Country</span>
                <select
                  className={colSelectClass}
                  style={colSelectStyle}
                  value={col.country}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, country: e.target.value }))
                    setPage(1)
                  }}
                >
                  <option value="">All Countries</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Client Status</span>
                <input
                  className={colFilterClass}
                  placeholder="Filter status..."
                  value={col.status}
                  onChange={(e) => {
                    setCol((s) => ({ ...s, status: e.target.value }))
                    setPage(1)
                  }}
                />
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>First Deposit Date</span>
                <div className="h-9" />
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Last Login Date</span>
                <div className="h-9" />
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Last Interaction</span>
                <div className="h-9" />
              </th>
              <th className={`${thClass} text-right`}>
                <span className={`${thLabelClass} text-right`}>Balance</span>
                <div className="h-9" />
              </th>
              <th className={thClass}>
                <span className={thLabelClass}>Assigned To</span>
                {me.role === 'ADMIN' ? (
                  <select
                    className={colSelectClass}
                    style={colSelectStyle}
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
                ) : (
                  <div className="h-9" />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-[#1c222c]/80"
              >
                <td className={tdClass}>
                  <input
                    type="checkbox"
                    className="auth-checkbox h-4 w-4 cursor-pointer rounded border border-[#2b3139]"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                  />
                </td>
                <td className={tdClass}>
                  <Link
                    to={`/crm/clients/${c.id}`}
                    className="block truncate text-[16px] font-bold text-text hover:text-accent"
                  >
                    {c.name}
                  </Link>
                  <div className="mt-0.5 truncate text-[12px] text-secondary">
                    #{c.crmNumber ?? '-'} · {c.email}
                  </div>
                </td>
                <td className={`${tdClass} text-[14px] font-medium text-secondary`}>{c.country || '-'}</td>
                <td className={tdClass}>
                  <span className="inline-flex rounded-lg border border-border bg-[#12151a] px-2.5 py-1 text-sm font-medium capitalize">
                    {c.crmStatus?.replaceAll('_', ' ').toLowerCase()}
                  </span>
                </td>
                <td className={`${tdClass} whitespace-nowrap text-[12px] text-secondary`}>
                  {fmt(c.firstDepositAt)}
                </td>
                <td className={`${tdClass} whitespace-nowrap text-[12px] text-secondary`}>
                  {fmt(c.lastSeenAt)}
                </td>
                <td className={`${tdClass} whitespace-nowrap text-[12px] text-secondary`}>
                  {fmt(c.lastInteractionAt)}
                </td>
                <td className={`${tdClass} text-right text-[14px] font-bold tabular-nums`}>
                  {money(c.balance ?? c.totalDeposits)}
                </td>
                <td className={`${tdClass} text-[14px] font-medium text-secondary`}>{c.assignedTo?.name || '-'}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-base text-secondary">
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
