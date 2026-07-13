import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  Crosshair,
  LayoutDashboard,
  LineChart,
  Settings,
  Store,
  Trophy,
} from 'lucide-react'
import clsx from 'clsx'

const items = [
  { to: '/platform', icon: LineChart, label: 'Trading', end: true },
  { to: '/signals', icon: Store, label: 'Signals' },
  { to: '/premium', icon: Crosshair, label: 'Premium' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/reports', icon: LayoutDashboard, label: 'Reports' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const ICON_PX = 24

export function IconSidebar() {
  return (
    <>
      {/* Desktop / tablet vertical rail */}
      <aside
        className="panel hidden w-14 shrink-0 flex-col items-center border-r py-2 md:flex"
        aria-label="Main navigation"
      >
        <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1">
          {items.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                clsx(
                  'group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                  'text-text-secondary hover:bg-sidebar-active hover:text-brand-ink',
                  isActive && 'bg-sidebar-active text-brand-ink ring-1 ring-border',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-link" />
                  ) : null}
                  <Icon size={ICON_PX} strokeWidth={1.75} className="h-6 w-6" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-1 w-full border-t border-border px-1 pt-1.5">
          <NavLink
            to="/account/details"
            title="Settings"
            aria-label="Settings"
            className={({ isActive }) =>
              clsx(
                'flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-sidebar-active hover:text-brand-ink',
                isActive && 'bg-sidebar-active text-brand-ink ring-1 ring-border',
              )
            }
          >
            <Settings size={ICON_PX} strokeWidth={1.75} className="h-6 w-6" />
          </NavLink>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav
        className="panel fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around border-t px-0.5 md:hidden"
        aria-label="Mobile navigation"
      >
        {items.slice(0, 5).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-text-secondary',
                isActive && 'text-brand-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-md',
                    isActive && 'bg-sidebar-active',
                  )}
                >
                  <Icon size={ICON_PX} strokeWidth={1.75} className="h-6 w-6" />
                </span>
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
