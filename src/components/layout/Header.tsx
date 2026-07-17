import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Check, ChevronDown, CreditCard, Globe, History, Layers, LogOut, Moon, ShieldCheck, Sun, User, Wallet, X } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { formatMoney } from '../../data/mock'
import { BrandLogo } from '../BrandLogo'
import { UserAvatar } from '../UserAvatar'
import { MobileAccountSwitcher } from './MobileAccountSwitcher'

const userMenu = [
  { to: '/account/details', icon: User, label: 'Account details' },
  { to: '/account/manage', icon: Layers, label: 'Manage accounts', hideOnMobile: true },
  { to: '/account/deposit', icon: CreditCard, label: 'Deposit' },
  { to: '/account/withdraw', icon: Wallet, label: 'Withdraw' },
  { to: '/account/transactions', icon: History, label: 'Transactions', hideOnMobile: true },
  { to: '/account/verification', icon: ShieldCheck, label: 'Verification', hideOnMobile: true },
]

export function Header() {
  const {
    metrics,
    activeAccountId,
    accountType,
    accounts,
    switchAccount,
    darkMode,
    setDarkMode,
    user,
    language,
    setLanguage,
    logout,
    notifications,
    markNotificationsRead,
  } = useApp()
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-GB'))
  const [langOpen, setLangOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const account = accounts.find((a) => a.id === activeAccountId)
  const isLiveAccount = accountType === 'live'
  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!userOpen && !langOpen && !notifOpen) return
    const onDoc = (e: Event) => {
      const target = e.target as Node
      if (userOpen && userMenuRef.current && !userMenuRef.current.contains(target)) setUserOpen(false)
      if (langOpen && langRef.current && !langRef.current.contains(target)) setLangOpen(false)
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserOpen(false)
        setLangOpen(false)
        setNotifOpen(false)
      }
    }
    // Defer so the opening tap/click does not immediately close on mobile
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDoc)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [userOpen, langOpen, notifOpen])

  return (
    <header className="panel relative z-40 flex h-14 shrink-0 items-center gap-1.5 overflow-hidden border-b px-3 sm:h-16 sm:gap-3 sm:overflow-visible sm:px-5">
      <Link to="/platform" className="flex shrink-0 items-center">
        <BrandLogo className="h-6 w-auto max-w-[4.5rem] object-contain sm:h-10 sm:max-w-none" />
      </Link>

      <MobileAccountSwitcher />

      {/* Demo / Live account switch — desktop / tablet */}
      <div className="relative hidden min-w-0 shrink-0 sm:block">
        <div className="relative flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-[#29313d] py-0.5 pl-2 pr-0.5 sm:gap-2.5 sm:py-1 sm:pl-2.5 sm:pr-1">
          <span
            className={clsx(
              'pointer-events-none relative z-0 h-2 w-2 shrink-0 rounded-full',
              isLiveAccount
                ? 'bg-buy shadow-[0_0_0_3px_rgba(34,160,107,0.2)]'
                : 'bg-link shadow-[0_0_0_3px_rgba(96,165,250,0.2)]',
            )}
          />
          <div className="pointer-events-none relative z-0 min-w-0 pr-5 sm:pr-6">
            <div
              className={clsx(
                'h-8 max-w-[6.75rem] truncate pr-1 text-xs font-semibold leading-8 sm:max-w-[9.5rem] sm:text-sm',
                isLiveAccount ? 'text-buy' : 'text-link',
              )}
            >
              {account
                ? `${account.type === 'demo' ? 'Demo' : 'Live'}${
                    account.number ? ` · ${String(account.number).slice(-4)}` : ''
                  }`
                : 'Account'}
            </div>
            <div className="hidden truncate text-[10px] leading-none text-text-secondary sm:block">
              ID {account?.number || account?.id}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={clsx(
              'pointer-events-none absolute right-1.5 top-1/2 z-0 -translate-y-1/2 sm:right-2',
              isLiveAccount ? 'text-buy' : 'text-link',
            )}
            aria-hidden
          />
          <select
            aria-label="Switch demo or live account"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
            value={accounts.some((a) => a.id === activeAccountId) ? activeAccountId : accounts[0]?.id || ''}
            onChange={(e) => {
              const next = e.target.value
              if (next && next !== activeAccountId) switchAccount(next)
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.type === 'demo' ? 'Demo' : 'Live'}
                {a.number ? ` · ${String(a.number).slice(-4)}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ml-1 hidden min-w-0 flex-1 items-center gap-1 overflow-hidden lg:flex xl:gap-2">
        <Metric label="Free Margin" value={formatMoney(metrics.freeMargin)} />
        <Metric label="Used Funds" value={formatMoney(metrics.usedFunds)} />
        <Metric label="Equity" value={formatMoney(metrics.equity)} className="positive" />
        <Metric
          label="Total PnL"
          value={formatMoney(metrics.totalPnl)}
          className={metrics.totalPnl >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Margin Level"
          value={metrics.usedFunds > 0 ? `${metrics.marginLevel.toFixed(2)}%` : '—'}
          className="positive"
        />
      </div>

      <div className="hidden min-w-0 flex-1 sm:block lg:hidden" aria-hidden />

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <button
          type="button"
          onClick={() => navigate('/account/deposit')}
          aria-label="Deposit"
          className="order-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-[#28303c] hover:text-brand-ink sm:order-1 sm:auth-btn sm:h-10 sm:w-auto sm:rounded-[8px] sm:bg-[#fcd535] sm:px-4 sm:!text-[#202630] sm:hover:bg-[#ceaf30]"
        >
          <Wallet size={17} strokeWidth={1.75} className="sm:hidden" />
          <span className="hidden text-sm font-semibold sm:inline">Deposit</span>
        </button>

        <span className="order-3 mr-1 hidden w-[4.75rem] text-right tabular-nums text-xs text-text-secondary sm:order-2 sm:inline">
          {time}
        </span>

        <button
          type="button"
          aria-label="Toggle theme"
          className="order-3 hidden h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-[#28303c] hover:text-brand-ink sm:order-3 sm:flex sm:h-10 sm:w-10"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        <div className="relative order-3 hidden sm:order-4 sm:block" ref={langRef}>
          <button
            type="button"
            aria-label="Language"
            className={clsx(
              'flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-[#28303c] hover:text-brand-ink sm:h-10 sm:w-10',
              langOpen && 'bg-[#28303c] text-brand-ink',
            )}
            onClick={() => {
              setLangOpen((v) => !v)
              setUserOpen(false)
              setNotifOpen(false)
            }}
          >
            <Globe size={18} strokeWidth={1.75} />
          </button>
          {langOpen ? (
            <div className="panel absolute right-0 top-12 z-[60] min-w-[8.5rem] overflow-hidden rounded-xl border shadow-xl">
              {(['en', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={clsx(
                    'block w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[#28303c]',
                    language === lang && 'font-semibold text-brand-ink',
                  )}
                  onClick={() => {
                    setLanguage(lang)
                    setLangOpen(false)
                  }}
                >
                  {lang === 'en' ? 'English' : 'العربية'}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative order-1 sm:order-5" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className={clsx(
              'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-[#28303c] hover:text-brand-ink sm:h-10 sm:w-10',
              notifOpen && 'bg-[#28303c] text-brand-ink',
            )}
            onClick={() => {
              setNotifOpen((v) => !v)
              setUserOpen(false)
              setLangOpen(false)
            }}
          >
            <Bell size={17} strokeWidth={1.75} />
            {unreadCount > 0 ? (
              <span className="absolute right-[2px] top-[2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-sell px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div className="panel fixed right-[5px] top-[3.5rem] z-[60] w-[calc(100vw-10px)] max-w-[22rem] overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:right-0 sm:top-14 sm:w-[min(22rem,calc(100vw-1.5rem))] sm:max-w-none">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="text-sm font-semibold">Notifications</div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-[#fcd535] hover:underline"
                    onClick={() => void markNotificationsRead()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-[min(22rem,60vh)] overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-text-secondary">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'border-b border-border/70 px-4 py-3 last:border-b-0',
                        !n.read && 'bg-[#28303c]/50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm font-medium text-text">{n.title}</div>
                        <div className="shrink-0 text-[10px] text-text-secondary">{n.time}</div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-[#28303c] hover:text-brand-ink"
                  onClick={() => {
                    setNotifOpen(false)
                    navigate('/notifications')
                  }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative order-3 ml-0.5 sm:order-6" ref={userMenuRef}>
          <button
            type="button"
            aria-label="User menu"
            aria-expanded={userOpen}
            className={clsx(
              'flex cursor-pointer items-center rounded-full bg-transparent p-0.5 transition-colors hover:bg-[#28303c] sm:p-1.5',
              userOpen && 'bg-[#28303c]',
            )}
            onClick={() => {
              setUserOpen((v) => !v)
              setLangOpen(false)
              setNotifOpen(false)
            }}
          >
            <UserAvatar
              photoUrl={user?.photoUrl}
              name={user?.name}
              size={32}
              plain
              className="border border-[#28303c]"
            />
          </button>
          {userOpen ? (
            <div className="panel fixed right-[5px] top-[3.5rem] z-[60] flex w-[calc(100vw-10px)] max-w-[18rem] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:right-0 sm:top-14 sm:w-72 sm:max-w-none">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5">
                <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={44} plain />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">{user?.name}</div>
                  <div className="truncate text-xs text-text-secondary">{user?.email}</div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary ring-1 ring-border">
                    <span
                      className={clsx('h-1.5 w-1.5 rounded-full', isLiveAccount ? 'bg-buy' : 'bg-link')}
                    />
                    {isLiveAccount ? 'Live' : 'Demo'}
                  </div>
                </div>
              </div>
              <div>
                <div className="hidden border-b border-border px-3 py-3 sm:block">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    Trading account
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {accounts.map((a) => {
                      const active = a.id === activeAccountId
                      const live = a.type === 'live'
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            switchAccount(a.id)
                            setUserOpen(false)
                          }}
                          className={clsx(
                            'rounded-xl border px-3 py-2.5 text-left transition-colors',
                            active
                              ? live
                                ? 'border-buy bg-buy/10'
                                : 'border-link bg-link/10'
                              : 'border-border hover:bg-[#29313d]',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={clsx('h-1.5 w-1.5 rounded-full', live ? 'bg-buy' : 'bg-link')}
                            />
                            <span className="text-xs font-semibold">{live ? 'Live' : 'Demo'}</span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-text-secondary">
                            #{a.number || a.id}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="py-1.5">
                  {userMenu.map(({ to, icon: Icon, label, hideOnMobile }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setUserOpen(false)}
                      className={clsx(
                        'items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-[#29313d] hover:text-brand-ink',
                        hideOnMobile ? 'hidden md:flex' : 'flex',
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center text-brand-ink">
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-border py-1.5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-sell transition-colors hover:bg-[#29313d]"
                    onClick={() => {
                      setUserOpen(false)
                      logout()
                      navigate('/login')
                    }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sell/10">
                      <LogOut size={18} strokeWidth={1.75} />
                    </span>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function Metric({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="w-[6.75rem] shrink-0 rounded-lg px-2 py-1.5 xl:w-[7.5rem] xl:px-2.5">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</div>
      <div
        className={clsx(
          'mt-0.5 block w-full truncate text-sm font-semibold leading-tight tabular-nums',
          className,
        )}
      >
        {value}
      </div>
    </div>
  )
}

export function Toast() {
  const { toast, clearToast } = useApp()
  if (!toast) return null

  const volumeLabel =
    toast.kind === 'trade'
      ? Number.isInteger(toast.volume)
        ? String(toast.volume)
        : toast.volume.toFixed(2)
      : ''

  return (
    <div
      role="status"
      className="toast pointer-events-auto fixed right-3 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.75rem))] z-[100] flex w-[min(22rem,calc(100%-1.5rem))] items-start gap-3 rounded-3xl bg-white px-4 py-3.5 text-left text-[#111] shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:right-5"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white">
        {toast.kind === 'trade' ? (
          <Check
            size={16}
            strokeWidth={2.5}
            className={toast.side === 'buy' ? 'text-buy' : 'text-sell'}
          />
        ) : (
          <Check size={16} strokeWidth={2.5} className="text-[#22a06b]" />
        )}
      </span>

      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-snug">
        {toast.kind === 'trade' ? (
          <>
            <div>
              {toast.pending ? (
                <>
                  Done! Pending {toast.side} of <span className="font-bold">{volumeLabel}</span>
                </>
              ) : (
                <>
                  Done! You have {toast.side === 'buy' ? 'bought' : 'sold'}{' '}
                  <span className="font-bold">{volumeLabel}</span>
                </>
              )}
            </div>
            <div>
              <span className="font-bold">{toast.symbol}</span> at{' '}
              <span className="font-bold">{toast.priceLabel}.</span>
            </div>
          </>
        ) : (
          <div className="font-medium">{toast.text}</div>
        )}
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={clearToast}
        className="mt-0.5 shrink-0 cursor-pointer rounded-md p-0.5 text-[#6b7280] transition-colors hover:text-[#111]"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
