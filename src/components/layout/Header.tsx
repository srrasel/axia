import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
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

export function Header() {
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
    <header className="panel relative z-40 flex h-14 shrink-0 items-center gap-1.5 border-b px-2 sm:h-16 sm:gap-3 sm:px-5">
      <Link to="/platform" className="flex shrink-0 items-center pr-[5px]">
        <BrandLogo className="h-9 sm:h-10" />
      </Link>

      {/* Demo / Live account switch — compact on mobile, full on desktop */}
      <div className="relative min-w-0 shrink-0">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 py-0.5 pl-2 pr-0.5 sm:gap-2.5 sm:py-1 sm:pl-2.5 sm:pr-1">
          <span
            className={clsx(
              'h-2 w-2 shrink-0 rounded-full',
              isLiveAccount ? 'bg-buy shadow-[0_0_0_3px_rgba(34,160,107,0.2)]' : 'bg-link',
            )}
          />
          <div className="min-w-0">
            <select
              aria-label="Switch demo or live account"
              className="h-8 max-w-[6.75rem] appearance-none bg-transparent pr-4 text-xs font-semibold text-brand-ink outline-none sm:max-w-[9.5rem] sm:pr-5 sm:text-sm"
              value={activeAccountId}
              onChange={(e) => switchAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type === 'demo' ? 'Demo' : 'Live'}
                  {a.number ? ` · ${String(a.number).slice(-4)}` : ''}
                </option>
              ))}
            </select>
            <div className="hidden truncate text-[10px] leading-none text-text-secondary sm:block">
              ID {account?.number || account?.id}
            </div>
          </div>
          <ChevronDown size={14} className="pointer-events-none mr-1 text-text-secondary sm:mr-1.5" />
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
        {isLiveAccount ? (
          <span className="ml-1 inline-flex min-w-[4.25rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-buy/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-buy">
            <span className="h-1.5 w-1.5 rounded-full bg-buy" />
            LIVE
            {!liveData ? <span className="font-medium opacity-70">· SIM</span> : null}
          </span>
        ) : (
          <span className="ml-1 inline-flex min-w-[4.25rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold tracking-wide text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-link" />
            DEMO
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 lg:hidden" aria-hidden />

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          onClick={() => navigate('/account/deposit')}
          className="auth-btn h-9 shrink-0 cursor-pointer rounded-xl bg-[#fcd535] px-2.5 text-sm font-semibold !text-[#202630] transition-colors hover:bg-[#ceaf30] sm:h-10 sm:px-4"
        >
          Deposit
        </button>

        <span className="mr-1 hidden w-[4.75rem] text-right tabular-nums text-xs text-text-secondary sm:inline">
          {time}
        </span>

        <button
          type="button"
          aria-label="Toggle theme"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink sm:h-10 sm:w-10"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        <div className="relative" ref={langRef}>
          <button
            type="button"
            aria-label="Language"
            className={clsx(
              'flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink sm:h-10 sm:w-10',
              langOpen && 'bg-muted text-brand-ink',
            )}
            onClick={() => {
              setLangOpen((v) => !v)
              setUserOpen(false)
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

        <div className="relative ml-0.5" ref={userMenuRef}>
          <button
            type="button"
            aria-label="User menu"
            aria-expanded={userOpen}
            className={clsx(
              'flex cursor-pointer items-center rounded-full p-0.5 transition-colors hover:bg-muted',
              userOpen && 'bg-muted',
            )}
            onClick={() => {
              setUserOpen((v) => !v)
              setLangOpen(false)
            }}
          >
            <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={40} ring />
          </button>
          {userOpen ? (
            <div className="panel absolute right-0 top-12 z-[60] w-[min(18rem,calc(100%-1rem))] overflow-hidden rounded-2xl border shadow-2xl sm:top-14 sm:w-72">
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
              <div className="border-b border-border px-3 py-3">
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
                {userMenu.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-[#29313d] hover:text-brand-ink"
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
    <div className="min-w-[4.75rem] shrink-0 rounded-lg px-2.5 py-1.5 xl:min-w-[5.25rem] xl:px-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</div>
      <div className={`truncate text-sm font-semibold tabular-nums leading-tight ${className}`}>{value}</div>
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
      className="toast pointer-events-auto fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[100] max-w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-xl border border-[#fcd535]/40 bg-[#181a20] px-5 py-2.5 text-sm font-medium text-[#fcd535] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
    >
      {toast}
    </button>
  )
}
