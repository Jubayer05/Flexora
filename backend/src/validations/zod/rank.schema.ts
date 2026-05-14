import { z } from 'zod'

// Base rank schema matching frontend
const RankBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayOrder: z.number().int().min(0).optional(),
  description: z.string().optional(),
  minSpending: z.number().min(0, 'Minimum spending must be a positive number'),
  maxSpending: z.number().min(0, 'Maximum spending must be a positive number'),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').optional(),
  bonusDevices: z.number().int().min(0).optional(),
  meta: z
    .object({
      features: z.array(z.string()).optional()
    })
    .optional(),
  icon: z.string().optional()
})

// Create rank schema
export const CreateRankSchema = RankBaseSchema.refine(
  (data) => data.maxSpending >= data.minSpending,
  {
    message: 'Maximum spending must be greater than or equal to minimum spending',
    path: ['maxSpending']
  }
)

// Update rank schema - all fields optional
export const UpdateRankSchema = z
  .object({
    name: z.string().min(1, 'Name is required').optional(),
    displayOrder: z.number().int().min(0).optional(),
    description: z.string().optional(),
    minSpending: z.number().min(0, 'Minimum spending must be a positive number').optional(),
    maxSpending: z.number().min(0, 'Maximum spending must be a positive number').optional(),
    discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').optional(),
    bonusDevices: z.number().int().min(0).optional(),
    meta: z
      .object({
        features: z.array(z.string()).optional()
      })
      .optional(),
    icon: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.minSpending !== undefined && data.maxSpending !== undefined) {
        return data.maxSpending >= data.minSpending
      }
      return true
    },
    {
      message: 'Maximum spending must be greater than or equal to minimum spending',
      path: ['maxSpending']
    }
  )

// Query schema for listing ranks
export const RankQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  sortBy: z.string().optional().default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
})

// Type exports
export type CreateRankData = z.infer<typeof CreateRankSchema>
export type UpdateRankData = z.infer<typeof UpdateRankSchema>
export type RankQuery = z.infer<typeof RankQuerySchema>
