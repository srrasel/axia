import { ChevronDown, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { ARABIAN_SYMBOLS, NITAJFX_FAVORITES } from '../../api/twelveData'
import { formatPrice } from '../../data/mock'
import clsx from 'clsx'

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
  { key: 'favorites', label: 'Favorites' },
  { key: 'seekapa', label: 'NitajFX Favorites' },
  { key: 'forex', label: 'Forex' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'index', label: 'Indices' },
  { key: 'arabian', label: 'Arabian Markets' },
  { key: 'stock', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
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

export function Watchlist({
  className,
  onSelect,
}: {
  className?: string
  onSelect?: () => void
}) {
  const { quotes, selectedSymbol, setSelectedSymbol } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<CategoryKey>('seekapa')
  const [openMenu, setOpenMenu] = useState(false)
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

  const activeLabel = CATEGORIES.find((c) => c.key === category)?.label || 'NitajFX Favorites'

  return (
    <div className={clsx('panel flex h-full min-h-0 flex-col overflow-hidden', className ?? 'w-56 border-r lg:w-64')}>
      <div className="shrink-0 border-b border-border p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-md border border-border bg-muted pl-8 pr-3 text-sm outline-none transition-colors hover:border-[#F0B90B] focus:border-[#F0B90B] sm:h-9"
          />
        </div>

        <div className="relative mt-3">
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-panel px-3 text-[16px] font-semibold transition-colors hover:border-[#F0B90B] hover:bg-[#29313d]"
            onClick={() => setOpenMenu((v) => !v)}
          >
            <span>{activeLabel}</span>
            <ChevronDown size={14} className={clsx('text-text-secondary transition', openMenu && 'rotate-180')} />
          </button>
          {openMenu ? (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-panel shadow-lg">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={clsx(
                    'flex w-full px-3 py-2 text-left text-[16px] transition-colors hover:bg-[#29313d]',
                    category === c.key && 'bg-[#29313d] font-semibold',
                  )}
                  onClick={() => {
                    setCategory(c.key)
                    setOpenMenu(false)
                  }}
                >
                  {c.label}
                  {c.key === 'favorites' ? (
                    <span className="ml-auto text-[10px] text-text-secondary">{favorites.length}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-text-secondary">
            {category === 'favorites' ? 'Star symbols to add favorites.' : 'No assets in this list.'}
          </p>
        ) : null}
        {filtered.map((item) => {
          const isFav = favorites.includes(item.symbol)
          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => {
                setSelectedSymbol(item.symbol)
                onSelect?.()
              }}
              className={clsx(
                'flex w-full items-center gap-2 border-b border-border/60 px-3 py-3 text-left hover:bg-muted sm:py-2.5',
                selectedSymbol === item.symbol && 'bg-sidebar-active',
              )}
            >
              <div
                role="presentation"
                className="flex h-7 w-7 shrink-0 items-center justify-center"
                onClick={(e) => toggleFavorite(item.symbol, e)}
              >
                <Star
                  size={14}
                  className={clsx(isFav ? 'fill-accent text-accent' : 'text-text-secondary')}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{item.symbol}</span>
                  {item.closed ? (
                    <span className="rounded bg-muted px-1 text-[9px] uppercase text-text-secondary">closed</span>
                  ) : null}
                </div>
                <div className="truncate text-[11px] text-text-secondary">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">{formatPrice(item.price, item.symbol)}</div>
                <div
                  className={clsx(
                    'text-[11px] tabular-nums',
                    item.percentChange >= 0 ? 'positive' : 'negative',
                  )}
                >
                  {item.percentChange >= 0 ? '+' : ''}
                  {item.percentChange.toFixed(2)}%
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
