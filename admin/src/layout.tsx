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
  Contact,
  Building2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCog,
  Bell,
  BarChart3,
  Shield,
  SlidersHorizontal,
  Gauge,
  Headphones,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { CurrencyProvider, money, useCurrency } from './currency'
import { BrandLogo } from './BrandLogo'

export { money }

export function isAdminRole(role?: string) {
  return role === 'ADMIN'
}

export function isCrmStaffRole(role?: string) {
  return Boolean(
    role &&
      role !== 'USER' &&
      role !== 'ADMIN' &&
      [
        'MANAGER',
        'EMPLOYEE',
        'TEAM_LEADER',
        'SALES',
        'RETENTION',
        'COMPLIANCE',
        'FINANCE',
        'SUPPORT',
        'MARKETING',
      ].includes(role),
  )
}

/** Paths CRM staff are allowed to open */
export const CRM_STAFF_PATHS = [
  '/',
  '/crm',
  '/crm/clients',
  '/crm/notifications',
  '/crm/analytics',
  '/crm/security',
] as const

export function canAccessPath(role: string | undefined, pathname: string) {
  if (!role) return false
  if (isAdminRole(role)) return true
  if (!isCrmStaffRole(role)) return false
  if (pathname === '/' || pathname === '') return true
  if (pathname === '/crm' || pathname.startsWith('/crm/clients')) return true
  if (pathname.startsWith('/crm/notifications')) return true
  if (pathname.startsWith('/crm/analytics')) return true
  if (pathname.startsWith('/crm/security')) return true
  return false
}

