import { useState } from 'react'
import clsx from 'clsx'
import { WATCHLIST_SYMBOLS } from '../api/twelveData'

/** 1x1 SVG flags (jsDelivr / lipis flag-icons) */
function flagUrl(code: string) {
  return `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/1x1/${code}.svg`
}

function brandFavicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

/** Real brand / crypto logos */
const BRAND_LOGOS: Record<string, string> = {
  BTCUSD: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/btc.svg',
  ETHUSD: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/eth.svg',
  TESLA: brandFavicon('tesla.com'),
  AAPL: brandFavicon('apple.com'),
  NVDA: brandFavicon('nvidia.com'),
  SPACEX: brandFavicon('spacex.com'),
  ARAMCO: brandFavicon('aramco.com'),
  ALRAJHI: brandFavicon('alrajhibank.com.sa'),
  SABIC: brandFavicon('sabic.com'),
}

const CURRENCY_FLAG: Record<string, string> = {
  EUR: 'eu',
  USD: 'us',
  GBP: 'gb',
  JPY: 'jp',
  AUD: 'au',
  CHF: 'ch',
  CAD: 'ca',
  NZD: 'nz',
  CNY: 'cn',
  HKD: 'hk',
  SGD: 'sg',
  SAR: 'sa',
  AED: 'ae',
  KWD: 'kw',
  QAR: 'qa',
  BHD: 'bh',
  OMR: 'om',
  JOD: 'jo',
}

const SYMBOL_FLAGS: Record<string, [string, string] | [string]> = {
  EURUSD: ['eu', 'us'],
  GBPUSD: ['gb', 'us'],
  USDJPY: ['us', 'jp'],
  AUDUSD: ['au', 'us'],
  USDCHF: ['us', 'ch'],
  USDCAD: ['us', 'ca'],
  US30: ['us'],
  DAX40: ['de'],
  NAS100: ['us'],
  UK100: ['gb'],
  TASI: ['sa'],
  OIL: ['us'],
}

const FALLBACK_TONE: Record<string, string> = {
  BTCUSD: 'bg-[#f7931a] text-white',
  ETHUSD: 'bg-[#627eea] text-white',
  GOLD: 'bg-[#fcd535] text-[#202630]',
  SILVER: 'bg-[#c0c0c0] text-[#202630]',
  OIL: 'bg-[#29313d] text-[#fcd535]',
}

function parseForexFlags(symbol: string): [string, string] | null {
  const known = SYMBOL_FLAGS[symbol]
  if (known && known.length === 2) return [known[0], known[1]]

  const clean = symbol.replace(/[^A-Za-z]/g, '').toUpperCase()
  if (clean.length === 6) {
    const a = CURRENCY_FLAG[clean.slice(0, 3)]
    const b = CURRENCY_FLAG[clean.slice(3, 6)]
    if (a && b) return [a, b]
  }
  return null
}

function symbolInitials(symbol: string) {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '')
  if (clean.length <= 2) return clean.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

function FallbackBadge({
  symbol,
  size,
  className,
}: {
  symbol: string
  size: number
  className?: string
}) {
  const label =
    symbol.startsWith('BTC') ? '₿' : symbol.startsWith('ETH') ? 'Ξ' : symbolInitials(symbol)
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide',
        FALLBACK_TONE[symbol] || 'bg-[#fcd535]/20 text-[#fcd535]',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {label}
    </span>
  )
}

function FlagCircle({
  code,
  size,
  className,
}: {
  code: string
  size: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        className={clsx('rounded-full bg-muted', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={clsx(
        'overflow-hidden rounded-full bg-muted shadow-[0_0_0_1.5px_#1a1f28]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={flagUrl(code)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  )
}

function BrandCircle({
  src,
  size,
  contain,
  onError,
}: {
  src: string
  size: number
  contain?: boolean
  onError: () => void
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        contain ? 'bg-white p-[18%]' : 'bg-transparent',
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt=""
        className={clsx('h-full w-full', contain ? 'object-contain' : 'object-cover')}
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={onError}
      />
    </span>
  )
}

type SymbolLogoProps = {
  symbol: string
  size?: number
  className?: string
}

/**
 * Real market logos: overlapping flags for forex, brand/crypto icons for other assets.
 */
export function SymbolLogo({ symbol, size = 44, className }: SymbolLogoProps) {
  const [brandFailed, setBrandFailed] = useState(false)
  const meta = WATCHLIST_SYMBOLS.find((s) => s.symbol === symbol)
  const forex = parseForexFlags(symbol)
  const brand = BRAND_LOGOS[symbol]
  const singleFlag = SYMBOL_FLAGS[symbol]?.length === 1 ? SYMBOL_FLAGS[symbol]![0] : null
  const isCrypto = meta?.category === 'crypto'

  // Forex: EU + US style overlapping flags
  if (forex) {
    const flagSize = Math.round(size * 0.74)
    return (
      <span
        className={clsx('relative inline-flex shrink-0', className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <FlagCircle code={forex[0]} size={flagSize} className="absolute left-0 top-0 z-[1]" />
        <FlagCircle code={forex[1]} size={flagSize} className="absolute bottom-0 right-0 z-[2]" />
      </span>
    )
  }

  // Real brand / crypto logo
  if (brand && !brandFailed) {
    return (
      <span
        className={clsx('inline-flex shrink-0 items-center justify-center', className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <BrandCircle
          src={brand}
          size={size}
          contain={!isCrypto}
          onError={() => setBrandFailed(true)}
        />
      </span>
    )
  }

  // Commodities without remote logo
  if (symbol === 'GOLD' || symbol === 'SILVER' || symbol === 'OIL') {
    return <FallbackBadge symbol={symbol} size={size} className={className} />
  }

  // Indices / oil: country flag
  if (singleFlag) {
    return (
      <span
        className={clsx('relative inline-flex shrink-0', className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <FlagCircle code={singleFlag} size={size} />
      </span>
    )
  }

  return <FallbackBadge symbol={symbol} size={size} className={className} />
}
