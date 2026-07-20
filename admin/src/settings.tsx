import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Coins,
  CreditCard,
  Gauge,
  Landmark,
  RefreshCw,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { api } from './api'
import { setActiveCurrency, useCurrency } from './currency'
import { PageHeader, Panel, btnPrimary } from './layout'

type SettingDef = {
  key: string
  label: string
  description: string
  type: 'text' | 'number' | 'percent' | 'boolean' | 'select' | 'secret'
  group: string
  options?: string[]
  defaultValue: string
}

const GROUP_META: Record<string, { icon: LucideIcon; blurb: string }> = {
  General: { icon: Settings2, blurb: 'Brand identity and core platform options' },
  Premium: { icon: Sparkles, blurb: 'Premium account thresholds and features' },
  Fees: { icon: Coins, blurb: 'Trading, deposit, and withdrawal fee rules' },
  Limits: { icon: Gauge, blurb: 'Deposit, withdraw, leverage, and demo limits' },
  Referrals: { icon: Users, blurb: 'Referral program and commission rates' },
  Automation: { icon: Zap, blurb: 'Auto-approve deposits and withdrawals' },
  Payments: { icon: CreditCard, blurb: 'Bank details, wallets, and payment APIs' },
}

const fieldClass =
  'h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm text-text outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]'

