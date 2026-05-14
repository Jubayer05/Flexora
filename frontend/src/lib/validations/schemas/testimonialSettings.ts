import { z } from 'zod'
import { titleSubtitleDescSchema } from './homepageSettings'

const testimonial = z.object({
  name: z.string().optional(),
  designation: z.string().optional(),
  company: z.string().optional(),
  avatar: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().optional()
})

const testimonialGroup = z.object({
  name: z.string().optional(),
  testimonials: z.array(testimonial).optional()
})

export const testimonialSettingsSchema = z.object({
  title: z
    .string()
    .nonempty({ message: 'Title is required' })
    .min(2, { message: 'Title must be at least 2 characters' }),

  description: z.string().max(255).optional(),
  groups: z.array(testimonialGroup).optional()
})

export const homepageTestimonialSchema = titleSubtitleDescSchema.extend({
  testimonials: z.array(testimonial).optional()
})

export type TestimonialSettings = z.infer<typeof testimonialSettingsSchema>
export type HomepageTestimonialType = z.infer<typeof homepageTestimonialSchema>
export type TestimonialType = z.infer<typeof testimonial>