type NavItem = {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
  adminOnly?: boolean
  crmAllowed?: boolean
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true, adminOnly: true },
      { to: '/earnings', icon: Coins, label: 'Earnings', adminOnly: true },
    ],
  },
  {
    title: 'CRM',
    items: [
      { to: '/crm', icon: LayoutDashboard, label: 'CRM Dashboard', end: true, crmAllowed: true },
      { to: '/crm/clients', icon: Contact, label: 'Clients', crmAllowed: true },
      { to: '/crm/notifications', icon: Bell, label: 'Notifications', crmAllowed: true },
      { to: '/crm/analytics', icon: BarChart3, label: 'Analytics', crmAllowed: true },
      { to: '/crm/security', icon: Shield, label: 'Security', crmAllowed: true },
      { to: '/crm/roles', icon: UserCog, label: 'Roles', adminOnly: true },
      { to: '/crm/system', icon: SlidersHorizontal, label: 'CRM Settings', adminOnly: true },
      { to: '/crm/prices', icon: Gauge, label: 'Market Prices', adminOnly: true },
      { to: '/crm/staff', icon: Users, label: 'CRM Users', adminOnly: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/users', icon: Users, label: 'Users', adminOnly: true },
      { to: '/accounts', icon: Landmark, label: 'Accounts', adminOnly: true },
      { to: '/trades', icon: CandlestickChart, label: 'Trades', adminOnly: true },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Money Ops', adminOnly: true },
      { to: '/bank-accounts', icon: Building2, label: 'Bank Accounts', adminOnly: true },
      { to: '/kyc', icon: BadgeCheck, label: 'KYC', adminOnly: true },
      { to: '/support', icon: Headphones, label: 'Support', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
    ],
  },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const admin = isAdminRole(user?.role)
  const homePath = admin ? '/' : '/crm'
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
      <NavLink
        to={homePath}
        end
        onClick={onNavigate}
        className="relative flex items-center gap-2.5 border-b border-border px-5 py-5 transition-colors hover:bg-muted/60"
        title="Go to dashboard"
      >
        <BrandLogo variant="dark" className="h-8" />
        <div>
          <div className="text-[11px] font-semibold capitalize tracking-[0.14em] text-accent">Admin</div>
          <div className="text-xs text-secondary">Control Center</div>
        </div>
      </NavLink>
      <div className="relative px-5 py-3 text-[16px] capitalize tracking-wide text-white">
        {user?.role?.replaceAll('_', ' ').toLowerCase()} - <CurrencyBadge />
      </div>
      <nav className="relative flex-1 space-y-5 overflow-y-auto px-[22px] pb-4">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 px-[22px] text-[12px] font-semibold capitalize tracking-[0.16em] text-secondary/70">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, end }) => {
                const displayLabel = label
                return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-[22px] py-2.5 text-sm text-secondary transition-colors hover:bg-muted hover:text-text',
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
      <div className="relative border-t border-border px-[22px] py-4">
        <div className="mb-2 truncate text-xs text-secondary">{user?.email}</div>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-base font-medium text-secondary transition-colors hover:bg-muted hover:text-text"
          onClick={() => {
            logout()
            navigate('/login')
            onNavigate?.()
          }}
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </>
  )
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const homePath = isAdminRole(user?.role) ? '/' : '/crm'

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

        <div
          className={clsx(
            'fixed inset-0 z-50 transition-[visibility] duration-300 md:hidden',
            open ? 'visible pointer-events-auto' : 'invisible pointer-events-none',
          )}
        >
          <button
            type="button"
            className={clsx(
              'absolute inset-0 bg-black/60 transition-opacity duration-300',
              open ? 'opacity-100' : 'opacity-0',
            )}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside
            className={clsx(
              'absolute right-0 top-0 flex h-full w-[min(280px,86vw)] flex-col border-l border-border bg-panel text-text shadow-2xl transition-transform duration-300 ease-out',
              open ? 'translate-x-0' : 'translate-x-full',
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  'radial-gradient(500px 220px at 100% 0%, rgba(252,213,53,0.08), transparent 60%)',
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

        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel/95 px-4 backdrop-blur md:hidden">
            <NavLink
              to={homePath}
              end
              className="inline-flex items-center gap-2"
              title="Go to dashboard"
            >
              <BrandLogo variant="dark" className="h-7" />
              <span className="text-xs font-semibold capitalize tracking-wide text-accent">Admin</span>
            </NavLink>
            <button
              type="button"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text hover:bg-muted"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </header>
          <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-5">
            <div className="min-h-full rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:p-6">
              <Outlet />
            </div>
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
      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] font-semibold capitalize tracking-[0.12em] text-secondary">{title}</div>
        {Icon ? (
          <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', toneMap[tone])}>
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight tabular-nums text-text sm:text-[1.65rem]">{value}</div>
      {sub ? <div className="mt-1.5 text-xs capitalize text-secondary">{sub}</div> : null}
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
          <h2 className="text-base font-semibold capitalize tracking-tight text-text">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs capitalize text-secondary">{subtitle}</p> : null}
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
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl lg:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[16px] text-secondary">{subtitle}</p> : null}
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
    s === 'completed' || s === 'online' || s === 'approved' || s === 'active' || s === 'yes' || s === 'live'
      ? 'bg-buy/15 text-buy border-buy/25'
      : s === 'demo'
        ? 'bg-sell/15 text-sell border-sell/25'
        : s === 'pending'
          ? 'bg-accent/15 text-accent border-accent/25'
          : s === 'rejected' || s === 'forced' || s === 'offline'
            ? 'bg-sell/15 text-sell border-sell/25'
            : 'bg-muted text-secondary border-border'
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-wide',
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
  'h-10 w-full min-w-0 rounded-xl border border-border bg-panel px-3 text-sm text-text outline-none transition-colors placeholder:text-secondary hover:border-[#fcd535]/70 focus:border-[#fcd535]'

/** Select matching inputClass, with custom chevron inset from the right */
export const selectClass =
  'h-10 w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-border bg-panel py-0 pl-3 pr-10 text-sm text-text outline-none transition-colors hover:border-[#fcd535]/70 focus:border-[#fcd535]'
export const selectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  backgroundSize: '14px 14px',
} as const

export function formatRoleLabel(role?: string | null) {
  if (!role) return ''
  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Shared table / toolbar action buttons */
export const actionBtnBase =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
export const actionBtnPrimary = `${actionBtnBase} bg-[#fcd535] text-[#202630] hover:bg-[#ceaf30]`
export const actionBtnSuccess = `${actionBtnBase} border border-buy/40 bg-buy/15 text-buy hover:bg-buy/25`
export const actionBtnDanger = `${actionBtnBase} border border-sell/40 bg-sell/15 text-sell hover:bg-sell/25`
export const actionBtnNeutral = `${actionBtnBase} border border-border bg-panel text-secondary hover:border-accent/40 hover:bg-muted hover:text-text`
export const theadClass = 'bg-muted text-[14px] text-secondary'
export const thClass = 'pl-[15px] pr-3 py-2'
export const tdClass = 'pl-[15px] pr-3 py-2'
export const nameLinkClass = 'font-medium text-[#22a06b] hover:text-[#1a8056]'
export const nameCellClass = 'font-medium text-[#22a06b]'
export const actionTdClass = 'pl-[25px] pr-3 py-2'
export const actionTdClassLoose = 'pl-[25px] pr-3 py-2.5'

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

/** Top toast popup for save / force / success feedback */
export function ToastPopup({
  text,
  tone = 'ok',
}: {
  text: string
  tone?: 'ok' | 'err'
}) {
  const display = text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[80] flex justify-center px-4 sm:top-16">
      <div
        className={clsx(
          'pointer-events-auto max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl',
          tone === 'err'
            ? 'border-sell/35 bg-white text-[#b42318]'
            : 'border-[#d0d5dd] bg-white text-[#101828]',
        )}
        role="status"
      >
        {display}
      </div>
    </div>
  )
}

export function useToast(durationMs = 2000) {
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function showToast(text: string, tone: 'ok' | 'err' = 'ok') {
    if (!text) return
    if (timer.current) clearTimeout(timer.current)
    setToast({ text, tone })
    timer.current = setTimeout(() => setToast(null), durationMs)
  }

  return { toast, showToast }
}
