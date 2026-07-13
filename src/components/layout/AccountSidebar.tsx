import { NavLink, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CreditCard,
  FileText,
  History,
  LogOut,
  Smartphone,
  User,
  Users,
  Wallet,
  ShieldCheck,
  Layers,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'

const links = [
  { to: '/account/details', icon: User, label: 'Account details' },
  { to: '/account/manage', icon: Layers, label: 'Manage accounts' },
  { to: '/account/transactions', icon: History, label: 'Transactions history' },
  { to: '/account/verification', icon: ShieldCheck, label: 'Verification center', badgeKey: 'kyc' as const },
  { to: '/account/withdraw', icon: Wallet, label: 'Withdraw' },
  { to: '/account/invite', icon: Users, label: 'Invite a friend' },
  { to: '/account/deposit', icon: CreditCard, label: 'Deposit' },
  { to: '/account/questionnaire', icon: FileText, label: 'View Questionnaire' },
  { to: '/account/mobile', icon: Smartphone, label: 'Get mobile app' },
]

export function AccountSidebar() {
  const { user, logout, accounts } = useApp()
  const navigate = useNavigate()
  const live = accounts.filter((a) => a.type === 'live').length
  const demo = accounts.filter((a) => a.type === 'demo').length
  const kycPending = Math.max(
    0,
    2 - (user?.kyc.identityFile ? 1 : 0) - (user?.kyc.residenceFile ? 1 : 0),
  )

  return (
    <aside className="panel flex w-64 shrink-0 flex-col border-r">
      <button
        type="button"
        onClick={() => navigate('/platform')}
        className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-brand-ink"
      >
        <ArrowLeft size={16} /> To Platform
      </button>

      <div className="flex items-center gap-3 border-b border-border px-4 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">
          {user?.initials ?? 'MN'}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{user?.name}</div>
          <div className="truncate text-xs text-text-secondary">{user?.email}</div>
          <div className="mt-0.5 text-[11px] text-text-secondary">
            {live} live account{live !== 1 ? 's' : ''} | {demo} demo account{demo !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {links.map(({ to, icon: Icon, label, badgeKey }) => {
          const badge = badgeKey === 'kyc' ? kycPending : 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'relative mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-muted',
                  isActive &&
                    'bg-sidebar-active font-medium text-brand-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1 before:rounded-r before:bg-link',
                )
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {badge > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sell px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-muted"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Sign Out
        </button>
      </nav>
    </aside>
  )
}
