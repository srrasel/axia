import { useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'
import { PageHeader, Panel } from './layout'

type BankAccountRow = {
  id: string
  countryCode: string
  label: string
  bankName: string
  accountName: string
  iban: string
  swift: string
  referenceHint: string | null
  contactOnly: boolean
  active: boolean
  sortOrder: number
}

export function BankAccountsPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [accounts, setAccounts] = useState<BankAccountRow[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BankAccountRow>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () =>
    void api<{ accounts: BankAccountRow[] }>('/api/admin/bank-accounts')
      .then((r) => setAccounts(r.accounts))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))

  useEffect(() => {
    load()
  }, [])

  const startEdit = (row: BankAccountRow) => {
    setEditing(row.countryCode)
    setForm({ ...row })
    setMsg(null)
    setError(null)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      await api(`/api/admin/bank-accounts/${editing}`, {
        method: 'PUT',
        body: JSON.stringify({
          bankName: form.bankName,
          accountName: form.accountName,
          iban: form.iban,
          swift: form.swift,
          referenceHint: form.referenceHint,
          active: form.active,
        }),
      })
      setMsg(`Bank account updated for ${form.label}`)
      setEditing(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Change Bank Account"
        subtitle="Bank details shown to clients on the deposit page. Update anytime — accounts may change frequently."
      />
      {!canEdit ? (
        <p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          View only — managers and admins can edit bank accounts.
        </p>
      ) : null}
      {msg ? <p className="mb-4 rounded-lg border border-buy/30 bg-buy/15 px-3 py-2 text-sm text-buy">{msg}</p> : null}
      {error ? <p className="mb-4 rounded-lg border border-sell/30 bg-sell/15 px-3 py-2 text-sm text-sell">{error}</p> : null}

      <div className="space-y-4">
        {accounts.map((row) => {
          const isEditing = editing === row.countryCode
          return (
            <Panel
              key={row.id}
              title={row.label}
              subtitle={
                row.contactOnly
                  ? 'International — clients contact Finance (no fixed account)'
                  : `Country code: ${row.countryCode}`
              }
              action={
                canEdit ? (
                  isEditing ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-9 rounded-md border border-border px-3 text-sm"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        className="h-9 rounded-md bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30] disabled:opacity-60"
                        onClick={() => void save()}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                      onClick={() => startEdit(row)}
                    >
                      Edit account
                    </button>
                  )
                ) : null
              }
            >
              {isEditing ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {!row.contactOnly ? (
                    <>
                      <label className="block text-sm">
                        Bank name
                        <input
                          className="mt-1 h-10 w-full rounded-md border border-border px-3"
                          value={form.bankName || ''}
                          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        />
                      </label>
                      <label className="block text-sm">
                        Account name
                        <input
                          className="mt-1 h-10 w-full rounded-md border border-border px-3"
                          value={form.accountName || ''}
                          onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                        />
                      </label>
                      <label className="block text-sm md:col-span-2">
                        IBAN / Account number
                        <input
                          className="mt-1 h-10 w-full rounded-md border border-border px-3 font-mono"
                          value={form.iban || ''}
                          onChange={(e) => setForm({ ...form, iban: e.target.value })}
                        />
                      </label>
                      <label className="block text-sm">
                        SWIFT / BIC
                        <input
                          className="mt-1 h-10 w-full rounded-md border border-border px-3 font-mono"
                          value={form.swift || ''}
                          onChange={(e) => setForm({ ...form, swift: e.target.value })}
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="block text-sm md:col-span-2">
                    Client instruction
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-md border border-border px-3 py-2 text-sm"
                      value={form.referenceHint || ''}
                      onChange={(e) => setForm({ ...form, referenceHint: e.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.active ?? true}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    Active (visible to clients)
                  </label>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {row.contactOnly ? (
                    <p className="text-secondary">{row.referenceHint || 'Contact Finance for international wire instructions.'}</p>
                  ) : (
                    <>
                      <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                        <span className="text-secondary">Bank</span>
                        <span className="font-medium">{row.bankName || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                        <span className="text-secondary">Beneficiary</span>
                        <span className="font-medium">{row.accountName || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                        <span className="text-secondary">IBAN</span>
                        <span className="break-all font-mono text-xs">{row.iban || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                        <span className="text-secondary">SWIFT</span>
                        <span className="font-mono">{row.swift || '—'}</span>
                      </div>
                      {row.referenceHint ? (
                        <p className="pt-1 text-xs text-secondary">{row.referenceHint}</p>
                      ) : null}
                    </>
                  )}
                  <div className="pt-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.active ? 'bg-buy/15 text-buy' : 'bg-muted text-secondary'
                      }`}
                    >
                      {row.active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
