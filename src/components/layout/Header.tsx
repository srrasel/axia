import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Globe,
  History,
  Layers,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Wallet,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { formatMoney } from '../../data/mock'
import { BrandLogo } from '../BrandLogo'
import { UserAvatar } from '../UserAvatar'

const userMenu = [
  { to: '/account/details', icon: User, label: 'Account details' },
  { to: '/account/manage', icon: Layers, label: 'Manage accounts' },
  { to: '/account/deposit', icon: CreditCard, label: 'Deposit' },
  { to: '/account/withdraw', icon: Wallet, label: 'Withdraw' },
  { to: '/account/transactions', icon: History, label: 'Transactions' },
  { to: '/account/verification', icon: ShieldCheck, label: 'Verification' },
]

export function Header({ showClose }: { showClose?: boolean }) {
  const {
    metrics,
    activeAccountId,
    accountType,
    accounts,
    switchAccount,
    darkMode,
    setDarkMode,
    liveData,
    user,
    language,
    setLanguage,
    logout,
  } = useApp()
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-GB'))
  const [langOpen, setLangOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const account = accounts.find((a) => a.id === activeAccountId)
  const isLiveAccount = accountType === 'live'

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date().toLocaleTimeString('en-GB')), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!userOpen && !langOpen) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (userOpen && userMenuRef.current && !userMenuRef.current.contains(target)) setUserOpen(false)
      if (langOpen && langRef.current && !langRef.current.contains(target)) setLangOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserOpen(false)
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [userOpen, langOpen])

  return (
    <header className="panel flex h-14 shrink-0 items-center gap-1.5 border-b px-2 sm:h-16 sm:gap-3 sm:px-5">
      <Link to="/platform" className="flex shrink-0 items-center">
        <BrandLogo className="h-8 sm:h-10" />
      </Link>

      {!showClose ? (
        <div className="relative hidden shrink-0 sm:block">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 py-1 pl-2.5 pr-1">
            <span
              className={clsx(
                'h-2 w-2 shrink-0 rounded-full',
                isLiveAccount ? 'bg-buy shadow-[0_0_0_3px_rgba(34,160,107,0.2)]' : 'bg-link',
              )}
            />
            <div className="min-w-0">
              <select
                className="h-8 max-w-[9.5rem] appearance-none bg-transparent pr-5 text-sm font-semibold text-brand-ink outline-none"
                value={activeAccountId}
                onChange={(e) => switchAccount(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type === 'demo' ? 'Demo' : 'Live'} Account
                  </option>
                ))}
              </select>
              <div className="truncate text-[10px] leading-none text-text-secondary">
                ID {account?.number || account?.id}
              </div>
            </div>
            <ChevronDown size={14} className="pointer-events-none mr-1.5 text-text-secondary" />
          </div>
        </div>
      ) : null}

      {!showClose ? (
        <div className="ml-1 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex xl:gap-2">
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
          {isLiveAccount ? (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-buy/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-buy">
              <span className="h-1.5 w-1.5 rounded-full bg-buy" />
              LIVE
              {liveData ? null : <span className="font-medium opacity-70">· SIM</span>}
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold tracking-wide text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-link" />
              DEMO
            </span>
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <div className="truncate text-sm font-semibold text-brand-ink">Account</div>
          <div className="hidden truncate text-[11px] text-text-secondary sm:block">
            Manage profile, security & funding
          </div>
        </div>
      )}

      {!showClose ? (
        <button
          type="button"
          onClick={() => navigate('/account/deposit')}
          className="ml-auto h-9 shrink-0 rounded-xl border border-brand bg-panel px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-sidebar-active sm:h-10 sm:px-4"
        >
          Deposit
        </button>
      ) : null}

      <div
        className={clsx(
          'relative flex shrink-0 items-center gap-0.5 sm:gap-1',
          !showClose && 'ml-0',
          showClose && 'ml-auto',
        )}
      >
        {!showClose ? (
          <span className="mr-1 hidden tabular-nums text-xs text-text-secondary sm:inline">{time}</span>
        ) : null}

        <button
          type="button"
          aria-label="Toggle theme"
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink sm:flex sm:h-10 sm:w-10"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
        </button>

        <div className="relative hidden sm:block" ref={langRef}>
          <button
            type="button"
            aria-label="Language"
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink sm:h-10 sm:w-10',
              langOpen && 'bg-muted text-brand-ink',
            )}
            onClick={() => {
              setLangOpen((v) => !v)
              setUserOpen(false)
            }}
          >
            <Globe size={20} strokeWidth={1.75} />
          </button>
          {langOpen ? (
            <div className="panel absolute right-0 top-12 z-50 min-w-[8.5rem] overflow-hidden rounded-xl border shadow-xl">
              {(['en', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={clsx(
                    'block w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-muted',
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

        {showClose ? (
          <button
            type="button"
            aria-label="Back to platform"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-panel px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink sm:h-10 sm:px-3"
            onClick={() => navigate('/platform')}
          >
            <ArrowLeft size={16} className="sm:hidden" />
            <X size={16} className="hidden sm:block" strokeWidth={1.75} />
            <span className="hidden sm:inline">Close</span>
            <span className="sm:hidden">Back</span>
          </button>
        ) : null}

        <div className="relative ml-0.5" ref={userMenuRef}>
          <button
            type="button"
            aria-label="User menu"
            aria-expanded={userOpen}
            className={clsx(
              'flex items-center gap-1 rounded-xl py-0.5 pl-0.5 pr-1 transition-colors hover:bg-muted sm:gap-1.5 sm:pr-2',
              userOpen && 'bg-muted',
            )}
            onClick={() => {
              setUserOpen((v) => !v)
              setLangOpen(false)
            }}
          >
            <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={40} ring />
            <ChevronDown
              size={16}
              className={clsx(
                'hidden text-text-secondary transition-transform sm:block',
                userOpen && 'rotate-180',
              )}
            />
          </button>
          {userOpen ? (
            <div className="panel absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border shadow-2xl sm:top-14 sm:w-72">
              <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3.5">
                <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={44} />
                <div className="min-w-0">
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
              <div className="py-1.5">
                {userMenu.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-brand-ink">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    {label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-border py-1.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-sell transition-colors hover:bg-muted"
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
    <div className="min-w-0 shrink-0 rounded-lg px-2.5 py-1.5 xl:px-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</div>
      <div className={`text-sm font-semibold tabular-nums leading-tight ${className}`}>{value}</div>
    </div>
  )
}

export function AlertBanner() {
  const { user } = useApp()
  if (user?.funded) return null
  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-alert-border bg-alert px-3 py-2 text-sm sm:items-center sm:px-4">
      <span className="shrink-0">⚠️</span>
      <span className="min-w-0 leading-snug">
        Action Required:{' '}
        <Link to="/account/deposit" className="font-semibold text-link underline">
          Fund your account
        </Link>
      </span>
    </div>
  )
}

export function Toast() {
  const { toast, clearToast } = useApp()
  if (!toast) return null
  return (
    <button
      type="button"
      onClick={clearToast}
      className="toast fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-[100] max-w-[calc(100vw-1.5rem)] rounded-lg bg-brand px-4 py-3 text-sm font-medium text-on-brand shadow-lg sm:right-5 sm:max-w-sm"
    >
      {toast}
    </button>
  )
}
