import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { authRequired } from '../auth.js'
import {
  completePendingDeposit,
  createNowPayment,
  createStripeCheckout,
  getBankDetails,
  getCryptoWallets,
  getStripeSecretKey,
  nowPaymentsConfigured,
  paymentLabel,
  PAYMENT_METHODS,
  requiresAdminApproval,
  stripeConfigured,
  verifyNowPaymentsIpn,
  type PaymentMethod,
} from '../payments.js'
import { currencySymbol, getCurrencyCode, getSettingNumber } from '../settings.js'

export const paymentsRouter = Router()

paymentsRouter.get('/methods', authRequired, async (_req, res) => {
  const bank = await getBankDetails()
  const crypto = await getCryptoWallets()
  const stripeOk = await stripeConfigured()
  const nowOk = await nowPaymentsConfigured()
  return res.json({
    methods: [
      {
        id: 'stripe',
        label: 'Stripe (Card)',
        description: 'Pay instantly with Visa / Mastercard',
        requiresApproval: false,
        configured: stripeOk,
        testMode: !stripeOk,
      },
      {
        id: 'nowpayments',
        label: 'NOWPayments',
        description: 'Pay with 100+ cryptocurrencies',
        requiresApproval: false,
        configured: nowOk,
        testMode: !nowOk,
      },
      {
        id: 'crypto',
        label: 'Crypto (Manual)',
        description: 'Send USDT / BTC / ETH — admin confirms after blockchain check',
        requiresApproval: true,
        configured: true,
        wallets: crypto,
      },
      {
        id: 'bank',
        label: 'Bank Transfer',
        description: 'Wire transfer — requires admin approval after funds arrive',
        requiresApproval: true,
        configured: true,
        bank,
      },
    ],
  })
})

