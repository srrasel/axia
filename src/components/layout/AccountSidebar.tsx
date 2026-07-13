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
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { UserAvatar } from '../UserAvatar'

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

type Props = {
  open?: boolean
  onClose?: () => void
}

function SidebarBody({ onClose, showClose }: { onClose?: () => void; showClose?: boolean }) {
  const { user, logout, accounts } = useApp()
  const navigate = useNavigate()
  const live = accounts.filter((a) => a.type === 'live').length
  const demo = accounts.filter((a) => a.type === 'demo').length
  const kycPending = Math.max(
    0,
    2 - (user?.kyc.identityFile ? 1 : 0) - (user?.kyc.residenceFile ? 1 : 0),
  )
  const close = () => onClose?.()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          close()
          navigate('/platform')
        }}
        className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-brand-ink"
      >
        <ArrowLeft size={16} /> To Platform
      </button>

      <div className="flex items-center gap-3 border-b border-border px-4 pb-4">
        <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user?.name}</div>
          <div className="truncate text-xs text-text-secondary">{user?.email}</div>
          <div className="mt-0.5 text-[11px] text-text-secondary">
            {live} live account{live !== 1 ? 's' : ''} | {demo} demo account{demo !== 1 ? 's' : ''}
          </div>
        </div>
        {showClose ? (
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-muted"
            onClick={close}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {links.map(({ to, icon: Icon, label, badgeKey }) => {
          const badge = badgeKey === 'kyc' ? kycPending : 0
          return (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                clsx(
                  'relative mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-muted',
                  isActive &&
                    'bg-sidebar-active font-medium text-brand-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1 before:rounded-r before:bg-link',
                )
              }
            >
              <Icon size={17} strokeWidth={1.75} className="shrink-0" />
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
            close()
            navigate('/login')
          }}
          className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-muted"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Sign Out
        </button>
      </nav>
    </>
  )
}

export function AccountSidebar({ open = false, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <aside className="panel hidden w-64 shrink-0 flex-col border-r md:flex">
        <SidebarBody />
      </aside>

      <div
        className={clsx(
          'fixed inset-0 z-50 md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={clsx(
            'absolute inset-0 bg-black/45 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
          aria-label="Close menu overlay"
        />
        <aside
          className={clsx(
            'panel absolute inset-y-0 left-0 flex w-[min(100%,20rem)] max-w-[85vw] flex-col border-r shadow-2xl transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarBody onClose={onClose} showClose />
        </aside>
      </div>
    </>
  )
}
