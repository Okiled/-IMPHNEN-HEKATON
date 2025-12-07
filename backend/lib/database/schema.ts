import { PrismaClient, datasets, products, sales, daily_analytics } from '@prisma/client'

export type Dataset = datasets
export type Product = products
export type Sale = sales
export type DailyAnalytics = daily_analytics

export type DateRange = { startDate: Date; endDate: Date }

export type UpsertSalesRow = {
  productName: string
  date: Date
  quantity: number
  hasPromo?: boolean
  source?: string
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export { prisma }
