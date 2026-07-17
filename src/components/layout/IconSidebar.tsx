import { useState, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CandlestickChart,
  Crosshair,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  List,
  Settings,
  Store,
  Trophy,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'

const desktopItems = [
  { to: '/member', icon: LineChart, label: 'Trading', end: true },
  { to: '/markets', icon: List, label: 'Markets' },
  { to: '/signals', icon: Store, label: 'Signals' },
  { to: '/premium', icon: Crosshair, label: 'Premium' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/reports', icon: LayoutDashboard, label: 'Reports' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const mobileItems = [
  { to: '/markets', icon: LineChart, label: 'Markets' },
  { to: '/member', icon: CandlestickChart, label: 'Trade', end: true },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/more', icon: LayoutGrid, label: 'More' },
]

const MORE_ACTIVE_PREFIXES = [
  '/more',
  '/signals',
  '/premium',
  '/reports',
  '/calendar',
  '/analytics',
  '/notifications',
  '/ai',
  '/account',
]

const ICON_PX = 24

function RailLink({
  to,
  end,
  label,
  icon: Icon,
}: {
  to: string
  end?: boolean
  label: string
  icon: typeof LineChart
}) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null)

  const showTip = (e: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ top: r.top + r.height / 2, left: r.right + 8 })
  }

  const hideTip = () => setTip(null)

  return (
    <>
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={({ isActive }) =>
          clsx(
            'relative mb-[10px] flex shrink-0 items-center justify-center rounded-full p-[10px] transition-colors last:mb-0',
            'text-text-secondary hover:bg-sidebar-active hover:text-brand-ink',
            isActive && 'bg-sidebar-active text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#fcd535]" />
            ) : null}
            <Icon size={ICON_PX} strokeWidth={1.75} className="h-6 w-6" />
          </>
        )}
      </NavLink>
      {tip
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[200] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#29313d] p-[10px] text-[13px] font-semibold leading-none text-white shadow-md"
              style={{ top: tip.top, left: tip.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}

function isMoreSection(pathname: string) {
  return MORE_ACTIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function IconSidebar({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const { pathname } = useLocation()
  const { trades, activeAccountId } = useApp()
  const hasOpenPositions = trades.some(
    (t) => t.status === 'open' && t.accountId === activeAccountId,
  )

  return (
    <>
      {/* Desktop / tablet */}
      {!mobileOnly ? (
        <aside
          className="panel hidden w-[64px] shrink-0 flex-col items-center overflow-y-auto border-r py-[10px] md:flex"
          aria-label="Main navigation"
        >
          <nav className="flex w-full flex-1 flex-col items-center px-[10px]">
            {desktopItems.map(({ to, icon, label, end }) => (
              <RailLink key={`${to}-${label}`} to={to} end={end} label={label} icon={icon} />
            ))}
          </nav>

          <div className="mt-[10px] w-full border-t border-border px-[10px] pt-[10px]">
            <RailLink to="/account/details" label="Settings" icon={Settings} />
          </div>
        </aside>
      ) : null}

      {/* Mobile bottom bar */}
      <nav
        className="panel fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t px-0 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
        aria-label="Mobile navigation"
      >
        {mobileItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => {
              const active = to === '/more' ? isMoreSection(pathname) : isActive
              return clsx(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active ? 'text-[#fcd535]' : 'text-text-secondary',
              )
            }}
          >
            {({ isActive }) => {
              const active = to === '/more' ? isMoreSection(pathname) : isActive
              const showOpenDot = to === '/portfolio' && hasOpenPositions
              return (
                <>
                  <span className="relative inline-flex">
                    <Icon
                      size={ICON_PX}
                      strokeWidth={active ? 2 : 1.75}
                      className="h-6 w-6"
                    />
                    {showOpenDot ? (
                      <span
                        className="absolute -right-px -top-px h-[5px] w-[5px] rounded-full bg-[#e5484d]"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span
                    className={clsx(
                      'max-w-full truncate px-0.5 text-[11px] font-medium leading-tight',
                      active ? 'text-[#fcd535]' : 'text-text-secondary',
                    )}
                  >
                    {label}
                  </span>
                </>
              )
            }}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
