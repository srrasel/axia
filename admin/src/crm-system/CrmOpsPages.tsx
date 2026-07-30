import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { btnPrimary, inputClass, money } from '../layout'

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
          <thead className="border-b border-border text-[10px] uppercase text-secondary">
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-sm text-secondary">
            New lead, FTD, withdrawal, documents, login alert, missed call, KYC expiry · {unread} unread
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            void api('/api/admin/crm/notifications/read', { method: 'POST', body: '{}' }).then(load)
          }
        >
          Mark all read
        </button>
      </div>
      {error && <p className="text-sm text-sell">{error}</p>}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-secondary">No notifications yet</p>}
        {items.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl border px-3 py-2 ${
              n.read ? 'border-border bg-[#161a21]' : 'border-accent/30 bg-accent/5'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{n.title}</div>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-secondary">
                {n.type}
              </span>
            </div>
            <div className="text-xs text-secondary">{n.body}</div>
            <div className="mt-1 text-[10px] text-secondary">{fmt(n.createdAt)}</div>
            {n.clientId && (
              <Link to={`/crm/clients/${n.clientId}`} className="text-[11px] text-accent">
                Open client →
              </Link>
            )}
          </div>
        ))}
      </div>
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
            <div className="text-[10px] uppercase text-secondary">{label}</div>
            <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-[#161a21] p-3">
          <div className="mb-2 text-xs font-bold uppercase text-secondary">By country</div>
          {(data.byCountry || []).map((x: any) => (
            <div key={x.country} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
              <span className="text-secondary">{x.country}</span>
              <span className="font-semibold">{x.count}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-[#161a21] p-3">
          <div className="mb-2 text-xs font-bold uppercase text-secondary">By source</div>
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
        <div className="border-b border-border px-3 py-2 text-xs font-bold uppercase text-secondary">
          Login logs
        </div>
        <table className="w-full min-w-[800px] text-left text-[12px]">
          <thead className="text-[10px] uppercase text-secondary">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {(data.loginLogs || []).map((l: any) => (
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="border-b border-border px-3 py-2 text-xs font-bold uppercase text-secondary">
          Active sessions
        </div>
        <table className="w-full min-w-[700px] text-left text-[12px]">
          <thead className="text-[10px] uppercase text-secondary">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Last active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data.sessions || []).map((s: any) => (
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="border-b border-border px-3 py-2 text-xs font-bold uppercase text-secondary">
          Audit trail
        </div>
        <table className="w-full min-w-[700px] text-left text-[12px]">
          <thead className="text-[10px] uppercase text-secondary">
            <tr>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {(data.auditTrail || []).map((a: any) => (
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
      </div>
    </div>
  )
}

/** 21. System settings — Admin only */
export function CrmSystemSettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ settings: any }>('/api/admin/crm/system-settings')
      .then((r) => setSettings(r.settings))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [])

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await api<{ settings: any }>('/api/admin/crm/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      })
      setSettings(r.settings)
      setMsg('Saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="text-sell">{error}</p>
  if (!settings) return <p className="text-secondary">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">System Settings</h1>
          <p className="text-sm text-secondary">
            Admin only · Countries, currencies, languages, templates, APIs, email / SMS / WhatsApp
          </p>
        </div>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          Save settings
        </button>
      </div>
      {msg && <p className="text-sm text-accent">{msg}</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block rounded-xl border border-border bg-[#161a21] p-3 text-xs text-secondary">
          Countries (comma-separated)
          <textarea
            className={`${inputClass} mt-1 min-h-[80px]`}
            value={(settings.countries || []).join(', ')}
            onChange={(e) =>
              setSettings({
                ...settings,
                countries: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <label className="block rounded-xl border border-border bg-[#161a21] p-3 text-xs text-secondary">
          Currencies
          <input
            className={`${inputClass} mt-1`}
            value={(settings.currencies || []).join(', ')}
            onChange={(e) =>
              setSettings({
                ...settings,
                currencies: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <label className="block rounded-xl border border-border bg-[#161a21] p-3 text-xs text-secondary">
          Languages
          <input
            className={`${inputClass} mt-1`}
            value={(settings.languages || []).join(', ')}
            onChange={(e) =>
              setSettings({
                ...settings,
                languages: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <label className="block rounded-xl border border-border bg-[#161a21] p-3 text-xs text-secondary">
          Webhook URL
          <input
            className={`${inputClass} mt-1`}
            value={settings.apis?.webhookUrl || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                apis: { ...settings.apis, webhookUrl: e.target.value, webhooksEnabled: Boolean(e.target.value) },
              })
            }
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['email', 'Email integration'],
          ['sms', 'SMS integration'],
          ['whatsapp', 'WhatsApp integration'],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-xl border border-border bg-[#161a21] px-3 py-3 text-sm"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key]?.enabled)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  [key]: { ...settings[key], enabled: e.target.checked },
                })
              }
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-[#161a21] p-3 space-y-2">
        <div className="text-xs font-bold uppercase text-secondary">Templates</div>
        {Object.keys(settings.templates || {}).map((k) => (
          <label key={k} className="block text-xs text-secondary">
            {k}
            <input
              className={`${inputClass} mt-1`}
              value={settings.templates[k]}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  templates: { ...settings.templates, [k]: e.target.value },
                })
              }
            />
          </label>
        ))}
      </div>
    </div>
  )
}
