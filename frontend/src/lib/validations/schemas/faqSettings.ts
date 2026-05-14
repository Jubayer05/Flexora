import { z } from 'zod'
import { titleSubtitleDescSchema } from './homepageSettings'

const faqs = z.object({
  question: z.string().optional(),
  answer: z.string().optional()
})

const groups = z.object({
  name: z.string().optional(),
  faqs: z.array(faqs).optional()
})

export const faqSettingsSchema = z.object({
  title: z
    .string()
    .nonempty({ message: 'Title is required' })
    .min(2, { message: 'Title must be at least 2 characters' }),

  description: z.string().max(255).optional(),
  groups: z.array(groups).optional()
})

export const homepageFaqSchema = titleSubtitleDescSchema.extend({
  faqs: z.array(faqs).optional()
})

export type FaqSettings = z.infer<typeof faqSettingsSchema>
export type HomepageFaqType = z.infer<typeof homepageFaqSchema>
