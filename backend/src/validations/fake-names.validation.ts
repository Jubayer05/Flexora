import { z } from 'zod'

export const createFakeNameSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
    status: z.enum(['AVAILABLE', 'USED']).optional().default('AVAILABLE')
  })
})

export const bulkCreateFakeNamesSchema = z.object({
  body: z.object({
    names: z
      .array(z.string().min(1).max(255))
      .min(1, 'At least one name is required')
      .max(1000, 'Maximum 1000 names per bulk operation')
  })
})

export const updateFakeNameSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
    status: z.enum(['AVAILABLE', 'USED']).optional()
  })
})

export const bulkDeleteFakeNamesSchema = z.object({
  body: z.object({
    ids: z.array(z.number()).min(1, 'At least one ID is required')
  })
})

export const getFakeNamesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('50'),
    status: z.enum(['AVAILABLE', 'USED']).optional(),
    search: z.string().optional()
  })
})
