import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import { ARABIAN_SYMBOLS, NITAJFX_FAVORITES } from '../api/twelveData'
import { formatPrice } from '../data/mock'
import { SymbolLogo } from '../components/SymbolLogo'

const FAV_KEY = 'seekapa_favorites'

type CategoryKey =
  | 'favorites'
  | 'seekapa'
  | 'forex'
  | 'commodity'
  | 'index'
  | 'arabian'
  | 'stock'
  | 'crypto'

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: 'seekapa', label: 'Popular' },
  { key: 'forex', label: 'Forex' },
  { key: 'stock', label: 'Stocks' },
  { key: 'index', label: 'Indices' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'arabian', label: 'Arabian' },
]

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return [...NITAJFX_FAVORITES]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : [...NITAJFX_FAVORITES]
  } catch {
    return [...NITAJFX_FAVORITES]
  }
}

export function MarketsPage() {
  const navigate = useNavigate()
  const { quotes, setSelectedSymbol } = useApp()
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [category, setCategory] = useState<CategoryKey>('seekapa')
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (symbol: string, e: MouseEvent) => {
    e.stopPropagation()
    setFavorites((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]))
  }

  const filtered = useMemo(() => {
    let list = quotes
    if (category === 'favorites') list = quotes.filter((x) => favorites.includes(x.symbol))
    else if (category === 'seekapa') list = quotes.filter((x) => NITAJFX_FAVORITES.includes(x.symbol))
    else if (category === 'arabian') list = quotes.filter((x) => ARABIAN_SYMBOLS.includes(x.symbol))
    else list = quotes.filter((x) => x.category === category)

    const term = q.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (x) => x.symbol.toLowerCase().includes(term) || x.name.toLowerCase().includes(term),
    )
  }, [quotes, q, category, favorites])

  const openSymbol = (symbol: string) => {
    setSelectedSymbol(symbol)
    navigate('/member')
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">Markets</h1>
          <button
            type="button"
            aria-label={searchOpen ? 'Close search' : 'Search markets'}
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) setQ('')
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-muted hover:text-text"
          >
            {searchOpen ? <X size={20} strokeWidth={1.75} /> : <Search size={20} strokeWidth={1.75} />}
          </button>
        </div>

        {searchOpen ? (
          <div className="relative mt-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search symbols..."
              className="h-10 w-full rounded-md border border-border bg-muted pl-8 pr-3 text-sm outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B]"
            />
          </div>
        ) : null}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory('favorites')}
            className={clsx(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                category === 'favorites'
                  ? 'border-transparent bg-white text-[#202630]'
                  : 'border-border bg-transparent text-text-secondary hover:bg-muted hover:text-text',
              )}
              aria-label="Favorites"
            >
              <Star
                size={14}
                className={clsx(category === 'favorites' ? 'fill-current' : 'text-text-secondary')}
              />
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={clsx(
                  'h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  category === c.key
                    ? 'border-transparent bg-white text-[#202630]'
                    : 'border-border bg-transparent text-text-secondary hover:bg-muted hover:text-text',
                )}
              >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-secondary">
            {category === 'favorites' ? 'Star symbols to add favorites.' : 'No assets in this list.'}
          </p>
        ) : null}

        {filtered.map((item) => {
          const isFav = favorites.includes(item.symbol)
          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => openSymbol(item.symbol)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors hover:bg-muted active:bg-sidebar-active sm:px-6"
            >
              <SymbolLogo symbol={item.symbol} size={44} />

              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-text">{item.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-text-secondary">
                  <span className="font-medium tabular-nums">{item.symbol}</span>
                  <span>·</span>
                  <span>{item.closed ? 'Market Closed' : 'Market Open'}</span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[15px] font-semibold tabular-nums text-text">
                  {formatPrice(item.price, item.symbol)}
                </div>
                <div
                  className={clsx(
                    'mt-0.5 text-[12px] font-medium tabular-nums',
                    item.percentChange >= 0 ? 'positive' : 'negative',
                  )}
                >
                  {item.percentChange >= 0 ? '+' : ''}
                  {item.percentChange.toFixed(2)}%
                </div>
              </div>

              <div
                role="presentation"
                className="flex h-8 w-8 shrink-0 items-center justify-center"
                onClick={(e) => toggleFavorite(item.symbol, e)}
              >
                <Star
                  size={16}
                  className={clsx(isFav ? 'fill-accent text-accent' : 'text-text-secondary/70')}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
