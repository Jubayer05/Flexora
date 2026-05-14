import { z } from 'zod'

// ================================
// CREATE SCHEMA
// ================================
export const createSubscriptionPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.any().optional(), // JSON field
  price: z.number().min(0).max(10000),
  discount: z.number().min(0).max(100), // Percentage 0-100
  duration: z.number().int().positive().default(30), // Duration in days
  isActive: z.boolean().default(true),
  meta: z.any().optional() // JSON field
})

export type CreateSubscriptionPackageInput = z.infer<typeof createSubscriptionPackageSchema>

// ================================
// UPDATE SCHEMA
// ================================
export const updateSubscriptionPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').optional(),
  description: z.any().optional(),
  price: z.number().min(0).max(10000).optional(),
  discount: z.number().min(0).max(100).optional(),
  duration: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  meta: z.any().optional()
})

export type UpdateSubscriptionPackageInput = z.infer<typeof updateSubscriptionPackageSchema>

// ================================
// QUERY SCHEMA
// ================================
export const subscriptionPackageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'discount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type SubscriptionPackageQueryInput = z.infer<typeof subscriptionPackageQuerySchema>

// ================================
// PARAMS SCHEMA
// ================================
export const subscriptionPackageIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
})

export type SubscriptionPackageIdParams = z.infer<typeof subscriptionPackageIdParamsSchema>
