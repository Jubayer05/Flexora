import { z } from 'zod'

// ================================
// PURCHASE SCHEMA
// ================================
export const purchaseSubscriptionSchema = z.object({
  subscriptionPackageId: z.number().int().positive('Subscription package ID is required'),
  gateway: z.string().min(1, 'Payment gateway is required')
})

export type PurchaseSubscriptionInput = z.infer<typeof purchaseSubscriptionSchema>

// ================================
// RENEWAL SCHEMA
// ================================
export const renewSubscriptionSchema = z.object({
  gateway: z.string().min(1, 'Payment gateway is required')
})

export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>

// ================================
// QUERY SCHEMAS
// ================================
export const subscriptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
})

export type SubscriptionHistoryQuery = z.infer<typeof subscriptionHistoryQuerySchema>

export const activeSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
})

export type ActiveSubscriptionsQuery = z.infer<typeof activeSubscriptionsQuerySchema>

export const expiringSubscriptionsQuerySchema = z.object({
  daysAhead: z.coerce.number().int().positive().max(30).default(7)
})

export type ExpiringSubscriptionsQuery = z.infer<typeof expiringSubscriptionsQuerySchema>

// ================================
// ADMIN SCHEMAS
// ================================
export const extendSubscriptionSchema = z.object({
  days: z.number().int().positive().min(1).max(365, 'Maximum extension is 365 days')
})

export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>

export const subscriptionPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'PARTIAL', 'REFUNDED']).optional()
})

export type SubscriptionPaymentsQuery = z.infer<typeof subscriptionPaymentsQuerySchema>