paymentsRouter.post('/deposit', authRequired, async (req, res) => {
  const schema = z.object({
    accountId: z.string(),
    amount: z.number().positive(),
    method: z.enum(PAYMENT_METHODS),
    // optional extras
    bankReference: z.string().optional(),
    cryptoNetwork: z.enum(['usdt_trc20', 'usdt_erc20', 'btc', 'eth']).optional(),
    cryptoTxHash: z.string().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: req.user!.id },
  })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  if (account.type === 'demo') return res.status(400).json({ error: 'Deposit is unavailable for demo account' })

  const minDeposit = await getSettingNumber('min_deposit', 50)
  const currency = await getCurrencyCode()
  const sym = currencySymbol(currency)
  if (parsed.data.amount < minDeposit) {
    return res.status(400).json({ error: `Minimum deposit is ${sym}${minDeposit}` })
  }

  const method = parsed.data.method as PaymentMethod
  const feePct = await getSettingNumber('deposit_fee_percent', 0)
  const fee = Number(((parsed.data.amount * feePct) / 100).toFixed(2))
  const webOrigin = (process.env.WEB_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')
  const apiOrigin = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(
    /\/$/,
    '',
  )

  const meta: Record<string, unknown> = { method }
  if (method === 'bank') {
    meta.bankReference = parsed.data.bankReference || ''
    meta.bank = await getBankDetails()
  }
  if (method === 'crypto') {
    meta.cryptoNetwork = parsed.data.cryptoNetwork || 'usdt_trc20'
    meta.cryptoTxHash = parsed.data.cryptoTxHash || ''
    meta.wallets = await getCryptoWallets()
  }

  const needsApproval = requiresAdminApproval(method)
  const tx = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      accountId: account.id,
      type: 'deposit',
      status: 'pending',
      amount: parsed.data.amount,
      fee,
      payment: paymentLabel(method),
      note: needsApproval
        ? `${paymentLabel(method)} — awaiting admin approval`
        : `${paymentLabel(method)} — awaiting payment confirmation`,
      gatewayRef: null,
      meta: JSON.stringify(meta),
    },
  })

  // Stripe
  if (method === 'stripe') {
    const successUrl =
      parsed.data.successUrl ||
      `${webOrigin}/account/transactions?deposit=success&tx=${tx.id}`
    const cancelUrl =
      parsed.data.cancelUrl || `${webOrigin}/account/deposit?deposit=cancelled&tx=${tx.id}`

    if (await stripeConfigured()) {
      try {
        const session = await createStripeCheckout({
          amount: parsed.data.amount,
          currency,
          txId: tx.id,
          email: req.user!.email,
          successUrl: `${apiOrigin}/api/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}&tx=${tx.id}`,
          cancelUrl,
        })
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { gatewayRef: session.sessionId },
        })
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            title: 'Stripe checkout started',
            body: `Complete card payment of ${sym}${parsed.data.amount.toFixed(2)} to fund your account.`,
          },
        })
        return res.json({
          ok: true,
          pending: true,
          requiresApproval: false,
          transactionId: tx.id,
          checkoutUrl: session.url,
          fee,
        })
      } catch (e) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'rejected', note: `Stripe error: ${e instanceof Error ? e.message : 'failed'}` },
        })
        return res.status(502).json({ error: e instanceof Error ? e.message : 'Stripe failed' })
      }
    }

    // Test mode — frontend can open demo checkout
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: 'Stripe test mode',
        body: `Stripe keys not configured. Use test checkout or wait for admin.`,
      },
    })
    return res.json({
      ok: true,
      pending: true,
      requiresApproval: false,
      testMode: true,
      transactionId: tx.id,
      checkoutUrl: `${apiOrigin}/api/payments/demo/pay/${tx.id}`,
      fee,
      message: 'Stripe test mode — complete the test payment page to credit funds.',
    })
  }

  // NOWPayments
  if (method === 'nowpayments') {
    const successUrl =
      parsed.data.successUrl || `${webOrigin}/account/transactions?deposit=success&tx=${tx.id}`
    const cancelUrl =
      parsed.data.cancelUrl || `${webOrigin}/account/deposit?deposit=cancelled&tx=${tx.id}`

    if (await nowPaymentsConfigured()) {
      try {
        const invoice = await createNowPayment({
          amount: parsed.data.amount,
          currency,
          txId: tx.id,
          orderDescription: `NitajFX deposit ${tx.id}`,
          ipnCallbackUrl: `${apiOrigin}/api/payments/nowpayments/ipn`,
          successUrl,
          cancelUrl,
        })
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { gatewayRef: invoice.paymentId },
        })
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            title: 'NOWPayments invoice created',
            body: `Pay ${sym}${parsed.data.amount.toFixed(2)} via crypto invoice.`,
          },
        })
        return res.json({
          ok: true,
          pending: true,
          requiresApproval: false,
          transactionId: tx.id,
          checkoutUrl: invoice.url,
          fee,
        })
      } catch (e) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'rejected',
            note: `NOWPayments error: ${e instanceof Error ? e.message : 'failed'}`,
          },
        })
        return res.status(502).json({ error: e instanceof Error ? e.message : 'NOWPayments failed' })
      }
    }

    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: 'NOWPayments test mode',
        body: `API key not configured. Use test checkout or wait for admin.`,
      },
    })
    return res.json({
      ok: true,
      pending: true,
      requiresApproval: false,
      testMode: true,
      transactionId: tx.id,
      checkoutUrl: `${apiOrigin}/api/payments/demo/pay/${tx.id}`,
      fee,
      message: 'NOWPayments test mode — complete the test payment page to credit funds.',
    })
  }

  // Bank / Crypto manual — always admin approval
  const bank = method === 'bank' ? await getBankDetails() : undefined
  const wallets = method === 'crypto' ? await getCryptoWallets() : undefined

  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: `${paymentLabel(method)} pending approval`,
      body:
        method === 'bank'
          ? `Transfer ${sym}${parsed.data.amount.toFixed(2)} using the bank details shown. Admin will approve after funds arrive.`
          : `Send crypto and submit TX hash if available. Admin will approve after confirmation.`,
    },
  })

  return res.json({
    ok: true,
    pending: true,
    requiresApproval: true,
    transactionId: tx.id,
    fee,
    bank,
    wallets,
    message:
      method === 'bank'
        ? 'Bank transfer submitted — awaiting admin approval after payment is received.'
        : 'Crypto deposit submitted — awaiting admin approval after blockchain confirmation.',
  })
})

