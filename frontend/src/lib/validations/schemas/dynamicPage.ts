import { z } from 'zod'

export const dynamicPageSchema = z.object({
  title: z
    .string()
    .nonempty({ message: 'Title is required' })
    .min(2, { message: 'Title must be at least 2 characters' }),

  description: z.string().optional()
})

export type DynamicPageSchema = z.infer<typeof dynamicPageSchema>
