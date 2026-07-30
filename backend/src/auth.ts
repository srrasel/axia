import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'
import { ALL_STAFF_ROLES, hasPermission, type Permission } from './permissions.js'

export type StaffRole = (typeof ALL_STAFF_ROLES)[number]
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

const STAFF = new Set<string>(ALL_STAFF_ROLES)
const MANAGERS = new Set(['ADMIN', 'MANAGER', 'TEAM_LEADER'])

export function isStaff(role?: string): role is StaffRole {
  return Boolean(role && STAFF.has(role))
}

export function isManager(role?: string) {
  return Boolean(role && MANAGERS.has(role))
}

export function isAdmin(role?: string) {
  return role === 'ADMIN'
}

/** Desk staff with assigned-client scope (everyone except ADMIN / USER) */
export function isCrmStaff(role?: string) {
  return isStaff(role) && role !== 'ADMIN'
}

/** Prisma filter: CRM staff only see their assigned clients */
export function assignedClientsFilter(req: { user?: AuthUser }) {
  if (!req.user || isAdmin(req.user.role)) return {}
  return { assignedToId: req.user.id }
}

export async function assertAssignedClient(req: { user?: AuthUser }, clientId: string) {
  if (!req.user) return false
  if (isAdmin(req.user.role)) return true
  const client = await prisma.user.findFirst({
    where: { id: clientId, role: 'USER', assignedToId: req.user.id },
    select: { id: true },
  })
  return Boolean(client)
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

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}

export function staffRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !isStaff(req.user.role)) {
    return res.status(403).json({ error: 'Staff only' })
  }
  next()
}

export function managerRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !isManager(req.user.role)) {
    return res.status(403).json({ error: 'Manager or admin only' })
  }
  next()
}

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (req.user.role === 'ADMIN') return next()
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, permissionsJson: true },
    })
    if (!dbUser || !hasPermission(dbUser, permission)) {
      return res.status(403).json({ error: 'Permission denied' })
    }
    next()
  }
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

export function clientIp(req: Request) {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    null
  )
}

export function clientDevice(req: Request) {
  return req.headers['user-agent']?.toString().slice(0, 180) || null
}