/** Demo / test checkout page when Stripe or NOWPayments keys are missing */
paymentsRouter.get('/demo/pay/:txId', async (req, res) => {
  const tx = await prisma.transaction.findUnique({ where: { id: req.params.txId } })
  if (!tx || tx.type !== 'deposit' || tx.status !== 'pending') {
    return res.status(404).send('Payment not found or already processed')
  }
  const sym = currencySymbol(await getCurrencyCode())
  const webOrigin = (process.env.WEB_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>NitajFX Test Payment</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f1218;color:#e8eaed;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#161a21;border:1px solid #2a303a;border-radius:16px;padding:28px;max-width:420px;width:90%}
h1{font-size:1.25rem;margin:0 0 8px}p{color:#9aa3b2;font-size:.9rem;line-height:1.45}
.amt{font-size:1.75rem;font-weight:700;margin:16px 0}
button{width:100%;height:44px;border:0;border-radius:10px;background:#22a06b;color:#fff;font-weight:600;cursor:pointer;margin-top:8px}
a{color:#6b9eff;font-size:.85rem}
</style></head><body><div class="card">
<h1>Test payment checkout</h1>
<p>Gateway keys are not configured. Completing this page simulates a successful <b>${tx.payment}</b> payment.</p>
<div class="amt">${sym}${tx.amount.toFixed(2)}</div>
<form method="POST" action="/api/payments/demo/complete/${tx.id}">
<button type="submit">Pay &amp; credit account</button>
</form>
<p style="margin-top:14px"><a href="${webOrigin}/account/deposit">Cancel</a></p>
</div></body></html>`)
})

paymentsRouter.post('/demo/complete/:txId', async (req, res) => {
  const tx = await prisma.transaction.findUnique({ where: { id: req.params.txId } })
  if (!tx || tx.type !== 'deposit' || tx.status !== 'pending') {
    return res.status(404).send('Payment not found or already processed')
  }
  // Only allow demo complete for non-approval gateways (or when explicitly in test)
  const meta = safeJson(tx.meta)
  const method = String(meta.method || '')
  if (method === 'bank' || method === 'crypto') {
    return res.status(400).send('Bank and manual crypto deposits require admin approval')
  }
  try {
    await completePendingDeposit(tx.id, 'Test payment completed')
  } catch (e) {
    return res.status(400).send(e instanceof Error ? e.message : 'Failed')
  }
  const webOrigin = (process.env.WEB_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')
  return res.redirect(`${webOrigin}/account/transactions?deposit=success&tx=${tx.id}`)
})

/** Stripe return — verify session then credit */
paymentsRouter.get('/stripe/return', async (req, res) => {
  const sessionId = String(req.query.session_id || '')
  const txId = String(req.query.tx || '')
  const webOrigin = (process.env.WEB_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')
  const key = await getStripeSecretKey()
  if (!sessionId || !txId || !key) {
    return res.redirect(`${webOrigin}/account/deposit?deposit=error`)
  }
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const session = (await r.json()) as {
      payment_status?: string
      client_reference_id?: string
      metadata?: { txId?: string }
    }
    const ref = session.client_reference_id || session.metadata?.txId
    if (session.payment_status === 'paid' && ref === txId) {
      const existing = await prisma.transaction.findUnique({ where: { id: txId } })
      if (existing?.status === 'pending') {
        await completePendingDeposit(txId, `Stripe ${sessionId}`)
      }
      return res.redirect(`${webOrigin}/account/transactions?deposit=success&tx=${txId}`)
    }
  } catch (e) {
    console.error('stripe return', e)
  }
  return res.redirect(`${webOrigin}/account/deposit?deposit=error&tx=${txId}`)
})

/** NOWPayments IPN */
paymentsRouter.post('/nowpayments/ipn', async (req, res) => {
  try {
    const sig = String(req.headers['x-nowpayments-sig'] || '')
    const valid = await verifyNowPaymentsIpn(sig, req.body)
    if (!valid) return res.status(401).json({ error: 'Invalid IPN signature' })

    const orderId = String(req.body?.order_id || '')
    const status = String(req.body?.payment_status || req.body?.status || '')
    if (!orderId) return res.status(400).json({ error: 'missing order_id' })
    if (['finished', 'confirmed', 'sending'].includes(status)) {
      const existing = await prisma.transaction.findUnique({ where: { id: orderId } })
      if (existing?.status === 'pending' && existing.type === 'deposit') {
        await completePendingDeposit(orderId, `NOWPayments ${status}`)
      }
    }
    return res.json({ ok: true })
  } catch (e) {
    console.error('nowpayments ipn', e)
    return res.status(500).json({ error: 'ipn failed' })
  }
})

function safeJson(raw?: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
