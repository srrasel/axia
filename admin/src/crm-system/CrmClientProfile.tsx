import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MessageCircle,
  Mail,
  Phone,
  Pencil,
  Lock,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { api } from '../api'
import { btnPrimary, inputClass, money } from '../layout'
import type { AdminUser } from '../auth'

type TimelineItem = { at: string; type: string; title: string; detail?: string }
type Profile = { client: any; timeline: TimelineItem[] }

const TABS = [
  { id: 'tracking', label: 'Tracking Information' },
  { id: 'accounts', label: 'Trading Accounts' },
  { id: 'transactions', label: 'Financial Transactions' },
  { id: 'emails', label: 'Emails' },
  { id: 'documents', label: 'Documents' },
  { id: 'activities', label: 'Activities' },
  { id: 'activity', label: 'Activity History' },
  { id: 'sms', label: 'SMS' },
  { id: 'calls', label: 'Calls' },
  { id: 'chat', label: 'Chat Logs' },
  { id: 'push', label: 'Push Notifications' },
] as const

type TabId = (typeof TABS)[number]['id']

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function pnlClass(n: number) {
  if (n > 0) return 'text-buy'
  if (n < 0) return 'text-sell'
  return 'text-text'
}

function splitName(name: string) {
  const parts = (name || '').trim().split(/\s+/)
  return { first: parts[0] || '—', last: parts.slice(1).join(' ') || '—' }
}

function Kpi({
  label,
  value,
  sub,
  tone,
  onEdit,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'good' | 'bad' | 'neutral'
  onEdit?: () => void
}) {
  const color =
    tone === 'good' ? 'text-buy' : tone === 'bad' ? 'text-sell' : 'text-text'
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      className="min-w-0 rounded-lg border border-border bg-[#161a21] px-2.5 py-2 text-left transition-colors hover:border-accent/50 disabled:cursor-default disabled:hover:border-border"
      title={onEdit ? `Edit ${label}` : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="truncate text-[10px] font-medium capitalize tracking-wide text-secondary">{label}</div>
        {onEdit ? <Pencil size={10} className="shrink-0 text-secondary" /> : null}
      </div>
      <div className={`mt-0.5 truncate text-sm font-bold tabular-nums ${color}`}>{value}</div>
      {sub ? <div className="text-[10px] text-secondary">{sub}</div> : null}
    </button>
  )
}

function InfoRow({
  label,
  value,
  editable,
  onEdit,
}: {
  label: string
  value?: ReactNode
  editable?: boolean
  onEdit?: () => void
}) {
  return (
    <div className="flex min-h-[28px] items-start gap-1 border-b border-border/40 py-1.5 text-[12px] leading-tight">
      <span className="w-[42%] shrink-0 text-secondary">{label}</span>
      <span className="min-w-0 flex-1 break-words font-medium text-text">{value ?? '—'}</span>
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className="mt-0.5 shrink-0 text-secondary hover:text-accent"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
      ) : null}
    </div>
  )
}

