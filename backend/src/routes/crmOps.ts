import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import {
  adminRequired,
  isAdmin,
  isCrmStaff,
  requirePermission,
  staffRequired,
} from '../auth.js'
import {
  CRM_ROLES,
  DEFAULT_CRM_SETTINGS,
  NOTIFICATION_TYPES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  permissionsForRole,
  resolvePermissions,
} from '../permissions.js'
import { getSetting, setSetting } from '../settings.js'

export const crmOpsRouter = Router()
crmOpsRouter.use(staffRequired)

/** ——— 17. Roles & permissions (Admin) ——— */
crmOpsRouter.get('/roles', adminRequired, async (_req, res) => {
  const counts = await prisma.user.groupBy({
    by: ['role'],
    where: { role: { not: 'USER' } },
    _count: true,
  })
  const countMap = Object.fromEntries(counts.map((c) => [c.role, c._count]))
  return res.json({
    roles: [
      {
        role: 'ADMIN',
        label: 'Admin',
        permissions: permissionsForRole('ADMIN'),
        count: countMap.ADMIN || 0,
        access: 'admin',
      },
      ...CRM_ROLES.map((role) => ({
        role,
        label: role.replaceAll('_', ' '),
        permissions: ROLE_PERMISSIONS[role] || [],
        count: countMap[role] || 0,
        access: 'crm',
      })),
    ],
    allPermissions: PERMISSIONS,
  })
})

crmOpsRouter.get('/roles/users', adminRequired, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'USER' } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      permissionsJson: true,
      totpEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({
    users: users.map((u) => ({
      ...u,
      permissions: resolvePermissions(u),
    })),
  })
})

crmOpsRouter.patch('/roles/users/:id', adminRequired, async (req, res) => {
  const schema = z.object({
    role: z.enum([
      'ADMIN',
      'MANAGER',
      'EMPLOYEE',
      'TEAM_LEADER',
      'SALES',
      'RETENTION',
      'COMPLIANCE',
      'FINANCE',
      'SUPPORT',
      'MARKETING',
    ]).optional(),
    active: z.boolean().optional(),
    permissions: z.array(z.string()).nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const id = String(req.params.id)
  if (id === req.user!.id && parsed.data.role && parsed.data.role !== 'ADMIN') {
    return res.status(400).json({ error: 'Cannot demote yourself' })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.role) data.role = parsed.data.role
  if (parsed.data.active !== undefined) data.active = parsed.data.active
  if (parsed.data.permissions !== undefined) {
    data.permissionsJson =
      parsed.data.permissions === null ? null : JSON.stringify(parsed.data.permissions)
  }

  const user = await prisma.user.update({ where: { id }, data })
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      permissions: resolvePermissions(user),
    },
  })
})

crmOpsRouter.get('/me/permissions', async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { role: true, permissionsJson: true },
  })
  return res.json({
    role: u?.role,
    permissions: u ? resolvePermissions(u) : [],
  })
})

/** ——— 18. Notifications (Admin + CRM) ——— */
crmOpsRouter.get('/notifications', requirePermission('crm.notifications'), async (req, res) => {
  const unreadOnly = req.query.unread === '1'
  const where = isAdmin(req.user?.role)
    ? {
        OR: [{ recipientId: null }, { recipientId: req.user!.id }],
        ...(unreadOnly ? { read: false } : {}),
      }
    : {
        recipientId: req.user!.id,
        ...(unreadOnly ? { read: false } : {}),
      }

  const [items, unread] = await Promise.all([
    prisma.staffNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.staffNotification.count({
      where: isAdmin(req.user?.role)
        ? { OR: [{ recipientId: null }, { recipientId: req.user!.id }], read: false }
        : { recipientId: req.user!.id, read: false },
    }),
  ])

  return res.json({ notifications: items, unread, types: NOTIFICATION_TYPES })
})

crmOpsRouter.post('/notifications/read', requirePermission('crm.notifications'), async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
  const where = isAdmin(req.user?.role)
    ? ids.length
      ? { id: { in: ids } }
      : { OR: [{ recipientId: null }, { recipientId: req.user!.id }], read: false }
    : ids.length
      ? { id: { in: ids }, recipientId: req.user!.id }
      : { recipientId: req.user!.id, read: false }

  await prisma.staffNotification.updateMany({ where, data: { read: true } })
  return res.json({ ok: true })
})

crmOpsRouter.post('/notifications/test', adminRequired, async (req, res) => {
  const type = String(req.body?.type || 'new_lead')
  await prisma.staffNotification.create({
    data: {
      type,
      title: `Test: ${type}`,
      body: 'Sample CRM notification',
      recipientId: null,
    },
  })
  return res.json({ ok: true })
})

