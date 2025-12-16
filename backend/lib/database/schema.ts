import { PrismaClient } from '@prisma/client'

// Use flexible types to avoid Prisma Decimal conflicts
export type Dataset = any
export type Product = any
export type Sale = any
export type DailyAnalytics = any

export type DateRange = { startDate: Date; endDate: Date }

export type UpsertSalesRow = {
  productName: string
  date: Date
  quantity: number
  hasPromo?: boolean
  source?: string
  price?: number      // Unit price (harga satuan)
  totalPrice?: number // Total price for calculating unit price if needed
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export { prisma }
