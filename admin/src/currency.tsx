import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

const STORAGE_KEY = 'seekapa_admin_currency'

type CurrencyState = {
  code: string
  symbol: string
  refresh: () => Promise<void>
}

function readStoredCurrency() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.toUpperCase()
    if (raw && SYMBOLS[raw]) return raw
  } catch {
    /* ignore */
  }
  return 'EUR'
}

let activeCode = readStoredCurrency()
let activeSymbol = SYMBOLS[activeCode] || '€'
const listeners = new Set<() => void>()

function notifyCurrencyListeners() {
  for (const fn of listeners) fn()
}

export function setActiveCurrency(code: string) {
  const next = (code || 'EUR').toUpperCase()
  activeCode = SYMBOLS[next] ? next : 'EUR'
  activeSymbol = SYMBOLS[activeCode] || `${activeCode} `
  try {
    localStorage.setItem(STORAGE_KEY, activeCode)
  } catch {
    /* ignore */
  }
  notifyCurrencyListeners()
}

export function getActiveCurrency() {
  return { code: activeCode, symbol: activeSymbol }
}

/** Formats with the live platform currency from Settings (EUR / USD / GBP). */
export function money(n: number, overrideCodeOrSymbol?: string) {
  let sym = activeSymbol
  if (overrideCodeOrSymbol) {
    const up = overrideCodeOrSymbol.toUpperCase()
    sym = SYMBOLS[up] || (overrideCodeOrSymbol.length <= 2 ? overrideCodeOrSymbol : `${overrideCodeOrSymbol} `)
  }
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-${sym}${abs}` : `${sym}${abs}`
}

const CurrencyContext = createContext<CurrencyState>({
  code: activeCode,
  symbol: activeSymbol,
  refresh: async () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(activeCode)
  const [symbol, setSymbol] = useState(activeSymbol)

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ values?: { currency?: string } }>('/api/admin/settings')
      const next = (r.values?.currency || 'EUR').toUpperCase()
      setActiveCurrency(next)
    } catch {
      /* ignore before login */
    }
  }, [])

  useEffect(() => {
    const sync = () => {
      setCode(activeCode)
      setSymbol(activeSymbol)
    }
    listeners.add(sync)
    sync()
    void refresh()
    return () => {
      listeners.delete(sync)
    }
  }, [refresh])

  return (
    <CurrencyContext.Provider value={{ code, symbol, refresh }}>{children}</CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
