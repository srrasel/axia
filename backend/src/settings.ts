import { prisma } from './prisma.js'

export type SettingMeta = {
  key: string
  label: string
  description: string
  type: 'text' | 'number' | 'percent' | 'boolean' | 'select' | 'secret'
  group: string
  options?: string[]
  defaultValue: string
}

/** Placeholder shown in admin when a secret is already saved */
export const SECRET_MASK = '••••••••'

export function isSecretSetting(key: string) {
  return SETTING_DEFS.some((d) => d.key === key && d.type === 'secret')
}

/** Mask secrets for admin API responses (never send raw keys to the browser). */
export function maskSecretSettings(values: Record<string, string>) {
  const out = { ...values }
  for (const def of SETTING_DEFS) {
    if (def.type !== 'secret') continue
    const v = (out[def.key] || '').trim()
    out[def.key] = v ? SECRET_MASK : ''
  }
  return out
}

/**
 * When saving: keep existing secret if the admin left the mask (or blank and we
 * treat blank as "unchanged" only when mask was shown — blank clears intentionally).
 * Convention: SECRET_MASK = keep; empty = clear; anything else = replace.
 */
export function resolveSecretWrites(
  incoming: Record<string, string>,
  existing: Record<string, string>,
): Record<string, string> {
  const out = { ...incoming }
  for (const def of SETTING_DEFS) {
    if (def.type !== 'secret') continue
    if (!(def.key in out)) continue
    const next = out[def.key]
    if (next === SECRET_MASK) {
      out[def.key] = existing[def.key] ?? ''
    }
  }
  return out
}

export const SETTING_DEFS: SettingMeta[] = [
  {
    key: 'platform_name',
    label: 'Platform name',
    description: 'Brand name shown across the platform',
    type: 'text',
    group: 'General',
    defaultValue: 'NitajFX',
  },
  {
    key: 'currency',
    label: 'Account currency',
    description: 'Platform currency. Changing it converts balances with live ECB FX rates (USD/EUR/GBP)',
    type: 'select',
    group: 'General',
    options: ['USD', 'EUR', 'GBP'],
    defaultValue: 'USD',
  },
  {
    key: 'support_email',
    label: 'Support email',
    description: 'Contact email for clients',
    type: 'text',
    group: 'General',
    defaultValue: 'support@nitajfx.online',
  },
  {
    key: 'finance_email',
    label: 'Finance department email',
    description: 'Email shown for bank transfer and international deposit assistance',
    type: 'text',
    group: 'General',
    defaultValue: 'finance@nitajfx.online',
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance mode',
    description: 'Block new trades when enabled (true/false)',
    type: 'boolean',
    group: 'General',
    defaultValue: 'false',
  },
  {
    key: 'premium_threshold',
    label: 'Premium deposit threshold',
    description: 'Total deposits required to unlock Premium / Signals',
    type: 'number',
    group: 'Premium',
    defaultValue: '5000',
  },
  {
    key: 'premium_enabled',
    label: 'Premium feature enabled',
    description: 'Turn premium gating on or off',
    type: 'boolean',
    group: 'Premium',
    defaultValue: 'true',
  },
  {
    key: 'trading_fee_per_lot',
    label: 'Trading fee per lot',
    description: 'Commission charged when a trade is closed (per lot)',
    type: 'number',
    group: 'Fees',
    defaultValue: '7',
  },
  {
    key: 'deposit_fee_percent',
    label: 'Deposit fee %',
    description: 'Percent fee deducted from approved deposits',
    type: 'percent',
    group: 'Fees',
    defaultValue: '0',
  },
  {
    key: 'withdraw_fee_percent',
    label: 'Withdraw fee %',
    description: 'Percent fee charged on approved withdrawals',
    type: 'percent',
    group: 'Fees',
    defaultValue: '1.5',
  },
  {
    key: 'spread_markup_percent',
    label: 'Spread markup %',
    description: 'Extra spread applied to quotes (display / future booking)',
    type: 'percent',
    group: 'Fees',
    defaultValue: '0.01',
  },
  {
    key: 'min_deposit',
    label: 'Minimum deposit',
    description: 'Smallest deposit amount allowed',
    type: 'number',
    group: 'Limits',
    defaultValue: '50',
  },
  {
    key: 'min_withdraw',
    label: 'Minimum withdraw',
    description: 'Smallest withdrawal amount allowed',
    type: 'number',
    group: 'Limits',
    defaultValue: '20',
  },
  {
    key: 'max_leverage',
    label: 'Max leverage',
    description: 'Highest leverage shown for new accounts',
    type: 'select',
    group: 'Limits',
    options: ['1:100', '1:200', '1:400', '1:500', '1:1000'],
    defaultValue: '1:400',
  },
  {
    key: 'default_demo_balance',
    label: 'Default demo balance',
    description: 'Starting balance for new demo accounts',
    type: 'number',
    group: 'Limits',
    defaultValue: '24767.36',
  },
  {
    key: 'referral_commission_percent',
    label: 'Referral commission %',
    description: 'Percent of referred user deposit paid to referrer',
    type: 'percent',
    group: 'Referrals',
    defaultValue: '10',
  },
  {
    key: 'referral_enabled',
    label: 'Referral program enabled',
    description: 'Pay referral bonuses on approved deposits',
    type: 'boolean',
    group: 'Referrals',
    defaultValue: 'true',
  },
  {
    key: 'auto_approve_deposits',
    label: 'Auto-approve deposits',
    description: 'If true, deposits complete instantly (skip admin)',
    type: 'boolean',
    group: 'Automation',
    defaultValue: 'false',
  },
  {
    key: 'auto_approve_withdrawals',
    label: 'Auto-approve withdrawals',
    description: 'If true, withdrawals complete instantly (skip admin)',
    type: 'boolean',
    group: 'Automation',
    defaultValue: 'false',
  },
  {
    key: 'bank_name',
    label: 'Bank name',
    description: 'Bank shown to clients for wire deposits',
    type: 'text',
    group: 'Payments',
    defaultValue: 'NitajFX Partner Bank',
  },
  {
    key: 'bank_account_name',
    label: 'Bank account name',
    description: 'Beneficiary name for deposits',
    type: 'text',
    group: 'Payments',
    defaultValue: 'NitajFX Trading Ltd',
  },
  {
    key: 'bank_iban',
    label: 'Bank IBAN',
    description: 'IBAN / account number for wire deposits',
    type: 'text',
    group: 'Payments',
    defaultValue: 'AE070331234567890123456',
  },
  {
    key: 'bank_swift',
    label: 'Bank SWIFT/BIC',
    description: 'SWIFT code for international transfers',
    type: 'text',
    group: 'Payments',
    defaultValue: 'EBILAEAD',
  },
  {
    key: 'bank_reference_hint',
    label: 'Bank reference hint',
    description: 'Instruction shown under bank details',
    type: 'text',
    group: 'Payments',
    defaultValue: 'Use your registered email as payment reference',
  },
  {
    key: 'crypto_usdt_trc20',
    label: 'USDT (TRC20) wallet',
    description: 'Manual crypto deposit address',
    type: 'text',
    group: 'Payments',
    defaultValue: 'TDemoWalletXXXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'crypto_usdt_erc20',
    label: 'USDT (ERC20) wallet',
    description: 'Manual crypto deposit address',
    type: 'text',
    group: 'Payments',
    defaultValue: '0xDemoWalletXXXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'crypto_btc',
    label: 'BTC wallet',
    description: 'Manual BTC deposit address',
    type: 'text',
    group: 'Payments',
    defaultValue: 'bc1qdemowalletxxxxxxxxxxxxxxxxxx',
  },
  {
    key: 'crypto_eth',
    label: 'ETH wallet',
    description: 'Manual ETH deposit address',
    type: 'text',
    group: 'Payments',
    defaultValue: '0xDemoEthWalletXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'nowpayments_api_key',
    label: 'NOWPayments API key',
    description: 'Paste your NOWPayments API key — enables live crypto checkout on Deposit',
    type: 'secret',
    group: 'Payments',
    defaultValue: '',
  },
  {
    key: 'nowpayments_ipn_secret',
    label: 'NOWPayments IPN secret',
    description: 'IPN secret from NOWPayments dashboard (Settings → Payments) — verifies payment callbacks',
    type: 'secret',
    group: 'Payments',
    defaultValue: '',
  },
  {
    key: 'nowpayments_sandbox',
    label: 'NOWPayments sandbox mode',
    description: 'Use api-sandbox.nowpayments.io (sandbox API key required)',
    type: 'boolean',
    group: 'Payments',
    defaultValue: 'false',
  },
  {
    key: 'stripe_secret_key',
    label: 'Stripe secret key',
    description: 'Stripe secret key (sk_live_… or sk_test_…) — enables card checkout',
    type: 'secret',
    group: 'Payments',
    defaultValue: '',
  },
]

