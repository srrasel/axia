import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import {
  calcMargin,
  contractSize,
  formatMoney,
  formatPrice,
  getPlatformCurrency,
} from '../../data/mock'
import type { Quote } from '../../types'

type VolumeMode = 'amount' | 'lot'
type LevelUnit = 'pips' | 'price' | 'money'

function pipSize(symbol: string, category: Quote['category'], price: number) {
  if (category === 'forex') return symbol.includes('JPY') ? 0.01 : 0.0001
  if (category === 'crypto') return price >= 1000 ? 1 : price >= 1 ? 0.01 : 0.0001
  if (category === 'commodity' || category === 'index' || category === 'stock') {
    return price >= 50 ? 0.01 : 0.0001
  }
  return 0.0001
}

function priceDecimals(symbol: string, category: Quote['category'], price: number) {
  if (category === 'forex') return symbol.includes('JPY') ? 3 : 5
  if (price >= 50) return 2
  return 5
}

function roundTo(n: number, decimals: number) {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

function estimatePnl(
  side: 'buy' | 'sell',
  volume: number,
  entry: number,
  exit: number,
  category: Quote['category'],
  symbol: string,
) {
  const direction = side === 'buy' ? 1 : -1
  const size = volume * contractSize(category, symbol)
  return Number(((exit - entry) * direction * size).toFixed(2))
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
        checked ? 'bg-brand' : 'bg-border',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'left-4' : 'left-0.5',
        )}
      />
    </button>
  )
}

function Stepper({
  display,
  onBump,
  onCommit,
  stepLabel,
}: {
  display: string
  onBump: (dir: -1 | 1) => void
  onCommit: (raw: string) => void
  stepLabel?: string
}) {
  return (
    <div className="flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border border-border">
      <button
        type="button"
        aria-label={stepLabel ? `Decrease ${stepLabel}` : 'Decrease'}
        className="flex w-8 shrink-0 items-center justify-center border-r border-border text-text-secondary hover:bg-muted"
        onClick={() => onBump(-1)}
      >
        <Minus size={14} strokeWidth={2.25} />
      </button>
      <input
        value={display}
        onChange={(e) => onCommit(e.target.value)}
        inputMode="decimal"
        className="h-full min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-medium tabular-nums outline-none"
      />
      <button
        type="button"
        aria-label={stepLabel ? `Increase ${stepLabel}` : 'Increase'}
        className="flex w-8 shrink-0 items-center justify-center border-l border-border text-text-secondary hover:bg-muted"
        onClick={() => onBump(1)}
      >
        <Plus size={14} strokeWidth={2.25} />
      </button>
    </div>
  )
}

