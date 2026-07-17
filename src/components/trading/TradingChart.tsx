import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import {
  Camera,
  CandlestickChart,
  ChevronDown,
  Maximize2,
  MoreVertical,
  MousePointer2,
  Settings2,
  Sparkles,
  TrendingUp,
  Type,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatPrice } from '../../data/mock'
import clsx from 'clsx'

const DESKTOP_TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W', '1Mo']

/** Mobile interval bar — trading-app style pills, mapped to supported TFs */
const MOBILE_TIMEFRAMES: Array<{ key: string; label: string }> = [
  { key: '5M', label: '5M' },
  { key: '15M', label: '15M' },
  { key: '1H', label: '1H' },
  { key: '1D', label: '1D' },
  { key: '1W', label: '1W' },
  { key: '1Mo', label: '1M' },
]

const TWO_DEC_SYMBOLS = new Set([
  'BTCUSD',
  'ETHUSD',
  'US30',
  'DAX40',
  'NAS100',
  'UK100',
  'TASI',
  'GOLD',
  'SILVER',
  'OIL',
  'TESLA',
  'AAPL',
  'NVDA',
  'SPACEX',
  'ARAMCO',
  'ALRAJHI',
  'SABIC',
])

function chartPriceFormat(symbol: string) {
  if (TWO_DEC_SYMBOLS.has(symbol)) {
    return { type: 'price' as const, precision: 2, minMove: 0.01 }
  }
  if (symbol.includes('JPY')) {
    return { type: 'price' as const, precision: 3, minMove: 0.001 }
  }
  return { type: 'price' as const, precision: 5, minMove: 0.00001 }
}