const DEFAULTS: Record<string, string> = Object.fromEntries(
  SETTING_DEFS.map((d) => [d.key, d.defaultValue]),
)

let cache: Record<string, string> = { ...DEFAULTS }
let loadedAt = 0

export async function loadSettings(force = false) {
  if (!force && Date.now() - loadedAt < 15_000) return cache
  const rows = await prisma.setting.findMany()
  cache = { ...DEFAULTS }
  for (const row of rows) cache[row.key] = row.value
  loadedAt = Date.now()
  return cache
}

export async function getSettingNumber(key: string, fallback: number) {
  const settings = await loadSettings()
  const n = Number(settings[key])
  return Number.isFinite(n) ? n : fallback
}

export async function getSettingBool(key: string, fallback = false) {
  const settings = await loadSettings()
  const v = (settings[key] ?? String(fallback)).toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export async function getPremiumThreshold() {
  return getSettingNumber('premium_threshold', 5000)
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

export async function getCurrencyCode() {
  const settings = await loadSettings()
  const code = (settings.currency || 'USD').toUpperCase()
  return CURRENCY_SYMBOLS[code] ? code : 'USD'
}

export function currencySymbol(code?: string) {
  const c = (code || 'USD').toUpperCase()
  return CURRENCY_SYMBOLS[c] || `${c} `
}

export async function moneySymbol() {
  return currencySymbol(await getCurrencyCode())
}

export function formatMoneyAmount(amount: number, codeOrSymbol?: string) {
  const sym =
    codeOrSymbol && CURRENCY_SYMBOLS[codeOrSymbol.toUpperCase()]
      ? CURRENCY_SYMBOLS[codeOrSymbol.toUpperCase()]
      : codeOrSymbol && codeOrSymbol.length <= 2
        ? codeOrSymbol
        : currencySymbol(codeOrSymbol)
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `-${sym}${abs}` : `${sym}${abs}`
}

/** Keep account.currency in sync with platform setting */
export async function syncAccountCurrencies(code: string) {
  const c = code.toUpperCase()
  if (!CURRENCY_SYMBOLS[c]) return
  await prisma.account.updateMany({ data: { currency: c } })
}

export async function ensureDefaultSettings() {
  for (const def of SETTING_DEFS) {
    await prisma.setting.upsert({
      where: { key: def.key },
      update: {},
      create: { key: def.key, value: def.defaultValue },
    })
  }
  await loadSettings(true)
}

export { DEFAULTS as SETTING_DEFAULTS, CURRENCY_SYMBOLS }
