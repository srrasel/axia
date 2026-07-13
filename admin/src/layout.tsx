import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  CandlestickChart,
  ArrowLeftRight,
  Landmark,
  Coins,
  Headset,
  Wifi,
  TrendingUp,
  Receipt,
  Gauge,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { CurrencyProvider, money, useCurrency } from './currency'
import { BrandLogo } from './BrandLogo'

export { money }

const navGroups: { title: string; items: { to: string; icon: LucideIcon; label: string; end?: boolean }[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/earnings', icon: Coins, label: 'Earnings' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { to: '/crm/transactions', icon: Receipt, label: 'Transactions' },
      { to: '/crm/desk', icon: Headset, label: 'Client desk' },
      { to: '/crm/online', icon: Wifi, label: 'Online now' },
      { to: '/crm/performance', icon: TrendingUp, label: 'Winners / losers' },
      { to: '/crm/prices', icon: Gauge, label: 'Market prices' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/accounts', icon: Landmark, label: 'Accounts' },
      { to: '/trades', icon: CandlestickChart, label: 'Trades' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Money ops' },
      { to: '/kyc', icon: BadgeCheck, label: 'KYC' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <CurrencyProvider>
      <div className="flex h-full">
        <aside className="relative flex w-[248px] shrink-0 flex-col bg-brand text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(500px 220px at 0% 0%, #e8b92333, transparent 60%), radial-gradient(400px 280px at 100% 100%, #0ea5e933, transparent 55%)',
            }}
          />
          <div className="relative flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
            <BrandLogo variant="dark" className="h-8" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Admin</div>
              <div className="text-xs text-white/50">Control center</div>
            </div>
          </div>
          <div className="relative px-5 py-3 text-[11px] uppercase tracking-wide text-white/45">
            {user?.role} · <CurrencyBadge />
          </div>
          <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 pb-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/8 hover:text-white',
                          isActive && 'bg-white/12 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={clsx(
                              'flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/70',
                              isActive && 'bg-accent/20 text-accent',
                            )}
                          >
                            <Icon size={15} />
                          </span>
                          {label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="relative border-t border-white/10 p-4">
            <div className="mb-2 truncate text-xs text-white/55">{user?.email}</div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </CurrencyProvider>
  )
}

function CurrencyBadge() {
  const { code, symbol } = useCurrency()
  return (
    <span>
      {code} ({symbol})
    </span>
  )
}

export function Card({
  title,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string
  value: string
  sub?: string
  icon?: LucideIcon
  tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'info'
}) {
  const toneMap = {
    neutral: 'bg-slate-100 text-slate-600',
    good: 'bg-emerald-50 text-buy',
    bad: 'bg-rose-50 text-sell',
    warn: 'bg-amber-50 text-amber-700',
    info: 'bg-sky-50 text-sky',
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">{title}</div>
        {Icon ? (
          <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', toneMap[tone])}>
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[1.65rem] font-bold tracking-tight tabular-nums text-text">{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-secondary">{sub}</div> : null}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-border bg-panel p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-secondary">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function PageHeader({ title, children, subtitle }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text lg:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-secondary">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}