function ActionBtn({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border border-border bg-[#12151a] px-3 py-2 text-left text-[12px] font-medium text-text transition-colors hover:border-accent/50 hover:bg-[#1c222c] disabled:opacity-50"
    >
      {label}
      <ChevronRight size={12} className="text-secondary" />
    </button>
  )
}

function TradePriceRow({ trade, onSaved }: { trade: any; onSaved: () => void | Promise<void> }) {
  const [openPrice, setOpenPrice] = useState(String(trade.openPrice))
  const [currentPrice, setCurrentPrice] = useState(String(trade.currentPrice))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setOpenPrice(String(trade.openPrice))
    setCurrentPrice(String(trade.currentPrice))
  }, [trade.openPrice, trade.currentPrice, trade.id])

  async function apply() {
    const o = Number(openPrice)
    const m = Number(currentPrice)
    if (!Number.isFinite(o) || o <= 0 || !Number.isFinite(m) || m <= 0) return
    setBusy(true)
    try {
      await api(`/api/admin/crm/trades/${trade.id}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ openPrice: o, currentPrice: m, lockMark: true }),
      })
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-border/50">
      <td className="px-2 py-2 font-semibold">
        {trade.symbol}
        {trade.markLocked ? <span className="ml-1 text-[9px] text-accent">locked</span> : null}
      </td>
      <td className="px-2 py-2 capitalize">{trade.side}</td>
      <td className="px-2 py-2">{trade.volume}</td>
      <td className="px-2 py-2">
        <input
          className="h-7 w-24 rounded border border-border bg-[#12151a] px-1.5 text-[11px] tabular-nums outline-none focus:border-accent"
          value={openPrice}
          onChange={(e) => setOpenPrice(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <input
          className="h-7 w-24 rounded border border-border bg-[#12151a] px-1.5 text-[11px] tabular-nums outline-none focus:border-accent"
          value={currentPrice}
          onChange={(e) => setCurrentPrice(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply()}
          className="rounded bg-accent px-2 py-1 text-[10px] font-bold text-[#202630] disabled:opacity-50"
        >
          Apply
        </button>
      </td>
    </tr>
  )
}

export function CrmClientProfilePage({ me }: { me: AdminUser }) {
  const { id = '' } = useParams()
  const [data, setData] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('tracking')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [modal, setModal] = useState<null | 'alert' | 'password' | 'email' | 'deposit' | 'finance'>(null)
  const [modalVal, setModalVal] = useState('')
  const [financeField, setFinanceField] = useState<string | null>(null)
  const [similar, setSimilar] = useState<any[] | null>(null)

  async function saveFinance(field: string, raw: string) {
    const num = Number(raw)
    if (!Number.isFinite(num)) {
      setMsg('Enter a valid number')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await api(`/api/admin/crm/clients-v2/${id}/finance`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: num }),
      })
      setModal(null)
      setFinanceField(null)
      setModalVal('')
      setMsg(`${field} updated`)
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  function openFinanceEdit(field: string, current: number) {
    setFinanceField(field)
    setModalVal(String(Number(current ?? 0).toFixed(2)))
    setModal('finance')
  }

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api<Profile>(`/api/admin/crm/clients-v2/${id}`)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveProfile(patch: Record<string, unknown>) {
    setBusy(true)
    setMsg(null)
    try {
      await api(`/api/admin/crm/clients-v2/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setEditKey(null)
      setMsg('Saved')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function runAction(action: string, extra: Record<string, string> = {}) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await api<any>(`/api/admin/crm/clients-v2/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.similar) setSimilar(res.similar)
      setModal(null)
      setModalVal('')
      setMsg('Done')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function addComment() {
    if (!comment.trim()) return
    setBusy(true)
    try {
      await api(`/api/admin/crm/clients-v2/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment }),
      })
      setComment('')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function contactClient(kind: 'call' | 'email' | 'chat') {
    const client = data?.client
    if (!client || !id) return
    setBusy(true)
    setMsg(null)
    try {
      if (kind === 'call') {
        await api(`/api/admin/crm/clients-v2/${id}/comms`, {
          method: 'POST',
          body: JSON.stringify({
            channel: 'call',
            note: client.phone
              ? `Outbound call to ${client.phone}`
              : 'Outbound call attempted (no phone on file)',
          }),
        })
        setTab('calls')
        if (client.phone) {
          window.location.href = `tel:${String(client.phone).replace(/[^\d+]/g, '')}`
          setMsg(`Calling ${client.name}…`)
        } else {
          setMsg('No phone number on file — logged under Calls')
        }
      } else if (kind === 'email') {
        await api(`/api/admin/crm/clients-v2/${id}/comms`, {
          method: 'POST',
          body: JSON.stringify({
            channel: 'email',
            note: `Email opened to ${client.email}`,
          }),
        })
        setTab('emails')
        window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(`NitajFX — ${client.name}`)}`
        setMsg(`Opening email to ${client.email}`)
      } else {
        await api(`/api/admin/crm/clients-v2/${id}/comms`, {
          method: 'POST',
          body: JSON.stringify({
            channel: 'im',
            note: client.phone
              ? `Chat / WhatsApp to ${client.phone}`
              : 'Chat started (no phone on file)',
          }),
        })
        setTab('chat')
        if (client.phone) {
          const digits = String(client.phone).replace(/\D/g, '')
          window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer')
          setMsg('Opening WhatsApp chat…')
        } else {
          setMsg('No phone for WhatsApp — opened Chat log')
        }
      }
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Contact action failed')
    } finally {
      setBusy(false)
    }
  }

  const dayBars = useMemo(() => {
    const days: { key: string; label: string; active: boolean; deposit: boolean; trade: boolean }[] = []
    const now = new Date()
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const hits = (data?.timeline || []).filter((t) => t.at.slice(0, 10) === key)
      days.push({
        key,
        label,
        active: hits.length > 0,
        deposit: hits.some((h) => h.type === 'deposit'),
        trade: hits.some((h) => h.type === 'activity' || h.type === 'communication'),
      })
    }
    return days
  }, [data?.timeline])

  if (error) {
    return (
      <div className="space-y-3">
        <Link to="/crm/clients" className="inline-flex items-center gap-1.5 text-sm text-accent">
          <ArrowLeft size={14} /> Clients
        </Link>
        <p className="text-sell">{error}</p>
      </div>
    )
  }
  if (!data) return <p className="text-secondary">Loading client…</p>

  const c = data.client
  const { first, last } = splitName(c.name)
  const liveCount = c.liveAccounts ?? (c.accounts || []).filter((a: any) => a.type === 'live').length

  function startEdit(key: string, current: string) {
    setEditKey(key)
    setEditVal(current || '')
  }

  function commitEdit() {
    if (!editKey) return
    void saveProfile({ [editKey]: editVal || null })
  }

  const editableValue = (key: string, display: ReactNode) => {
    if (editKey === key) {
      return (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            className="h-6 w-full min-w-0 rounded border border-accent bg-[#12151a] px-1 text-[12px] outline-none"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditKey(null)
            }}
          />
          <button type="button" className="text-[10px] font-semibold text-accent" onClick={commitEdit}>
            OK
          </button>
        </span>
      )
    }
    return display
  }

  return (
    <div className="-mx-1 space-y-3 lg:-mx-2">
      {/* Identity + KPIs */}
      <div className="rounded-xl border border-border bg-[#161a21] p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-text sm:text-xl">{c.name}</h1>
              <span className="rounded bg-buy/15 px-2 py-0.5 text-[10px] font-semibold text-buy">
                Live accounts {liveCount}
              </span>
              {c.online ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-buy">
                  <span className="h-1.5 w-1.5 rounded-full bg-buy" /> Online
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-secondary">
              <span>CRM #{c.crmNumber ?? '—'}</span>
              <span>{c.country || '—'}</span>
              <span>{c.email}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {(
                [
                  { icon: Phone, title: 'Call', kind: 'call' as const },
                  { icon: Mail, title: 'Email', kind: 'email' as const },
                  { icon: MessageCircle, title: 'Chat', kind: 'chat' as const },
                ] as const
              ).map(({ icon: Icon, title, kind }) => (
                <button
                  key={title}
                  type="button"
                  title={title}
                  disabled={busy}
                  onClick={() => void contactClient(kind)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-secondary hover:border-accent/50 hover:text-accent disabled:opacity-40"
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
          <Link
            to="/crm/clients"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary hover:text-text"
          >
            <ArrowLeft size={14} /> Clients
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5 xl:grid-cols-9">
          <Kpi label="Balance" value={money(c.balance)} onEdit={() => openFinanceEdit('balance', c.balance)} />
          <Kpi label="Credit" value={money(c.credit)} onEdit={() => openFinanceEdit('credit', c.credit)} />
          <Kpi label="Equity" value={money(c.equity)} onEdit={() => openFinanceEdit('equity', c.equity)} />
          <Kpi
            label="Free Margin"
            value={money(c.freeMargin)}
            tone={c.freeMargin < 0 ? 'bad' : 'neutral'}
            onEdit={() => openFinanceEdit('freeMargin', c.freeMargin)}
          />
          <Kpi
            label="Open P&L"
            value={money(c.openPnl)}
            tone={c.openPnl < 0 ? 'bad' : c.openPnl > 0 ? 'good' : 'neutral'}
            onEdit={() => openFinanceEdit('openPnl', c.openPnl)}
          />
          <Kpi
            label="Closed P&L"
            value={money(c.closedPnl)}
            tone={c.closedPnl < 0 ? 'bad' : c.closedPnl > 0 ? 'good' : 'neutral'}
            onEdit={() => openFinanceEdit('closedPnl', c.closedPnl)}
          />
          <Kpi
            label="Deposit"
            value={money(c.deposits)}
            sub={`(${c.depositCount ?? 0})`}
            tone="good"
            onEdit={() => openFinanceEdit('deposits', c.deposits)}
          />
          <Kpi
            label="Withdrawals"
            value={money(c.withdrawals)}
            sub={`(${c.withdrawalCount ?? 0})`}
            tone={c.withdrawals > 0 ? 'bad' : 'neutral'}
            onEdit={() => openFinanceEdit('withdrawals', c.withdrawals)}
          />
          <Kpi
            label="Net Deposit"
            value={money(c.netDeposit)}
            tone={c.netDeposit >= 0 ? 'good' : 'bad'}
            onEdit={() => openFinanceEdit('netDeposit', c.netDeposit)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-1 border-t border-border/60 pt-2">
          {dayBars.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-0.5">
              <div
                className={`h-5 w-5 rounded-sm border ${
                  d.deposit
                    ? 'border-buy/40 bg-buy/30'
                    : d.active
                      ? 'border-accent/40 bg-accent/20'
                      : 'border-border bg-[#12151a]'
                }`}
                title={d.key}
              />
              <span className="text-[9px] text-secondary">{d.label}</span>
            </div>
          ))}
          <div className="ml-auto flex flex-wrap gap-3 text-[10px] text-secondary">
            <span>
              Last deposit: <b className="text-text">{fmt(c.lastDepositAt)}</b>
            </span>
            <span>
              Trades: <b className="text-text">{c.tradeCount ?? 0}</b>
            </span>
            <span>
              Updated: <b className="text-text">{fmt(c.updatedAt || c.lastInteractionAt)}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
        <div className="flex min-w-max gap-0 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-secondary hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-xs font-medium text-accent">{msg}</p>}

      <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-3">
          {/* Summary ribbon */}
          <div className="grid gap-2 rounded-xl border border-accent/20 bg-accent/5 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ['Assign To', c.assignedTo?.name || '—'],
              ['Client Status', c.crmStatus],
              [
                'Document Status',
                `Approved (${c.docsApproved ?? 0}) / New (${c.docsNew ?? 0})`,
              ],
              ['Compliance Agent', '—'],
              [
                'Compliance',
                c.kycStatus === 'approved'
                  ? 'Fully Verified'
                  : c.identityVerified
                    ? 'Partially Verified'
                    : 'Unverified',
              ],
              ['Created Time', fmt(c.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/50 bg-[#161a21]/80 px-2.5 py-2">
                <div className="text-[9px] font-semibold capitalize tracking-wide text-secondary">{label}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-text">{value}</div>
              </div>
            ))}
          </div>

          {tab === 'tracking' && (
            <div className="rounded-xl border border-border bg-[#161a21] p-3">
              <div className="mb-2 text-xs font-bold capitalize tracking-wide text-secondary">
                Client Information
              </div>
              <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <InfoRow
                    label="First Name"
                    value={editableValue('name', first)}
                    editable
                    onEdit={() => startEdit('name', c.name)}
                  />
                  <InfoRow
                    label="Mobile"
                    value={editableValue('phone', c.phone || '—')}
                    editable
                    onEdit={() => startEdit('phone', c.phone || '')}
                  />
                  <InfoRow label="Date of Birth" value={c.dateOfBirth ? fmt(c.dateOfBirth) : '—'} />
                  <InfoRow label="Created Time" value={fmt(c.createdAt)} />
                  <InfoRow label="Total Withdrawal" value={money(c.withdrawals)} />
                  <InfoRow label="Amount of Trades" value={c.tradeCount ?? 0} />
                  <InfoRow label="Withdrawals Count" value={c.withdrawalCount ?? 0} />
                  <InfoRow
                    label="Campaign Name"
                    value={editableValue('campaign', c.campaign || '—')}
                    editable
                    onEdit={() => startEdit('campaign', c.campaign || '')}
                  />
                  <InfoRow label="Campaign ID" value={c.campaignId || '—'} />
                  <InfoRow label="Client Status" value={c.crmStatus} />
                  <InfoRow label="Phone Verified" value={c.phoneVerified ? 'yes' : 'no'} />
                  <InfoRow label="Comments Count" value={c.crmComments?.length ?? 0} />
                </div>
                <div>
                  <InfoRow label="Last Name" value={last} />
                  <InfoRow label="CRM ID" value={c.crmNumber ?? '—'} />
                  <InfoRow
                    label="Citizenship"
                    value={editableValue('nationality', c.nationality || '—')}
                    editable
                    onEdit={() => startEdit('nationality', c.nationality || '')}
                  />
                  <InfoRow label="Customer ID" value={c.id?.slice(0, 10)} />
                  <InfoRow label="Platform" value={c.accounts?.[0]?.platform || 'Web'} />
                  <InfoRow label="Balance" value={<span className={pnlClass(c.balance)}>{money(c.balance)}</span>} />
                  <InfoRow
                    label="Net Deposit"
                    value={<span className={pnlClass(c.netDeposit)}>{money(c.netDeposit)}</span>}
                  />
                  <InfoRow label="Keyword" value={c.keyword || '—'} />
                  <InfoRow label="Creative Name" value={c.creative || '—'} />
                  <InfoRow label="Campaign Type" value={c.campaignType || '—'} />
                  <InfoRow label="Test User" value={c.crmCategory === 'TEST' ? 'yes' : 'no'} />
                  <InfoRow label="Trading Restricted" value={c.tradingRestricted ? 'yes' : 'no'} />
                </div>
                <div>
                  <InfoRow
                    label="Email"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Lock size={10} className="text-secondary" />
                        {c.email}
                      </span>
                    }
                  />
                  <InfoRow
                    label="UI Language"
                    value={editableValue('language', c.language || '—')}
                    editable
                    onEdit={() => startEdit('language', c.language || '')}
                  />
                  <InfoRow label="Total Deposit" value={money(c.deposits)} />
                  <InfoRow label="First Deposit Date" value={fmt(c.firstDepositAt)} />
                  <InfoRow label="First Trade Date" value={fmt(c.firstTradeAt)} />
                  <InfoRow label="Last Trade Date" value={fmt(c.lastTradeAt)} />
                  <InfoRow label="FTD Amount" value={money(c.ftdAmount || 0)} />
                  <InfoRow label="Media Source" value={c.mediaSource || '—'} />
                  <InfoRow label="UTM Source" value={c.utmSource || '—'} />
                  <InfoRow label="UTM Campaign" value={c.utmCampaign || '—'} />
                  <InfoRow label="Uploaded Documents" value={(c.kycDocuments || []).length} />
                  <InfoRow label="Email Verified" value={c.emailVerified ? 'yes' : 'no'} />
                </div>
                <div>
                  <InfoRow
                    label="Phone"
                    value={editableValue('phone', c.phone || '—')}
                    editable
                    onEdit={() => startEdit('phone', c.phone || '')}
                  />
                  <InfoRow
                    label="Country"
                    value={editableValue('country', c.country || '—')}
                    editable
                    onEdit={() => startEdit('country', c.country || '')}
                  />
                  <InfoRow label="Base Currency" value={c.accounts?.[0]?.currency || 'USD'} />
                  <InfoRow label="Last Deposit Date" value={fmt(c.lastDepositAt)} />
                  <InfoRow label="Last Login Date" value={fmt(c.lastSeenAt)} />
                  <InfoRow
                    label="Client Source"
                    value={editableValue('clientSource', c.clientSource || '—')}
                    editable
                    onEdit={() => startEdit('clientSource', c.clientSource || '')}
                  />
                  <InfoRow label="Landing Page" value={c.landingPage || '—'} />
                  <InfoRow label="Click ID" value={c.clickId || '—'} />
                  <InfoRow label="Assigned To" value={c.assignedTo?.name || '—'} />
                  <InfoRow label="Compliance Status" value={c.kycStatus || 'none'} />
                  <InfoRow label="AML Status" value={c.amlStatus || 'none'} />
                  <InfoRow label="Last Interaction" value={fmt(c.lastInteractionAt)} />
                </div>
              </div>
            </div>
          )}

          {tab === 'accounts' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="border-b border-border text-[10px] capitalize text-secondary">
                    <tr>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Leverage</th>
                      <th className="px-3 py-2">Balance</th>
                      <th className="px-3 py-2">Equity</th>
                      <th className="px-3 py-2">Credit</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(c.accounts || []).map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50">
                        <td className="px-3 py-2 font-semibold">{a.number}</td>
                        <td className="px-3 py-2">{a.type}</td>
                        <td className="px-3 py-2">{a.leverage}</td>
                        <td className="px-3 py-2 tabular-nums">{money(a.balance)}</td>
                        <td className="px-3 py-2 tabular-nums">{money(a.equity)}</td>
                        <td className="px-3 py-2 tabular-nums">{money(a.credit)}</td>
                        <td className="px-3 py-2">{a.active === false ? 'Disabled' : 'Active'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-border bg-[#161a21] p-3">
                <div className="mb-2 text-xs font-bold capitalize tracking-wide text-secondary">
                  Open trades — live price control
                </div>
                <p className="mb-3 text-[11px] text-secondary">
                  Change entry (open) or mark price. Client app refreshes every 2s while the page is open.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-[12px]">
                    <thead className="border-b border-border text-[10px] capitalize text-secondary">
                      <tr>
                        <th className="px-2 py-2">Symbol</th>
                        <th className="px-2 py-2">Side</th>
                        <th className="px-2 py-2">Vol</th>
                        <th className="px-2 py-2">Open (entry)</th>
                        <th className="px-2 py-2">Current (mark)</th>
                        <th className="px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(c.trades || [])
                        .filter((t: any) => t.status === 'open' || t.status === 'pending')
                        .map((t: any) => (
                          <TradePriceRow key={t.id} trade={t} onSaved={load} />
                        ))}
                      {(c.trades || []).filter((t: any) => t.status === 'open' || t.status === 'pending')
                        .length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center text-secondary">
                            No open trades
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'transactions' && (
            <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead className="border-b border-border text-[10px] capitalize text-secondary">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(c.transactions || []).map((t: any) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="px-3 py-2 capitalize">{t.type}</td>
                      <td className={`px-3 py-2 tabular-nums ${pnlClass(t.amount)}`}>{money(t.amount)}</td>
                      <td className="px-3 py-2">{t.status}</td>
                      <td className="px-3 py-2 text-secondary">{fmt(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-2 rounded-xl border border-border bg-[#161a21] p-3">
              {(c.kycDocuments || []).length === 0 && (
                <p className="text-sm text-secondary">No documents</p>
              )}
              {(c.kycDocuments || []).map((d: any) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[12px]"
                >
                  <div>
                    <div className="font-semibold">
                      {d.kind} / {d.docType}
                    </div>
                    <div className="text-secondary">
                      {d.status} · {fmt(d.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-buy/20 px-2 py-1 text-[11px] font-semibold text-buy"
                      onClick={() =>
                        void api(`/api/admin/crm/documents/${d.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'approved' }),
                        }).then(load)
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded bg-sell/20 px-2 py-1 text-[11px] font-semibold text-sell"
                      onClick={() =>
                        void api(`/api/admin/crm/documents/${d.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'rejected' }),
                        }).then(load)
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(tab === 'activities' || tab === 'activity') && (
            <div className="overflow-x-auto rounded-xl border border-border bg-[#161a21]">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="border-b border-border text-[10px] capitalize text-secondary">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(c.crmActivities || []).map((a: any) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="px-3 py-2">{a.staff?.name || '—'}</td>
                      <td className="px-3 py-2">
                        {a.action}
                        {a.detail ? <span className="block text-[10px] text-secondary">{a.detail}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-secondary">{a.ip || '—'}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-secondary">{a.device || '—'}</td>
                      <td className="px-3 py-2 text-secondary">{fmt(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {['emails', 'sms', 'calls', 'chat', 'push'].includes(tab) && (
            <div className="space-y-2 rounded-xl border border-border bg-[#161a21] p-3">
              {(c.contactsAsClient || [])
                .filter((x: any) => {
                  if (tab === 'emails') return x.channel === 'email'
                  if (tab === 'sms') return x.channel === 'sms'
                  if (tab === 'calls') return x.channel === 'call' || x.channel === 'phone'
                  if (tab === 'chat') return x.channel === 'im' || x.channel === 'whatsapp'
                  if (tab === 'push') return x.channel === 'push'
                  return true
                })
                .map((x: any) => (
                  <div key={x.id} className="rounded-lg border border-border px-3 py-2 text-[12px]">
                    <div className="text-[10px] text-secondary">
                      {x.channel} · {x.staff?.name} · {fmt(x.createdAt)}
                    </div>
                    <div>{x.note}</div>
                  </div>
                ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder={`Log ${tab} note…`}
                  value={modalVal}
                  onChange={(e) => setModalVal(e.target.value)}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy || !modalVal.trim()}
                  onClick={() => {
                    const channel =
                      tab === 'emails'
                        ? 'email'
                        : tab === 'sms'
                          ? 'sms'
                          : tab === 'calls'
                            ? 'call'
                            : tab === 'chat'
                              ? 'whatsapp'
                              : 'push'
                    void api(`/api/admin/crm/clients-v2/${id}/comms`, {
                      method: 'POST',
                      body: JSON.stringify({ note: modalVal, channel }),
                    }).then(() => {
                      setModalVal('')
                      return load()
                    })
                  }}
                >
                  Log
                </button>
              </div>
            </div>
          )}

          {/* Comments — always visible like Panda */}
          <div className="rounded-xl border border-border bg-[#161a21] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">
                Comments ({c.crmComments?.length ?? 0})
              </h3>
            </div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <textarea
                rows={2}
                className="min-h-[64px] flex-1 rounded-lg border border-border bg-[#12151a] px-3 py-2 text-sm outline-none hover:border-accent/50 focus:border-accent"
                placeholder="Enter your comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !comment.trim()}
                onClick={() => void addComment()}
                className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-[#202630] hover:bg-[#ceaf30] disabled:opacity-50"
              >
                Add comment
              </button>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-y-auto">
              {(c.crmComments || []).map((n: any) => (
                <div key={n.id} className="rounded-lg border border-border/70 bg-[#12151a]/60 px-3 py-2">
                  <div className="text-[12px] whitespace-pre-wrap text-text">{n.body}</div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-secondary">
                    <span>
                      {n.staff?.name || 'Staff'}
                      {me.role ? ` · ${me.role}` : ''}
                    </span>
                    <span className="flex items-center gap-2">
                      {fmt(n.createdAt)}
                      {(n.staffId === me.id || me.role === 'ADMIN') && (
                        <button
                          type="button"
                          className="text-sell"
                          onClick={() =>
                            void api(`/api/admin/crm/comments/${n.id}`, { method: 'DELETE' }).then(load)
                          }
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CRM Actions sidebar */}
        <aside className="h-fit rounded-xl border border-border bg-[#161a21] p-2 xl:sticky xl:top-3">
          <div className="mb-2 px-1 text-[10px] font-bold capitalize tracking-wide text-secondary">
            CRM Actions
          </div>
          <div className="space-y-1">
            <ActionBtn label="Client Deposit" onClick={() => setModal('deposit')} disabled={busy} />
            <ActionBtn label="Pop-up Alert" onClick={() => setModal('alert')} disabled={busy} />
            <ActionBtn
              label="Send Instant Message"
              onClick={() => {
                setTab('chat')
                setMsg('Use Chat Logs tab to log IM / WhatsApp')
              }}
            />
            <ActionBtn label="Manage Password" onClick={() => setModal('password')} disabled={busy} />
            <ActionBtn
              label="Restrict Trading"
              onClick={() => void runAction('restrict_trading')}
              disabled={busy}
            />
            <ActionBtn
              label="Disable Account"
              onClick={() => void runAction('disable_account')}
              disabled={busy}
            />
            <ActionBtn
              label="Enable Account"
              onClick={() => void runAction('enable_account')}
              disabled={busy}
            />
            <ActionBtn label="Change Email" onClick={() => setModal('email')} disabled={busy} />
            <ActionBtn
              label="Customer Logs"
              onClick={() => setTab('activity')}
            />
            <ActionBtn
              label="Client Timeline"
              onClick={() => setTab('activities')}
            />
            <ActionBtn
              label="Verification"
              onClick={() => setTab('documents')}
            />
            <ActionBtn
              label="Find Similar"
              onClick={() => void runAction('find_similar')}
              disabled={busy}
            />
            <ActionBtn
              label="Change Marketing Plan"
              onClick={() => {
                setTab('tracking')
                startEdit('campaign', c.campaign || '')
              }}
            />
          </div>

          {similar && (
            <div className="mt-3 space-y-1 border-t border-border pt-2">
              <div className="px-1 text-[10px] font-bold capitalize text-secondary">Similar</div>
              {similar.length === 0 && <p className="px-1 text-[11px] text-secondary">None</p>}
              {similar.map((s) => (
                <Link
                  key={s.id}
                  to={`/crm/clients/${s.id}`}
                  className="block rounded-md border border-border px-2 py-1.5 text-[11px] hover:border-accent/40"
                >
                  #{s.crmNumber} {s.name}
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-[#161a21] p-5 shadow-xl sm:p-6">
            <h3 className="text-base font-bold text-text">
              {modal === 'alert'
                ? 'Pop-up Alert'
                : modal === 'password'
                  ? 'Manage Password'
                  : modal === 'email'
                    ? 'Change Email'
                    : modal === 'finance'
                      ? `Edit ${financeField}`
                      : 'Client Deposit note'}
            </h3>
            <input
              className={`${inputClass} mt-4 w-full`}
              type={
                modal === 'password'
                  ? 'password'
                  : modal === 'email'
                    ? 'email'
                    : 'text'
              }
              inputMode={modal === 'finance' ? 'decimal' : undefined}
              step={modal === 'finance' ? '0.01' : undefined}
              autoFocus={modal === 'finance'}
              placeholder={
                modal === 'alert'
                  ? 'Message'
                  : modal === 'password'
                    ? 'New password'
                    : modal === 'email'
                      ? 'New email'
                      : modal === 'finance'
                        ? 'Amount'
                        : 'Deposit note / reference'
              }
              value={modalVal}
              onChange={(e) => setModalVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && modal === 'finance' && financeField) {
                  void saveFinance(financeField, modalVal)
                }
              }}
            />
            {modal === 'finance' && (
              <p className="mt-2 text-[12px] text-secondary">
                Sets the value on the client live account and logs a CRM finance change.
              </p>
            )}
            <div className="mt-5 flex w-full justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-secondary hover:text-text"
                onClick={() => {
                  setModal(null)
                  setFinanceField(null)
                  setModalVal('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnPrimary} h-10`}
                disabled={busy}
                onClick={() => {
                  if (modal === 'alert') void runAction('popup_alert', { message: modalVal })
                  else if (modal === 'password') void runAction('change_password', { password: modalVal })
                  else if (modal === 'email') void runAction('change_email', { email: modalVal })
                  else if (modal === 'finance' && financeField) void saveFinance(financeField, modalVal)
                  else {
                    void api(`/api/admin/crm/clients-v2/${id}/comms`, {
                      method: 'POST',
                      body: JSON.stringify({ note: `Deposit: ${modalVal}`, channel: 'im' }),
                    }).then(() => {
                      setModal(null)
                      setModalVal('')
                      return load()
                    })
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