export function OrderPanel({
  className,
  onPlaced,
  initialSide,
}: {
  className?: string
  onPlaced?: () => void
  initialSide?: 'buy' | 'sell'
}) {
  const { quotes, selectedSymbol, placeTrade, metrics, accounts, activeAccountId } = useApp()
  const quote = quotes.find((q) => q.symbol === selectedSymbol)
  const account = accounts.find((a) => a.id === activeAccountId)!
  const { symbol: currencySym } = getPlatformCurrency()

  const [side, setSide] = useState<'buy' | 'sell'>(initialSide ?? 'buy')
  const [volumeMode, setVolumeMode] = useState<VolumeMode>('lot')
  const [lots, setLots] = useState(1)
  const [amountInput, setAmountInput] = useState('')

  const [slOn, setSlOn] = useState(false)
  const [tpOn, setTpOn] = useState(false)
  const [pendingOn, setPendingOn] = useState(false)

  const [slUnit, setSlUnit] = useState<LevelUnit>('pips')
  const [tpUnit, setTpUnit] = useState<LevelUnit>('pips')
  const [slPips, setSlPips] = useState(20)
  const [tpPips, setTpPips] = useState(20)
  const [slPrice, setSlPrice] = useState(0)
  const [tpPrice, setTpPrice] = useState(0)
  const [trigger, setTrigger] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (initialSide) setSide(initialSide)
  }, [initialSide])

  useEffect(() => {
    setError(null)
    setSlOn(false)
    setTpOn(false)
    setPendingOn(false)
    setSlPips(20)
    setTpPips(20)
    setLots(1)
    setAmountInput('')
  }, [selectedSymbol])

  const entry = useMemo(() => {
    if (!quote) return 0
    return side === 'buy' ? quote.ask : quote.bid
  }, [quote, side])

  const pip = useMemo(() => {
    if (!quote) return 0.0001
    return pipSize(selectedSymbol, quote.category, quote.price)
  }, [quote, selectedSymbol])

  const decimals = useMemo(() => {
    if (!quote) return 5
    return priceDecimals(selectedSymbol, quote.category, quote.price)
  }, [quote, selectedSymbol])

  // Sync SL/TP rates from pips when in pips mode
  useEffect(() => {
    if (!quote || !entry) return
    if (slUnit === 'pips') {
      const sl = side === 'buy' ? entry - slPips * pip : entry + slPips * pip
      setSlPrice(roundTo(sl, decimals))
    }
    if (tpUnit === 'pips') {
      const tp = side === 'buy' ? entry + tpPips * pip : entry - tpPips * pip
      setTpPrice(roundTo(tp, decimals))
    }
  }, [quote, entry, side, slPips, tpPips, pip, decimals, slUnit, tpUnit])

  useEffect(() => {
    if (!quote || !entry || pendingOn) return
    setTrigger(roundTo(entry, decimals))
  }, [quote, entry, decimals, pendingOn, side])

  const notionalPerLot = useMemo(() => {
    if (!quote) return 0
    const size = contractSize(quote.category, selectedSymbol)
    const fxAdj =
      quote.category === 'forex' && selectedSymbol.startsWith('USD')
        ? 1 / Math.max(entry, 0.0001)
        : 1
    return size * entry * fxAdj
  }, [quote, selectedSymbol, entry])

  const volume = useMemo(() => {
    if (volumeMode === 'lot') return Math.max(0.01, lots)
    const amt = Number(amountInput) || 0
    if (amt <= 0 || notionalPerLot <= 0) return 0.01
    return Math.max(0.01, roundTo(amt / notionalPerLot, 2))
  }, [volumeMode, lots, amountInput, notionalPerLot])

  const displayAmount = useMemo(() => {
    if (volumeMode === 'amount' && amountInput !== '') return amountInput
    return roundTo(volume * notionalPerLot, 2).toFixed(2)
  }, [volumeMode, amountInput, volume, notionalPerLot])

  const requiredMargin = useMemo(() => {
    if (!quote) return 0
    return calcMargin(
      {
        volume,
        openPrice: entry,
        category: quote.category,
        symbol: selectedSymbol,
      },
      account.leverage,
    )
  }, [quote, volume, entry, selectedSymbol, account.leverage])

  const spreadPips = useMemo(() => {
    if (!quote) return 0
    const diff = Math.abs(quote.ask - quote.bid)
    return Number((diff / pip).toFixed(1))
  }, [quote, pip])

  const sentiment = useMemo(() => {
    if (!quote) return { bull: 56, bear: 44 }
    const bull = Math.min(79, Math.max(21, 50 + quote.percentChange * 10))
    return { bull: Math.round(bull), bear: Math.round(100 - bull) }
  }, [quote])

  const slMoney = useMemo(() => {
    if (!quote || !slOn) return 0
    return estimatePnl(side, volume, entry, slPrice, quote.category, selectedSymbol)
  }, [quote, slOn, side, volume, entry, slPrice, selectedSymbol])

  const tpMoney = useMemo(() => {
    if (!quote || !tpOn) return 0
    return estimatePnl(side, volume, entry, tpPrice, quote.category, selectedSymbol)
  }, [quote, tpOn, side, volume, entry, tpPrice, selectedSymbol])

  const resolveLevel = (unit: LevelUnit, pips: number, price: number, money: number, kind: 'sl' | 'tp') => {
    if (!quote) return price
    if (unit === 'price') return price
    if (unit === 'pips') {
      return kind === 'sl'
        ? side === 'buy'
          ? entry - pips * pip
          : entry + pips * pip
        : side === 'buy'
          ? entry + pips * pip
          : entry - pips * pip
    }
    // money → approximate price from PnL
    const size = volume * contractSize(quote.category, selectedSymbol)
    if (size <= 0) return price
    const direction = side === 'buy' ? 1 : -1
    // for SL money is typically negative; use absolute risk
    const target = kind === 'sl' ? -Math.abs(money) : Math.abs(money)
    return entry + (target / size) * direction
  }

  if (!quote) return null

  const onInvest = async () => {
    setBusy(true)
    setError(null)
    if (quote.closed && !pendingOn) {
      setError('Market is closed — use a pending order or wait for open')
      setBusy(false)
      return
    }
    if (volume < 0.01) {
      setError('Volume too small')
      setBusy(false)
      return
    }
    if (slOn && slPrice <= 0) {
      setError('Invalid stop loss')
      setBusy(false)
      return
    }
    if (tpOn && tpPrice <= 0) {
      setError('Invalid take profit')
      setBusy(false)
      return
    }
    if (pendingOn && trigger <= 0) {
      setError('Enter a trigger price')
      setBusy(false)
      return
    }

    const finalSl = slOn
      ? roundTo(resolveLevel(slUnit, slPips, slPrice, Math.abs(slMoney) || slPips * 10, 'sl'), decimals)
      : undefined
    const finalTp = tpOn
      ? roundTo(resolveLevel(tpUnit, tpPips, tpPrice, Math.abs(tpMoney) || tpPips * 10, 'tp'), decimals)
      : undefined

    const err = await placeTrade({
      side,
      volume,
      stopLoss: finalSl,
      takeProfit: finalTp,
      pending: pendingOn,
      triggerPrice: pendingOn ? trigger : undefined,
    })
    setError(err)
    setBusy(false)
    if (!err) onPlaced?.()
  }

  const canInvest =
    !busy &&
    volume >= 0.01 &&
    (!pendingOn || trigger > 0) &&
    (pendingOn || requiredMargin <= metrics.freeMargin)

  const setVolumeFromAmount = (raw: string) => {
    setAmountInput(raw.replace(/[^\d.]/g, ''))
    const amt = Number(raw.replace(/[^\d.]/g, ''))
    if (amt > 0 && notionalPerLot > 0) {
      setLots(Math.max(0.01, roundTo(amt / notionalPerLot, 2)))
    }
  }

  const bumpLots = (dir: -1 | 1) => {
    const next = Math.max(0.01, roundTo(lots + dir * 0.01, 2))
    setLots(next)
    setAmountInput('')
  }

  const bumpAmount = (dir: -1 | 1) => {
    const cur = Number(displayAmount) || 0
    const step = Math.max(notionalPerLot * 0.01, 1)
    const next = Math.max(step, roundTo(cur + dir * step, 2))
    setAmountInput(next.toFixed(2))
    setLots(Math.max(0.01, roundTo(next / notionalPerLot, 2)))
  }

  const bumpLevel = (kind: 'sl' | 'tp', dir: -1 | 1) => {
    const unit = kind === 'sl' ? slUnit : tpUnit
    if (unit === 'pips') {
      if (kind === 'sl') setSlPips((v) => Math.max(1, v + dir))
      else setTpPips((v) => Math.max(1, v + dir))
      return
    }
    if (unit === 'price') {
      const step = pip
      if (kind === 'sl') setSlPrice((v) => roundTo(Math.max(step, v + dir * step), decimals))
      else setTpPrice((v) => roundTo(Math.max(step, v + dir * step), decimals))
      return
    }
    // money
    const step = 10
    const cur = kind === 'sl' ? Math.abs(slMoney) : Math.abs(tpMoney)
    const nextMoney = Math.max(step, cur + dir * step)
    const size = volume * contractSize(quote.category, selectedSymbol)
    const direction = side === 'buy' ? 1 : -1
    const target = kind === 'sl' ? -nextMoney : nextMoney
    const nextPrice = roundTo(entry + (target / size) * direction, decimals)
    if (kind === 'sl') {
      setSlPrice(nextPrice)
      setSlPips(Math.max(1, Math.round(Math.abs(nextPrice - entry) / pip)))
    } else {
      setTpPrice(nextPrice)
      setTpPips(Math.max(1, Math.round(Math.abs(nextPrice - entry) / pip)))
    }
  }

  const levelDisplay = (kind: 'sl' | 'tp') => {
    const unit = kind === 'sl' ? slUnit : tpUnit
    if (unit === 'pips') return String(kind === 'sl' ? slPips : tpPips)
    if (unit === 'price') return String(kind === 'sl' ? slPrice : tpPrice)
    return Math.abs(kind === 'sl' ? slMoney : tpMoney).toFixed(2)
  }

  const commitLevel = (kind: 'sl' | 'tp', raw: string) => {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    const unit = kind === 'sl' ? slUnit : tpUnit
    if (unit === 'pips') {
      if (kind === 'sl') setSlPips(Math.max(1, Math.round(n)))
      else setTpPips(Math.max(1, Math.round(n)))
      return
    }
    if (unit === 'price') {
      if (kind === 'sl') {
        setSlPrice(n)
        setSlPips(Math.max(1, Math.round(Math.abs(n - entry) / pip)))
      } else {
        setTpPrice(n)
        setTpPips(Math.max(1, Math.round(Math.abs(n - entry) / pip)))
      }
      return
    }
    const size = volume * contractSize(quote.category, selectedSymbol)
    const direction = side === 'buy' ? 1 : -1
    const target = kind === 'sl' ? -Math.abs(n) : Math.abs(n)
    const nextPrice = roundTo(entry + (target / size) * direction, decimals)
    if (kind === 'sl') {
      setSlPrice(nextPrice)
      setSlPips(Math.max(1, Math.round(Math.abs(nextPrice - entry) / pip)))
    } else {
      setTpPrice(nextPrice)
      setTpPips(Math.max(1, Math.round(Math.abs(nextPrice - entry) / pip)))
    }
  }

  return (
    <div
      className={clsx(
        'panel flex h-full min-h-0 flex-col overflow-hidden',
        className ?? 'w-[17.5rem] border-l xl:w-72',
      )}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight">{selectedSymbol}</div>
          <div className="truncate text-[11px] text-text-secondary">{quote.name}</div>
        </div>
        <div className="shrink-0 text-right text-[10px] text-text-secondary">
          Spread <span className="font-semibold tabular-nums text-text">{spreadPips}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-3 py-2.5 [-webkit-overflow-scrolling:touch]">
        {/* Sell / Buy */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={clsx(
              'cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-colors',
              side === 'sell' ? 'border-sell bg-sell/10' : 'border-border hover:bg-muted',
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-sell">Sell</div>
            <div className="text-sm font-bold tabular-nums leading-tight text-sell">
              {formatPrice(quote.bid, selectedSymbol)}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={clsx(
              'cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-colors',
              side === 'buy' ? 'border-buy bg-buy/10' : 'border-border hover:bg-muted',
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-buy">Buy</div>
            <div className="text-sm font-bold tabular-nums leading-tight text-buy">
              {formatPrice(quote.ask, selectedSymbol)}
            </div>
          </button>
        </div>

        {/* Volume — Amount / Lot */}
        <div>
          <div className="mb-1 text-[11px] text-text-secondary">Volume</div>
          <div className="flex gap-1.5">
            <div className="relative w-[5.75rem] shrink-0">
              <select
                value={volumeMode}
                onChange={(e) => {
                  const mode = e.target.value as VolumeMode
                  setVolumeMode(mode)
                  setAmountInput('')
                }}
                className="h-9 w-full appearance-none rounded-md border border-border bg-panel py-1 pl-2 pr-7 text-sm outline-none"
              >
                <option value="amount">Amount</option>
                <option value="lot">Lot</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
              />
            </div>
            {volumeMode === 'lot' ? (
              <Stepper
                display={String(lots)}
                stepLabel="lot"
                onBump={bumpLots}
                onCommit={(raw) => {
                  const n = Number(raw)
                  if (Number.isFinite(n) && n > 0) {
                    setLots(Math.max(0.01, roundTo(n, 2)))
                    setAmountInput('')
                  }
                }}
              />
            ) : (
              <div className="flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border border-border">
                <button
                  type="button"
                  aria-label="Decrease amount"
                  className="flex w-8 shrink-0 items-center justify-center border-r border-border text-text-secondary hover:bg-muted"
                  onClick={() => bumpAmount(-1)}
                >
                  <Minus size={14} strokeWidth={2.25} />
                </button>
                <div className="flex min-w-0 flex-1 items-center px-1">
                  <span className="shrink-0 text-xs text-text-secondary">{currencySym}</span>
                  <input
                    value={displayAmount}
                    onChange={(e) => setVolumeFromAmount(e.target.value)}
                    inputMode="decimal"
                    className="h-full min-w-0 flex-1 bg-transparent px-0.5 text-center text-sm font-medium tabular-nums outline-none"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Increase amount"
                  className="flex w-8 shrink-0 items-center justify-center border-l border-border text-text-secondary hover:bg-muted"
                  onClick={() => bumpAmount(1)}
                >
                  <Plus size={14} strokeWidth={2.25} />
                </button>
              </div>
            )}
          </div>
          <div className="mt-1 text-[10px] text-text-secondary">
            {volumeMode === 'amount' ? (
              <>
                ≈ <span className="font-medium text-text">{volume.toFixed(2)}</span> lot · Margin{' '}
                {formatMoney(requiredMargin)}
              </>
            ) : (
              <>
                ≈ {currencySym}
                {roundTo(volume * notionalPerLot, 2).toLocaleString()} · Margin {formatMoney(requiredMargin)}
              </>
            )}
          </div>
        </div>

        {/* Stop loss */}
        <LevelBlock
          title="Stop loss"
          money={slOn ? slMoney : null}
          enabled={slOn}
          onToggle={setSlOn}
          unit={slUnit}
          onUnit={setSlUnit}
          display={levelDisplay('sl')}
          onBump={(d) => bumpLevel('sl', d)}
          onCommit={(raw) => commitLevel('sl', raw)}
          rate={slOn ? slPrice : null}
          decimals={decimals}
          tone="loss"
        />

        {/* Take profit */}
        <LevelBlock
          title="Take profit"
          money={tpOn ? tpMoney : null}
          enabled={tpOn}
          onToggle={setTpOn}
          unit={tpUnit}
          onUnit={setTpUnit}
          display={levelDisplay('tp')}
          onBump={(d) => bumpLevel('tp', d)}
          onCommit={(raw) => commitLevel('tp', raw)}
          rate={tpOn ? tpPrice : null}
          decimals={decimals}
          tone="profit"
        />

        {/* Pending */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-secondary">Open order when price is:</span>
            <ToggleSwitch checked={pendingOn} onChange={setPendingOn} label="Pending order" />
          </div>
          {pendingOn ? (
            <Stepper
              display={trigger.toFixed(decimals)}
              stepLabel="trigger"
              onBump={(dir) => setTrigger((v) => roundTo(Math.max(pip, v + dir * pip), decimals))}
              onCommit={(raw) => {
                const n = Number(raw)
                if (Number.isFinite(n) && n > 0) setTrigger(roundTo(n, decimals))
              }}
            />
          ) : null}
        </div>

        <div className="pt-1">
          <div className="mb-1 flex justify-between text-[10px] text-text-secondary">
            <span>Sentiment</span>
            <span>
              Bear {sentiment.bear}% · Bull {sentiment.bull}%
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full">
            <div className="bg-sell" style={{ width: `${sentiment.bear}%` }} />
            <div className="bg-buy" style={{ width: `${sentiment.bull}%` }} />
          </div>
        </div>

        {error ? <p className="rounded-md bg-sell/10 px-2 py-1 text-[11px] text-sell">{error}</p> : null}
        {!pendingOn && requiredMargin > metrics.freeMargin ? (
          <p className="rounded-md bg-sell/10 px-2 py-1 text-[11px] text-sell">Not enough free margin</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-panel p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!canInvest}
          onClick={() => void onInvest()}
          className={clsx(
            'h-10 w-full cursor-pointer rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50',
            side === 'buy' ? 'bg-buy hover:brightness-95' : 'bg-sell hover:brightness-95',
          )}
        >
          {busy ? 'Placing…' : side === 'buy' ? 'Invest Buy' : 'Invest Sell'}
        </button>
      </div>
    </div>
  )
}

function LevelBlock({
  title,
  money,
  enabled,
  onToggle,
  unit,
  onUnit,
  display,
  onBump,
  onCommit,
  rate,
  decimals,
  tone,
}: {
  title: string
  money: number | null
  enabled: boolean
  onToggle: (v: boolean) => void
  unit: LevelUnit
  onUnit: (u: LevelUnit) => void
  display: string
  onBump: (dir: -1 | 1) => void
  onCommit: (raw: string) => void
  rate: number | null
  decimals: number
  tone: 'loss' | 'profit'
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0 text-[11px]">
          <span className="text-text-secondary">{title}:</span>{' '}
          {money != null ? (
            <span
              className={clsx(
                'font-semibold tabular-nums',
                tone === 'loss' || money < 0 ? 'text-sell' : 'text-buy',
              )}
            >
              {formatMoney(money)}
            </span>
          ) : null}
        </div>
        <ToggleSwitch checked={enabled} onChange={onToggle} label={title} />
      </div>
      {enabled ? (
        <>
          <div className="flex gap-1.5">
            <div className="relative w-[5.75rem] shrink-0">
              <select
                value={unit}
                onChange={(e) => onUnit(e.target.value as LevelUnit)}
                className="h-9 w-full appearance-none rounded-md border border-border bg-panel py-1 pl-2 pr-7 text-sm outline-none"
              >
                <option value="pips">Pips</option>
                <option value="price">Price</option>
                <option value="money">Money</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
              />
            </div>
            <Stepper display={display} onBump={onBump} onCommit={onCommit} />
          </div>
          {rate != null ? (
            <div className="mt-1 text-[10px] text-text-secondary">
              Rate: <span className="tabular-nums text-text">{rate.toFixed(decimals)}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
