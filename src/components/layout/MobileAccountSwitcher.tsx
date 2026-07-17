import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronDown, Copy, Settings2 } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../../context/AppContext'
import { formatMoney } from '../../data/mock'
import type { TradingAccount } from '../../types'

function AccountRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={clsx('text-xs font-semibold tabular-nums text-text', className)}>{value}</span>
    </div>
  )
}

export function MobileAccountSwitcher() {
  const { metrics, activeAccountId, accounts, switchAccount } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [picker, setPicker] = useState(false)
  const [copied, setCopied] = useState(false)

  const account = accounts.find((a) => a.id === activeAccountId)
  const isLive = account?.type === 'live'
  const pnl = metrics.totalPnl
  const accountLabel = account?.number || account?.id || '—'

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) setPicker(false)
  }, [open])

  const copyId = async () => {
    if (!accountLabel) return
    try {
      await navigator.clipboard.writeText(String(accountLabel))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const pickAccount = (a: TradingAccount) => {
    if (a.id !== activeAccountId) switchAccount(a.id)
    setOpen(false)
    setPicker(false)
  }

  return (
    <>
      <div className="min-w-0 flex-1 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-auto max-w-full items-center gap-1.5 overflow-hidden rounded-full bg-[#29313d] py-2 pl-[10px] pr-2"
          aria-label="Open account details"
        >
          <span
            className={clsx(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
              isLive ? 'bg-buy/20 text-buy' : 'bg-[#f79009]/20 text-[#f79009]',
            )}
          >
            {isLive ? 'L' : 'D'}
          </span>
          <span className="min-w-0 truncate text-left text-[15px] font-semibold leading-none tabular-nums text-text">
            {formatMoney(metrics.equity)}
          </span>
          <ChevronDown size={12} className="shrink-0 text-text-secondary" aria-hidden />
        </button>
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] sm:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Close account sheet"
                onClick={() => setOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,100%)] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-panel shadow-2xl pb-[calc(5px+env(safe-area-inset-bottom,0px))]">
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />

                {picker ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-[5px]">
                    <h3 className="text-[15px] font-semibold text-text">Switch account</h3>
                    <p className="mt-1 text-[12px] text-text-secondary">Choose Demo or Live account</p>
                    <div className="mt-4 space-y-3 pb-[5px]">
                      {accounts.map((a) => {
                        const live = a.type === 'live'
                        const active = a.id === activeAccountId
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => pickAccount(a)}
                            className={clsx(
                              'flex w-full items-center gap-4 rounded-2xl border px-4 py-[18px] text-left transition-colors',
                              active
                                ? live
                                  ? 'border-buy/70 bg-buy/10 shadow-[0_0_0_1px_rgba(34,160,107,0.12)]'
                                  : 'border-[#f79009]/70 bg-[#f79009]/10 shadow-[0_0_0_1px_rgba(247,144,9,0.12)]'
                                : 'border-border/80 bg-[#1e242d] hover:border-border hover:bg-[#232a34]',
                            )}
                          >
                            <span
                              className={clsx(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold tracking-wide',
                                live ? 'bg-buy/20 text-buy' : 'bg-[#f79009]/20 text-[#f79009]',
                              )}
                            >
                              {live ? 'L' : 'D'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[16px] font-semibold leading-snug tracking-tight text-text">
                                {live ? 'Live account' : 'Demo account'}
                              </span>
                              <span className="mt-1 block truncate text-[13px] leading-snug text-text-secondary">
                                {live ? 'Real trade' : 'Practice trade'}
                              </span>
                            </span>
                            {active ? (
                              <span
                                className={clsx(
                                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                                  live ? 'bg-buy/15 text-buy' : 'bg-[#f79009]/15 text-[#f79009]',
                                )}
                              >
                                Active
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          isLive ? 'border-buy bg-buy/10 text-buy' : 'border-border text-text-secondary',
                        )}
                      >
                        Live
                      </span>
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          !isLive
                            ? 'border-[#f79009] bg-[#f79009]/10 text-[#f79009]'
                            : 'border-border text-text-secondary',
                        )}
                      >
                        Demo
                      </span>
                    </div>

                    <h2 className="mt-2 text-xl font-bold text-text">{isLive ? 'Live' : 'Demo'}</h2>

                    <button
                      type="button"
                      onClick={() => void copyId()}
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary"
                    >
                      <span className="tabular-nums">#{accountLabel}</span>
                      <Copy size={12} />
                      {copied ? <span className="text-[11px] text-buy">Copied</span> : null}
                    </button>

                    <div className="mt-1.5 divide-y divide-border/60">
                      <AccountRow label="Equity" value={formatMoney(metrics.equity)} />
                      <AccountRow
                        label="Unrealized P/L"
                        value={formatMoney(metrics.totalPnl)}
                        className={pnl >= 0 ? 'positive' : 'negative'}
                      />
                      <AccountRow label="Balance" value={formatMoney(metrics.balance)} />
                      <AccountRow label="Margin" value={formatMoney(metrics.usedFunds)} />
                      <AccountRow label="Free Margin" value={formatMoney(metrics.freeMargin)} />
                      <AccountRow
                        label="Margin Level"
                        value={metrics.usedFunds > 0 ? `${metrics.marginLevel.toFixed(2)}%` : '—'}
                      />
                      <AccountRow label="Credit" value={formatMoney(account?.credit ?? 0)} />
                      <AccountRow label="Leverage" value={account?.leverage || '—'} />
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          navigate('/account/manage')
                        }}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#fcd535] text-[13px] font-semibold text-[#202630] transition-colors hover:bg-[#ceaf30]"
                      >
                        <Settings2 size={16} strokeWidth={1.75} />
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => setPicker(true)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel text-[13px] font-semibold text-text transition-colors hover:bg-muted"
                      >
                        <ArrowLeftRight size={16} strokeWidth={1.75} />
                        Switch Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
