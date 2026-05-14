import { z } from 'zod'

export const PAGELIMIT = 10
export const MAX_PAGELIMIT = 50

// Common pagination schema that can be reused across all query schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .refine((val) => /^\d+$/.test(val), 'Page must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Page must be positive'),
  limit: z
    .string()
    .optional()
    .default(PAGELIMIT.toString())
    .refine((val) => /^\d+$/.test(val), 'Limit must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => val > 0 && val <= MAX_PAGELIMIT,
      `Limit must be between 1 and ${MAX_PAGELIMIT}`
    )
})

export const BooleanSchemaString = z
  .string()
  .optional()
  .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))

// Export the type
export type Pagination = z.infer<typeof PaginationSchema>
