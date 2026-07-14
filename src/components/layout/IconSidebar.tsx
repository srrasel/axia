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
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        clsx(
          'group relative mb-[10px] flex shrink-0 items-center justify-center rounded-full p-[10px] transition-colors last:mb-0',
          'text-text-secondary hover:bg-sidebar-active hover:text-brand-ink',
          isActive && 'bg-sidebar-active text-brand-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-link" />
          ) : null}
          <Icon size={ICON_PX} strokeWidth={1.75} className="h-6 w-6" />
          <span
            className={clsx(
              'pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2',
              'whitespace-nowrap rounded-2xl bg-black px-3.5 py-2 text-sm font-semibold text-white shadow-lg',
              'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function IconSidebar() {
  return (
    <>
      {/* Desktop / tablet: 10px + 24px icon + 10px padding ≈ 44–64 */}
      <aside
        className="panel hidden w-[64px] shrink-0 flex-col items-center overflow-x-clip overflow-y-auto border-r py-[10px] md:flex"
        aria-label="Main navigation"
      >
        <nav className="flex w-full flex-1 flex-col items-center overflow-visible px-[10px]">
          {items.map(({ to, icon, label, end }) => (
            <RailLink key={to} to={to} end={end} label={label} icon={icon} />
          ))}
        </nav>

        <div className="mt-[10px] w-full border-t border-border px-[10px] pt-[10px]">
          <RailLink to="/account/details" label="Settings" icon={Settings} />
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
                    'flex items-center justify-center rounded-md p-[10px]',
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
