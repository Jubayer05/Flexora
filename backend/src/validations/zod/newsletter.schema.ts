import { z } from 'zod'
import { PaginationSchema } from '../common/pagination.schema'

// ================================
// NEWSLETTER SUBSCRIPTION SCHEMA
// ================================

export const SubscribeNewsletterSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase()
})

// ================================
// ADMIN QUERY SCHEMA
// ================================

export const NewsletterQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// ================================
// DELETE SCHEMA
// ================================

export const NewsletterIdSchema = z.object({
  id: z.coerce.number().int().positive('Invalid subscriber ID')
})

// ================================
// TYPE EXPORTS
// ================================

export type SubscribeNewsletterInput = z.infer<typeof SubscribeNewsletterSchema>
export type NewsletterQueryInput = z.infer<typeof NewsletterQuerySchema>
export type NewsletterIdInput = z.infer<typeof NewsletterIdSchema>
