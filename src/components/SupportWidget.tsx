import { useEffect, useState, type FormEvent, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Headphones, HelpCircle, LifeBuoy, Mail, MessageCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'

export type SupportConfig = {
  enabled: boolean
  icon: string
  title: string
  subtitle: string
  placeholder: string
  successMessage: string
  supportEmail: string
}

export const SUPPORT_ICONS = {
  'message-circle': MessageCircle,
  headphones: Headphones,
  'life-buoy': LifeBuoy,
  'help-circle': HelpCircle,
  mail: Mail,
} as const

export function supportIconFromConfig(icon?: string) {
  return SUPPORT_ICONS[(icon as keyof typeof SUPPORT_ICONS) || 'message-circle'] || MessageCircle
}

export function useSupportConfig() {
  const [config, setConfig] = useState<SupportConfig | null>(null)

  useEffect(() => {
    void api<SupportConfig>('/api/support/config')
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [])

  return config
}

export function SupportFormModal({
  config,
  open,
  onClose,
}: {
  config: SupportConfig
  open: boolean
  onClose: () => void
}) {
  const { showToast } = useApp()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/api/support/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim() || 'Support',
          message: message.trim(),
        }),
      })
      setSubject('')
      setMessage('')
      onClose()
      showToast(config.successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close support form"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90dvh,36rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-panel shadow-2xl md:max-w-md md:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
          <div className="min-w-0">
            <div className="text-[16px] font-semibold capitalize text-text">{config.title}</div>
            <p className="mt-0.5 text-[12px] text-text-secondary">{config.subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-border bg-muted/30 px-4 py-3 text-[12px] text-text-secondary">
          <div className="font-medium capitalize text-text">Support Details</div>
          <p className="mt-1">
            Email:{' '}
            <a className="text-[#fcd535] hover:underline" href={`mailto:${config.supportEmail}`}>
              {config.supportEmail}
            </a>
          </p>
        </div>

        <form className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" onSubmit={(e) => void submit(e)}>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium capitalize text-text-secondary">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-white"
              placeholder="Support"
              maxLength={120}
            />
          </label>
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium capitalize text-text-secondary">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              maxLength={4000}
              placeholder={config.placeholder}
              className="min-h-[120px] w-full resize-y rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-white"
            />
          </label>
          {error ? <p className="text-[12px] text-sell">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || message.trim().length < 3}
            className={clsx(
              'mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-[#fcd535] text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]',
              (busy || message.trim().length < 3) && 'opacity-50',
            )}
          >
            {busy ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}

/** Mobile floating button (desktop uses left sidebar). */
export function SupportWidget() {
  const config = useSupportConfig()
  const [open, setOpen] = useState(false)

  if (!config?.enabled) return null

  const Icon = supportIconFromConfig(config.icon)

  return (
    <>
      <button
        type="button"
        aria-label="Open support"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-[#fcd535] text-[#202630] shadow-lg transition-colors hover:bg-[#ceaf30] md:hidden"
      >
        <Icon size={22} strokeWidth={1.75} />
      </button>
      <SupportFormModal config={config} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function SupportRailButton() {
  const config = useSupportConfig()
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null)

  if (!config?.enabled) return null

  const Icon = supportIconFromConfig(config.icon)

  const showTip = (e: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ top: r.top + r.height / 2, left: r.right + 8 })
  }

  const hideTip = () => setTip(null)

  return (
    <>
      <button
        type="button"
        aria-label="Support"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={clsx(
          'relative mb-[10px] flex shrink-0 items-center justify-center rounded-full p-[10px] transition-colors last:mb-0',
          'text-text-secondary hover:bg-sidebar-active hover:text-brand-ink',
          open && 'bg-sidebar-active text-white',
        )}
      >
        {open ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#fcd535]" /> : null}
        <Icon size={24} strokeWidth={1.75} className="h-6 w-6" />
      </button>
      {tip
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[200] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#29313d] p-[10px] text-[13px] font-semibold leading-none text-white shadow-md"
              style={{ top: tip.top, left: tip.left }}
            >
              Support
            </span>,
            document.body,
          )
        : null}
      <SupportFormModal config={config} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
