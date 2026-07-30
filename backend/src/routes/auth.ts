import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import {
  authRequired,
  publicUser,
  signToken,
  sign2faToken,
  verify2faToken,
  loadUser,
  clientIp,
  clientDevice,
  isStaff,
} from '../auth.js'
import { initialsFromName, referralCode } from '../trading.js'
import { generateTotpSecret, totpAuthUrl, totpQrDataUrl, verifyTotp } from '../totp.js'
import { nextCrmNumber } from '../crmHelpers.js'
import { notifyStaff } from '../crmNotify.js'
import { createHash } from 'crypto'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    referralCode: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message })

  const { name, email, password, referralCode: ref } = parsed.data
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

  let referredById: string | undefined
  if (ref) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: ref } })
    if (referrer) referredById = referrer.id
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      initials: initialsFromName(name),
      referralCode: referralCode(name),
      referredById,
      crmNumber: await nextCrmNumber(),
      crmCategory: 'NEW',
      crmStatus: 'NEW',
      clientSource: ref ? 'Referral' : 'Direct',
      lastInteractionAt: new Date(),
      accounts: {
        create: [
          {
            number: String(5000000 + Math.floor(Math.random() * 900000)),
            type: 'live',
            balance: 0,
            equity: 0,
          },
          {
            number: String(6000000 + Math.floor(Math.random() * 900000)),
            type: 'demo',
            balance: 24767.36,
            equity: 24767.36,
          },
        ],
      },
      notifications: {
        create: {
          title: 'Welcome to NitajFX',
          body: 'Your demo and live accounts are ready. Fund your live account to trade real markets.',
        },
      },
    },
    include: { accounts: true },
  })

  await notifyStaff({
    type: 'new_lead',
    title: 'New lead',
    body: `${user.name} (${user.email}) registered`,
    clientId: user.id,
    recipientId: null,
  })

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  return res.json({ token, user: publicUser(user) })
})

async function recordLogin(req: any, opts: {
  userId?: string | null
  email?: string
  success: boolean
  reason?: string
  token?: string
}) {
  const ip = clientIp(req)
  const device = clientDevice(req)
  await prisma.loginLog.create({
    data: {
      userId: opts.userId || null,
      email: opts.email || null,
      ip,
      device,
      success: opts.success,
      reason: opts.reason,
    },
  })
  if (opts.success && opts.userId && opts.token && isStaff((await prisma.user.findUnique({ where: { id: opts.userId }, select: { role: true } }))?.role)) {
    await prisma.staffSession.create({
      data: {
        userId: opts.userId,
        tokenHash: createHash('sha256').update(opts.token).digest('hex'),
        ip,
        device,
      },
    })
  }
}

authRouter.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials' })

  const email = parsed.data.email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true, kycDocuments: true },
  })
  if (!user || !user.active) {
    await recordLogin(req, { email, success: false, reason: 'invalid_user' })
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) {
    await recordLogin(req, { userId: user.id, email, success: false, reason: 'bad_password' })
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  if (user.totpEnabled && user.totpSecret) {
    const tempToken = sign2faToken(user.id, user.email, user.role)
    return res.json({
      requires2fa: true,
      tempToken,
      email: user.email,
      name: user.name,
    })
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  await recordLogin(req, { userId: user.id, email, success: true, token })
  if (isStaff(user.role)) {
    await notifyStaff({
      type: 'login_alert',
      title: 'Staff login',
      body: `${user.name} signed in`,
      recipientId: user.id,
    })
  }
  return res.json({ token, user: publicUser(user) })
})

authRouter.post('/login/2fa', async (req, res) => {
  const schema = z.object({
    tempToken: z.string().min(10),
    code: z.string().min(6).max(8),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid 2FA payload' })

  let payload
  try {
    payload = verify2faToken(parsed.data.tempToken)
  } catch {
    return res.status(401).json({ error: '2FA session expired — sign in again' })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { accounts: true, kycDocuments: true },
  })
  if (!user || !user.active || !user.totpEnabled || !user.totpSecret) {
    await recordLogin(req, { userId: payload.id, email: payload.email, success: false, reason: '2fa_invalid_session' })
    return res.status(401).json({ error: 'Invalid 2FA session' })
  }
  if (!verifyTotp(user.totpSecret, parsed.data.code)) {
    await recordLogin(req, { userId: user.id, email: user.email, success: false, reason: '2fa_bad_code' })
    return res.status(401).json({ error: 'Invalid authenticator code' })
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  await recordLogin(req, { userId: user.id, email: user.email, success: true, token })
  return res.json({ token, user: publicUser(user) })
})

authRouter.get('/me', authRequired, async (req, res) => {
  const user = await loadUser(req.user!.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ user: publicUser(user) })
})

authRouter.get('/2fa/status', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ enabled: Boolean(user.totpEnabled) })
})

authRouter.post('/2fa/setup', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled' })

  const secret = generateTotpSecret()
  const otpauthUrl = totpAuthUrl(secret, user.email)
  const qrDataUrl = await totpQrDataUrl(otpauthUrl)

  await prisma.user.update({
    where: { id: user.id },
    data: { totpTempSecret: secret },
  })

  return res.json({
    secret,
    otpauthUrl,
    qrDataUrl,
    message: 'Scan the QR code with Google Authenticator, then confirm with a 6-digit code.',
  })
})

authRouter.post('/2fa/enable', authRequired, async (req, res) => {
  const schema = z.object({ code: z.string().min(6).max(8) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter the 6-digit code' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.totpEnabled) return res.status(400).json({ error: '2FA is already enabled' })
  if (!user.totpTempSecret) return res.status(400).json({ error: 'Start setup first' })

  if (!verifyTotp(user.totpTempSecret, parsed.data.code)) {
    return res.status(400).json({ error: 'Invalid authenticator code' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpSecret: user.totpTempSecret,
      totpTempSecret: null,
    },
  })
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: '2FA enabled',
      body: 'Google Authenticator two-step verification is now active on your account.',
    },
  })

  return res.json({ ok: true, enabled: true })
})

authRouter.post('/2fa/disable', authRequired, async (req, res) => {
  const schema = z.object({
    code: z.string().min(6).max(8),
    password: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Code and password required' })

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.totpEnabled || !user.totpSecret) {
    return res.status(400).json({ error: '2FA is not enabled' })
  }

  const okPass = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!okPass) return res.status(401).json({ error: 'Incorrect password' })
  if (!verifyTotp(user.totpSecret, parsed.data.code)) {
    return res.status(400).json({ error: 'Invalid authenticator code' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpTempSecret: null },
  })
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: '2FA disabled',
      body: 'Two-step verification was turned off for your account.',
    },
  })

  return res.json({ ok: true, enabled: false })
})