/** ——— 19. Analytics (Admin + CRM with permission) ——— */
crmOpsRouter.get('/analytics', requirePermission('crm.analytics'), async (req, res) => {
  const scope = isCrmStaff(req.user?.role) ? { assignedToId: req.user!.id } : {}
  const clientWhere = { role: 'USER' as const, ...scope }
  const full = !isCrmStaff(req.user?.role) || (await (async () => {
    const u = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true, permissionsJson: true },
    })
    return u ? resolvePermissions(u).includes('crm.analytics.full') : false
  })())

  const total = await prisma.user.count({ where: clientWhere })
  const leads = await prisma.user.count({ where: { ...clientWhere, funded: false } })
  const ftd = await prisma.user.count({ where: { ...clientWhere, funded: true } })
  const active = await prisma.user.count({ where: { ...clientWhere, active: true, funded: true } })

  const deposits = await prisma.transaction.aggregate({
    where: { type: 'deposit', status: { in: ['completed', 'approved'] }, user: clientWhere },
    _sum: { amount: true },
    _count: true,
  })
  const withdrawals = await prisma.transaction.aggregate({
    where: { type: 'withdraw', status: { in: ['completed', 'approved'] }, user: clientWhere },
    _sum: { amount: true },
  })
  const revenue = (deposits._sum.amount ?? 0) - Math.abs(withdrawals._sum.amount ?? 0)

  const byCountry = await prisma.user.groupBy({
    by: ['country'],
    where: clientWhere,
    _count: true,
    orderBy: { _count: { country: 'desc' } },
    take: 15,
  })
  const bySource = await prisma.user.groupBy({
    by: ['clientSource'],
    where: clientWhere,
    _count: true,
    orderBy: { _count: { clientSource: 'desc' } },
    take: 15,
  })

  // Simple LTV proxy: avg net deposit of funded clients
  const funded = await prisma.user.findMany({
    where: { ...clientWhere, funded: true },
    select: { totalDeposited: true },
  })
  const ltv =
    funded.length === 0
      ? 0
      : funded.reduce((s, u) => s + u.totalDeposited, 0) / funded.length

  const conversionRate = total ? (ftd / total) * 100 : 0
  const retentionRate = ftd ? (active / ftd) * 100 : 0

  return res.json({
    scoped: isCrmStaff(req.user?.role),
    full,
    funnel: {
      leads: total,
      newLeads: leads,
      ftd,
      activeRetention: active,
      conversionRate: Number(conversionRate.toFixed(2)),
      retentionRate: Number(retentionRate.toFixed(2)),
    },
    revenue: {
      deposits: Number((deposits._sum.amount ?? 0).toFixed(2)),
      depositCount: deposits._count,
      withdrawals: Number(Math.abs(withdrawals._sum.amount ?? 0).toFixed(2)),
      net: Number(revenue.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      roi: deposits._count ? Number((revenue / Math.max(1, deposits._count)).toFixed(2)) : 0,
    },
    byCountry: byCountry.map((r) => ({ country: r.country || 'Unknown', count: r._count })),
    bySource: bySource.map((r) => ({ source: r.clientSource || 'Direct', count: r._count })),
  })
})

/** ——— 20. Security (Admin: all / CRM: own) ——— */
crmOpsRouter.get('/security/logs', async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { role: true, permissionsJson: true },
  })
  const canAll = u && (u.role === 'ADMIN' || resolvePermissions(u).includes('crm.security.all'))
  const where = canAll ? {} : { userId: req.user!.id }

  const [loginLogs, sessions, audit] = await Promise.all([
    prisma.loginLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.staffSession.findMany({
      where: canAll ? { revoked: false } : { userId: req.user!.id, revoked: false },
      orderBy: { lastActiveAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.crmActivity.findMany({
      where: canAll ? {} : { staffId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        staff: { select: { name: true } },
        client: { select: { name: true, crmNumber: true } },
      },
    }),
  ])

  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { totpEnabled: true },
  })

  return res.json({
    totpEnabled: Boolean(me?.totpEnabled),
    canViewAll: Boolean(canAll),
    loginLogs,
    sessions,
    auditTrail: audit,
  })
})

crmOpsRouter.post('/security/sessions/:id/revoke', async (req, res) => {
  const session = await prisma.staffSession.findUnique({ where: { id: String(req.params.id) } })
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await prisma.staffSession.update({ where: { id: session.id }, data: { revoked: true } })
  return res.json({ ok: true })
})

/** ——— 21. System settings (Admin only) ——— */
crmOpsRouter.get('/system-settings', adminRequired, async (_req, res) => {
  const raw = await getSetting('crm.system')
  let settings = DEFAULT_CRM_SETTINGS
  if (raw) {
    try {
      settings = { ...DEFAULT_CRM_SETTINGS, ...JSON.parse(raw) }
    } catch {
      /* keep defaults */
    }
  }
  return res.json({ settings, access: 'admin' })
})

crmOpsRouter.put('/system-settings', adminRequired, async (req, res) => {
  const body = req.body?.settings
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid settings' })
  const merged = { ...DEFAULT_CRM_SETTINGS, ...body }
  await setSetting('crm.system', JSON.stringify(merged))
  return res.json({ settings: merged })
})
