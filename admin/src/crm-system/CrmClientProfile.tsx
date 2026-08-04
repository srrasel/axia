import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MessageCircle,
  Mail,
  Phone,
  Pencil,
  Lock,
  ChevronRight,
  ArrowLeft,
  Eye,
  X,
} from 'lucide-react'
import { api } from '../api'
import { btnPrimary, inputClass, money, TablePagination, usePagination, actionBtnPrimary, actionBtnSuccess, actionBtnDanger, actionBtnNeutral } from '../layout'
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

function toTitleCase(text?: string | null) {
  if (!text) return ''
  return text
    .replaceAll('_', ' ')
    .replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

const FINANCE_FIELD_LABELS: Record<string, string> = {
  balance: 'Balance',
  credit: 'Credit',
  equity: 'Equity',
  freeMargin: 'Free Margin',
  openPnl: 'Open P&L',
  closedPnl: 'Closed P&L',
  deposits: 'Deposit',
  withdrawals: 'Withdrawals',
  netDeposit: 'Net Deposit',
}

function financeFieldLabel(field?: string | null) {
  if (!field) return ''
  return (
    FINANCE_FIELD_LABELS[field] ||
    toTitleCase(field.replace(/([a-z])([A-Z])/g, '$1 $2'))
  )
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
      className="flex h-full min-h-[72px] min-w-0 flex-col justify-start rounded-lg border border-border bg-[#161a21] px-2.5 py-2 text-left transition-colors hover:border-accent/50 disabled:cursor-default disabled:hover:border-border"
      title={onEdit ? `Edit ${label}` : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="truncate text-[12px] font-medium capitalize tracking-wide text-secondary">{label}</div>
        {onEdit ? <Pencil size={10} className="mt-0.5 shrink-0 text-secondary" /> : null}
      </div>
      <div className={`mt-0.5 truncate text-sm font-bold tabular-nums ${color}`}>{value}</div>
      <div className="mt-auto min-h-[14px] text-[10px] leading-[14px] text-secondary">{sub || '\u00a0'}</div>
    </button>
  )
}

function InfoRow({
  label,
  value,
  editable,
  editing,
  onEdit,
}: {
  label: string
  value?: ReactNode
  editable?: boolean
  editing?: boolean
  onEdit?: () => void
}) {
  return (
    <div
      className={`flex min-h-[28px] min-w-0 items-start gap-1 border-b border-border/40 py-1.5 text-[12px] leading-tight ${
        editing ? 'overflow-visible' : 'overflow-hidden'
      }`}
    >
      <span className="w-[42%] max-w-[42%] shrink-0 text-secondary">{label}</span>
      <span
        className={`min-w-0 flex-1 font-medium text-text ${
          editing ? 'overflow-visible' : 'overflow-hidden break-all'
        }`}
      >
        {value ?? '—'}
      </span>
      {editable && !editing ? (
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
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="flex min-h-9 w-full touch-manipulation items-center justify-between gap-2 rounded-md border border-border bg-[#12151a] px-2.5 py-1.5 text-left text-[12px] font-medium text-text transition-colors hover:border-accent/50 hover:bg-[#1c222c] active:bg-[#1c222c] disabled:opacity-50 xl:min-h-0 xl:px-3 xl:py-2 xl:text-[12px]"
    >
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      <ChevronRight size={14} className="shrink-0 text-secondary" />
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
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const [comment, setComment] = useState('')
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [modal, setModal] = useState<null | 'alert' | 'password' | 'email' | 'deposit' | 'finance'>(null)
  const [modalVal, setModalVal] = useState('')
  const [financeField, setFinanceField] = useState<string | null>(null)
  const [similar, setSimilar] = useState<any[] | null>(null)
  const [docPreview, setDocPreview] = useState<{
    id: string
    fileName: string
    mimeType?: string | null
    fileData: string
    docType: string
    kind: string
    status: string
  } | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(text: string, tone: 'ok' | 'err' = 'ok') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ text, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function getScrollParent(el: HTMLElement | null): HTMLElement | null {
    let p = el?.parentElement ?? null
    while (p) {
      const oy = getComputedStyle(p).overflowY
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p
      p = p.parentElement
    }
    return null
  }

  function preserveScroll(run: () => void | Promise<void>) {
    const scroller = getScrollParent(pageRef.current)
    const top = scroller ? scroller.scrollTop : window.scrollY
    return Promise.resolve(run()).finally(() => {
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = top
        else window.scrollTo(0, top)
      })
    })
  }

  function goTab(next: TabId) {
    setTab(next)
    requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function saveFinance(field: string, raw: string) {
    const num = Number(raw)
    if (!Number.isFinite(num)) {
      showToast('Enter a valid number', 'err')
      return
    }
    setBusy(true)
    try {
      await api(`/api/admin/crm/clients-v2/${id}/finance`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: num }),
      })
      setModal(null)
      setFinanceField(null)
      setModalVal('')
      showToast(`${financeFieldLabel(field)} Updated`)
      await preserveScroll(() => load())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed', 'err')
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
    try {
      await api(`/api/admin/crm/clients-v2/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setEditKey(null)
      showToast('Saved')
      await preserveScroll(() => load())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function runAction(action: string, extra: Record<string, string> = {}) {
    setBusy(true)
    try {
      const res = await api<any>(`/api/admin/crm/clients-v2/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.similar) setSimilar(res.similar)
      setModal(null)
      setModalVal('')
      const labels: Record<string, string> = {
        restrict_trading: 'Trading restricted',
        unrestrict_trading: 'Trading unrestricted',
        disable_account: 'Account disabled',
        enable_account: 'Account enabled',
        popup_alert: 'Alert sent',
        change_password: 'Password updated',
        change_email: 'Email updated',
        find_similar: 'Similar clients loaded',
      }
      showToast(labels[action] || 'Done')
      await preserveScroll(() => load())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'err')
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
      showToast('Comment added')
      await preserveScroll(() => load())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function contactClient(kind: 'call' | 'email' | 'chat') {
    const client = data?.client
    if (!client || !id) return
    setBusy(true)
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
        requestAnimationFrame(() => {
          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        if (client.phone) {
          window.location.href = `tel:${String(client.phone).replace(/[^\d+]/g, '')}`
          showToast(`Calling ${client.name}…`)
        } else {
          showToast('No phone number on file — logged under Calls', 'err')
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
        requestAnimationFrame(() => {
          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(`NitajFX — ${client.name}`)}`
        showToast(`Opening email to ${client.email}`)
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
        requestAnimationFrame(() => {
          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        if (client.phone) {
          const digits = String(client.phone).replace(/\D/g, '')
          window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer')
          showToast('Opening WhatsApp chat…')
        } else {
          showToast('No phone for WhatsApp — opened Chat log', 'err')
        }
      }
      await preserveScroll(() => load())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Contact action failed', 'err')
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

  const timelineRows = useMemo(() => data?.timeline ?? [], [data?.timeline])
  const activityRows = useMemo(
    () => (data?.client?.crmActivities as any[]) ?? [],
    [data?.client?.crmActivities],
  )
  const timelinePager = usePagination(timelineRows)
  const activityPager = usePagination(activityRows)
  const toastText = toast ? toast.text.charAt(0).toUpperCase() + toast.text.slice(1) : ''

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
    if (!editKey || busy) return
    const value = editVal.trim()
    if (editKey === 'name' && value.length < 2) {
      showToast('Name must be at least 2 characters', 'err')
      return
    }
    const nullable = new Set([
      'phone',
      'campaign',
      'campaignId',
      'campaignType',
      'clientSource',
      'address',
      'mediaSource',
      'adGroup',
      'creative',
      'keyword',
      'landingPage',
      'country',
      'nationality',
      'language',
    ])
    const payload: Record<string, unknown> = {
      [editKey]: value === '' && nullable.has(editKey) ? null : value,
    }
    void saveProfile(payload)
  }

  const editableValue = (key: string, display: ReactNode) => {
    if (editKey === key) {
      return (
        <span className="flex w-full min-w-0 items-center gap-1.5">
          <input
            autoFocus
            className="h-7 min-w-0 flex-1 rounded border border-accent bg-[#12151a] px-1.5 text-[12px] outline-none"
            value={editVal}
            disabled={busy}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitEdit()
              }
              if (e.key === 'Escape') setEditKey(null)
            }}
          />
          <button
            type="button"
            disabled={busy}
            className="h-7 shrink-0 rounded bg-accent px-2 text-[11px] font-bold text-[#202630] hover:bg-[#ceaf30] disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              commitEdit()
            }}
          >
            OK
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-7 shrink-0 rounded border border-border px-2 text-[11px] text-secondary hover:text-text disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setEditKey(null)
            }}
          >
            Cancel
          </button>
        </span>
      )
    }
    return display
  }

  return (
    <div ref={pageRef} className="-mx-1 space-y-3 pb-[min(32vh,240px)] lg:-mx-2 xl:pb-4">
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
              {c.tradingRestricted ? (
                <span className="rounded bg-sell/15 px-2 py-0.5 text-[10px] font-semibold text-sell">
                  Trading restricted
                </span>
              ) : null}
              {c.active === false ? (
                <span className="rounded bg-sell/15 px-2 py-0.5 text-[10px] font-semibold text-sell">
                  Account disabled
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

        <div className="mt-3 grid grid-cols-3 items-stretch gap-1.5 sm:grid-cols-5 xl:grid-cols-9">
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
      <div ref={tabsRef} className="scroll-mt-16 overflow-x-auto rounded-xl border border-border bg-[#161a21] md:scroll-mt-3">
        <div className="flex min-w-max gap-0 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              className={`touch-manipulation border-b-2 px-3 py-3 text-[12px] font-semibold whitespace-nowrap transition-colors sm:py-2.5 ${
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

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[80] flex justify-center px-4 sm:top-16">
          <div
            className={`pointer-events-auto max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
              toast.tone === 'err'
                ? 'border-sell/35 bg-white text-[#b42318]'
                : 'border-[#d0d5dd] bg-white text-[#101828]'
            }`}
            role="status"
          >
            {toastText}
          </div>
        </div>
      ) : null}

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
              <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-4 [&>div]:min-w-0">
                <div>
                  <InfoRow
                    label="First Name"
                    value={editableValue('name', first)}
                    editable
                    editing={editKey === 'name'}
                    onEdit={() => startEdit('name', c.name)}
                  />
                  <InfoRow
                    label="Mobile"
                    value={editableValue('phone', c.phone || '—')}
                    editable
                    editing={editKey === 'phone'}
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
                    editing={editKey === 'campaign'}
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
                    editing={editKey === 'nationality'}
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
                      <span className="inline-flex max-w-full min-w-0 items-start gap-1">
                        <Lock size={10} className="mt-0.5 shrink-0 text-secondary" />
                        <span className="min-w-0 break-all">{c.email}</span>
                      </span>
                    }
                  />
                  <InfoRow
                    label="UI Language"
                    value={editableValue('language', c.language || '—')}
                    editable
                    editing={editKey === 'language'}
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
                    editing={editKey === 'phone'}
                    onEdit={() => startEdit('phone', c.phone || '')}
                  />
                  <InfoRow
                    label="Country"
                    value={editableValue('country', c.country || '—')}
                    editable
                    editing={editKey === 'country'}
                    onEdit={() => startEdit('country', c.country || '')}
                  />
                  <InfoRow label="Base Currency" value={c.accounts?.[0]?.currency || 'USD'} />
                  <InfoRow label="Last Deposit Date" value={fmt(c.lastDepositAt)} />
                  <InfoRow label="Last Login Date" value={fmt(c.lastSeenAt)} />
                  <InfoRow
                    label="Client Source"
                    value={editableValue('clientSource', c.clientSource || '—')}
                    editable
                    editing={editKey === 'clientSource'}
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
                  <div className="min-w-0">
                    <div className="font-semibold capitalize">
                      {d.docType} · {d.kind}
                    </div>
                    <div className="truncate text-secondary">
                      {d.fileName} · {d.status} · {fmt(d.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-[10px]">
                    <button
                      type="button"
                      disabled={!d.hasFile && !d.fileData}
                      className={`${actionBtnNeutral} disabled:opacity-40`}
                      onClick={() =>
                        void api<{ document: any }>(`/api/admin/crm/documents/${d.id}/file`)
                          .then((r) => setDocPreview(r.document))
                          .catch((e) => showToast(e instanceof Error ? e.message : 'Could not open file', 'err'))
                      }
                    >
                      <Eye size={14} />
                      Check
                    </button>
                    {d.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className={actionBtnSuccess}
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
                          className={actionBtnDanger}
                          onClick={() =>
                            void api(`/api/admin/crm/documents/${d.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: 'rejected',
                                note: 'Please re-upload a clearer document',
                              }),
                            }).then(load)
                          }
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {docPreview ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-panel">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {docPreview.docType} · {docPreview.kind}
                    </div>
                    <div className="truncate text-xs text-secondary">{docPreview.fileName}</div>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
                    onClick={() => setDocPreview(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="overflow-auto bg-[#0e1116] p-4">
                  {docPreview.mimeType?.startsWith('image/') ||
                  docPreview.fileData.startsWith('data:image/') ? (
                    <img
                      src={docPreview.fileData}
                      alt={docPreview.fileName}
                      className="mx-auto max-h-[55vh] max-w-full object-contain"
                    />
                  ) : (
                    <iframe
                      title={docPreview.fileName}
                      src={docPreview.fileData}
                      className="h-[55vh] w-full rounded-lg bg-white"
                    />
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
                  <button
                    type="button"
                    className="h-9 rounded-lg border border-border px-3 text-sm"
                    onClick={() => setDocPreview(null)}
                  >
                    Close
                  </button>
                  {docPreview.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className={actionBtnDanger}
                        onClick={() =>
                          void api(`/api/admin/crm/documents/${docPreview.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                              status: 'rejected',
                              note: 'Please re-upload a clearer document',
                            }),
                          }).then(() => {
                            setDocPreview(null)
                            return load()
                          })
                        }
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className={actionBtnPrimary}
                        onClick={() =>
                          void api(`/api/admin/crm/documents/${docPreview.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'approved' }),
                          }).then(() => {
                            setDocPreview(null)
                            return load()
                          })
                        }
                      >
                        Approve
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'activities' && (
            <div className="overflow-hidden rounded-xl border border-border bg-[#161a21]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="border-b border-border text-[10px] capitalize text-secondary">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Detail</th>
                      <th className="px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelinePager.pageItems.map((t, i) => (
                      <tr key={`${t.at}-${t.type}-${i}`} className="border-b border-border/50">
                        <td className="px-3 py-2 capitalize text-secondary">{t.type}</td>
                        <td className="px-3 py-2">{t.title}</td>
                        <td className="max-w-[280px] truncate px-3 py-2 text-secondary">
                          {t.detail || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-secondary">{fmt(t.at)}</td>
                      </tr>
                    ))}
                    {timelinePager.total === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-sm text-secondary">
                          No timeline activity yet
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={timelinePager.page}
                totalPages={timelinePager.totalPages}
                total={timelinePager.total}
                from={timelinePager.from}
                to={timelinePager.to}
                onPageChange={timelinePager.setPage}
              />
            </div>
          )}

          {tab === 'activity' && (
            <div className="overflow-hidden rounded-xl border border-border bg-[#161a21]">
              <div className="overflow-x-auto">
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
                    {activityPager.pageItems.map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50">
                        <td className="px-3 py-2">{a.staff?.name || '—'}</td>
                        <td className="px-3 py-2">
                          {a.action}
                          {a.detail ? (
                            <span className="block text-[10px] text-secondary">{a.detail}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-secondary">{a.ip || '—'}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-secondary">
                          {a.device || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-secondary">{fmt(a.createdAt)}</td>
                      </tr>
                    ))}
                    {activityPager.total === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-secondary">
                          No activity history yet
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={activityPager.page}
                totalPages={activityPager.totalPages}
                total={activityPager.total}
                from={activityPager.from}
                to={activityPager.to}
                onPageChange={activityPager.setPage}
              />
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
                            void preserveScroll(() =>
                              api(`/api/admin/crm/comments/${n.id}`, { method: 'DELETE' }).then(load),
                            )
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

        {/* CRM Actions — fixed bottom sheet on mobile, side panel on xl */}
        <aside className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 max-h-[min(28vh,210px)] overflow-y-auto overscroll-contain rounded-t-xl border border-border bg-[#161a21]/97 p-1.5 pb-1.5 shadow-[0_-12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md xl:static xl:inset-auto xl:z-auto xl:max-h-none xl:overflow-visible xl:rounded-xl xl:border xl:border-border xl:bg-[#161a21] xl:p-2 xl:pb-2 xl:shadow-none xl:backdrop-blur-none xl:sticky xl:top-3 xl:h-fit">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1 px-1">
            <div className="text-[11px] font-bold capitalize tracking-wide text-secondary xl:text-[10px]">
              CRM Actions
            </div>
            <div className="flex flex-wrap gap-1">
              {c.tradingRestricted ? (
                <span className="rounded bg-sell/15 px-1.5 py-0.5 text-[10px] font-semibold text-sell">
                  Trading restricted
                </span>
              ) : null}
              {c.active === false ? (
                <span className="rounded bg-sell/15 px-1.5 py-0.5 text-[10px] font-semibold text-sell">
                  Account disabled
                </span>
              ) : (
                <span className="rounded bg-buy/15 px-1.5 py-0.5 text-[10px] font-semibold text-buy">
                  Account active
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-1 xl:gap-1">
            <ActionBtn label="Client Deposit" onClick={() => setModal('deposit')} disabled={busy} />
            <ActionBtn label="Pop-up Alert" onClick={() => setModal('alert')} disabled={busy} />
            <ActionBtn
              label="Send Instant Message"
              onClick={() => {
                goTab('chat')
                showToast('Use Chat Logs tab to log IM / WhatsApp')
              }}
            />
            <ActionBtn label="Manage Password" onClick={() => setModal('password')} disabled={busy} />
            <ActionBtn
              label={c.tradingRestricted ? 'Unrestrict Trading' : 'Restrict Trading'}
              onClick={() =>
                void runAction(c.tradingRestricted ? 'unrestrict_trading' : 'restrict_trading')
              }
              disabled={busy}
            />
            <ActionBtn
              label={c.active === false ? 'Enable Account' : 'Disable Account'}
              onClick={() =>
                void runAction(c.active === false ? 'enable_account' : 'disable_account')
              }
              disabled={busy}
            />
            <ActionBtn label="Change Email" onClick={() => setModal('email')} disabled={busy} />
            <ActionBtn label="Customer Logs" onClick={() => goTab('activity')} />
            <ActionBtn label="Client Timeline" onClick={() => goTab('activities')} />
            <ActionBtn label="Verification" onClick={() => goTab('documents')} />
            <ActionBtn
              label="Find Similar"
              onClick={() => void runAction('find_similar')}
              disabled={busy}
            />
            <ActionBtn
              label="Change Marketing Plan"
              onClick={() => {
                goTab('tracking')
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
                  className="block rounded-md border border-border px-2 py-2 text-[12px] hover:border-accent/40 sm:py-1.5 sm:text-[11px]"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-[#161a21] p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h3 className="text-base font-bold text-text">
              {modal === 'alert'
                ? 'Pop-up Alert'
                : modal === 'password'
                  ? 'Manage Password'
                  : modal === 'email'
                    ? 'Change Email'
                    : modal === 'finance'
                      ? `Edit ${financeFieldLabel(financeField)}`
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
