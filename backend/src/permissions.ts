/** CRM staff roles (excludes USER / ADMIN platform roles for desk work) */
export const CRM_ROLES = [
  'MANAGER',
  'TEAM_LEADER',
  'SALES',
  'RETENTION',
  'COMPLIANCE',
  'FINANCE',
  'SUPPORT',
  'MARKETING',
  'EMPLOYEE',
] as const

export type CrmRole = (typeof CRM_ROLES)[number]

export const ALL_STAFF_ROLES = ['ADMIN', ...CRM_ROLES] as const

export const PERMISSIONS = [
  'crm.dashboard',
  'crm.clients.view',
  'crm.clients.edit',
  'crm.clients.assign',
  'crm.notifications',
  'crm.analytics',
  'crm.analytics.full',
  'crm.security.own',
  'crm.security.all',
  'crm.roles.manage',
  'crm.settings.manage',
  'crm.documents.review',
  'crm.finance.view',
  'crm.comms',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ALL = [...PERMISSIONS]

/** Default granular permissions per role */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ALL,
  MANAGER: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.clients.assign',
    'crm.notifications',
    'crm.analytics',
    'crm.analytics.full',
    'crm.security.own',
    'crm.documents.review',
    'crm.finance.view',
    'crm.comms',
  ],
  TEAM_LEADER: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.clients.assign',
    'crm.notifications',
    'crm.analytics',
    'crm.analytics.full',
    'crm.security.own',
    'crm.documents.review',
    'crm.comms',
  ],
  SALES: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.notifications',
    'crm.analytics',
    'crm.security.own',
    'crm.comms',
  ],
  RETENTION: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.notifications',
    'crm.analytics',
    'crm.security.own',
    'crm.comms',
  ],
  COMPLIANCE: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.notifications',
    'crm.documents.review',
    'crm.security.own',
  ],
  FINANCE: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.notifications',
    'crm.analytics',
    'crm.finance.view',
    'crm.security.own',
  ],
  SUPPORT: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.notifications',
    'crm.security.own',
    'crm.comms',
  ],
  MARKETING: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.notifications',
    'crm.analytics',
    'crm.analytics.full',
    'crm.security.own',
  ],
  EMPLOYEE: [
    'crm.dashboard',
    'crm.clients.view',
    'crm.clients.edit',
    'crm.notifications',
    'crm.analytics',
    'crm.security.own',
    'crm.comms',
  ],
}

export function permissionsForRole(role?: string): Permission[] {
  if (!role) return []
  if (role === 'ADMIN') return ALL
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.EMPLOYEE
}

export function resolvePermissions(user: { role: string; permissionsJson?: string | null }): Permission[] {
  if (user.permissionsJson) {
    try {
      const parsed = JSON.parse(user.permissionsJson)
      if (Array.isArray(parsed)) return parsed.filter((p) => PERMISSIONS.includes(p))
    } catch {
      /* fall through */
    }
  }
  return permissionsForRole(user.role)
}

export function hasPermission(
  user: { role: string; permissionsJson?: string | null } | undefined,
  permission: Permission,
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return resolvePermissions(user).includes(permission)
}

export const NOTIFICATION_TYPES = [
  'new_lead',
  'first_deposit',
  'withdrawal',
  'document_uploaded',
  'login_alert',
  'missed_call',
  'kyc_expiry',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const DEFAULT_CRM_SETTINGS = {
  countries: ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Egypt'],
  currencies: ['USD', 'EUR', 'SAR', 'AED'],
  languages: ['en', 'ar', 'fr'],
  email: { enabled: false, from: '', provider: 'smtp' },
  sms: { enabled: false, provider: '' },
  whatsapp: { enabled: false, provider: '' },
  apis: { webhooksEnabled: false, webhookUrl: '' },
  templates: {
    welcomeEmail: 'Welcome to NitajFX',
    depositEmail: 'Your deposit was received',
    kycApproved: 'Your verification was approved',
  },
}
