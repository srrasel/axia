import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'

export type StaffRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
export type AuthRole = 'USER' | StaffRole

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const secret = () => process.env.JWT_SECRET || 'seekapa-dev-secret'

const STAFF: StaffRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE']
const MANAGERS: StaffRole[] = ['ADMIN', 'MANAGER']

export function isStaff(role?: string): role is StaffRole {
  return STAFF.includes(role as StaffRole)
}

export function isManager(role?: string) {
  return MANAGERS.includes(role as StaffRole)
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, secret(), { expiresIn: '7d' })
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    req.user = jwt.verify(header.slice(7), secret()) as AuthUser
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/** Legacy name — full platform admin only */
export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}

/** CRM desk staff: admin, manager, employee */
export function staffRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !isStaff(req.user.role)) {
    return res.status(403).json({ error: 'Staff only' })
  }
  next()
}

/** Manager powers: bonuses, price control, balance add */
export function managerRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !isManager(req.user.role)) {
    return res.status(403).json({ error: 'Manager or admin only' })
  }
  next()
}

export async function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      accounts: { orderBy: { createdAt: 'asc' } },
      kycDocuments: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export function publicUser(user: Record<string, any> | null) {
  if (!user) return null
  const {
    passwordHash: _pw,
    totpSecret: _secret,
    totpTempSecret: _temp,
    ...rest
  } = user
  return {
    ...rest,
    totpEnabled: Boolean(user.totpEnabled),
  }
}

export function sign2faToken(userId: string, email: string, role: AuthRole) {
  return jwt.sign({ id: userId, email, role, purpose: '2fa' }, secret(), { expiresIn: '10m' })
}

export function verify2faToken(token: string) {
  const payload = jwt.verify(token, secret()) as AuthUser & { purpose?: string }
  if (payload.purpose !== '2fa') throw new Error('Invalid 2FA token')
  return payload
}
