import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from './common'

const categorySlugPattern = /^[A-Za-z0-9-]+$/

/**
 * Category Validation Schemas
 *
 * This file contains all Zod validation schemas for Category operations:
 * - CategoryBaseSchema: Core category fields validation
 * - CreateCategorySchema: For creating new categories
 * - UpdateCategorySchema: For updating existing categories (includes ID)
 * - CategoryQuerySchema: For filtering and searching categories
 * - CategoryIdSchema: For validating category ID parameters
 * - CategorySlugSchema: For validating category slug parameters
 * - CategoryTreeSchema: For hierarchical category operations
 * - CategoryMoveSchema: For reordering/moving categories
 */

// Base Category Schema
export const CategoryBaseSchema = z.object({
  name: z
    .string('Category name is required')
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters')
    .trim(),
  slug: z
    .string('Category slug is required')
    .min(1, 'Category slug is required')
    .max(255, 'Category slug must be less than 255 characters')
    .trim()
    .refine((val) => categorySlugPattern.test(val), {
      message: 'Slug must contain only letters, numbers, and hyphens'
    }),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  icon: z.string().optional().nullable().or(z.literal('')),
  isActive: z.boolean('Status is required'),
  sortOrder: z
    .number('Sort order must be a number')
    .int('Sort order must be an integer')
    .min(0, 'Sort order cannot be negative')
    .max(999999, 'Sort order is too high'),
  parentId: z
    .number('Parent category ID must be a number')
    .int('Parent category ID must be an integer')
    .positive('Parent category ID must be positive')
    .optional()
    .nullable()
})

// Create Category Schema
export const CreateCategorySchema = CategoryBaseSchema.refine(
  (data) => {
    // Ensure slug is unique (this would typically be handled by backend)
    if (data.slug && data.slug.trim() === '') {
      return false
    }
    return true
  },
  {
    message: 'Category slug cannot be empty',
    path: ['slug']
  }
)

// Update Category Schema (without refinements first, then add them)
const UpdateCategoryBaseSchema = z.object({
  id: z.number().int().positive('Category ID must be a positive integer'),
  name: z
    .string('Category name is required')
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters')
    .trim()
    .optional(),
  slug: z
    .string('Category slug is required')
    .min(1, 'Category slug is required')
    .max(255, 'Category slug must be less than 255 characters')
    .trim()
    .refine((val) => categorySlugPattern.test(val), {
      message: 'Slug must contain only letters, numbers, and hyphens'
    })
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  icon: z.string().optional().nullable().or(z.literal('')),
  isActive: z.boolean('Status is required').optional(),
  sortOrder: z
    .number('Sort order must be a number')
    .int('Sort order must be an integer')
    .min(0, 'Sort order cannot be negative')
    .max(999999, 'Sort order is too high')
    .optional(),
  parentId: z
    .number('Parent category ID must be a number')
    .int('Parent category ID must be an integer')
    .positive('Parent category ID must be positive')
    .optional()
    .nullable()
})

export const UpdateCategorySchema = UpdateCategoryBaseSchema
  .refine(
    (data) => {
      // Prevent self-referencing parent
      if (data.parentId && data.id && data.parentId === data.id) {
        return false
      }
      return true
    },
    {
      message: 'Category cannot be its own parent',
      path: ['parentId']
    }
  )

// Category Query/Filter Schema
export const CategoryQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  parentId: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === 'null' || /^\d+$/.test(val),
      'Parent ID must be a valid number or null'
    )
    .transform((val) => {
      if (!val || val === 'null') return null
      return parseInt(val, 10)
    })
    .refine((val) => val === null || val > 0, 'Parent ID must be positive'),
  isActive: BooleanSchemaString,
  hasChildren: BooleanSchemaString,
  level: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Level must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val >= 0, 'Level cannot be negative'),
  sortBy: z
    .enum(['name', 'slug', 'sortOrder', 'createdAt', 'updatedAt'])
    .optional()
    .default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  includeParent: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includeChildren: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  tree: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false))
})

// Category ID Schema
export const CategoryIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Category ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

// Category Slug Schema
export const CategorySlugSchema = z.object({
  slug: z
    .string()
    .min(1, 'Category slug is required')
    .regex(categorySlugPattern, 'Slug must contain only letters, numbers, and hyphens')
})

// Category Tree Schema (for hierarchical operations)
export const CategoryTreeSchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false))
    .default(false),
  maxDepth: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Max depth must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || (val > 0 && val <= 10), 'Max depth must be between 1 and 10')
})

// Category Move Schema (for reordering/moving categories)
export const CategoryMoveSchema = z
  .object({
    categoryId: z
      .number('Category ID is required')
      .int('Category ID must be an integer')
      .positive('Category ID must be positive'),
    newParentId: z
      .number('New parent ID must be a number')
      .int('New parent ID must be an integer')
      .positive('New parent ID must be positive')
      .optional()
      .nullable(),
    newSortOrder: z
      .number('New sort order must be a number')
      .int('New sort order must be an integer')
      .min(0, 'Sort order cannot be negative')
      .optional()
  })
  .refine(
    (data) => {
      // Prevent self-referencing parent
      if (data.newParentId && data.categoryId === data.newParentId) {
        return false
      }
      return true
    },
    {
      message: 'Category cannot be moved to itself',
      path: ['newParentId']
    }
  )

// Export types
export type CategoryBase = z.infer<typeof CategoryBaseSchema>
export type CreateCategory = z.infer<typeof CreateCategorySchema>
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>
export type CategoryId = z.infer<typeof CategoryIdSchema>
export type CategorySlug = z.infer<typeof CategorySlugSchema>
export type CategoryTree = z.infer<typeof CategoryTreeSchema>
export type CategoryMove = z.infer<typeof CategoryMoveSchema>
