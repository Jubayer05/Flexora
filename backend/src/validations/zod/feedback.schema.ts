import { z } from 'zod'

// ================================
// FEEDBACK SCHEMAS
// ================================

export const feedbackSourceEnum = z.enum(['CUSTOMER', 'MANUAL', 'BULK_GENERATED'])
export type FeedbackSourceType = z.infer<typeof feedbackSourceEnum>

export const createFeedbackSchema = z.object({
  userId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  feedback: z
    .string()
    .min(1, 'Feedback is required')
    .max(1000, 'Feedback must be less than 1000 characters'),
  rating: z.number().min(1, 'Rating must be at least 1.0').max(5, 'Rating must be at most 5.0'),
  published: z.boolean().optional().default(false),
  source: feedbackSourceEnum.optional().default('MANUAL')
})

export const updateFeedbackSchema = z.object({
  userId: z.number().int().positive().optional().nullable(),
  productId: z.number().int().positive().optional().nullable(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  feedback: z
    .string()
    .min(1, 'Feedback is required')
    .max(1000, 'Feedback must be less than 1000 characters')
    .optional(),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1.0')
    .max(5, 'Rating must be at most 5.0')
    .optional(),
  published: z.boolean().optional(),
  source: feedbackSourceEnum.optional()
})

export const fakeFeedbackSchema = z.object({
  reviews: z.array(z.string().min(1)),
  minRatings: z.number().min(4.1).max(5),
  maxRatings: z.number().min(4.1).max(5),
  startedAt: z.number().int().optional(),
  endedAt: z.number().int().optional()
}).refine((data) => data.minRatings <= data.maxRatings, {
  message: 'Min rating must be less than or equal to max rating',
  path: ['minRatings']
})

export const feedbackQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  userId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  productId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  published: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  rating: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  source: feedbackSourceEnum.optional(),
  schedule: z.enum(['all', 'current', 'future']).optional().default('all')
})

export const feedbackParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number)
})

export const bulkFeedbackActionSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ID is required'),
  action: z.enum(['publish', 'unpublish', 'delete'])
})

export const bulkAssignedFeedbackEntrySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  feedback: z
    .string()
    .min(1, 'Feedback is required')
    .max(1000, 'Feedback must be less than 1000 characters'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  createdAt: z.coerce.date().optional()
})

export const bulkAssignFeedbackSchema = z.object({
  productIds: z
    .array(z.number().int().positive())
    .min(1, 'Select at least one product')
    .max(10, 'You can assign reviews to up to 10 products at a time'),
  entries: z.array(bulkAssignedFeedbackEntrySchema).min(1, 'At least one review entry is required')
})

// Customer feedback creation schema (authenticated customers)
export const customerCreateFeedbackSchema = z.object({
  productId: z.number().int().positive('Product ID is required'),
  feedback: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(1000, 'Feedback must be less than 1000 characters'),
  rating: z.number().min(1, 'Rating must be at least 1.0').max(5, 'Rating must be at most 5.0')
})

// ================================
// TYPE DEFINITIONS
// ================================

export type CreateFeedbackData = z.infer<typeof createFeedbackSchema>
export type UpdateFeedbackData = z.infer<typeof updateFeedbackSchema>
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>
export type FeedbackParams = z.infer<typeof feedbackParamsSchema>
export type CustomerCreateFeedbackData = z.infer<typeof customerCreateFeedbackSchema>
export type BulkFeedbackAction = z.infer<typeof bulkFeedbackActionSchema>
export type BulkAssignedFeedbackEntry = z.infer<typeof bulkAssignedFeedbackEntrySchema>
export type BulkAssignFeedbackData = z.infer<typeof bulkAssignFeedbackSchema>
