import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma.js'
import { recordEarning } from './earnings.js'
import {
  currencySymbol,
  getCurrencyCode,
  getSettingBool,
  getSettingNumber,
  loadSettings,
} from './settings.js'

export const PAYMENT_METHODS = ['stripe', 'nowpayments', 'crypto', 'bank'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function paymentLabel(method: string) {
  switch (method) {
    case 'stripe':
      return 'Stripe (Card)'
    case 'nowpayments':
      return 'NOWPayments'
    case 'crypto':
      return 'Crypto'
    case 'bank':
      return 'Bank Transfer'
    default:
      return method
  }
}

/** Methods that always wait for admin before crediting */
export function requiresAdminApproval(method: PaymentMethod) {
  return method === 'bank' || method === 'crypto'
}

export async function getBankDetails() {
  const s = await loadSettings()
  return {
    bankName: s.bank_name || 'NitajFX Partner Bank',
    accountName: s.bank_account_name || 'NitajFX Trading Ltd',
    iban: s.bank_iban || 'AE070331234567890123456',
    swift: s.bank_swift || 'EBILAEAD',
    referenceHint: s.bank_reference_hint || 'Use your email as payment reference',
  }
}

export async function getCryptoWallets() {
  const s = await loadSettings()
  return {
    usdtTrc20: s.crypto_usdt_trc20 || 'TDemoWalletXXXXXXXXXXXXXXXXXXXX',
    usdtErc20: s.crypto_usdt_erc20 || '0xDemoWalletXXXXXXXXXXXXXXXXXXXX',
    btc: s.crypto_btc || 'bc1qdemowalletxxxxxxxxxxxxxxxxxx',
    eth: s.crypto_eth || '0xDemoEthWalletXXXXXXXXXXXXXXXXXX',
  }
}

/** Prefer admin Settings value; fall back to env. */
async function resolveSecret(settingKey: string, envKey: string) {
  const s = await loadSettings()
  const fromDb = (s[settingKey] || '').trim()
  if (fromDb) return fromDb
  return (process.env[envKey] || '').trim()
}

export async function getStripeSecretKey() {
  return resolveSecret('stripe_secret_key', 'STRIPE_SECRET_KEY')
}

export async function getNowPaymentsApiKey() {
  return resolveSecret('nowpayments_api_key', 'NOWPAYMENTS_API_KEY')
}

export async function getNowPaymentsIpnSecret() {
  return resolveSecret('nowpayments_ipn_secret', 'NOWPAYMENTS_IPN_SECRET')
}

export async function stripeConfigured() {
  return Boolean(await getStripeSecretKey())
}

export async function nowPaymentsConfigured() {
  return Boolean(await getNowPaymentsApiKey())
}

export async function nowPaymentsBaseUrl() {
  const sandbox = await getSettingBool('nowpayments_sandbox', false)
  return sandbox ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1'
}

/**
 * Credit a pending deposit (shared by admin approve + payment webhooks).
 */
export async function completePendingDeposit(txId: string, noteExtra = '') {
  const existing = await prisma.transaction.findUnique({
    where: { id: txId },
    include: { user: true },
  })
  if (!existing) throw new Error('Transaction not found')
  if (existing.type !== 'deposit') throw new Error('Not a deposit')
  if (existing.status !== 'pending') throw new Error('Already processed')

  const credit = Number((existing.amount - existing.fee).toFixed(2))
  const referralPct = await getSettingNumber('referral_commission_percent', 10)
  const sym = currencySymbol(await getCurrencyCode())

  await prisma.$transaction(async (db) => {
    await db.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: credit }, equity: { increment: credit } },
    })
    await db.user.update({
      where: { id: existing.userId },
      data: { funded: true, totalDeposited: { increment: existing.amount } },
    })
    await db.transaction.update({
      where: { id: existing.id },
      data: {
        status: 'completed',
        note: `Deposit completed${noteExtra ? ` · ${noteExtra}` : ''}`.trim(),
      },
    })
    if (existing.fee > 0) {
      await recordEarning(db, {
        type: 'deposit_fee',
        amount: existing.fee,
        description: `Deposit fee on ${existing.amount}`,
        userId: existing.userId,
      })
    }
    if (existing.user.referredById && existing.amount > 0) {
      const commission = Number(((existing.amount * referralPct) / 100).toFixed(2))
      if (commission > 0) {
        const referrerLive = await db.account.findFirst({
          where: { userId: existing.user.referredById, type: 'live' },
        })
        if (referrerLive) {
          await db.account.update({
            where: { id: referrerLive.id },
            data: { balance: { increment: commission }, equity: { increment: commission } },
          })
          await db.transaction.create({
            data: {
              userId: existing.user.referredById,
              accountId: referrerLive.id,
              type: 'commission',
              status: 'completed',
              amount: commission,
              payment: 'Referral',
              note: `Referral bonus from ${existing.user.email}`,
            },
          })
          await recordEarning(db, {
            type: 'referral_commission',
            amount: commission,
            description: `Referral payout to referrer for ${existing.user.email}`,
            userId: existing.user.referredById,
          })
          await db.notification.create({
            data: {
              userId: existing.user.referredById,
              title: 'Referral bonus',
              body: `You earned ${sym}${commission.toFixed(2)} from a referred deposit.`,
            },
          })
        }
      }
    }
    await db.notification.create({
      data: {
        userId: existing.userId,
        title: 'Deposit completed',
        body: `${sym}${credit.toFixed(2)} credited to your account${existing.fee ? ` (fee ${sym}${existing.fee.toFixed(2)})` : ''}.`,
      },
    })
  })

  return { credit }
}

