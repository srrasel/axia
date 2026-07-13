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
} from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { CurrencyProvider, money, useCurrency } from './currency'
import { BrandLogo } from './BrandLogo'

export { money }

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/earnings', icon: Coins, label: 'Earnings' },
  { to: '/crm/transactions', icon: Receipt, label: 'CRM Transactions' },
  { to: '/crm/desk', icon: Headset, label: 'Client desk' },
  { to: '/crm/online', icon: Wifi, label: 'Online now' },
  { to: '/crm/performance', icon: TrendingUp, label: 'Winners / losers' },
  { to: '/crm/prices', icon: Gauge, label: 'Market prices' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/accounts', icon: Landmark, label: 'Accounts' },
  { to: '/trades', icon: CandlestickChart, label: 'Trades' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/kyc', icon: BadgeCheck, label: 'KYC' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <CurrencyProvider>
      <div className="flex h-full">
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-brand text-white">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <BrandLogo variant="dark" className="h-8" />
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">CRM</span>
          </div>
          <div className="px-5 pb-2 text-[10px] uppercase tracking-wide text-white/50">
            {user?.role} · <CurrencyBadge />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {links.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/15 font-semibold text-white',
                  )
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <div className="mb-2 truncate text-xs text-white/60">{user?.email}</div>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-6">
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

export function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-secondary">{title}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-xs text-secondary">{sub}</div> : null}
    </div>
  )
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  )
}
