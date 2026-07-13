import type { EarningType, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export async function recordEarning(
  tx: Prisma.TransactionClient | typeof prisma,
  data: {
    type: EarningType
    amount: number
    description: string
    userId?: string | null
    meta?: string
  },
) {
  if (data.amount <= 0) return null
  return tx.platformEarning.create({
    data: {
      type: data.type,
      amount: Number(data.amount.toFixed(2)),
      description: data.description,
      userId: data.userId ?? null,
      meta: data.meta,
    },
  })
}
