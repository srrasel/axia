import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  Globe2,
  Languages,
  Coins,
  Mail,
  MessageSquare,
  Phone,
  Webhook,
  FileText,
  Save,
  Plus,
  X,
  Shield,
  Bell,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../api'
import { btnPrimary, money, PageHeader, TablePagination, usePagination } from '../layout'

function fmt(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/** 17. Roles — Admin only */
export function CrmRolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    Promise.all([
      api<{ roles: any[] }>('/api/admin/crm/roles'),
      api<{ users: any[] }>('/api/admin/crm/roles/users'),
    ])
      .then(([r, u]) => {
        setRoles(r.roles)
        setUsers(u.users)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => {
    load()
  }, [])

  async function saveRole(id: string, role: string) {
    setBusy(true)
    try {
      await api(`/api/admin/crm/roles/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">User Roles</h1>
        <p className="text-sm text-secondary">
          Admin only · Granular permissions by role (Manager, Team Leader, Sales, Retention, Compliance, Finance, Support, Marketing)
        </p>
      </div>
      {error && <p className="text-sm text-sell">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.role} className="rounded-xl border border-border bg-[#161a21] p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.label}</div>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                {r.access}
              </span>
            </div>
            <div className="mt-1 text-xs text-secondary">{r.count} users</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(r.permissions || []).slice(0, 6).map((p: string) => (
                <span key={p} className="rounded border border-border px-1.5 py-0.5 text-[9px] text-secondary">
                  {p.replace('crm.', '')}
                </span>
              ))}
              {(r.permissions || []).length > 6 && (
                <span className="text-[9px] text-secondary">+{r.permissions.length - 6}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-border text-[10px] capitalize text-secondary">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">2FA</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-secondary">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    disabled={busy || u.role === 'ADMIN'}
                    value={u.role}
                    onChange={(e) => void saveRole(u.id, e.target.value)}
                    className="h-8 rounded border border-border bg-[#12151a] px-2 text-xs outline-none focus:border-accent"
                  >
                    {[
                      'ADMIN',
                      'MANAGER',
                      'TEAM_LEADER',
                      'SALES',
                      'RETENTION',
                      'COMPLIANCE',
                      'FINANCE',
                      'SUPPORT',
                      'MARKETING',
                      'EMPLOYEE',
                    ].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{u.totpEnabled ? 'On' : 'Off'}</td>
                <td className="px-3 py-2">{u.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 18. Notifications — Admin + CRM */
export function CrmNotificationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pager = usePagination(items, 10)

  const load = () =>
    api<{ notifications: any[]; unread: number }>('/api/admin/crm/notifications')
      .then((r) => {
        setItems(r.notifications)
        setUnread(r.unread)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))

  useEffect(() => {
    load()
  }, [])

  async function markAllRead() {
    setBusy(true)
    setError(null)
    try {
      await api('/api/admin/crm/notifications/read', { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  function formatType(type: string) {
    return String(type || '')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="New Lead, FTD, Withdrawal, Documents, Login Alert, Missed Call, And KYC Expiry."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center rounded-xl border border-border bg-[#161a21] px-4 text-sm font-medium text-secondary">
            <Bell size={16} className="mr-2 text-accent" />
            {unread} Unread
          </span>
          <button
            type="button"
            className={`${btnPrimary} inline-flex h-11 items-center gap-2 disabled:opacity-60`}
            disabled={busy || unread === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>
        </div>
      </PageHeader>

      {error && <p className="rounded-xl border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-[#161a21]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-secondary">
              <Bell size={22} />
            </div>
            <p className="text-base font-semibold text-text">No Notifications Yet</p>
            <p className="mt-1 max-w-sm text-sm text-secondary">
              New CRM alerts will appear here when leads, deposits, or documents need attention.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pager.pageItems.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  'px-4 py-4 transition-colors sm:px-5',
                  n.read ? 'bg-transparent' : 'bg-accent/[0.04]',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.read ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" title="Unread" />
                      ) : null}
                      <h3 className="text-[15px] font-semibold text-text">{n.title}</h3>
                      <span className="rounded-lg border border-border bg-[#12151a] px-2 py-0.5 text-[11px] font-medium capitalize text-secondary">
                        {formatType(n.type)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-secondary">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-secondary">
                      <span>{fmt(n.createdAt)}</span>
                      {n.clientId ? (
                        <Link
                          to={`/crm/clients/${n.clientId}`}
                          className="font-semibold text-accent hover:text-[#ceaf30]"
                        >
                          Open Client →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
  )
}

/** 19. Analytics — Admin + CRM */
export function CrmAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api('/api/admin/crm/analytics')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  if (error) return <p className="text-sell">{error}</p>
  if (!data) return <p className="text-secondary">Loading analytics…</p>

  const f = data.funnel
  const r = data.revenue

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-secondary">
          Conversion funnel, ROI, LTV, retention, revenue, source & country
          {data.scoped ? ' · scoped to your clients' : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Leads', f.leads],
          ['FTD', f.ftd],
          ['Conversion %', `${f.conversionRate}%`],
          ['Retention %', `${f.retentionRate}%`],
          ['Deposits', money(r.deposits)],
          ['Net revenue', money(r.net)],
          ['LTV', money(r.ltv)],
          ['ROI / deposit', money(r.roi)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-[#161a21] px-3 py-3">
            <div className="text-[14px] capitalize text-secondary">{label}</div>
            <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-[#161a21] p-3">
          <div className="mb-2 text-[14px] font-bold capitalize text-secondary">By country</div>
          {(data.byCountry || []).map((x: any) => (
            <div key={x.country} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
              <span className="text-secondary">{x.country}</span>
              <span className="font-semibold">{x.count}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-[#161a21] p-3">
          <div className="mb-2 text-[14px] font-bold capitalize text-secondary">By source</div>
          {(data.bySource || []).map((x: any) => (
            <div key={x.source} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
              <span className="text-secondary">{x.source}</span>
              <span className="font-semibold">{x.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 20. Security — Admin all / CRM own */
export function CrmSecurityPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const loginPager = usePagination(data?.loginLogs ?? [], 10)
  const sessionPager = usePagination(data?.sessions ?? [], 10)
  const auditPager = usePagination(data?.auditTrail ?? [], 10)

  const load = () =>
    api('/api/admin/crm/security/logs')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))

  useEffect(() => {
    load()
  }, [])

  if (error) return <p className="text-sell">{error}</p>
  if (!data) return <p className="text-secondary">Loading security…</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Security</h1>
        <p className="text-sm text-secondary">
          2FA, login logs, IP / device history, audit trail, sessions
          {data.canViewAll ? ' · full access' : ' · your account only'}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-[#161a21] p-3">
        <div className="text-sm font-semibold">
          Two-factor authentication:{' '}
          <span className={data.totpEnabled ? 'text-buy' : 'text-sell'}>
            {data.totpEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="mt-1 text-xs text-secondary">Manage 2FA from your account security settings after login.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="border-b border-border px-3 py-2 text-[16px] font-bold capitalize text-secondary">
          Login logs
        </div>
        <table className="w-full min-w-[800px] text-left text-[12px]">
          <thead className="text-[10px] capitalize text-secondary">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {loginPager.pageItems.map((l: any) => (
              <tr key={l.id} className="border-t border-border/50">
                <td className="px-3 py-2">{l.user?.email || l.email || '—'}</td>
                <td className="px-3 py-2 text-secondary">{l.ip || '—'}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-secondary">{l.device || '—'}</td>
                <td className={`px-3 py-2 ${l.success ? 'text-buy' : 'text-sell'}`}>
                  {l.success ? 'OK' : l.reason || 'Fail'}
                </td>
                <td className="px-3 py-2 text-secondary">{fmt(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-3 py-2">
          <TablePagination
            page={loginPager.page}
            totalPages={loginPager.totalPages}
            total={loginPager.total}
            from={loginPager.from}
            to={loginPager.to}
            onPageChange={loginPager.setPage}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="border-b border-border px-3 py-2 text-[16px] font-bold capitalize text-secondary">
          Active sessions
        </div>
        <table className="w-full min-w-[700px] text-left text-[12px]">
          <thead className="text-[10px] capitalize text-secondary">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Last active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessionPager.pageItems.map((s: any) => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="px-3 py-2">{s.user?.name || '—'}</td>
                <td className="px-3 py-2 text-secondary">{s.ip || '—'}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-secondary">{s.device || '—'}</td>
                <td className="px-3 py-2 text-secondary">{fmt(s.lastActiveAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-sell"
                    onClick={() =>
                      void api(`/api/admin/crm/security/sessions/${s.id}/revoke`, { method: 'POST' }).then(
                        load,
                      )
                    }
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-3 py-2">
          <TablePagination
            page={sessionPager.page}
            totalPages={sessionPager.totalPages}
            total={sessionPager.total}
            from={sessionPager.from}
            to={sessionPager.to}
            onPageChange={sessionPager.setPage}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="border-b border-border px-3 py-2 text-[16px] font-bold capitalize text-secondary">
          Audit trail
        </div>
        <table className="w-full min-w-[700px] text-left text-[12px]">
          <thead className="text-[10px] capitalize text-secondary">
            <tr>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {auditPager.pageItems.map((a: any) => (
              <tr key={a.id} className="border-t border-border/50">
                <td className="px-3 py-2">{a.staff?.name || '—'}</td>
                <td className="px-3 py-2">
                  #{a.client?.crmNumber} {a.client?.name}
                </td>
                <td className="px-3 py-2">
                  {a.action}
                  {a.detail ? <span className="block text-[10px] text-secondary">{a.detail}</span> : null}
                </td>
                <td className="px-3 py-2 text-secondary">{a.ip || '—'}</td>
                <td className="px-3 py-2 text-secondary">{fmt(a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-3 py-2">
          <TablePagination
            page={auditPager.page}
            totalPages={auditPager.totalPages}
            total={auditPager.total}
            from={auditPager.from}
            to={auditPager.to}
            onPageChange={auditPager.setPage}
          />
        </div>
      </div>
    </div>
  )
}

/** 21. System settings — Admin only (professional layout) */
const fieldClass =
  'h-10 w-full rounded-xl border border-border bg-[#12151a] px-3 text-sm text-text outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]'

type CrmSettingsTab = 'locale' | 'channels' | 'api' | 'templates'

const CRM_SETTINGS_TABS: { id: CrmSettingsTab; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'locale', label: 'Locale', icon: Globe2, blurb: 'Countries, currencies, and languages' },
  { id: 'channels', label: 'Channels', icon: MessageSquare, blurb: 'Email, SMS, and WhatsApp' },
  { id: 'api', label: 'APIs', icon: Webhook, blurb: 'Webhooks and external integrations' },
  { id: 'templates', label: 'Templates', icon: FileText, blurb: 'CRM message and email templates' },
]

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
  icon: Icon,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  icon: LucideIcon
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-accent/25 hover:bg-muted/35">
      <div className="flex min-w-0 gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-secondary">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          enabled ? 'bg-[#fcd535]' : 'bg-muted',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-[#12151a] shadow transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

function TagEditor({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string
  hint: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function addTag() {
    const v = draft.trim()
    if (!v) return
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
      <div className="text-sm font-semibold text-text">{label}</div>
      <p className="mt-1 text-xs text-secondary">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {values.length === 0 && (
          <span className="text-xs text-secondary">No items yet</span>
        )}
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-[#12151a] px-2 py-1 text-xs font-medium text-text"
          >
            {v}
            <button
              type="button"
              className="text-secondary hover:text-sell"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className={fieldClass}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <button
          type="button"
          onClick={addTag}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}

export function CrmSystemSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<CrmSettingsTab>('locale')

  useEffect(() => {
    api<{ settings: any }>('/api/admin/crm/system-settings')
      .then((r) => setSettings(r.settings))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  async function save() {
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const r = await api<{ settings: any }>('/api/admin/crm/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      })
      setSettings(r.settings)
      setMsg('CRM system settings saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (error && !settings) {
    return (
      <div className="rounded-2xl border border-sell/30 bg-sell/10 px-4 py-3 text-sm text-sell">
        {error}
      </div>
    )
  }
  if (!settings) {
    return <p className="text-secondary">Loading CRM settings…</p>
  }

  const active = CRM_SETTINGS_TABS.find((t) => t.id === tab)!

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM System Settings"
        subtitle="Admin only · Locale, messaging channels, APIs, and templates for the CRM desk."
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}
        >
          <Save size={15} />
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </PageHeader>

      {(msg || error) && (
        <div
          className={clsx(
            'rounded-xl border px-4 py-2.5 text-sm',
            error
              ? 'border-sell/30 bg-sell/10 text-sell'
              : 'border-accent/30 bg-accent/10 text-accent',
          )}
        >
          {error || msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-border bg-[#161a21] p-2 lg:sticky lg:top-3">
          <div className="mb-2 px-2 py-1.5 text-[10px] font-bold capitalize tracking-[0.14em] text-secondary">
            Categories
          </div>
          <div className="space-y-0.5">
            {CRM_SETTINGS_TABS.map(({ id, label, icon: Icon, blurb }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  tab === id
                    ? 'bg-accent/10 text-text'
                    : 'text-secondary hover:bg-muted hover:text-text',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    tab === id ? 'bg-accent/20 text-accent' : 'bg-muted text-secondary',
                  )}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className={clsx('block text-sm font-semibold', tab === id && 'text-accent')}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-secondary">{blurb}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-border/60 bg-[#12151a]/80 px-3 py-2.5">
            <Shield size={14} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[11px] leading-relaxed text-secondary">
              These settings apply across the CRM. Staff roles and permissions are managed under{' '}
              <span className="text-text">Roles</span>.
            </p>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-[#161a21] px-4 py-3">
            <div className="flex items-center gap-2">
              <active.icon size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-text">{active.label}</h2>
            </div>
            <p className="mt-1 text-xs text-secondary">{active.blurb}</p>
          </div>

          {tab === 'locale' && (
            <div className="grid gap-3 lg:grid-cols-1 xl:grid-cols-1">
              <TagEditor
                label="Countries"
                hint="Used in client filters, registration, and CRM country reports."
                values={settings.countries || []}
                onChange={(countries) => setSettings({ ...settings, countries })}
                placeholder="e.g. Saudi Arabia"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TagEditor
                  label="Currencies"
                  hint="Available account and reporting currencies."
                  values={settings.currencies || []}
                  onChange={(currencies) => setSettings({ ...settings, currencies })}
                  placeholder="e.g. USD"
                />
                <TagEditor
                  label="Languages"
                  hint="UI / client language codes for the CRM desk."
                  values={settings.languages || []}
                  onChange={(languages) => setSettings({ ...settings, languages })}
                  placeholder="e.g. en"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Globe2 size={14} /> Countries
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {(settings.countries || []).length}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Coins size={14} /> Currencies
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {(settings.currencies || []).length}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Languages size={14} /> Languages
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {(settings.languages || []).length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'channels' && (
            <div className="space-y-3">
              <ToggleCard
                icon={Mail}
                title="Email"
                description="Send CRM emails and notifications from the desk. Configure provider under APIs when enabled."
                enabled={Boolean(settings.email?.enabled)}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    email: { ...settings.email, enabled: !settings.email?.enabled },
                  })
                }
              />
              {settings.email?.enabled && (
                <div className="rounded-2xl border border-border bg-[#161a21] p-4">
                  <label className="block text-xs font-medium text-secondary">
                    From address
                    <input
                      className={`${fieldClass} mt-1.5`}
                      value={settings.email?.from || ''}
                      placeholder="crm@nitajfx.online"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, from: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-medium text-secondary">
                    Provider
                    <select
                      className={`${fieldClass} mt-1.5`}
                      value={settings.email?.provider || 'smtp'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          email: { ...settings.email, provider: e.target.value },
                        })
                      }
                    >
                      <option value="smtp">SMTP</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                    </select>
                  </label>
                </div>
              )}

              <ToggleCard
                icon={Phone}
                title="SMS"
                description="Log and send SMS from client communication tools."
                enabled={Boolean(settings.sms?.enabled)}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    sms: { ...settings.sms, enabled: !settings.sms?.enabled },
                  })
                }
              />
              {settings.sms?.enabled && (
                <div className="rounded-2xl border border-border bg-[#161a21] p-4">
                  <label className="block text-xs font-medium text-secondary">
                    SMS provider
                    <input
                      className={`${fieldClass} mt-1.5`}
                      value={settings.sms?.provider || ''}
                      placeholder="twilio / messagebird / …"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sms: { ...settings.sms, provider: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              )}

              <ToggleCard
                icon={MessageSquare}
                title="WhatsApp"
                description="Enable WhatsApp actions and communication logs in the CRM."
                enabled={Boolean(settings.whatsapp?.enabled)}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    whatsapp: { ...settings.whatsapp, enabled: !settings.whatsapp?.enabled },
                  })
                }
              />
              {settings.whatsapp?.enabled && (
                <div className="rounded-2xl border border-border bg-[#161a21] p-4">
                  <label className="block text-xs font-medium text-secondary">
                    WhatsApp provider
                    <input
                      className={`${fieldClass} mt-1.5`}
                      value={settings.whatsapp?.provider || ''}
                      placeholder="meta / twilio / …"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, provider: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {tab === 'api' && (
            <div className="space-y-3">
              <ToggleCard
                icon={Webhook}
                title="Webhooks"
                description="Push CRM events (new lead, FTD, KYC) to an external endpoint."
                enabled={Boolean(settings.apis?.webhooksEnabled)}
                onToggle={() =>
                  setSettings({
                    ...settings,
                    apis: {
                      ...settings.apis,
                      webhooksEnabled: !settings.apis?.webhooksEnabled,
                    },
                  })
                }
              />
              <div className="rounded-2xl border border-border bg-[#161a21] p-4">
                <label className="block text-xs font-medium text-secondary">
                  Webhook URL
                  <input
                    className={`${fieldClass} mt-1.5 font-mono text-[13px]`}
                    value={settings.apis?.webhookUrl || ''}
                    placeholder="https://hooks.example.com/crm"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        apis: {
                          ...settings.apis,
                          webhookUrl: e.target.value,
                          webhooksEnabled:
                            settings.apis?.webhooksEnabled || Boolean(e.target.value.trim()),
                        },
                      })
                    }
                  />
                </label>
                <p className="mt-2 text-[11px] text-secondary">
                  Events are sent as JSON POST requests. Keep this URL private.
                </p>
              </div>
            </div>
          )}

          {tab === 'templates' && (
            <div className="space-y-3">
              {Object.keys(settings.templates || {}).length === 0 && (
                <p className="text-sm text-secondary">No templates configured yet.</p>
              )}
              {Object.entries(settings.templates || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-accent/20"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold capitalize text-text">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <code className="rounded-md border border-border bg-[#12151a] px-1.5 py-0.5 text-[10px] text-secondary">
                      {key}
                    </code>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-border bg-[#12151a] px-3 py-2 text-sm outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]"
                    value={String(value ?? '')}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        templates: { ...settings.templates, [key]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-border/60 pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}
            >
              <Save size={15} />
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