function SettingField({
  def,
  value,
  onChange,
}: {
  def: SettingDef
  value: string
  onChange: (v: string) => void
}) {
  const isOn = value === 'true'

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-accent/25 hover:bg-muted/35">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text">{def.label}</div>
          <p className="mt-1 text-xs leading-relaxed text-secondary">{def.description}</p>
        </div>
        <code className="shrink-0 rounded-md border border-border bg-panel px-1.5 py-0.5 text-[10px] text-secondary">
          {def.key}
        </code>
      </div>

      <div className="mt-3">
        {def.type === 'boolean' ? (
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => onChange(isOn ? 'false' : 'true')}
            className={clsx(
              'relative inline-flex h-9 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium transition-colors',
              isOn
                ? 'border-buy/30 bg-buy/15 text-buy'
                : 'border-border bg-panel text-secondary hover:border-[#fcd535]/70',
            )}
          >
            <span>{isOn ? 'Enabled' : 'Disabled'}</span>
            <span
              className={clsx(
                'relative h-5 w-9 rounded-full transition-colors',
                isOn ? 'bg-buy' : 'bg-muted',
              )}
            >
              <span
                className={clsx(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  isOn ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        ) : def.type === 'select' && def.options ? (
          <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
            {def.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : def.type === 'secret' ? (
          <input
            type="password"
            autoComplete="new-password"
            className={`${fieldClass} font-mono tracking-wide`}
            value={value}
            placeholder="Paste API key / secret"
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (value === '••••••••') onChange('')
            }}
          />
        ) : (
          <div className="relative">
            <input
              type={def.type === 'number' || def.type === 'percent' ? 'number' : 'text'}
              step={def.type === 'percent' ? '0.01' : undefined}
              className={clsx(fieldClass, def.type === 'percent' && 'pr-8')}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            {def.type === 'percent' ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">
                %
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export function SettingsPage() {
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
  const [activeGroup, setActiveGroup] = useState<string>('General')

  const load = () =>
    void api<{ definitions: SettingDef[]; values: Record<string, string>; fx: any }>('/api/admin/settings')
      .then((r) => {
        setDefs(r.definitions || [])
        setValues(r.values || {})
        setFx(r.fx || null)
        const cur = r.values?.currency || 'USD'
        setOriginalCurrency(cur)
        setActiveCurrency(cur)
        const first = r.definitions?.[0]?.group
        if (first) setActiveGroup((g) => g || first)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))

  useEffect(() => {
    load()
  }, [])

  const groups = useMemo(() => Array.from(new Set(defs.map((d) => d.group))), [defs])

  useEffect(() => {
    if (groups.length && !groups.includes(activeGroup)) setActiveGroup(groups[0])
  }, [groups, activeGroup])

  const setVal = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  const saveAll = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const r = await api<{ conversion?: any; values?: { currency?: string } }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: values, convertCurrency: convertOnSave }),
      })
      const savedCurrency = r.values?.currency || values.currency || 'USD'
      setActiveCurrency(savedCurrency)
      await refresh()
      if (r.conversion && r.conversion.rate !== 1) {
        setMsg(
          `Converted ${r.conversion.from} → ${r.conversion.to} at ${r.conversion.rate.toFixed(6)} (${r.conversion.source}, ${r.conversion.date}). Updated ${r.conversion.accounts} accounts, ${r.conversion.earnings} earnings, ${r.conversion.transactions} transactions.`,
        )
      } else {
        setMsg(`Settings saved · currency ${savedCurrency}`)
      }
      load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const testNow = async () => {
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
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-sell/30 bg-sell/10 px-4 py-3 text-sm text-sell">{error}</div>
    )
  }

  if (!defs.length) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    )
  }

  const nextCur = values.currency || 'USD'
  const ratePreview =
    fx?.matrix?.[originalCurrency]?.[nextCur] != null ? Number(fx.matrix[originalCurrency][nextCur]) : null
  const activeDefs = defs.filter((d) => d.group === activeGroup)
  const ActiveIcon = GROUP_META[activeGroup]?.icon || Building2
  const msgTone = msg?.toLowerCase().includes('fail') ? 'sell' : 'buy'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Configure platform fees, limits, payments, and live FX conversion."
      >
        <button
          type="button"
          disabled={testingNow}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-text transition-colors hover:bg-muted disabled:opacity-60"
          onClick={() => void testNow()}
        >
          <Shield size={15} />
          {testingNow ? 'Testing…' : 'Test NOWPayments'}
        </button>
        <button type="button" disabled={saving} className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-60`} onClick={() => void saveAll()}>
          <Save size={15} />
          {saving ? 'Saving…' : 'Save all'}
        </button>
      </PageHeader>

      {msg ? (
        <div
          className={clsx(
            'rounded-2xl border px-4 py-3 text-sm',
            msgTone === 'sell' ? 'border-sell/30 bg-sell/10 text-sell' : 'border-buy/30 bg-buy/10 text-buy',
          )}
        >
          {msg}
        </div>
      ) : null}

      {fx ? (
        <Panel
          title="Live FX rates"
          subtitle="ECB real-time matrix · used when converting account currency"
          action={
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-secondary transition-colors hover:bg-muted hover:text-text"
              onClick={() => void api('/api/admin/fx').then(setFx)}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-medium">
              {fx.source}
            </span>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1">{fx.date}</span>
            {nextCur !== originalCurrency && ratePreview != null ? (
              <span className="rounded-full border border-buy/25 bg-buy/10 px-2.5 py-1 font-semibold text-buy">
                Preview · 1 {originalCurrency} = {ratePreview.toFixed(4)} {nextCur}
              </span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/80 text-[11px] uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">From \ To</th>
                  {['USD', 'EUR', 'GBP'].map((c) => (
                    <th key={c} className="px-3 py-2.5 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['USD', 'EUR', 'GBP'].map((from) => (
                  <tr key={from} className="border-t border-border">
                    <td className="px-3 py-2.5 font-semibold text-text">{from}</td>
                    {['USD', 'EUR', 'GBP'].map((to) => (
                      <td
                        key={to}
                        className={clsx(
                          'px-3 py-2.5 tabular-nums',
                          from === to ? 'text-secondary' : 'text-text',
                        )}
                      >
                        {Number(fx.matrix?.[from]?.[to] ?? 0).toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-sm transition-colors hover:border-accent/30">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#fcd535]"
              checked={convertOnSave}
              onChange={(e) => setConvertOnSave(e.target.checked)}
            />
            <span>
              <span className="font-medium text-text">Convert balances with live FX on currency change</span>
              <span className="mt-0.5 block text-xs text-secondary">
                Updates accounts, earnings, fees, and limits when you switch USD / EUR / GBP.
              </span>
            </span>
          </label>
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-border bg-panel p-2 lg:sticky lg:top-4">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary/80">
            Categories
          </div>
          <nav className="space-y-0.5">
            {groups.map((group) => {
              const Icon = GROUP_META[group]?.icon || Landmark
              const count = defs.filter((d) => d.group === group).length
              const on = activeGroup === group
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    on
                      ? 'bg-sidebar-active font-semibold text-text'
                      : 'text-secondary hover:bg-muted hover:text-text',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      on ? 'bg-accent/15 text-accent' : 'bg-muted text-secondary',
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{group}</span>
                  <span className="text-[10px] tabular-nums text-secondary">{count}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <Panel
          title={activeGroup}
          subtitle={GROUP_META[activeGroup]?.blurb || 'Platform configuration'}
          action={
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <ActiveIcon size={16} />
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {activeDefs.map((d) => (
              <SettingField
                key={d.key}
                def={d}
                value={values[d.key] ?? d.defaultValue}
                onChange={(v) => setVal(d.key, v)}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-xs text-secondary">
              Changes apply after you save. Currency conversion uses the live FX table above.
            </p>
            <button
              type="button"
              disabled={saving}
              className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-60`}
              onClick={() => void saveAll()}
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save all'}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
