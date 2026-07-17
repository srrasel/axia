import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AccountSidebar } from '../components/layout/AccountSidebar'
import { MobileMoreBackShell } from '../components/layout/MobileMoreBackShell'
import { UserAvatar } from '../components/UserAvatar'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import { calcUsedMargin, formatMoney, getPlatformCurrency } from '../data/mock'
import { morePathWithTab } from '../lib/moreTab'
import { PREMIUM_THRESHOLD } from '../types'
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Diamond,
  Eye,
  EyeOff,
  FileWarning,
  Lock,
  Mail,
  Pencil,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react'

function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <>
      {/* Desktop account sidebar only — mobile uses main footer nav */}
      <div className="hidden md:contents">
        <AccountSidebar />
      </div>
      <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden border-l-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-5">
          <button
            type="button"
            onClick={() => navigate(morePathWithTab())}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-text-secondary hover:bg-muted md:hidden"
            aria-label="Back to More"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 truncate text-[20px] font-semibold leading-tight">{title}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-4 sm:p-5">{children}</div>
      </div>
    </>
  )
}

export function AccountDetailsPage() {
  const { user, updateProfile, changePassword, setup2fa, enable2fa, disable2fa, accounts } = useApp()
  const [tab, setTab] = useState<'personal' | 'password' | 'security'>('personal')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [nationality, setNationality] = useState(user?.nationality ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code2fa, setCode2fa] = useState('')
  const [disablePass, setDisablePass] = useState('')
  const [secError, setSecError] = useState<string | null>(null)
  const [secBusy, setSecBusy] = useState(false)

  const liveCount = accounts.filter((a) => a.type === 'live').length
  const demoCount = accounts.filter((a) => a.type === 'demo').length

  const cancelEdit = () => {
    setEditing(false)
    setName(user?.name ?? '')
    setNationality(user?.nationality ?? '')
  }

  return (
    <PageShell title="Account Details">
      <div className="-mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-border px-3 sm:mx-0 sm:gap-2 sm:px-0">
        <TabBtn
          active={tab === 'personal'}
          onClick={() => {
            setTab('personal')
            cancelEdit()
          }}
        >
          Personal<span className="hidden sm:inline"> Information</span>
        </TabBtn>
        <TabBtn
          active={tab === 'password'}
          onClick={() => {
            setTab('password')
            cancelEdit()
          }}
        >
          <span className="sm:hidden">Password</span>
          <span className="hidden sm:inline">Change Password</span>
        </TabBtn>
        <TabBtn
          active={tab === 'security'}
          onClick={() => {
            setTab('security')
            cancelEdit()
          }}
        >
          <span className="sm:hidden">2FA</span>
          <span className="hidden sm:inline">Two-step verification</span>
        </TabBtn>
      </div>

      <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <UserAvatar photoUrl={user?.photoUrl} name={user?.name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold sm:text-lg">{user?.name}</div>
          <div className="truncate text-sm text-text-secondary">{user?.email}</div>
          <div className="text-xs text-text-secondary">
            {liveCount} live · {demoCount} demo
          </div>
        </div>
      </div>

      {tab === 'personal' ? (
        <div className="grid max-w-3xl gap-3 sm:gap-4 md:grid-cols-2">
          <div className="relative rounded-xl border border-border bg-panel p-4 sm:p-5">
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-muted hover:text-brand-ink"
              onClick={() => {
                if (editing) cancelEdit()
                else {
                  setEditing(true)
                  setName(user?.name ?? '')
                  setNationality(user?.nationality ?? '')
                }
              }}
              aria-label={editing ? 'Cancel editing' : 'Edit personal information'}
            >
              {editing ? <X size={15} /> : <Pencil size={15} />}
            </button>
            <div className="mb-3 pr-10 text-sm font-semibold">Personal Information</div>
            {editing ? (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  await updateProfile({ name, nationality })
                  setEditing(false)
                }}
              >
                <label className="block text-sm">
                  Name
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border px-3 outline-none focus:border-[#F0B90B]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Nationality
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border px-3 outline-none focus:border-[#F0B90B]"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="submit" className="h-10 rounded-lg btn-brand px-4 text-sm font-semibold">
                    Save
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <Row label="Name" value={user?.name ?? ''} />
                <Row label="Nationality" value={user?.nationality || '—'} />
                <Row label="Email" value={user?.email ?? ''} />
              </>
            )}
          </div>
          <div className="rounded-xl border border-border bg-panel p-4 sm:p-5">
            <div className="mb-3 text-sm font-semibold">Account Information</div>
            <div className="flex flex-wrap gap-2">
              <Badge icon={<Check size={12} />} label="Verified Account" muted={!user?.verified} />
              <Badge icon={<CreditCard size={12} />} label="Funded" muted={!user?.funded} />
              <Badge icon={<Briefcase size={12} />} label="Live Account" />
              <Badge
                icon={<Check size={12} />}
                label={user?.totpEnabled ? '2FA On' : '2FA Off'}
                muted={!user?.totpEnabled}
              />
            </div>
          </div>
        </div>
      ) : tab === 'password' ? (
        <form
          className="w-full max-w-md space-y-3 rounded-xl border border-border bg-panel p-4 sm:p-5"
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const err = await changePassword(String(fd.get('current')), String(fd.get('next')))
            if (err) setMsg(err)
            else {
              setMsg('Password updated')
              e.currentTarget.reset()
            }
          }}
        >
          {msg ? (
            <p className={clsx('text-sm', msg === 'Password updated' ? 'text-buy' : 'text-sell')}>{msg}</p>
          ) : null}
          <Input name="current" label="Current password" type="password" />
          <Input name="next" label="New password" type="password" />
          <button
            type="submit"
            className="h-10 w-full rounded-lg btn-brand px-4 text-sm font-semibold sm:w-auto"
          >
            Update password
          </button>
        </form>
      ) : (
        <div className="w-full max-w-lg space-y-4">
          <div className="rounded-xl border border-border bg-panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold">Google Authenticator</div>
                <p className="mt-1 text-sm text-text-secondary">
                  Protect your account with a 6-digit code from the Google Authenticator app.
                </p>
              </div>
              <span
                className={clsx(
                  'w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  user?.totpEnabled ? 'bg-buy/10 text-buy' : 'bg-muted text-text-secondary',
                )}
              >
                {user?.totpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {secError ? <p className="text-sm text-sell">{secError}</p> : null}

          {!user?.totpEnabled ? (
            <div className="space-y-3 rounded-xl border border-border bg-panel p-4 sm:p-5">
              {!qr ? (
                <button
                  type="button"
                  disabled={secBusy}
                  className="h-10 w-full rounded-lg btn-brand px-4 text-sm font-semibold disabled:opacity-50 sm:w-auto"
                  onClick={async () => {
                    setSecBusy(true)
                    setSecError(null)
                    const r = await setup2fa()
                    setSecBusy(false)
                    if ('error' in r) setSecError(r.error)
                    else {
                      setQr(r.qrDataUrl)
                      setSecret(r.secret)
                    }
                  }}
                >
                  {secBusy ? 'Preparing…' : 'Set up authenticator'}
                </button>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-secondary">
                      1. Open Google Authenticator → Add → Scan QR code
                    </p>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-muted"
                      onClick={() => {
                        setQr(null)
                        setSecret(null)
                        setCode2fa('')
                      }}
                      aria-label="Cancel setup"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <img
                    src={qr}
                    alt="2FA QR code"
                    className="mx-auto h-44 w-44 max-w-full rounded-lg border border-border bg-white p-2 sm:h-52 sm:w-52"
                  />
                  <p className="break-all text-center text-xs text-text-secondary">
                    Or enter key manually:{' '}
                    <span className="font-mono font-semibold text-text">{secret}</span>
                  </p>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">2. Enter the 6-digit code to confirm</span>
                    <input
                      value={code2fa}
                      onChange={(e) => setCode2fa(e.target.value)}
                      inputMode="numeric"
                      className="h-10 w-full rounded-lg border border-border px-3 outline-none focus:border-[#F0B90B]"
                      placeholder="000000"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={secBusy || code2fa.replace(/\s/g, '').length < 6}
                    className="h-10 w-full rounded-lg btn-brand text-sm font-semibold disabled:opacity-50"
                    onClick={async () => {
                      setSecBusy(true)
                      setSecError(null)
                      const err = await enable2fa(code2fa)
                      setSecBusy(false)
                      if (err) setSecError(err)
                      else {
                        setQr(null)
                        setSecret(null)
                        setCode2fa('')
                      }
                    }}
                  >
                    Enable 2FA
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-panel p-4 sm:p-5">
              <p className="text-sm text-text-secondary">
                Enter your password and a current authenticator code to turn off 2FA.
              </p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Password</span>
                <input
                  type="password"
                  value={disablePass}
                  onChange={(e) => setDisablePass(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border px-3 outline-none focus:border-[#F0B90B]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Authenticator code</span>
                <input
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value)}
                  inputMode="numeric"
                  className="h-10 w-full rounded-lg border border-border px-3 outline-none focus:border-[#F0B90B]"
                  placeholder="000000"
                />
              </label>
              <button
                type="button"
                disabled={secBusy}
                className="h-10 w-full rounded-lg border border-sell px-4 text-sm font-semibold text-sell hover:bg-sell/10 disabled:opacity-50 sm:w-auto"
                onClick={async () => {
                  setSecBusy(true)
                  setSecError(null)
                  const err = await disable2fa(code2fa, disablePass)
                  setSecBusy(false)
                  if (err) setSecError(err)
                  else {
                    setCode2fa('')
                    setDisablePass('')
                  }
                }}
              >
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

export function ManageAccountsPage() {
  const { accounts, switchAccount, activeAccountId } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'live' | 'demo'>('live')
  const [menu, setMenu] = useState<string | null>(null)
  const list = accounts.filter((a) => a.type === tab)

  return (
    <PageShell title="Manage Accounts">
      <div className="mb-4 flex gap-4 overflow-x-auto border-b border-border">
        <TabBtn active={tab === 'live'} onClick={() => setTab('live')}>
          Live
        </TabBtn>
        <TabBtn active={tab === 'demo'} onClick={() => setTab('demo')}>
          Demo
        </TabBtn>
      </div>
      <h2 className="mb-3 text-sm font-semibold capitalize">{tab} Accounts</h2>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {list.map((a) => (
          <div
            key={a.id}
            className={clsx(
              'rounded-xl border border-border p-4',
              activeAccountId === a.id && 'bg-sidebar-active ring-1 ring-border',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">#{a.number || a.id}</div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {a.platform} · {a.leverage} · {a.currency}
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-border px-2.5 py-1 text-lg leading-none"
                onClick={() => setMenu(menu === a.id ? null : a.id)}
                aria-label="Account actions"
              >
                ⋯
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[11px] text-text-secondary">Equity</div>
                <div className="font-semibold tabular-nums">{formatMoney(a.equity)}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-secondary">Balance</div>
                <div className="font-semibold tabular-nums">{formatMoney(a.balance)}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-secondary">Credit</div>
                <div className="tabular-nums">{formatMoney(a.credit)}</div>
              </div>
            </div>
            {menu === a.id ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border py-2 text-xs font-semibold hover:bg-muted"
                  onClick={() => {
                    switchAccount(a.id)
                    setMenu(null)
                    navigate('/member')
                  }}
                >
                  Trade
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border py-2 text-xs font-semibold hover:bg-muted"
                  onClick={() => {
                    switchAccount(a.id)
                    setMenu(null)
                    navigate('/account/deposit')
                  }}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border py-2 text-xs font-semibold hover:bg-muted"
                  onClick={() => {
                    switchAccount(a.id)
                    setMenu(null)
                  }}
                >
                  Set active
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-transparent text-[14px] text-text-secondary">
            <tr>
              {['Account', 'Platform', 'Leverage', 'Currency', 'Equity', 'Balance', 'Credit', 'Action'].map(
                (h) => (
                  <th key={h} className="border-0 px-3 py-2 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className={`border-t border-border ${activeAccountId === a.id ? 'bg-sidebar-active' : ''}`}>
                <td className="px-3 py-3 font-semibold">#{a.number || a.id}</td>
                <td className="px-3 py-3">{a.platform}</td>
                <td className="px-3 py-3">{a.leverage}</td>
                <td className="px-3 py-3">{a.currency}</td>
                <td className="px-3 py-3">{formatMoney(a.equity)}</td>
                <td className="px-3 py-3">{formatMoney(a.balance)}</td>
                <td className="px-3 py-3">{formatMoney(a.credit)}</td>
                <td className="relative px-3 py-3">
                  <button type="button" onClick={() => setMenu(menu === a.id ? null : a.id)}>
                    ⋯
                  </button>
                  {menu === a.id ? (
                    <div className="panel absolute right-3 z-10 mt-1 w-40 overflow-hidden rounded border shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          switchAccount(a.id)
                          setMenu(null)
                          navigate('/member')
                        }}
                      >
                        Trade
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          switchAccount(a.id)
                          setMenu(null)
                          navigate('/account/deposit')
                        }}
                      >
                        Deposit
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          switchAccount(a.id)
                          setMenu(null)
                        }}
                      >
                        Set active
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}

export function TransactionsPage() {
  const { transactions, accounts } = useApp()
  const [period, setPeriod] = useState('all')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (account !== 'all' && t.accountId !== account) return false
      if (period === '7d') {
        // keep all for demo simplicity unless we parse dates
      }
      return true
    })
  }, [transactions, type, account, period])

  return (
    <PageShell title="Transaction History">
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        <div className="relative min-w-0">
          <select
            className="h-10 w-full appearance-none rounded-md border border-border bg-panel py-2 pl-3 pr-7 text-sm outline-none md:h-9 md:w-auto md:min-w-[8.5rem]"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All Periods</option>
            <option value="7d">Last 7 days</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-[2px] top-1/2 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
        </div>
        <div className="relative min-w-0">
          <select
            className="h-10 w-full appearance-none rounded-md border border-border bg-panel py-2 pl-3 pr-7 text-sm outline-none md:h-9 md:w-auto md:min-w-[8.5rem]"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="trade_pnl">Trade PnL</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-[2px] top-1/2 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
        </div>
        <div className="relative col-span-2 min-w-0 md:col-span-1">
          <select
            className="h-10 w-full appearance-none rounded-md border border-border bg-panel py-2 pl-3 pr-7 text-sm outline-none md:h-9 md:w-auto md:min-w-[9.5rem]"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-[2px] top-1/2 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon={<CreditCard size={28} />}
          title="No Transactions"
          text="Your transaction history is empty. Check your filters or make a transaction."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium capitalize">{t.type.replace('_', ' ')}</div>
                    <div className="mt-0.5 truncate text-xs text-text-secondary">
                      #{t.accountId.slice(-6)} · {t.note}
                    </div>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                    {formatMoney(t.amount)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                  <span>{t.date}</span>
                  <span>{t.payment}</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                      t.status === 'completed' || t.status === 'approved'
                        ? 'bg-buy/10 text-buy'
                        : t.status === 'rejected'
                          ? 'bg-sell/10 text-sell'
                          : 'bg-muted text-text-secondary',
                    )}
                  >
                    {t.status || 'completed'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-transparent text-[14px] text-text-secondary">
                <tr>
                  <th className="border-0 px-3 py-2 font-medium">Type and account</th>
                  <th className="border-0 px-3 py-2 font-medium">Date</th>
                  <th className="border-0 px-3 py-2 font-medium">Amount</th>
                  <th className="border-0 px-3 py-2 font-medium">Payment</th>
                  <th className="border-0 px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <div className="font-medium capitalize">{t.type.replace('_', ' ')}</div>
                      <div className="text-xs text-text-secondary">#{t.accountId.slice(-6)} · {t.note}</div>
                    </td>
                    <td className="px-3 py-3">{t.date}</td>
                    <td className={`px-3 py-3 font-semibold ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                      {formatMoney(t.amount)}
                    </td>
                    <td className="px-3 py-3">{t.payment}</td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                          t.status === 'completed' || t.status === 'approved'
                            ? 'bg-buy/10 text-buy'
                            : t.status === 'rejected'
                              ? 'bg-sell/10 text-sell'
                              : 'bg-muted text-text-secondary',
                        )}
                      >
                        {t.status || 'completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  )
}

export function VerificationPage() {
  const { user, submitKyc } = useApp()
  return (
    <PageShell title="Account Verification">
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <UploadBlock
            title="Proof of Identity"
            current={user?.kyc.identityFile}
            onUpload={(doc, file) => void submitKyc('identity', doc, file)}
          />
          <UploadBlock
            title="Proof of Residence"
            current={user?.kyc.residenceFile}
            onUpload={(doc, file) => void submitKyc('residence', doc, file)}
          />
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">How to take a photo of your document</h3>
          <div className="mb-3 rounded-md bg-buy/5 p-3 text-xs">
            <div className="mb-1 font-semibold text-buy">Do</div>
            <ul className="list-disc space-y-1 pl-4 text-text-secondary">
              <li>Clear and sharp</li>
              <li>Readable details</li>
              <li>All four corners visible</li>
            </ul>
          </div>
          <div className="mb-3 rounded-md bg-muted p-3 text-xs">
            <div className="mb-1 font-semibold">Don&apos;t</div>
            <ul className="list-disc space-y-1 pl-4 text-text-secondary">
              <li>Blurry or unfocused</li>
              <li>Unreadable details</li>
              <li>Cropped corners</li>
            </ul>
          </div>
          <div className="rounded-md bg-link/10 p-3 text-xs text-text-secondary">
            Status: {user?.verified ? 'Verified' : 'Pending documents'}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export function WithdrawPage() {
  const { accounts, withdraw, transactions, trades } = useApp()
  const [tab, setTab] = useState<'request' | 'history'>('request')
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState(accounts.find((a) => a.type === 'live')?.id ?? accounts[0].id)
  const [payment, setPayment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const acc = accounts.find((a) => a.id === accountId)!
  const used = calcUsedMargin(
    trades.filter((t) => t.accountId === accountId && t.status === 'open'),
    acc.leverage,
  )
  const available = Math.max(0, acc.balance - used)
  const history = transactions.filter((t) => t.type === 'withdraw')

  return (
    <PageShell title="Withdraw">
      <div className="mb-4 flex gap-4 overflow-x-auto border-b border-border">
        <TabBtn active={tab === 'request'} onClick={() => setTab('request')}>
          Withdraw Request
        </TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
          Withdraw History
        </TabBtn>
      </div>

      {tab === 'history' ? (
        history.length === 0 ? (
          <Empty icon={<CreditCard size={28} />} title="No withdrawals" text="You have no withdrawal history yet." />
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-col gap-1 rounded-xl border border-border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 truncate text-text-secondary">#{h.accountId} · {h.date}</span>
                <span className="negative font-semibold tabular-nums">{formatMoney(h.amount)}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        <form
          className="max-w-lg space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const err = await withdraw(amount, payment, accountId)
            setError(err)
            if (!err) {
              setAmount(0)
              setTab('history')
            }
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Choose an account to withdraw from *</span>
            <select
              className="h-10 w-full rounded border border-border px-2"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type.toUpperCase()} #{a.number || a.id}
                </option>
              ))}
            </select>
          </label>
          <div>
            <div className="mb-1 text-sm font-medium">Amount To Withdraw</div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">{getPlatformCurrency().symbol}</span>
              <button type="button" className="h-10 w-10 rounded border" onClick={() => setAmount((a) => Math.max(0, a - 10))}>
                −
              </button>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="no-spinner h-10 flex-1 rounded border border-border px-2 text-center outline-none transition-colors hover:border-[#fcd535] focus:border-[#fcd535]"
              />
              <button type="button" className="h-10 w-10 rounded border" onClick={() => setAmount((a) => a + 10)}>
                +
              </button>
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              Available to Withdraw: {formatMoney(available)}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Preferred payment method for withdraw *</span>
            <select
              className="h-10 w-full rounded border border-border px-2"
              required
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              <option value="" disabled>
                Please Select...
              </option>
              <option value="Bank Transfer">Bank Transfer (approval required)</option>
              <option value="Crypto">Crypto wallet</option>
              <option value="Stripe (Card)">Stripe / Card</option>
            </select>
          </label>
          {error ? <p className="text-sm text-sell">{error}</p> : null}
          <button
            type="submit"
            disabled={amount <= 0 || !payment}
            className="h-11 w-full rounded-md btn-brand text-sm font-semibold"
          >
            Withdraw Funds
          </button>
        </form>
      )}
    </PageShell>
  )
}

export function DepositPage() {
  const { accountType, switchAccount, accounts, deposit, user } = useApp()
  const navigate = useNavigate()
  const live = accounts.find((a) => a.type === 'live')
  const [amount, setAmount] = useState(500)
  const [method, setMethod] = useState<'stripe' | 'nowpayments' | 'bank'>('stripe')
  const [bankReference, setBankReference] = useState('')
  const [cryptoCoin, setCryptoCoin] = useState('USDT')
  const [copied, setCopied] = useState<string | null>(null)
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bankCountry, setBankCountry] = useState<string>('SA')
  const [info, setInfo] = useState<{
    countries?: Array<{
      countryCode: string
      label: string
      bankName: string
      accountName: string
      iban: string
      swift: string
      referenceHint: string
      contactOnly: boolean
    }>
    financeEmail?: string
    wallets?: {
      usdtTrc20: string
      usdtErc20: string
      btc: string
      eth: string
    }
    configured: Record<string, boolean>
  } | null>(null)

  const currency = getPlatformCurrency()

  const nationalityToCountry = (nationality?: string) => {
    const map: Record<string, string> = {
      'Saudi Arabia': 'SA',
      UAE: 'AE',
      'United Arab Emirates': 'AE',
      Qatar: 'QA',
      Bahrain: 'BH',
      Oman: 'OM',
      Jordan: 'JO',
      Kuwait: 'KW',
    }
    return map[nationality || ''] || 'SA'
  }

  const selectedBankCountry = info?.countries?.find((c) => c.countryCode === bankCountry)
  const financeEmail = info?.financeEmail || 'finance@nitajfx.online'
  const isIntlBank = selectedBankCountry?.contactOnly === true

  const contactFinanceHref = `mailto:${financeEmail}?subject=${encodeURIComponent('Deposit assistance')}&body=${encodeURIComponent(
    `Hello Finance,\n\nI need help with a bank deposit.\n\nAccount: ${user?.email || ''}\nCountry: ${selectedBankCountry?.label || bankCountry}\nAmount: ${currency.symbol}${amount}\n\nThank you.`,
  )}`

  useEffect(() => {
    void api<{
      financeEmail?: string
      methods: Array<{
        id: string
        configured?: boolean
        countries?: Array<{
          countryCode: string
          label: string
          bankName: string
          accountName: string
          iban: string
          swift: string
          referenceHint: string
          contactOnly: boolean
        }>
        financeEmail?: string
        wallets?: {
          usdtTrc20: string
          usdtErc20: string
          btc: string
          eth: string
        }
      }>
    }>('/api/payments/methods')
      .then((data) => {
        const bankMethod = data.methods?.find((m) => m.id === 'bank')
        const countries = bankMethod?.countries || []
        const wallets = data.methods?.find((m) => m.id === 'crypto')?.wallets
        const configured: Record<string, boolean> = {}
        for (const m of data.methods || []) configured[m.id] = Boolean(m.configured)
        setInfo({
          countries,
          financeEmail: data.financeEmail || bankMethod?.financeEmail,
          wallets,
          configured,
        })
        const preferred = nationalityToCountry(user?.nationality)
        if (countries.some((c) => c.countryCode === preferred)) {
          setBankCountry(preferred)
        } else if (countries[0]) {
          setBankCountry(countries[0].countryCode)
        }
      })
      .catch(() => null)
  }, [user?.nationality])

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* ignore */
    }
  }

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  if (accountType === 'demo') {
    return (
      <PageShell title="Deposit">
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sell text-white">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-semibold">Deposit is unavailable for demo account.</h2>
          <p className="mt-1 text-sm text-text-secondary">Please switch to live account.</p>
          <button
            type="button"
            className="mt-5 h-11 rounded-md btn-brand px-8 text-sm font-semibold"
            onClick={() => {
              if (live) switchAccount(live.id)
            }}
          >
            Switch account
          </button>
        </div>
      </PageShell>
    )
  }

  const tabs = [
    {
      id: 'stripe' as const,
      title: 'Card',
      desc: 'Visa · Mastercard',
      icon: CreditCard,
    },
    {
      id: 'nowpayments' as const,
      title: 'Crypto',
      desc: 'USDT · BTC · ETH',
      icon: Wallet,
    },
    {
      id: 'bank' as const,
      title: 'Bank',
      desc: 'Wire Transfer',
      icon: Building2,
    },
  ]

  const cryptoOptions = [
    { id: 'USDT', name: 'Tether', network: 'TRC20 / ERC20' },
    { id: 'BTC', name: 'Bitcoin', network: 'Bitcoin' },
    { id: 'ETH', name: 'Ethereum', network: 'ERC20' },
    { id: 'USDC', name: 'USD Coin', network: 'ERC20' },
    { id: 'LTC', name: 'Litecoin', network: 'Litecoin' },
    { id: 'TRX', name: 'TRON', network: 'TRC20' },
  ]

  const walletPreview =
    cryptoCoin === 'BTC'
      ? info?.wallets?.btc
      : cryptoCoin === 'ETH'
        ? info?.wallets?.eth
        : info?.wallets?.usdtTrc20

  return (
    <PageShell title="Deposit">
      <form
        className="mx-auto max-w-lg space-y-6"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          if (method === 'stripe') {
            const digits = card.number.replace(/\s/g, '')
            if (digits.length < 12 || card.expiry.length < 4 || card.cvc.length < 3 || !card.name.trim()) {
              setBusy(false)
              setError('Enter complete card details to continue')
              return
            }
          }
          const err = await deposit(amount, method, {
            method,
            countryCode: method === 'bank' ? bankCountry : undefined,
            bankReference,
            cryptoNetwork:
              cryptoCoin === 'BTC' ? 'btc' : cryptoCoin === 'ETH' ? 'eth' : 'usdt_trc20',
          })
          setBusy(false)
          setError(err)
          if (!err && method === 'bank') {
            navigate('/account/transactions')
          }
        }}
      >
        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">Deposit amount</div>
              <div className="mt-1 text-sm capitalize text-text-secondary">
                Total Deposited {formatMoney(user?.totalDeposited ?? 0)}
              </div>
            </div>
            <div className="text-xs text-text-secondary sm:text-right">
              Premium from {formatMoney(PREMIUM_THRESHOLD)}
            </div>
          </div>

          <div className="relative mt-4">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-secondary">
              {currency.symbol}
            </span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 text-2xl font-semibold outline-none transition-colors hover:border-[#fff] focus:border-[#F0B90B]"
              required
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[100, 250, 500, 1000, 5000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={clsx(
                  'rounded-lg border bg-transparent px-5 py-2.5 text-xs font-semibold transition-colors',
                  amount === v
                    ? 'border-[#fff] text-[#fff]'
                    : 'border-border text-text-secondary hover:border-[#F0B90B]/50 hover:text-brand-ink',
                )}
              >
                {currency.symbol}
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[18px] font-semibold capitalize">Payment Method</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = method === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMethod(t.id)}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border bg-transparent p-3 text-left transition-all sm:block',
                    active
                      ? 'border-[#fff]'
                      : 'border-border hover:border-[#F0B90B]/50',
                  )}
                >
                  <Icon size={18} className={clsx('shrink-0', active ? 'text-[#fff]' : 'text-text-secondary')} />
                  <div>
                    <div className={clsx('text-sm font-semibold sm:mt-2', active && 'text-[#fff]')}>{t.title}</div>
                    <div className="mt-0.5 text-[11px] capitalize text-text-secondary">{t.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {method === 'stripe' ? (
          <div className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[18px] font-semibold capitalize">Card Details</div>
                <p className="mt-0.5 text-xs text-text-secondary">Pay securely with Visa or Mastercard</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
                <Lock size={12} />
                Stripe
              </div>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">Name on card</span>
              <input
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-transparent px-3 outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
                placeholder="Full name"
                autoComplete="cc-name"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">Card number</span>
              <div className="relative">
                <input
                  value={card.number}
                  onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                  className="h-11 w-full rounded-xl border border-border bg-transparent px-3 pr-12 font-mono outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
                  placeholder="ACCT-000003"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
                <CreditCard size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">Expiry</span>
                <input
                  value={card.expiry}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                  className="h-11 w-full rounded-xl border border-border bg-transparent px-3 font-mono outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">CVC</span>
                <input
                  value={card.cvc}
                  onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  className="h-11 w-full rounded-xl border border-border bg-transparent px-3 font-mono outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </label>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-[11px] leading-relaxed text-text-secondary">
              <Lock size={13} className="mt-0.5 shrink-0 text-[#F0B90B]" />
              Card data is processed by Stripe Checkout. You will be redirected to complete payment securely.
            </p>
          </div>
        ) : null}

        {method === 'nowpayments' ? (
          <div className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div>
              <div className="text-[18px] font-semibold capitalize">Select Cryptocurrency</div>
              <p className="mt-0.5 text-xs text-text-secondary">Pay with NOWPayments — balance credits after confirmation</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cryptoOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCryptoCoin(c.id)}
                  className={clsx(
                    'rounded-xl border bg-transparent px-3 py-3 text-left transition-all',
                    cryptoCoin === c.id
                      ? 'border-[#fff] text-[#fff]'
                      : 'border-border hover:border-[#F0B90B]/50',
                  )}
                >
                  <div className="text-sm font-semibold">{c.id}</div>
                  <div className={clsx('mt-0.5 text-[11px]', cryptoCoin === c.id ? 'text-[#fff]' : 'text-text-secondary')}>{c.name}</div>
                  <div className={clsx('mt-1 text-[10px]', cryptoCoin === c.id ? 'text-[#fff]' : 'text-text-secondary')}>{c.network}</div>
                </button>
              ))}
            </div>

            {walletPreview ? (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-text-secondary">
                  <span>Deposit address preview ({cryptoCoin})</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[#F0B90B] hover:underline"
                    onClick={() => void copyText('wallet', walletPreview)}
                  >
                    <Copy size={12} />
                    {copied === 'wallet' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="break-all font-mono text-[11px] text-text">{walletPreview}</div>
              </div>
            ) : null}

            <p className="text-[11px] leading-relaxed text-text-secondary">
              You will choose the exact network and pay on the NOWPayments invoice page.
              {info?.configured?.nowpayments ? '' : ' Gateway key not set — test checkout may be used.'}
            </p>
          </div>
        ) : null}

        {method === 'bank' && info?.countries?.length ? (
          <div className="space-y-4">
            <div>
              <div className="mb-3 text-[18px] font-semibold capitalize">Select Country</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {info.countries.map((c) => {
                  const active = bankCountry === c.countryCode
                  return (
                    <button
                      key={c.countryCode}
                      type="button"
                      onClick={() => setBankCountry(c.countryCode)}
                      className={clsx(
                        'rounded-lg border bg-transparent px-2.5 py-3 text-left transition-all',
                        active ? 'border-[#fff] text-[#fff]' : 'border-border hover:border-[#fff]',
                      )}
                    >
                      <div className="text-[13px] font-semibold leading-tight">{c.label}</div>
                      {c.contactOnly ? (
                        <div className={clsx('mt-0.5 text-[10px] capitalize leading-tight', active ? 'text-[#fff]' : 'text-text-secondary')}>
                          Contact Finance
                        </div>
                      ) : (
                        <div className={clsx('mt-0.5 text-[10px] capitalize leading-tight', active ? 'text-[#fff]' : 'text-text-secondary')}>
                          Local Transfer
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {isIntlBank ? (
              <div className="space-y-4 rounded-2xl border border-border bg-panel p-5">
                <div>
                  <div className="text-sm font-semibold capitalize">International Transfer</div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Bank accounts change frequently. Please contact the Finance Department for current wire instructions.
                  </p>
                </div>
                <a
                  href={contactFinanceHref}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fcd535] text-sm font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]"
                >
                  <Mail size={16} />
                  Contact Finance
                </a>
              </div>
            ) : selectedBankCountry ? (
              <div className="space-y-4 rounded-2xl border border-border bg-panel p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold capitalize">Bank Transfer Details — {selectedBankCountry.label}</div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Transfer funds using the details below, then submit for admin approval
                    </p>
                  </div>
                  <a
                    href={contactFinanceHref}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-text-secondary transition-colors hover:border-[#fff] hover:text-[#fff]"
                  >
                    <Mail size={15} />
                    Contact Finance
                  </a>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      ['Bank name', selectedBankCountry.bankName],
                      ['Account name', selectedBankCountry.accountName],
                      ['IBAN / Account', selectedBankCountry.iban],
                      ['SWIFT / BIC', selectedBankCountry.swift],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-text-secondary">{label}</div>
                        <div className="break-all text-sm font-medium">{value || '—'}</div>
                      </div>
                      {value ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-border p-2 text-text-secondary hover:text-[#F0B90B]"
                          onClick={() => void copyText(label, value)}
                          aria-label={`Copy ${label}`}
                        >
                          {copied === label ? <Check size={14} className="text-buy" /> : <Copy size={14} />}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-text-secondary">{selectedBankCountry.referenceHint}</p>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-medium text-text-secondary">Your payment reference</span>
                  <input
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-transparent px-3 outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
                    placeholder="Transfer ID / reference (optional)"
                  />
                </label>

                <p className="rounded-xl border border-sell/30 bg-sell/5 px-3 py-2.5 text-[11px] text-sell">
                  Bank deposits stay pending until an admin confirms the funds.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-sell">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || amount <= 0 || (method === 'bank' && isIntlBank)}
          className="auth-btn h-12 w-full rounded-xl bg-[#fcd535] text-[15px] font-semibold capitalize text-[#202630] transition-colors hover:bg-[#ceaf30] disabled:opacity-50"
          style={{ color: '#202630' }}
        >
          {busy
            ? 'Processing…'
            : method === 'bank' && isIntlBank
              ? 'Contact Finance to deposit'
              : method === 'stripe'
              ? `Pay ${currency.symbol}${amount.toFixed(2)} with card`
              : method === 'nowpayments'
                ? `Continue with ${cryptoCoin}`
                : 'Submit Bank Deposit'}
        </button>
      </form>
    </PageShell>
  )
}

export function InvitePage() {
  const { user, referrals } = useApp()
  const [tab, setTab] = useState<'signed' | 'qualified'>('signed')
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/register?ref=${user?.referralCode ?? 'NITAJFX'}`
  const list = tab === 'signed' ? referrals.items : referrals.items.filter((r) => r.funded)

  return (
    <PageShell title="Invite a Friend">
      <h2 className="mb-3 text-sm font-semibold">Your Referral Activity</h2>
      <div className="mb-4 rounded-lg border border-border p-4">
        <div className="text-xs text-text-secondary">Your referral code</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-sm font-semibold">{user?.referralCode}</code>
          <button
            type="button"
            className="h-9 rounded btn-brand px-3 text-sm font-semibold"
            onClick={async () => {
              await navigator.clipboard.writeText(link)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied!' : '+ Invite friends'}
          </button>
        </div>
        <p className="mt-2 break-all text-xs text-text-secondary">{link}</p>
      </div>
      <div className="mb-6 flex gap-4 overflow-x-auto border-b border-border">
        <TabBtn active={tab === 'signed'} onClick={() => setTab('signed')}>
          Signed Up ({referrals.signedUp})
        </TabBtn>
        <TabBtn active={tab === 'qualified'} onClick={() => setTab('qualified')}>
          Qualified ({referrals.qualified})
        </TabBtn>
      </div>
      {list.length === 0 ? (
        <Empty
          icon={<Users size={28} />}
          title="No sign-up"
          text="Invite friends to earn rewards when they join and fund their account."
        />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-xl border border-border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="break-all text-xs text-text-secondary">{r.email}</div>
              </div>
              <span className={clsx('shrink-0 text-xs font-semibold', r.funded ? 'positive' : 'text-text-secondary')}>
                {r.funded ? 'Qualified' : 'Signed up'}
              </span>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

export function QuestionnairePage() {
  const { user, completeQuestionnaire } = useApp()
  const [step, setStep] = useState(0)
  const questions = [
    'What is your employment status?',
    'What is your annual income range?',
    'What is your trading experience?',
    'What is your risk tolerance?',
  ]
  const [answers, setAnswers] = useState<string[]>(['', '', '', ''])

  if (user?.questionnaireDone) {
    return (
      <PageShell title="Compliance">
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Check size={36} className="mb-3 text-buy" />
          <h2 className="text-lg font-semibold">Questionnaire completed</h2>
          <p className="mt-1 text-sm text-text-secondary">Your regulatory questionnaire is on file.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Compliance">
      {step === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-text-secondary">
            <FileWarning size={30} />
          </div>
          <h2 className="text-lg font-semibold">Missing Regulatory Questionnaire</h2>
          <p className="mt-1 max-w-md text-sm text-text-secondary">
            To ensure compliance, please complete the following regulatory questionnaire.
          </p>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-5 h-11 rounded-md btn-brand px-6 text-sm font-semibold"
          >
            Complete the Questionnaire
          </button>
        </div>
      ) : (
        <form
          className="mx-auto max-w-lg space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (step < questions.length) setStep(step + 1)
            else await completeQuestionnaire()
          }}
        >
          <div className="text-xs text-text-secondary">
            Step {Math.min(step, questions.length)} of {questions.length}
          </div>
          <h2 className="text-lg font-semibold">{questions[Math.min(step, questions.length) - 1]}</h2>
          <select
            className="h-10 w-full rounded border border-border px-2"
            required
            value={answers[step - 1]}
            onChange={(e) => {
              const next = [...answers]
              next[step - 1] = e.target.value
              setAnswers(next)
            }}
          >
            <option value="">Select an option</option>
            <option>Option A</option>
            <option>Option B</option>
            <option>Option C</option>
          </select>
          <button type="submit" className="h-11 w-full rounded-md btn-brand text-sm font-semibold">
            {step >= questions.length ? 'Submit' : 'Next'}
          </button>
        </form>
      )}
    </PageShell>
  )
}

export function MobileAppPage() {
  return (
    <PageShell title="Get mobile app">
      <div className="max-w-lg rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Trade on the go</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Download the NitajFX mobile app for iOS and Android to manage positions anywhere.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-md btn-brand px-4 text-sm font-semibold"
          >
            App Store
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-md border border-brand px-4 text-sm font-semibold"
          >
            Google Play
          </a>
        </div>
      </div>
    </PageShell>
  )
}

export function PremiumPage() {
  const { isPremium, user } = useApp()
  if (isPremium) {
    return (
      <MobileMoreBackShell title="Premium" className="flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Diamond size={36} className="mx-auto mb-3 text-accent" />
          <h1 className="hidden text-xl font-semibold md:block">Premium active</h1>
          <p className="text-xl font-semibold md:hidden">Premium active</p>
          <p className="mt-2 text-sm text-text-secondary">
            You have deposited {formatMoney(user?.totalDeposited ?? 0)}. Enjoy signals and premium tools.
          </p>
          <Link to="/signals" className="mt-5 inline-flex h-11 items-center rounded-md btn-brand px-8 text-sm font-semibold">
            View Signals
          </Link>
        </div>
      </MobileMoreBackShell>
    )
  }
  return (
    <MobileMoreBackShell title="Premium" className="flex items-center justify-center p-6">
      <div className="text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-text-secondary">
          <Diamond size={32} />
        </div>
        <h1 className="hidden text-xl font-semibold md:block">Join Premium</h1>
        <p className="text-xl font-semibold md:hidden">Join Premium</p>
        <p className="mt-2 text-sm text-text-secondary">
          A total deposit of at least {formatMoney(PREMIUM_THRESHOLD)} is required to access the content.
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          Progress: {formatMoney(user?.totalDeposited ?? 0)} / {formatMoney(PREMIUM_THRESHOLD)}
        </p>
        <Link
          to="/account/deposit"
          className="mt-5 inline-flex h-11 items-center rounded-md btn-brand px-8 text-sm font-semibold"
        >
          Deposit
        </Link>
      </div>
    </MobileMoreBackShell>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'shrink-0 whitespace-nowrap border-b-2 px-2 pb-2.5 text-sm font-medium transition-colors sm:px-1',
        active
          ? 'border-brand text-brand-ink'
          : 'border-transparent text-text-secondary hover:text-brand-ink',
      )}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function Badge({ icon, label, muted }: { icon: ReactNode; label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        muted ? 'border-border text-text-secondary opacity-60' : 'border-border'
      }`}
    >
      {icon}
      {label}
    </span>
  )
}

function Input({ label, type = 'text', name }: { label: string; type?: string; name?: string }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={isPassword && visible ? 'text' : type}
          className={clsx(
            'h-10 w-full rounded border border-border px-3 outline-none',
            isPassword && 'pr-11',
          )}
          required
          autoComplete={name === 'next' ? 'new-password' : name === 'current' ? 'current-password' : undefined}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-transparent p-0.5 text-text-secondary transition-colors hover:text-brand-ink"
          >
            {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        ) : null}
      </div>
    </label>
  )
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: string
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-text-secondary">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{text}</p>
      {action ? (
        <button type="button" className="mt-5 h-11 rounded-md btn-brand px-5 text-sm font-semibold">
          {action}
        </button>
      ) : null}
    </div>
  )
}

function UploadBlock({
  title,
  current,
  onUpload,
}: {
  title: string
  current?: string
  onUpload: (docType: string, fileName: string) => void
}) {
  const [doc, setDoc] = useState('Passport')
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-text-secondary">Document type</span>
        <select className="h-10 w-full rounded border border-border px-2" value={doc} onChange={(e) => setDoc(e.target.value)}>
          <option>Passport</option>
          <option>National ID</option>
          <option>Driver License</option>
          <option>Utility Bill</option>
        </select>
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 px-4 py-10 text-center">
        <Upload size={22} className="mb-2 text-text-secondary" />
        <div className="text-sm font-medium">{current ? `Uploaded: ${current}` : 'Upload Document Front Side'}</div>
        <span className="mt-3 inline-flex h-9 items-center rounded border border-border bg-panel px-4 text-sm">
          Select File
        </span>
        <div className="mt-2 text-[11px] text-text-secondary">PDF, PNG or JPEG up to 5 MB.</div>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(doc, file.name)
          }}
        />
      </label>
    </div>
  )
}
