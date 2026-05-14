import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// ===============================
// BLOG INPUT SCHEMAS
// ===============================

export const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  source: z.string().optional(),
  thumbnail: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).default([]),
  categoryId: z.number().int().positive('Category ID must be a positive integer').optional(),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().datetime('Invalid publish date format').optional(),
  meta: z.record(z.string(), z.any()).optional(),
  seo: z.record(z.string(), z.any()).optional(),
});

export const updateBlogSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(200, 'Slug too long')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only')
      .optional(),
    excerpt: z.string().optional(),
    content: z.string().min(1, 'Content is required').optional(),
    source: z.string().optional(),
    thumbnail: z.string().optional(),
    gallery: z.array(z.string().optional()).optional(),
    tags: z.array(z.string().min(1, 'Tag cannot be empty')).optional(),
    categoryId: z.number().int().positive('Category ID must be a positive integer').optional(),
    isPublished: z.boolean().optional(),
    publishedAt: z.string().datetime('Invalid publish date format').optional(),
    meta: z.record(z.string(), z.any()).optional(),
    seo: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const blogParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number),
});

export const blogSlugParamsSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

export const blogQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  tags: z.string().optional(), // Comma-separated tags
  isPublished: BooleanSchemaString,
  sortBy: z.enum(['title', 'views', 'publishedAt', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const blogStatsQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const bulkBlogActionSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one blog ID is required'),
  action: z.enum(['publish', 'unpublish', 'delete']),
});

// Bulk create blogs (auto-upload): multiple posts with category, author rotation, scheduling
export const bulkCreateBlogsSchema = z.object({
  blogs: z
    .array(
      z.object({
        title: z.string().min(1, 'Title is required').max(500),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        thumbnail: z.string().optional(),
      })
    )
    .min(1, 'At least one blog post is required'),
  categoryId: z.number().int().positive('Category is required'),
  subCategoryId: z.number().int().positive().optional(),
  authorRotation: z.boolean().default(true),
  selectedAuthorId: z.number().int().positive().optional(),
  timeBetweenPosts: z
    .object({
      min: z.number().min(0).default(1),
      max: z.number().min(0).default(1),
    })
    .default({ min: 1, max: 1 }),
});

// ===============================
// TYPE EXPORTS
// ===============================

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type BulkCreateBlogsInput = z.infer<typeof bulkCreateBlogsSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogParams = z.infer<typeof blogParamsSchema>;
export type BlogSlugParams = z.infer<typeof blogSlugParamsSchema>;
export type BlogQuery = z.infer<typeof blogQuerySchema>;
export type BlogStatsQuery = z.infer<typeof blogStatsQuerySchema>;
export type BulkBlogActionInput = z.infer<typeof bulkBlogActionSchema>;
