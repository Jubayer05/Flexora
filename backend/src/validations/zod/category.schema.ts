import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

const categorySlugPattern = /^[A-Za-z0-9-]+$/;

// Base Category Schema
export const CategoryBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters'),
  slug: z
    .string()
    .min(1, 'Category slug is required')
    .max(255, 'Category slug must be less than 255 characters')
    .trim()
    .regex(categorySlugPattern, 'Slug must contain only letters, numbers, and hyphens'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  icon: z.string().max(255, 'Icon path must be less than 255 characters').optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0, 'Sort order cannot be negative').default(0),
  parentId: z.number().int().positive('Parent ID must be a positive integer').nullable().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// Create Category Schema
export const CreateCategorySchema = CategoryBaseSchema;

// Update Category Schema
export const UpdateCategorySchema = CategoryBaseSchema.partial().extend({
  id: z.number().int().positive('Category ID must be a positive integer'),
});

// Category Query/Filter Schema
export const CategoryQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  isActive: BooleanSchemaString,
  parentId: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === 'null' || /^\d+$/.test(val),
      'Parent ID must be a valid number or null'
    )
    .transform((val) => (!val || val === 'null' ? null : parseInt(val, 10)))
    .refine((val) => val === null || val > 0, 'Parent ID must be positive or null'),
  isRoot: BooleanSchemaString,
  hasChildren: BooleanSchemaString,
  sortBy: z
    .enum(['name', 'slug', 'createdAt', 'updatedAt', 'sortOrder'])
    .optional()
    .default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  includeProductCount: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includeChildren: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includeParent: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
});

// Category ID Schema
export const CategoryIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Category ID must be a valid number')
    .transform((val) => parseInt(val, 10)),
});

// Category Slug Schema
export const CategorySlugSchema = z.object({
  slug: z.string().min(1, 'Category slug is required'),
});

// Bulk Category Operations
export const BulkCategoryUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one category ID is required'),
  updates: z.object({
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const BulkCategoryDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one category ID is required'),
});

// Category Sort Order Update
export const CategorySortUpdateSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, 'At least one category is required'),
});

// Category Hierarchy Schemas
export const CategoryTreeSchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
  includeProductCount: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
});

export const CategoryMoveSchema = z.object({
  categoryId: z.number().int().positive('Category ID must be a positive integer'),
  newParentId: z.number().int().positive('New parent ID must be a positive integer').nullable(),
});

// Parent Category ID Schema for URL params
export const ParentCategoryIdSchema = z.object({
  parentId: z
    .string()
    .regex(/^\d+$/, 'Parent ID must be a valid number')
    .transform((val) => parseInt(val, 10)),
});

// Category Details Schema for individual category retrieval
export const CategoryDetailsSchema = z.object({
  includeRelations: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
});

// Category Reorder Schema
export const CategoryReorderSchema = z.object({
  prevSortOrder: z.number().int().nullable().optional(),
  nextSortOrder: z.number().int().nullable().optional(),
});

// Export types
export type CategoryBase = z.infer<typeof CategoryBaseSchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>;
export type CategoryId = z.infer<typeof CategoryIdSchema>;
export type CategorySlug = z.infer<typeof CategorySlugSchema>;
export type BulkCategoryUpdate = z.infer<typeof BulkCategoryUpdateSchema>;
export type BulkCategoryDelete = z.infer<typeof BulkCategoryDeleteSchema>;
export type CategorySortUpdate = z.infer<typeof CategorySortUpdateSchema>;
export type CategoryTree = z.infer<typeof CategoryTreeSchema>;
export type CategoryMove = z.infer<typeof CategoryMoveSchema>;
export type CategoryReorder = z.infer<typeof CategoryReorderSchema>;
export type ParentCategoryId = z.infer<typeof ParentCategoryIdSchema>;
export type CategoryDetails = z.infer<typeof CategoryDetailsSchema>;
