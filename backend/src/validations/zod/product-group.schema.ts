import { z } from 'zod'
import { PaginationSchema } from '../common/pagination.schema'

const productGroupSlugPattern = /^[A-Za-z0-9-]+$/

// Base Product Group Schema
export const ProductGroupBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Product group name is required')
    .max(100, 'Product group name must be less than 100 characters'),
  productIds: z
    .array(z.number().int().positive('Product ID must be a positive integer'))
    .optional(),
  categoryId: z.number().int().positive(),
  meta: z.record(z.string(), z.any()).optional(),
  // Schemaless SEO JSON blob stored on ProductGroup.seo (Prisma Json?)
  seo: z.record(z.string(), z.any()).optional(),
  // Optional slug (service can auto-generate/ensure uniqueness)
  slug: z
    .string()
    .min(1)
    .trim()
    .regex(productGroupSlugPattern, 'Slug must contain only letters, numbers, and hyphens')
    .optional()
})

// Create Product Group Schema
export const CreateProductGroupSchema = ProductGroupBaseSchema

// Update Product Group Schema
// NOTE: For updates, do NOT default productIds to [] (would unintentionally detach all products).
export const UpdateProductGroupSchema = ProductGroupBaseSchema.partial().extend({
  productIds: z.array(z.number().int().positive('Product ID must be a positive integer')).optional()
})

// Product Group Query Schema
export const ProductGroupQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'sortOrder']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Product Group Reorder Schema (for drag & drop)
export const ProductGroupReorderSchema = z.object({
  prevSortOrder: z.number().int().nullable().optional(),
  nextSortOrder: z.number().int().nullable().optional()
})

// Product Group ID Schema
export const ProductGroupIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Product group ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

export const ProductGroupSlugSchema = z.object({
  slug: z
    .string()
    .min(1, 'Product group slug is required')
    .trim()
    .regex(productGroupSlugPattern, 'Product group slug must contain only letters, numbers, and hyphens')
})

// Export types
export type ProductGroupBase = z.infer<typeof ProductGroupBaseSchema>
export type CreateProductGroup = z.infer<typeof CreateProductGroupSchema>
export type UpdateProductGroup = z.infer<typeof UpdateProductGroupSchema>
export type ProductGroupQuery = z.infer<typeof ProductGroupQuerySchema>
export type ProductGroupReorder = z.infer<typeof ProductGroupReorderSchema>
export type ProductGroupId = z.infer<typeof ProductGroupIdSchema>
export type ProductGroupSlug = z.infer<typeof ProductGroupSlugSchema>
