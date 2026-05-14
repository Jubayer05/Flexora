import { z } from 'zod'
import { PaginationSchema } from '../common/pagination.schema'

// ===============================
// CUSTOM PAGE INPUT SCHEMAS
// ===============================

export const createCustomPageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(300, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  title: z.string().max(200, 'Title too long').optional(),
  group: z.string().optional(),
  type: z.enum(['EXTERNAL', 'DYNAMIC', 'HYBRID']).default('DYNAMIC'),
  location: z.enum(['HEADER', 'FOOTER']).optional(),
  url: z.string().optional(),
  subtitle: z.string().max(300, 'Subtitle too long').optional(),
  excerpt: z.string().optional(),
  description: z.string().optional(),
  banner: z.string().optional(),
  thumbnail: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
  seo: z.record(z.string(), z.any()).optional(),
  content: z.record(z.string(), z.any()).optional(),
  meta: z.record(z.string(), z.any()).optional()
})

export const updateCustomPageSchema = z
  .object({
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(300, 'Slug too long')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only')
      .optional(),
    title: z.string().max(200, 'Title too long').optional(),
    group: z.string().optional(),
    type: z.enum(['EXTERNAL', 'DYNAMIC', 'HYBRID']).optional(),
    location: z.enum(['HEADER', 'FOOTER']).optional(),
    url: z.string().optional(),
    subtitle: z.string().max(300, 'Subtitle too long').optional(),
    excerpt: z.string().optional(),
    description: z.string().optional(),
    banner: z.string().optional(),
    sortOrder: z.number().int().optional(),
    thumbnail: z.string().optional(),
    isActive: z.boolean().optional(),
    seo: z.record(z.string(), z.any()).optional(),
    content: z.record(z.string(), z.any()).optional(),
    meta: z.record(z.string(), z.any()).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })

export const customPageParamsSchema = z.object({
  id: z.string().uuid('Invalid page ID')
})

export const customPageSlugParamsSchema = z.object({
  slug: z.string().min(1, 'Slug is required')
})

export const customPageQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  type: z.enum(['EXTERNAL', 'DYNAMIC', 'HYBRID']).optional(),
  location: z.enum(['HEADER', 'FOOTER']).optional()
})

// ===============================
// TYPE EXPORTS
// ===============================

export type CreateCustomPageInput = z.infer<typeof createCustomPageSchema>
export type UpdateCustomPageInput = z.infer<typeof updateCustomPageSchema>
export type CustomPageParams = z.infer<typeof customPageParamsSchema>
export type CustomPageSlugParams = z.infer<typeof customPageSlugParamsSchema>
export type CustomPageQuery = z.infer<typeof customPageQuerySchema>
