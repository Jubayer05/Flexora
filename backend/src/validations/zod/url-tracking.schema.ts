import { z } from 'zod'

const VALID_SLUG = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/

export const UrlTrackingPageTypeEnum = z.enum(['existing', 'non-existing'])

export const CreateUrlTrackingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  url: z.string().min(1).refine((v) => {
    try {
      return new URL(v).href === v
    } catch {
      return false
    }
  }, 'Invalid URL'),
  slug: z.string().min(1).max(200),
  isActive: z.boolean().default(true),
  pageType: UrlTrackingPageTypeEnum.default('non-existing')
})

export const UpdateUrlTrackingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional(),
  slug: z.string().min(1).max(200).regex(VALID_SLUG).optional(),
  isActive: z.boolean().optional(),
  pageType: UrlTrackingPageTypeEnum.optional()
})

export const TrackClickSchema = z.object({
  slug: z.string().min(1),
  visitorId: z.string().min(1, 'Visitor ID is required'),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      deviceType: z.string().optional(),
      browser: z.string().optional(),
      os: z.string().optional(),
      userAgent: z.string().optional(),
      screenResolution: z.string().optional()
    })
    .optional()
})

export const UrlTrackingQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
})

export const AnalyticsQuerySchema = z.object({
  period: z.enum(['1day', '7days', '30days', 'all']).optional().default('all')
})

export type CreateUrlTrackingInput = z.infer<typeof CreateUrlTrackingSchema>
export type UpdateUrlTrackingInput = z.infer<typeof UpdateUrlTrackingSchema>
export type TrackClickInput = z.infer<typeof TrackClickSchema>
export type UrlTrackingQueryInput = z.infer<typeof UrlTrackingQuerySchema>
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>
