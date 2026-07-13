import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AccountSidebar } from '../components/layout/AccountSidebar'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import { calcUsedMargin, formatMoney, getPlatformCurrency } from '../data/mock'
import { PREMIUM_THRESHOLD } from '../types'
import {
  AlertCircle,
  Briefcase,
  Check,
  CreditCard,
  Diamond,
  FileWarning,
  Pencil,
  Upload,
  Users,
} from 'lucide-react'

function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <AccountSidebar />
      <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden border-l-0">
        <div className="border-b border-border bg-muted px-5 py-3 text-sm font-semibold">{title}</div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}

export function AccountDetailsPage() {
  const { user, updateProfile, changePassword, setup2fa, enable2fa, disable2fa } = useApp()
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

  return (
    <PageShell title="Account Details">
      <div className="mb-4 flex gap-4 overflow-x-auto border-b border-border">
        <TabBtn active={tab === 'personal'} onClick={() => setTab('personal')}>
          Personal Information
        </TabBtn>
        <TabBtn active={tab === 'password'} onClick={() => setTab('password')}>
          Change Password
        </TabBtn>
        <TabBtn active={tab === 'security'} onClick={() => setTab('security')}>
          Two-step verification
        </TabBtn>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand">
          {user?.initials}
        </div>
        <div>
          <div className="text-lg font-semibold">{user?.name}</div>
          <div className="text-sm text-text-secondary">{user?.email}</div>
          <div className="text-xs text-text-secondary">1 live accounts | 1 demo accounts</div>
        </div>
      </div>

      {tab === 'personal' ? (
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="relative rounded-lg border border-border p-4">
            <button
              type="button"
              className="absolute right-3 top-3 text-text-secondary"
              onClick={() => {
                setEditing((v) => !v)
                setName(user?.name ?? '')
                setNationality(user?.nationality ?? '')
              }}
            >
              <Pencil size={15} />
            </button>
            <div className="mb-3 text-sm font-semibold">Personal Information</div>
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
                    className="mt-1 h-9 w-full rounded border border-border px-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Nationality
                  <input
                    className="mt-1 h-9 w-full rounded border border-border px-2"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                  />
                </label>
                <button type="submit" className="h-9 rounded btn-brand px-3 text-sm font-semibold">
                  Save
                </button>
              </form>
            ) : (
              <>
                <Row label="Name" value={user?.name ?? ''} />
                <Row label="Nationality" value={user?.nationality ?? ''} />
              </>
            )}
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-semibold">Account Information</div>
            <div className="flex flex-wrap gap-2">
              <Badge icon={<Check size={12} />} label="Verified Account" muted={!user?.verified} />
              <Badge icon={<CreditCard size={12} />} label="$ Funded" muted={!user?.funded} />
              <Badge icon={<Briefcase size={12} />} label="Live Account" />
              <Badge icon={<Check size={12} />} label={user?.totpEnabled ? '2FA On' : '2FA Off'} muted={!user?.totpEnabled} />
            </div>
          </div>
        </div>
      ) : tab === 'password' ? (
        <form
          className="max-w-md space-y-3"
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
          {msg ? <p className="text-sm text-link">{msg}</p> : null}
          <Input name="current" label="Current password" type="password" />
          <Input name="next" label="New password" type="password" />
          <button type="submit" className="h-10 rounded-md btn-brand px-4 text-sm font-semibold">
            Update password
          </button>
        </form>
      ) : (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Google Authenticator</div>
                <p className="mt-1 text-sm text-text-secondary">
                  Protect your account with a 6-digit code from the Google Authenticator app.
                </p>
              </div>
              <span
                className={clsx(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  user?.totpEnabled ? 'bg-buy/10 text-buy' : 'bg-muted text-text-secondary',
                )}
              >
                {user?.totpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {secError ? <p className="text-sm text-sell">{secError}</p> : null}

          {!user?.totpEnabled ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              {!qr ? (
                <button
                  type="button"
                  disabled={secBusy}
                  className="h-10 rounded-md btn-brand px-4 text-sm font-semibold disabled:opacity-50"
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
                  <p className="text-sm text-text-secondary">1. Open Google Authenticator → Add → Scan QR code</p>
                  <img
                    src={qr}
                    alt="2FA QR code"
                    className="mx-auto h-52 w-52 rounded-lg border border-border bg-white p-2"
                  />
                  <p className="text-center text-xs text-text-secondary">
                    Or enter key manually: <span className="font-mono font-semibold text-text">{secret}</span>
                  </p>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">2. Enter the 6-digit code to confirm</span>
                    <input
                      value={code2fa}
                      onChange={(e) => setCode2fa(e.target.value)}
                      inputMode="numeric"
                      className="h-10 w-full rounded-lg border border-border px-3 outline-none"
                      placeholder="000000"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={secBusy || code2fa.replace(/\s/g, '').length < 6}
                    className="h-10 w-full rounded-md btn-brand text-sm font-semibold disabled:opacity-50"
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
            <div className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm text-text-secondary">
                Enter your password and a current authenticator code to turn off 2FA.
              </p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Password</span>
                <input
                  type="password"
                  value={disablePass}
                  onChange={(e) => setDisablePass(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border px-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Authenticator code</span>
                <input
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value)}
                  inputMode="numeric"
                  className="h-10 w-full rounded-lg border border-border px-3 outline-none"
                  placeholder="000000"
                />
              </label>
              <button
                type="button"
                disabled={secBusy}
                className="h-10 rounded-md border border-sell px-4 text-sm font-semibold text-sell hover:bg-sell/10 disabled:opacity-50"
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
      <div className="mb-4 flex gap-4 border-b border-border">
        <TabBtn active={tab === 'live'} onClick={() => setTab('live')}>
          Live
        </TabBtn>
        <TabBtn active={tab === 'demo'} onClick={() => setTab('demo')}>
          Demo
        </TabBtn>
      </div>
      <h2 className="mb-3 text-sm font-semibold capitalize">{tab} Accounts</h2>
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted text-xs text-text-secondary">
            <tr>
              {['Account', 'Platform', 'Leverage', 'Currency', 'Equity', 'Balance', 'Credit', 'Action'].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium">
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
                          navigate('/platform')
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
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="h-9 rounded border border-border px-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">All Periods</option>
          <option value="7d">Last 7 days</option>
        </select>
        <select className="h-9 rounded border border-border px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
          <option value="trade_pnl">Trade PnL</option>
        </select>
        <select className="h-9 rounded border border-border px-2 text-sm" value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="all">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon={<CreditCard size={28} />}
          title="No Transactions"
          text="Your transaction history is empty. Check your filters or make a transaction."
        />
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2">Type and account</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Status</th>
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
      <div className="mb-4 flex gap-4 border-b border-border">
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
              <div key={h.id} className="flex justify-between rounded border border-border px-3 py-2 text-sm">
                <span>#{h.accountId} · {h.date}</span>
                <span className="negative">{formatMoney(h.amount)}</span>
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
                className="h-10 flex-1 rounded border border-border px-2 text-center"
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
  const [method, setMethod] = useState<'stripe' | 'nowpayments' | 'crypto' | 'bank'>('stripe')
  const [bankReference, setBankReference] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState<'usdt_trc20' | 'usdt_erc20' | 'btc' | 'eth'>('usdt_trc20')
  const [cryptoTxHash, setCryptoTxHash] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<{
    bank?: {
      bankName: string
      accountName: string
      iban: string
      swift: string
      referenceHint: string
    }
    wallets?: {
      usdtTrc20: string
      usdtErc20: string
      btc: string
      eth: string
    }
    configured: Record<string, boolean>
  } | null>(null)

  useEffect(() => {
    void api<{
      methods: Array<{
        id: string
        configured?: boolean
        bank?: {
          bankName: string
          accountName: string
          iban: string
          swift: string
          referenceHint: string
        }
        wallets?: {
          usdtTrc20: string
          usdtErc20: string
          btc: string
          eth: string
        }
      }>
    }>('/api/payments/methods')
      .then((data) => {
        const bank = data.methods?.find((m) => m.id === 'bank')?.bank
        const wallets = data.methods?.find((m) => m.id === 'crypto')?.wallets
        const configured: Record<string, boolean> = {}
        for (const m of data.methods || []) configured[m.id] = Boolean(m.configured)
        setInfo({ bank, wallets, configured })
      })
      .catch(() => null)
  }, [])

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

  const methods = [
    {
      id: 'stripe' as const,
      title: 'Stripe (Card)',
      desc: 'Visa / Mastercard — instant when paid',
      badge: info?.configured?.stripe ? 'Live' : 'Test mode',
    },
    {
      id: 'nowpayments' as const,
      title: 'Crypto gateway',
      desc: 'NOWPayments — 100+ coins, auto-credit when paid',
      badge: info?.configured?.nowpayments ? 'Live' : 'Test mode',
    },
    {
      id: 'crypto' as const,
      title: 'Crypto (Manual)',
      desc: 'Send to our wallet — admin confirms',
      badge: 'Needs approval',
    },
    {
      id: 'bank' as const,
      title: 'Bank Transfer',
      desc: 'Wire funds — admin approves after arrival',
      badge: 'Needs approval',
    },
  ]

  return (
    <PageShell title="Deposit">
      <form
        className="mx-auto max-w-xl space-y-5"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          const err = await deposit(amount, method, {
            method,
            bankReference,
            cryptoNetwork,
            cryptoTxHash,
          })
          setBusy(false)
          setError(err)
          if (!err && (method === 'bank' || method === 'crypto')) {
            navigate('/account/transactions')
          }
        }}
      >
        <p className="text-sm text-text-secondary">
          Total deposited: {formatMoney(user?.totalDeposited ?? 0)} · Premium at {formatMoney(PREMIUM_THRESHOLD)}
        </p>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Amount ({getPlatformCurrency().code})</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-border px-3 outline-none"
            required
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {[100, 500, 1000, 5000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {getPlatformCurrency().symbol}
              {v}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Payment method</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={clsx(
                  'rounded-xl border p-3 text-left transition-colors',
                  method === m.id ? 'border-brand bg-sidebar-active' : 'border-border hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{m.title}</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      m.badge.includes('approval') || m.badge.includes('Test')
                        ? 'bg-sell/10 text-sell'
                        : 'bg-buy/10 text-buy',
                    )}
                  >
                    {m.badge}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {method === 'bank' && info?.bank ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <div className="font-semibold">Transfer to this bank account</div>
            <div className="grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
              <div>
                Bank: <span className="font-medium text-text">{info.bank.bankName}</span>
              </div>
              <div>
                Name: <span className="font-medium text-text">{info.bank.accountName}</span>
              </div>
              <div className="sm:col-span-2">
                IBAN: <span className="font-medium text-text">{info.bank.iban}</span>
              </div>
              <div>
                SWIFT: <span className="font-medium text-text">{info.bank.swift}</span>
              </div>
              <div className="sm:col-span-2">{info.bank.referenceHint}</div>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-text">Your payment reference (optional)</span>
              <input
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-panel px-3 text-sm outline-none"
                placeholder="Reference / transfer ID"
              />
            </label>
            <p className="text-[11px] text-sell">
              Bank deposits stay pending until an admin confirms the funds and approves the payment.
            </p>
          </div>
        ) : null}

        {method === 'crypto' && info?.wallets ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <div className="font-semibold">Send crypto to our wallet</div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-text">Network</span>
              <select
                value={cryptoNetwork}
                onChange={(e) => setCryptoNetwork(e.target.value as typeof cryptoNetwork)}
                className="h-10 w-full rounded-lg border border-border bg-panel px-2 text-sm"
              >
                <option value="usdt_trc20">USDT (TRC20)</option>
                <option value="usdt_erc20">USDT (ERC20)</option>
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
              </select>
            </label>
            <div className="break-all rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs">
              {cryptoNetwork === 'usdt_trc20'
                ? info.wallets.usdtTrc20
                : cryptoNetwork === 'usdt_erc20'
                  ? info.wallets.usdtErc20
                  : cryptoNetwork === 'btc'
                    ? info.wallets.btc
                    : info.wallets.eth}
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-text">Transaction hash (optional)</span>
              <input
                value={cryptoTxHash}
                onChange={(e) => setCryptoTxHash(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-panel px-3 text-sm outline-none"
                placeholder="Paste TX hash after sending"
              />
            </label>
            <p className="text-[11px] text-sell">
              Manual crypto deposits require admin approval after blockchain confirmation.
            </p>
          </div>
        ) : null}

        {method === 'stripe' || method === 'nowpayments' ? (
          <p
            className={clsx(
              'rounded-lg px-3 py-2 text-xs',
              info?.configured[method] ? 'bg-buy/10 text-buy' : 'bg-muted text-text-secondary',
            )}
          >
            {info?.configured[method]
              ? method === 'nowpayments'
                ? 'You will be redirected to NOWPayments to pay with crypto. Your balance credits automatically after confirmation.'
                : 'You will be redirected to Stripe Checkout. Your balance credits after a successful card payment.'
              : 'Gateway API key not set yet — you will use a local test checkout that credits instantly for demo. Admin can paste the key under Settings → Payments.'}
          </p>
        ) : null}

        {error ? <p className="text-sm text-sell">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || amount <= 0}
          className="h-11 w-full rounded-lg btn-brand text-sm font-semibold disabled:opacity-50"
        >
          {busy
            ? 'Processing…'
            : method === 'stripe' || method === 'nowpayments'
              ? 'Continue to payment'
              : 'Submit for approval'}
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
      <div className="mb-6 flex gap-4 border-b border-border">
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
            <div key={r.id} className="flex justify-between rounded border border-border px-3 py-2 text-sm">
              <span>
                {r.name}
                <span className="ml-2 text-xs text-text-secondary">{r.email}</span>
              </span>
              <span className={r.funded ? 'positive' : 'text-text-secondary'}>
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
        <div className="mt-4 flex gap-3">
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
      <div className="flex h-full items-center justify-center bg-panel">
        <div className="max-w-md text-center">
          <Diamond size={36} className="mx-auto mb-3 text-accent" />
          <h1 className="text-xl font-semibold">Premium active</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You have deposited {formatMoney(user?.totalDeposited ?? 0)}. Enjoy signals and premium tools.
          </p>
          <Link to="/signals" className="mt-5 inline-flex h-11 items-center rounded-md btn-brand px-8 text-sm font-semibold">
            View Signals
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full items-center justify-center bg-panel">
      <div className="text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-text-secondary">
          <Diamond size={32} />
        </div>
        <h1 className="text-xl font-semibold">Join Premium</h1>
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
    </div>
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
      className={`border-b-2 pb-2 text-sm ${
        active ? 'border-brand font-semibold text-brand-ink' : 'border-transparent text-text-secondary'
      }`}
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
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input name={name} type={type} className="h-10 w-full rounded border border-border px-3 outline-none" required />
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
