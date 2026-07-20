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
  Building2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { CurrencyProvider, money, useCurrency } from './currency'
import { BrandLogo } from './BrandLogo'

export { money }

export function isAdminRole(role?: string) {
  return role === 'ADMIN'
}

export function isCrmStaffRole(role?: string) {
  return role === 'MANAGER' || role === 'EMPLOYEE'
}

/** Paths CRM staff (manager/employee) are allowed to open */
export const CRM_STAFF_PATHS = [
  '/',
  '/earnings',
  '/trades',
  '/crm/transactions',
  '/crm/desk',
  '/crm/online',
  '/crm/performance',
] as const

export function canAccessPath(role: string | undefined, pathname: string) {
  if (!role) return false
  if (isAdminRole(role)) return true
  if (!isCrmStaffRole(role)) return false
  if (pathname === '/' || pathname === '') return true
  if (CRM_STAFF_PATHS.some((p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/')))) return true
  return false
}

type NavItem = { to: string; icon: LucideIcon; label: string; end?: boolean; adminOnly?: boolean; crmAllowed?: boolean }

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true, crmAllowed: true },
      { to: '/earnings', icon: Coins, label: 'Earnings', crmAllowed: true },
    ],
  },
  {
    title: 'CRM',
    items: [
      { to: '/crm/transactions', icon: Receipt, label: 'Transactions', crmAllowed: true },
      { to: '/crm/desk', icon: Headset, label: 'Client desk', crmAllowed: true },
      { to: '/crm/online', icon: Wifi, label: 'Online now', crmAllowed: true },
      { to: '/crm/performance', icon: TrendingUp, label: 'Winners / losers', crmAllowed: true },
      { to: '/crm/prices', icon: Gauge, label: 'Market prices', adminOnly: true },
      { to: '/crm/staff', icon: UserCog, label: 'CRM users', adminOnly: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/users', icon: Users, label: 'Users', adminOnly: true },
      { to: '/accounts', icon: Landmark, label: 'Accounts', adminOnly: true },
      { to: '/trades', icon: CandlestickChart, label: 'Trades', crmAllowed: true },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Money ops', adminOnly: true },
      { to: '/bank-accounts', icon: Building2, label: 'Bank accounts', adminOnly: true },
      { to: '/kyc', icon: BadgeCheck, label: 'KYC', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
    ],
  },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const admin = isAdminRole(user?.role)
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (admin) return true
        if (item.adminOnly) return false
        return item.crmAllowed === true
      }),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <div className="relative flex items-center gap-2.5 border-b border-border px-5 py-5">
        <BrandLogo variant="dark" className="h-8" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Admin</div>
          <div className="text-xs text-secondary">Control center</div>
        </div>
      </div>
      <div className="relative px-5 py-3 text-[11px] uppercase tracking-wide text-secondary">
        {user?.role} · <CurrencyBadge />
      </div>
      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary/70">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, end }) => {
                const displayLabel =
                  to === '/crm/desk' && isCrmStaffRole(user?.role) ? 'My clients' : label
                return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-colors hover:bg-muted hover:text-text',
                      isActive &&
                        'bg-sidebar-active font-semibold text-text',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={clsx(
                          'flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-secondary',
                          isActive && 'bg-accent/15 text-accent',
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      {displayLabel}
                    </>
                  )}
                </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="relative border-t border-border p-4">
        <div className="mb-2 truncate text-xs text-secondary">{user?.email}</div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-secondary transition-colors hover:bg-muted hover:text-text"
          onClick={() => {
            logout()
            navigate('/login')
            onNavigate?.()
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  )
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <CurrencyProvider>
      <div className="flex h-full">
        <aside className="relative hidden w-[248px] shrink-0 flex-col border-r border-border bg-panel text-text md:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(500px 220px at 0% 0%, rgba(252,213,53,0.08), transparent 60%), radial-gradient(400px 280px at 100% 100%, rgba(96,165,250,0.06), transparent 55%)',
            }}
          />
          <SidebarNav />
        </aside>

        {open ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside className="relative flex h-full w-[min(280px,86vw)] flex-col border-r border-border bg-panel text-text shadow-2xl">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background:
                    'radial-gradient(500px 220px at 0% 0%, rgba(252,213,53,0.08), transparent 60%)',
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-secondary hover:text-text"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel/95 px-4 backdrop-blur md:hidden">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text hover:bg-muted"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <BrandLogo variant="dark" className="h-7" />
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Admin</span>
          </header>
          <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
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
    neutral: 'bg-muted text-secondary',
    good: 'bg-buy/15 text-buy',
    bad: 'bg-sell/15 text-sell',
    warn: 'bg-accent/15 text-accent',
    info: 'bg-sky/15 text-sky',
  }
  const accentMap = {
    neutral: 'from-transparent',
    good: 'from-buy/20',
    bad: 'from-sell/20',
    warn: 'from-accent/20',
    info: 'from-sky/20',
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-panel p-4 transition-all hover:border-accent/25 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:p-5">
      <div
        className={clsx(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent',
          accentMap[tone],
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">{title}</div>
        {Icon ? (
          <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', toneMap[tone])}>
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight tabular-nums text-text sm:text-[1.65rem]">{value}</div>
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
        'rounded-2xl border border-border bg-panel p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)] sm:p-5',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4 sm:mb-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text">{title}</h2>
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
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl lg:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-secondary">{subtitle}</p> : null}
      </div>
      {children ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const tone =
    s === 'completed' || s === 'online' || s === 'approved' || s === 'active' || s === 'yes'
      ? 'bg-buy/15 text-buy border-buy/25'
      : s === 'pending'
        ? 'bg-accent/15 text-accent border-accent/25'
        : s === 'rejected' || s === 'forced' || s === 'offline'
          ? 'bg-sell/15 text-sell border-sell/25'
          : 'bg-muted text-secondary border-border'
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tone,
      )}
    >
      {status}
    </span>
  )
}

export const btnPrimary =
  'h-10 shrink-0 rounded-xl bg-[#fcd535] px-4 text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]'
export const inputClass =
  'h-10 w-full min-w-0 rounded-xl border border-border bg-panel px-3 text-sm text-text outline-none transition-colors placeholder:text-secondary hover:border-[#fcd535]/70 focus:border-[#fcd535] sm:w-auto'

export const PAGE_SIZE = 10

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    setPage(1)
  }, [total, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return { page, setPage, pageItems, total, totalPages, from, to, pageSize }
}

function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

export function TablePagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  total: number
  from: number
  to: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (total === 0) return null

  const pages = pageWindow(page, totalPages)
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-panel text-secondary transition-colors hover:border-accent/40 hover:bg-muted hover:text-text disabled:pointer-events-none disabled:opacity-35'

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-t border-border/60 bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4',
        className,
      )}
    >
      <p className="text-xs text-secondary sm:text-sm">
        Showing <span className="font-semibold tabular-nums text-text">{from}</span>
        {'–'}
        <span className="font-semibold tabular-nums text-text">{to}</span>
        {' of '}
        <span className="font-semibold tabular-nums text-text">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-secondary">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={clsx(
                btn,
                p === page && 'border-accent/50 bg-accent/15 font-semibold text-accent hover:bg-accent/20 hover:text-accent',
              )}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
