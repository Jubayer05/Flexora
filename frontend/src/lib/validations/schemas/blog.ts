import { z } from 'zod'

/**
 * Blog Validation Schemas
 *
 * - CreateBlogSchema: For creating new blog posts (manual form fields)
 * - UpdateBlogSchema: For updating existing blog posts (includes ID)
 */

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim()


export const BlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().optional() // Auto-generated from name
})

// Create category schema (only name is required)
export const CreateBlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters')
})

// Update category schema
export const UpdateBlogCategorySchema = CreateBlogCategorySchema.partial().extend({
  id: z.number()
})

// Create blog schema – matches manual blog form: title, slug, image, content, author, tags, category, subCategory, publish options
export const CreateBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200),
  categoryId: z.number().optional().nullable(),
  subCategoryId: z.number().optional().nullable(),
  authorName: z.string().optional(),
  thumbnail: z.string().optional(),
  content: z
    .string()
    .transform((val) => val ?? '')
    .refine((val) => stripHtml(val).trim().length > 0, {
      message: 'Content is required'
    }),
  tags: z.array(z.string()),
  isPublished: z.boolean(),
  publishLater: z.boolean().optional(),
  publishedAt: z.string().optional()
})


// Update blog schema (same as create but with optional fields for partial updates)
export const UpdateBlogSchema = CreateBlogSchema.partial().extend({
  id: z.number()
})

// Type exports
export type BlogCategoryType = z.infer<typeof BlogCategorySchema>
export type CreateBlogCategoryType = z.infer<typeof CreateBlogCategorySchema>
export type UpdateBlogCategoryType = z.infer<typeof UpdateBlogCategorySchema>
export type CreateBlogType = z.infer<typeof CreateBlogSchema>
export type UpdateBlogType = z.infer<typeof UpdateBlogSchema>
