import { z } from 'zod'

export const createBlogSubCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  slug: z.string().max(200).optional(),
  categoryId: z.number().int().positive('Category is required'),
  authorId: z.number().int().positive().optional().nullable()
})

export const updateBlogSubCategorySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().max(200).optional(),
    categoryId: z.number().int().positive().optional(),
    authorId: z.number().int().positive().optional().nullable()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })

export const blogSubCategoryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number)
})

export const blogSubCategoryQuerySchema = z.object({
  category: z.string().regex(/^\d+$/).transform(Number).optional()
})

export type CreateBlogSubCategoryInput = z.infer<typeof createBlogSubCategorySchema>
export type UpdateBlogSubCategoryInput = z.infer<typeof updateBlogSubCategorySchema>
export type BlogSubCategoryParams = z.infer<typeof blogSubCategoryParamsSchema>
export type BlogSubCategoryQuery = z.infer<typeof blogSubCategoryQuerySchema>
