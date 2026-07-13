import type { Trade } from '../../types'

/** Parse "DD/MM/YYYY HH:mm:ss" (en-GB style) or ISO-ish strings into a Date */
export function parseTradeDate(raw?: string): Date | null {
  if (!raw) return null
  const part = raw.trim().split(/\s+/)[0]
  const dmY = part.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmY) {
    const d = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const iso = new Date(raw)
  return Number.isNaN(iso.getTime()) ? null : iso
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function tradeDayKey(t: Trade) {
  const d = parseTradeDate(t.closeTime ?? t.openTime)
  return d ? dayKey(d) : null
}
