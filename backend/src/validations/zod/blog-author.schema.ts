import { z } from 'zod'

export const createBlogAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  email: z.string().max(255).optional().default(''),
  bio: z.string().max(5000).optional().nullable()
})

export const updateBlogAuthorSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().max(255).optional().default(''),
    bio: z.string().max(5000).optional().nullable(),
    isActive: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })

export const blogAuthorParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number)
})

export const blogAuthorQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional()
})

export type CreateBlogAuthorInput = z.infer<typeof createBlogAuthorSchema>
export type UpdateBlogAuthorInput = z.infer<typeof updateBlogAuthorSchema>
export type BlogAuthorParams = z.infer<typeof blogAuthorParamsSchema>
export type BlogAuthorQuery = z.infer<typeof blogAuthorQuerySchema>
