import { z } from 'zod'

const menuSchema = z.object({
  title: z.string(),
  url: z.string()
})

const navGroupSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  children: z.array(menuSchema).optional()
})

export const navigationSchema = z.array(navGroupSchema)

export type NavSettings = z.infer<typeof navigationSchema>
