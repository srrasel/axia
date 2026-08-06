import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Headphones, HelpCircle, LifeBuoy, Mail, MessageCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'

type SupportConfig = {
  enabled: boolean
  icon: string
  title: string
  subtitle: string
  placeholder: string
  successMessage: string
  supportEmail: string
}

const ICONS = {
  'message-circle': MessageCircle,
  headphones: Headphones,
  'life-buoy': LifeBuoy,
  'help-circle': HelpCircle,
  mail: Mail,
} as const

export function SupportWidget() {
  const { showToast } = useApp()
  const location = useLocation()
  const [config, setConfig] = useState<SupportConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show on trading / member shell pages (not account or auth-only flows)
  const onMemberShell =
    location.pathname === '/member' ||
    location.pathname.startsWith('/markets') ||
    location.pathname.startsWith('/signals') ||
    location.pathname.startsWith('/portfolio') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/more') ||
    location.pathname.startsWith('/analytics') ||
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/ai') ||
    location.pathname.startsWith('/premium') ||
    location.pathname.startsWith('/reports')

  useEffect(() => {
    if (!onMemberShell) return
    void api<SupportConfig>('/api/support/config')
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [onMemberShell])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!onMemberShell || !config?.enabled) return null

  const Icon = ICONS[config.icon as keyof typeof ICONS] || MessageCircle

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
      setOpen(false)
      showToast(config.successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open support"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-[#fcd535] text-[#202630] shadow-lg transition-colors hover:bg-[#ceaf30] md:bottom-6 md:right-6"
      >
        <Icon size={22} strokeWidth={1.75} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close support form"
            onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-muted"
              >
                <X size={16} />
              </button>
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
              <p className="text-[11px] text-text-secondary">
                Or email{' '}
                <a className="text-[#fcd535] hover:underline" href={`mailto:${config.supportEmail}`}>
                  {config.supportEmail}
                </a>
              </p>
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
        </div>
      ) : null}
    </>
  )
}
