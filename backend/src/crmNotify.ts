import { prisma } from './prisma.js'
import type { NotificationType } from './permissions.js'

/** Create CRM staff notifications (recipientId null = broadcast to admins later filtered in API) */
export async function notifyStaff(opts: {
  type: NotificationType | string
  title: string
  body: string
  clientId?: string | null
  recipientId?: string | null
}) {
  await prisma.staffNotification.create({
    data: {
      type: opts.type,
      title: opts.title,
      body: opts.body,
      clientId: opts.clientId || null,
      recipientId: opts.recipientId || null,
    },
  })
}

export async function notifyAssignedAndAdmins(opts: {
  type: NotificationType | string
  title: string
  body: string
  clientId: string
}) {
  const client = await prisma.user.findUnique({
    where: { id: opts.clientId },
    select: { assignedToId: true, name: true },
  })
  if (client?.assignedToId) {
    await notifyStaff({ ...opts, recipientId: client.assignedToId })
  }
  // Also create an admin-visible copy (recipient null)
  await notifyStaff({ ...opts, recipientId: null })
}
