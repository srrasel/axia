import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../api/client'
import type {
  AccountMetrics,
  AccountType,
  Candle,
  NotificationItem,
  PlaceTradeInput,
  Quote,
  Trade,
  TradeSide,
  TradingAccount,
  Transaction,
  User,
} from '../types'
import { PREMIUM_THRESHOLD } from '../types'
import { formatMoney, formatPrice, setPlatformCurrency } from '../data/mock'

export type AppToast =
  | { kind: 'message'; text: string }
  | {
      kind: 'trade'
      side: TradeSide
      symbol: string
      volume: number
      priceLabel: string
      pending?: boolean
    }

type ApiUser = User & {
  accounts?: TradingAccount[]
  kycDocuments?: Array<{ kind: string; docType: string; fileName: string; status: string }>
  totalDeposited: number
  questionnaireDone: boolean
  referralCode: string
  kycStatus?: string
}

interface AppState {
  user: ApiUser | null
  isAuthenticated: boolean
  accounts: TradingAccount[]
  activeAccountId: string
  accountType: AccountType
  quotes: Quote[]
  selectedSymbol: string
  candles: Candle[]
  timeframe: string
  trades: Trade[]
  transactions: Transaction[]
  notifications: NotificationItem[]
  referrals: { signedUp: number; qualified: number; items: Array<{ id: string; name: string; email: string; funded: boolean }> }
  metrics: AccountMetrics
  darkMode: boolean
  language: 'en' | 'ar'
  liveData: boolean
  isPremium: boolean
  chartIndicator: string
  toast: AppToast | null
  loading: boolean
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => Promise<{ requires2fa?: boolean; tempToken?: string; error?: string } | null>
  verifyLogin2fa: (tempToken: string, code: string) => Promise<string | null>
  setup2fa: () => Promise<{ secret: string; qrDataUrl: string } | { error: string }>
  enable2fa: (code: string) => Promise<string | null>
  disable2fa: (code: string, password: string) => Promise<string | null>
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<string | null>
  logout: () => void
  updateProfile: (patch: Partial<User>) => Promise<string | null>
  changePassword: (current: string, next: string) => Promise<string | null>
  setSelectedSymbol: (symbol: string) => void
  setTimeframe: (tf: string) => void
  setDarkMode: (v: boolean) => void
  setLanguage: (lang: 'en' | 'ar') => void
  setChartIndicator: (v: string) => void
  switchAccount: (id: string) => void
  placeTrade: (input: PlaceTradeInput) => Promise<string | null>
  closeTrade: (id: string) => Promise<void>
  cancelPending: (id: string) => Promise<void>
  updateTradeLevels: (id: string, stopLoss?: number, takeProfit?: number) => Promise<void>
  deposit: (
    amount: number,
    payment: string,
    extras?: {
      method?: string
      bankReference?: string
      cryptoNetwork?: string
      cryptoTxHash?: string
    },
  ) => Promise<string | null>
  withdraw: (amount: number, payment: string, fromAccountId: string) => Promise<string | null>
  submitKyc: (kind: 'identity' | 'residence', docType: string, fileName: string) => Promise<void>
  completeQuestionnaire: () => Promise<void>
  markNotificationsRead: () => Promise<void>
  clearToast: () => void
  refreshQuotes: () => Promise<void>
  refreshAll: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)
const THEME_KEY = 'seekapa_theme'
const LANG_KEY = 'seekapa_lang'

function mapAccount(a: any): TradingAccount {
  return {
    id: a.id,
    number: a.number,
    type: a.type,
    platform: a.platform,
    leverage: a.leverage,
    currency: a.currency,
    equity: a.equity,
    balance: a.balance,
    credit: a.credit,
  }
}