export async function createStripeCheckout(opts: {
  amount: number
  currency: string
  txId: string
  email: string
  successUrl: string
  cancelUrl: string
}) {
  const key = await getStripeSecretKey()
  if (!key) throw new Error('Stripe secret key not configured')
  const unitAmount = Math.round(opts.amount * 100)
  const body = new URLSearchParams()
  body.set('mode', 'payment')
  body.set('success_url', opts.successUrl)
  body.set('cancel_url', opts.cancelUrl)
  body.set('customer_email', opts.email)
  body.set('client_reference_id', opts.txId)
  body.set('metadata[txId]', opts.txId)
  body.set('line_items[0][quantity]', '1')
  body.set('line_items[0][price_data][currency]', opts.currency.toLowerCase())
  body.set('line_items[0][price_data][unit_amount]', String(unitAmount))
  body.set('line_items[0][price_data][product_data][name]', 'NitajFX Account Deposit')

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } }
  if (!res.ok || !data.url || !data.id) {
    throw new Error(data.error?.message || 'Stripe checkout failed')
  }
  return { sessionId: data.id, url: data.url }
}

export async function createNowPayment(opts: {
  amount: number
  currency: string
  txId: string
  orderDescription: string
  ipnCallbackUrl: string
  successUrl: string
  cancelUrl: string
}) {
  const key = await getNowPaymentsApiKey()
  if (!key) throw new Error('NOWPayments API key not configured')
  const base = await nowPaymentsBaseUrl()
  const res = await fetch(`${base}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: opts.amount,
      price_currency: opts.currency.toLowerCase(),
      order_id: opts.txId,
      order_description: opts.orderDescription,
      ipn_callback_url: opts.ipnCallbackUrl,
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    }),
  })
  const data = (await res.json()) as {
    id?: string | number
    invoice_url?: string
    message?: string
    code?: string
  }
  if (!res.ok || !data.invoice_url) {
    throw new Error(data.message || data.code || 'NOWPayments invoice failed')
  }
  return { paymentId: String(data.id ?? opts.txId), url: data.invoice_url }
}

/** Verify API key with a cheap authenticated NOWPayments call */
export async function testNowPaymentsConnection() {
  const key = await getNowPaymentsApiKey()
  if (!key) return { ok: false as const, error: 'API key not set' }
  const base = await nowPaymentsBaseUrl()
  const sandbox = await getSettingBool('nowpayments_sandbox', false)
  try {
    const statusRes = await fetch(`${base}/status`)
    const status = (await statusRes.json()) as { message?: string }
    const minRes = await fetch(`${base}/min-amount?currency_from=btc&currency_to=usd`, {
      headers: { 'x-api-key': key },
    })
    const minData = (await minRes.json()) as { min_amount?: number; message?: string; code?: string }
    if (!minRes.ok) {
      return {
        ok: false as const,
        sandbox,
        apiStatus: status.message || 'unknown',
        error: minData.message || minData.code || `HTTP ${minRes.status}`,
      }
    }
    return {
      ok: true as const,
      sandbox,
      apiStatus: status.message || 'OK',
      sampleMinBtcUsd: minData.min_amount,
    }
  } catch (e) {
    return { ok: false as const, sandbox, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}

/** Recursively sort object keys (NOWPayments IPN signature requirement). */
function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key])
  }
  return sorted
}

export async function verifyNowPaymentsIpn(signature: string | undefined, body: unknown) {
  const secret = await getNowPaymentsIpnSecret()
  // If no IPN secret configured, accept (dev) but warn — production should set it
  if (!secret) {
    console.warn('[NOWPayments] IPN secret not set — skipping signature check')
    return true
  }
  if (!signature) return false
  const payload = JSON.stringify(sortObject(body))
  const expected = createHmac('sha512', secret).update(payload).digest('hex')
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(String(signature), 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