function sma(values: number[], period: number) {
  return values.map((_, i) => {
    if (i + 1 < period) return null
    const slice = values.slice(i + 1 - period, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

function symbolInitials(symbol: string) {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '')
  if (clean.length <= 2) return clean.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export function TradingChart() {
  const {
    candles,
    selectedSymbol,
    timeframe,
    setTimeframe,
    trades,
    chartIndicator,
    setChartIndicator,
    darkMode,
    activeAccountId,
    quotes,
  } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const maRef = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const toolRef = useRef<'pointer' | 'trend' | 'text'>('pointer')

  const quote = quotes.find((q) => q.symbol === selectedSymbol)
  const changeAbs = quote?.change ?? 0
  const changePct = quote?.percentChange ?? 0
  const positive = changePct >= 0

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#161a21' : '#ffffff' },
        textColor: darkMode ? '#9aa3b2' : '#6b7280',
        fontFamily: 'DM Sans',
      },
      grid: {
        vertLines: { color: darkMode ? '#2a303a' : '#f0f1f4' },
        horzLines: { color: darkMode ? '#2a303a' : '#f0f1f4' },
      },
      rightPriceScale: {
        borderColor: darkMode ? '#2a303a' : '#e6e8ec',
        entireTextOnly: true,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(5),
      },
      timeScale: { borderColor: darkMode ? '#2a303a' : '#e6e8ec', timeVisible: true },
      crosshair: { mode: 1 },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22a06b',
      downColor: '#e5484d',
      borderUpColor: '#22a06b',
      borderDownColor: '#e5484d',
      wickUpColor: '#22a06b',
      wickDownColor: '#e5484d',
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      lastValueVisible: true,
      priceLineVisible: true,
    })
    const ma = chart.addSeries(LineSeries, {
      color: '#2563eb',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    })
    chartRef.current = chart
    seriesRef.current = series
    maRef.current = ma

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      maRef.current = null
      priceLinesRef.current = []
    }
  }, [darkMode])

  useEffect(() => {
    const series = seriesRef.current
    const ma = maRef.current
    const chart = chartRef.current
    if (!series || !candles.length) return

    const fmt = chartPriceFormat(selectedSymbol)
    series.applyOptions({ priceFormat: fmt })
    ma?.applyOptions({ priceFormat: fmt })
    chart?.applyOptions({
      localization: {
        priceFormatter: (price: number) => price.toFixed(fmt.precision),
      },
    })

    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    priceLinesRef.current.forEach((line) => series.removePriceLine(line))
    priceLinesRef.current = []

    const open = trades.find(
      (t) => t.status === 'open' && t.symbol === selectedSymbol && t.accountId === activeAccountId,
    )
    if (open) {
      priceLinesRef.current.push(
        series.createPriceLine({
          price: open.openPrice,
          color: '#2563eb',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${open.side} ${formatPrice(open.openPrice, selectedSymbol)}`,
        }),
      )
      if (open.stopLoss != null) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: open.stopLoss,
            color: '#e5484d',
            lineWidth: 1,
            lineStyle: 2,
            title: 'SL',
          }),
        )
      }
      if (open.takeProfit != null) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: open.takeProfit,
            color: '#22a06b',
            lineWidth: 1,
            lineStyle: 2,
            title: 'TP',
          }),
        )
      }
    }

    if (ma) {
      if (chartIndicator === 'Moving Average' || chartIndicator === 'RSI') {
        const closes = candles.map((c) => c.close)
        const period = chartIndicator === 'RSI' ? 14 : 20
        const values = sma(closes, period)
        ma.setData(
          candles
            .map((c, i) =>
              values[i] == null
                ? null
                : { time: c.time as UTCTimestamp, value: values[i] as number },
            )
            .filter(Boolean) as { time: UTCTimestamp; value: number }[],
        )
        ma.applyOptions({
          color: chartIndicator === 'RSI' ? '#a855f7' : '#2563eb',
          visible: true,
        })
      } else if (chartIndicator === 'Bollinger Bands' || chartIndicator === 'MACD') {
        const closes = candles.map((c) => c.close)
        const mid = sma(closes, 20)
        ma.setData(
          candles
            .map((c, i) =>
              mid[i] == null ? null : { time: c.time as UTCTimestamp, value: mid[i] as number },
            )
            .filter(Boolean) as { time: UTCTimestamp; value: number }[],
        )
        ma.applyOptions({ color: '#f59e0b', visible: true })
      } else {
        ma.setData([])
        ma.applyOptions({ visible: false })
      }
    }

    chartRef.current?.timeScale().fitContent()
  }, [candles, trades, selectedSymbol, chartIndicator, activeAccountId])

  const screenshot = () => {
    if (!chartRef.current) return
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${selectedSymbol}-${timeframe}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const fullscreen = () => {
    const el = containerRef.current?.parentElement
    if (!el) return
    if (!document.fullscreenElement) void el.requestFullscreen()
    else void document.exitFullscreen()
  }

  return (
    <div className="panel flex min-w-0 flex-1 flex-col">
      {/* Mobile asset header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-3 py-3 md:hidden">
        <Link to="/markets" className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fcd535]/20 text-[11px] font-bold text-[#fcd535]">
              {symbolInitials(selectedSymbol)}
            </span>
            <span className="truncate text-lg font-bold text-text">{selectedSymbol}</span>
            <ChevronDown size={16} className="shrink-0 text-text-secondary" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px]">
            <span className={clsx('font-medium tabular-nums', positive ? 'positive' : 'negative')}>
              {positive ? '+' : ''}
              {changeAbs.toFixed(changeAbs !== 0 && Math.abs(changeAbs) < 1 ? 5 : 2)}
            </span>
            <span className={clsx('font-medium tabular-nums', positive ? 'positive' : 'negative')}>
              {positive ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
            <span className="text-text-secondary">· 1 Month</span>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/signals"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fcd535]/15 text-[#fcd535]"
            aria-label="Signals"
          >
            <Sparkles size={18} strokeWidth={1.75} />
          </Link>
          <button
            type="button"
            onClick={() => setChartIndicator(chartIndicator === 'None' ? 'Moving Average' : 'None')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-muted"
            aria-label="More chart options"
          >
            <MoreVertical size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Desktop toolbar */}
      <div className="hidden items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 md:flex">
        <div className="mr-1 shrink-0 text-sm font-bold sm:mr-2">{selectedSymbol}</div>
        <div className="flex shrink-0 gap-1">
          {DESKTOP_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                timeframe === tf ? 'bg-[#29313d] text-text' : 'text-text-secondary hover:bg-muted'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <select
          value={chartIndicator}
          onChange={(e) => setChartIndicator(e.target.value)}
          className="ml-1 h-8 shrink-0 rounded border border-border bg-panel px-2 text-xs outline-none sm:ml-2"
        >
          <option value="None">Indicators</option>
          <option>RSI</option>
          <option>Moving Average</option>
          <option>MACD</option>
          <option>Bollinger Bands</option>
        </select>
        <div className="ml-auto hidden items-center gap-1 text-text-secondary sm:flex">
          <button type="button" className="rounded p-1.5 hover:bg-muted" title="Settings">
            <Settings2 size={15} />
          </button>
          <button type="button" className="rounded p-1.5 hover:bg-muted" onClick={fullscreen} title="Fullscreen">
            <Maximize2 size={15} />
          </button>
          <button type="button" className="rounded p-1.5 hover:bg-muted" onClick={screenshot} title="Screenshot">
            <Camera size={15} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute left-2 top-2 z-10 hidden flex-col gap-1 rounded border border-border bg-panel p-1 shadow-sm md:flex">
          <Tool
            icon={MousePointer2}
            active={toolRef.current === 'pointer'}
            onClick={() => {
              toolRef.current = 'pointer'
            }}
          />
          <Tool
            icon={TrendingUp}
            active={toolRef.current === 'trend'}
            onClick={() => {
              toolRef.current = 'trend'
            }}
          />
          <Tool
            icon={Type}
            active={toolRef.current === 'text'}
            onClick={() => {
              toolRef.current = 'text'
            }}
          />
        </div>
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Mobile time interval bar */}
      <div className="flex shrink-0 items-center gap-0.5 border-t border-border px-1.5 py-1.5 md:hidden">
        <button
          type="button"
          onClick={() =>
            setChartIndicator(chartIndicator === 'None' ? 'Moving Average' : 'None')
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-muted hover:text-text"
          aria-label="Chart settings"
        >
          <CandlestickChart size={16} strokeWidth={1.75} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOBILE_TIMEFRAMES.map(({ key, label }) => {
            const active = timeframe === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTimeframe(key)}
                className={clsx(
                  'flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'rounded-[4px] border-2 border-[#29313d] bg-[#29313d] text-text'
                    : 'rounded-full border-2 border-transparent text-text-secondary hover:rounded-[4px] hover:bg-muted hover:text-text',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={fullscreen}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-muted hover:text-text"
          aria-label="Fullscreen"
        >
          <Maximize2 size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

function Tool({
  icon: Icon,
  active,
  onClick,
}: {
  icon: typeof MousePointer2
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded p-1.5 hover:bg-muted hover:text-brand-ink ${active ? 'bg-muted text-brand-ink' : 'text-text-secondary'}`}
    >
      <Icon size={14} />
    </button>
  )
}