function mapTrade(t: any): Trade {
  return {
    id: t.id,
    accountId: t.accountId,
    symbol: t.symbol,
    side: t.side,
    volume: t.volume,
    openPrice: t.openPrice,
    currentPrice: t.currentPrice,
    closePrice: t.closePrice ?? undefined,
    openTime: new Date(t.openTime).toLocaleString('en-GB').replace(',', ''),
    closeTime: t.closeTime ? new Date(t.closeTime).toLocaleString('en-GB').replace(',', '') : undefined,
    status: t.status,
    stopLoss: t.stopLoss ?? undefined,
    takeProfit: t.takeProfit ?? undefined,
    triggerPrice: t.triggerPrice ?? undefined,
    realizedPnl: t.realizedPnl ?? undefined,
    swap: t.swap,
    category: t.category,
    source: t.source,
  }
}

function mapTx(t: any): Transaction {
  return {
    id: t.id,
    type: t.type,
    accountId: t.accountId,
    date: new Date(t.createdAt).toLocaleString('en-GB').replace(',', ''),
    amount: t.amount,
    payment: t.payment,
    note: t.note ?? undefined,
    status: t.status,
  }
}

function mapUser(u: any): ApiUser {
  const identity = u.kycDocuments?.find((d: any) => d.kind === 'identity')
  const residence = u.kycDocuments?.find((d: any) => d.kind === 'residence')
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password: '',
    nationality: u.nationality,
    initials: u.initials,
    photoUrl: u.photoUrl ?? u.avatarUrl ?? null,
    verified: u.verified,
    funded: u.funded,
    totalDeposited: u.totalDeposited ?? 0,
    questionnaireDone: u.questionnaireDone ?? false,
    referralCode: u.referralCode,
    totpEnabled: Boolean(u.totpEnabled),
    kyc: {
      identity: identity?.docType,
      residence: residence?.docType,
      identityFile: identity?.fileName,
      residenceFile: residence?.fileName,
    },
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD')
  const [candles, setCandles] = useState<Candle[]>([])
  const [timeframe, setTimeframe] = useState('5M')
  const [trades, setTrades] = useState<Trade[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [referrals, setReferrals] = useState<{
    signedUp: number
    qualified: number
    items: Array<{ id: string; name: string; email: string; funded: boolean }>
  }>({ signedUp: 0, qualified: 0, items: [] })
  const [metrics, setMetrics] = useState<AccountMetrics>({
    freeMargin: 0,
    usedFunds: 0,
    equity: 0,
    totalPnl: 0,
    marginLevel: 0,
    balance: 0,
  })
  const [darkMode, setDarkModeState] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY)
    // Default dark when no preference saved
    if (stored === null) return true
    return stored === '1'
  })
  const [language, setLanguageState] = useState<'en' | 'ar'>(
    () => (localStorage.getItem(LANG_KEY) as 'en' | 'ar') || 'en',
  )
  const [liveData, setLiveData] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [chartIndicator, setChartIndicator] = useState('None')
  const [toast, setToast] = useState<AppToast | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setCurrencyTick] = useState(0)
  const activeAccountIdRef = useRef(activeAccountId)
  const bootstrapSeqRef = useRef(0)

  activeAccountIdRef.current = activeAccountId

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? accounts[0]
  const accountType = (activeAccount?.type ?? 'demo') as AccountType

  const showToast = (msg: string | AppToast) => {
    setToast(typeof msg === 'string' ? { kind: 'message', text: msg } : msg)
    window.setTimeout(() => setToast(null), 3200)
  }

  const applyBootstrap = (data: any, requestedAccountId?: string) => {
    // Apply currency first so money formatting is correct on the same render pass
    if (data.currency) {
      setPlatformCurrency(data.currency)
    } else if (data.currencySymbol) {
      setPlatformCurrency(data.currencySymbol)
    }
    setUser(mapUser(data.user))
    setAccounts((data.accounts || []).map(mapAccount))
    // Prefer the account we asked for so a stale response cannot flip Demo/Live
    const nextAccountId =
      (requestedAccountId &&
        (data.accounts || []).some((a: any) => a.id === requestedAccountId) &&
        requestedAccountId) ||
      data.activeAccountId ||
      ''
    if (nextAccountId) {
      activeAccountIdRef.current = nextAccountId
      setActiveAccountId(nextAccountId)
    }
    setTrades((data.trades || []).map(mapTrade))
    setTransactions((data.transactions || []).map(mapTx))
    setNotifications(
      (data.notifications || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: new Date(n.createdAt).toLocaleString('en-GB').replace(',', ''),
        read: n.read,
      })),
    )
    setReferrals({
      signedUp: data.referrals?.signedUp ?? 0,
      qualified: data.referrals?.qualified ?? 0,
      items: (data.referrals?.items || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        funded: Boolean(r.funded),
      })),
    })
    setQuotes(data.quotes || [])
    setLiveData(Boolean(data.liveData))
    setMetrics(data.metrics)
    setIsPremium(Boolean(data.isPremium) || (data.user?.totalDeposited ?? 0) >= PREMIUM_THRESHOLD)
    setCurrencyTick((n) => n + 1)
  }

  const refreshAll = useCallback(async (accountIdOverride?: string) => {
    if (!getToken()) return
    const seq = ++bootstrapSeqRef.current
    const accountId = accountIdOverride ?? (activeAccountIdRef.current || '')
    const data = await api<any>(`/api/bootstrap?accountId=${encodeURIComponent(accountId)}`)
    // Ignore outdated responses so Demo/Live does not bounce while requests overlap
    if (seq !== bootstrapSeqRef.current) return
    // If user switched again while this request was in flight, drop it
    if (accountId && activeAccountIdRef.current && accountId !== activeAccountIdRef.current) return
    applyBootstrap(data, accountId || undefined)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(THEME_KEY, darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem(LANG_KEY, language)
  }, [language])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    refreshAll()
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [refreshAll])

  useEffect(() => {
    if (!user?.id || !activeAccountId) return
    void refreshAll(activeAccountId).catch(() => undefined)
    // Only re-fetch when the selected account changes, not on every bootstrap user object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, user?.id, refreshAll])

  const refreshQuotes = useCallback(async () => {
    if (!getToken()) return
    try {
      const market = await api<{ quotes: Quote[]; live: boolean }>('/api/quotes')
      setQuotes(market.quotes)
      setLiveData(market.live)
      await refreshAll(activeAccountIdRef.current)
    } catch {
      /* ignore transient errors */
    }
  }, [refreshAll])

  useEffect(() => {
    if (!user) return
    const id = window.setInterval(() => void refreshQuotes(), 4000)
    return () => window.clearInterval(id)
  }, [user, refreshQuotes])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<{ candles: Candle[] }>(
          `/api/candles?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${encodeURIComponent(timeframe)}`,
        )
        if (!cancelled) setCandles(data.candles)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedSymbol, timeframe, user])

  const switchAccount = useCallback((id: string) => {
    if (!id || id === activeAccountIdRef.current) return
    // Invalidate in-flight bootstraps so they cannot flip the selection back
    bootstrapSeqRef.current += 1
    activeAccountIdRef.current = id
    setActiveAccountId(id)
  }, [])

  const finishAuth = async (token: string, userData: any) => {
    setToken(token)
    const demo = (userData.accounts || []).find((a: any) => a.type === 'demo')
    const accountId = demo?.id || userData.accounts?.[0]?.id || ''
    bootstrapSeqRef.current += 1
    activeAccountIdRef.current = accountId
    setActiveAccountId(accountId)
    const boot = await api<any>(`/api/bootstrap?accountId=${encodeURIComponent(accountId)}`)
    applyBootstrap(boot, accountId)
    setLoading(false)
  }

  const login = async (email: string, password: string) => {
    try {
      const data = await api<{
        token?: string
        user?: any
        requires2fa?: boolean
        tempToken?: string
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.requires2fa && data.tempToken) {
        return { requires2fa: true, tempToken: data.tempToken }
      }
      if (!data.token || !data.user) return { error: 'Login failed' }
      await finishAuth(data.token, data.user)
      return null
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Login failed' }
    }
  }

  const verifyLogin2fa = async (tempToken: string, code: string) => {
    try {
      const data = await api<{ token: string; user: any }>('/api/auth/login/2fa', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code }),
      })
      await finishAuth(data.token, data.user)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid code'
    }
  }

  const setup2fa = async () => {
    try {
      return await api<{ secret: string; qrDataUrl: string }>('/api/auth/2fa/setup', { method: 'POST' })
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Setup failed' }
    }
  }

  const enable2fa = async (code: string) => {
    try {
      await api('/api/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) })
      setUser((u) => (u ? { ...u, totpEnabled: true } : u))
      showToast('Two-step verification enabled')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Failed to enable 2FA'
    }
  }

  const disable2fa = async (code: string, password: string) => {
    try {
      await api('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code, password }),
      })
      setUser((u) => (u ? { ...u, totpEnabled: false } : u))
      showToast('Two-step verification disabled')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Failed to disable 2FA'
    }
  }

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    try {
      const data = await api<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, referralCode }),
      })
      setToken(data.token)
      const demo = (data.user.accounts || []).find((a: any) => a.type === 'demo')
      const accountId = demo?.id || data.user.accounts?.[0]?.id || ''
      setActiveAccountId(accountId)
      const boot = await api<any>(`/api/bootstrap?accountId=${encodeURIComponent(accountId)}`)
      applyBootstrap(boot)
      showToast('Account created')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Register failed'
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setAccounts([])
    setTrades([])
  }

  const updateProfile = async (patch: Partial<User>) => {
    try {
      const data = await api<{ user: any }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: patch.name, nationality: patch.nationality }),
      })
      setUser(mapUser(data.user))
      showToast('Profile updated')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Update failed'
    }
  }

  const changePassword = async (current: string, next: string) => {
    try {
      await api('/api/password', { method: 'POST', body: JSON.stringify({ current, next }) })
      showToast('Password updated')
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Password change failed'
    }
  }

  const placeTrade = async (input: PlaceTradeInput) => {
    try {
      await api('/api/trades', {
        method: 'POST',
        body: JSON.stringify({
          accountId: activeAccountId,
          symbol: selectedSymbol,
          ...input,
        }),
      })
      await refreshAll()
      const q = quotes.find((x) => x.symbol === selectedSymbol)
      const price =
        input.pending && input.triggerPrice != null
          ? input.triggerPrice
          : input.side === 'buy'
            ? (q?.ask ?? q?.price)
            : (q?.bid ?? q?.price)
      const priceLabel = price != null ? formatPrice(price, selectedSymbol) : '—'
      showToast({
        kind: 'trade',
        side: input.side,
        symbol: selectedSymbol,
        volume: input.volume,
        priceLabel,
        pending: Boolean(input.pending),
      })
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Order failed'
    }
  }

  const closeTrade = async (id: string) => {
    const data = await api<{ pnl: number }>(`/api/trades/${id}/close`, { method: 'POST' })
    await refreshAll()
    showToast(`Closed · PnL ${data.pnl.toFixed(2)}`)
  }

  const cancelPending = async (id: string) => {
    await api(`/api/trades/${id}`, { method: 'DELETE' })
    await refreshAll()
    showToast('Pending order cancelled')
  }

  const updateTradeLevels = async (id: string, stopLoss?: number, takeProfit?: number) => {
    await api(`/api/trades/${id}/levels`, {
      method: 'PATCH',
      body: JSON.stringify({ stopLoss: stopLoss ?? null, takeProfit: takeProfit ?? null }),
    })
    await refreshAll()
    showToast('SL/TP updated')
  }

  const deposit = async (
    amount: number,
    payment: string,
    extras?: {
      method?: string
      bankReference?: string
      cryptoNetwork?: string
      cryptoTxHash?: string
    },
  ) => {
    try {
      const method = (extras?.method || payment || 'stripe').toLowerCase()
      const gatewayMethods = ['stripe', 'nowpayments', 'crypto', 'bank']
      if (gatewayMethods.includes(method)) {
        const data = await api<{
          pending?: boolean
          requiresApproval?: boolean
          checkoutUrl?: string
          testMode?: boolean
          message?: string
          fee?: number
          transactionId?: string
        }>('/api/payments/deposit', {
          method: 'POST',
          body: JSON.stringify({
            accountId: activeAccountId,
            amount,
            method,
            bankReference: extras?.bankReference,
            cryptoNetwork: extras?.cryptoNetwork,
            cryptoTxHash: extras?.cryptoTxHash,
            successUrl: `${window.location.origin}/account/transactions?deposit=success`,
            cancelUrl: `${window.location.origin}/account/deposit?deposit=cancelled`,
          }),
        })
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
          return null
        }
        await refreshAll()
        showToast(
          data.message ||
            (data.requiresApproval
              ? `Deposit ${formatMoney(amount)} submitted — awaiting admin approval`
              : `Deposit ${formatMoney(amount)} submitted`),
        )
        return null
      }

      const data = await api<{ pending?: boolean; premium?: boolean; fee?: number }>('/api/deposit', {
        method: 'POST',
        body: JSON.stringify({ accountId: activeAccountId, amount, payment }),
      })
      await refreshAll()
      if (data.pending) showToast(`Deposit ${formatMoney(amount)} submitted — awaiting admin approval`)
      else showToast(data.premium ? 'Premium unlocked!' : `Deposited ${formatMoney(amount)}`)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Deposit failed'
    }
  }

  const withdraw = async (amount: number, payment: string, fromAccountId: string) => {
    try {
      const data = await api<{ pending?: boolean; fee?: number }>('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify({ accountId: fromAccountId, amount, payment }),
      })
      await refreshAll()
        showToast(
          data.pending
          ? `Withdrawal ${formatMoney(amount)} submitted — awaiting admin approval`
          : `Withdrawal of ${formatMoney(amount)} submitted`,
        )
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Withdraw failed'
    }
  }

  const submitKyc = async (kind: 'identity' | 'residence', docType: string, fileName: string) => {
    await api('/api/kyc', { method: 'POST', body: JSON.stringify({ kind, docType, fileName }) })
    await refreshAll()
    showToast(`${kind === 'identity' ? 'Identity' : 'Residence'} document uploaded`)
  }

  const completeQuestionnaire = async () => {
    await api('/api/questionnaire', { method: 'POST' })
    await refreshAll()
    showToast('Questionnaire completed')
  }

  const value: AppState = {
    user,
    isAuthenticated: Boolean(user),
    accounts,
    activeAccountId,
    accountType,
    quotes,
    selectedSymbol,
    candles,
    timeframe,
    trades,
    transactions,
    notifications,
    referrals,
    metrics,
    darkMode,
    language,
    liveData,
    isPremium,
    chartIndicator,
    toast,
    loading,
    login,
    verifyLogin2fa,
    setup2fa,
    enable2fa,
    disable2fa,
    register,
    logout,
    updateProfile,
    changePassword,
    setSelectedSymbol,
    setTimeframe,
    setDarkMode: setDarkModeState,
    setLanguage: setLanguageState,
    setChartIndicator,
    switchAccount,
    placeTrade,
    closeTrade,
    cancelPending,
    updateTradeLevels,
    deposit,
    withdraw,
    submitKyc,
    completeQuestionnaire,
    markNotificationsRead: async () => {
      await api('/api/notifications/read', { method: 'POST' })
      await refreshAll()
    },
    clearToast: () => setToast(null),
    refreshQuotes,
    refreshAll,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// re-export unused TradeSide to avoid breaking imports
export type { TradeSide }
