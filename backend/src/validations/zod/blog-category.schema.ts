import { z } from 'zod';
import { PaginationSchema } from '../common/pagination.schema';

// ===============================
// BLOG CATEGORY INPUT SCHEMAS
// ===============================

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
});

export const updateBlogCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Category name is required')
      .max(100, 'Category name too long')
      .optional(),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(100, 'Slug too long')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const blogCategoryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number),
});

export const blogCategoryQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ===============================
// TYPE EXPORTS
// ===============================

export type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryInput = z.infer<typeof updateBlogCategorySchema>;
export type BlogCategoryParams = z.infer<typeof blogCategoryParamsSchema>;
export type BlogCategoryQuery = z.infer<typeof blogCategoryQuerySchema>;
