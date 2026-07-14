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
  const { user, logout, accounts, accountType } = useApp()
  const navigate = useNavigate()
  const isLiveAccount = accountType === 'live'
  const live = accounts.filter((a) => a.type === 'live').length
  const demo = accounts.filter((a) => a.type === 'demo').length
  const kycPending = Math.max(
    0,
    2 - (user?.kyc.identityFile ? 1 : 0) - (user?.kyc.residenceFile ? 1 : 0),
  )
  const close = () => onClose?.()

  return (
    <>
      {showClose ? (
        <div className="flex w-full shrink-0 items-center justify-end border-b border-border px-2 py-1.5">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-[#29313d] hover:text-brand-ink"
            onClick={close}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          close()
          navigate('/platform')
        }}
        className="mx-2 mt-3 mb-3 flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-[#29313d] hover:text-brand-ink"
      >
        <ArrowLeft size={16} /> To Platform
      </button>

      <div className="mx-2 mb-1 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-3.5">
        <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-text">{user?.name}</div>
          <div className="truncate text-xs text-text-secondary">{user?.email}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary ring-1 ring-border">
            <span className={clsx('h-1.5 w-1.5 rounded-full', isLiveAccount ? 'bg-buy' : 'bg-link')} />
            {isLiveAccount ? 'Live' : 'Demo'}
          </div>
          <div className="mt-1 text-[10px] text-text-secondary">
            {live} live · {demo} demo
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto py-1.5">
        {links.map(({ to, icon: Icon, label, badgeKey }) => {
          const badge = badgeKey === 'kyc' ? kycPending : 0
          return (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                clsx(
                  'mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-[#29313d] hover:text-brand-ink',
                  isActive && 'bg-[#29313d] font-medium text-brand-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-ink',
                      isActive ? 'bg-[#fcd535]/15 text-[#fcd535]' : 'bg-muted',
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="flex-1">{label}</span>
                  {badge > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sell px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-border py-1.5">
        <button
          type="button"
          onClick={() => {
            logout()
            close()
            navigate('/login')
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-sell transition-colors hover:bg-[#29313d]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sell/10">
            <LogOut size={18} strokeWidth={1.75} />
          </span>
          Sign out
        </button>
      </div>
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
      <aside className="panel hidden w-72 shrink-0 flex-col border-r md:flex">
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
