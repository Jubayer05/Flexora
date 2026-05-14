import { z } from 'zod'

export const CreateDeliveryTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  thankYouMessage: z.string().optional().nullable(),
  couponPromotionText: z.string().optional().nullable(),
  supportContactInfo: z.string().optional().nullable(),
  feedbackRequestText: z.string().optional().nullable(),
  credentialsHeader: z.string().default('ACCOUNT CREDENTIALS'),
  credentialsFormat: z
    .string()
    .default('____ {{itemName}} - Order #{{orderNumber}} Quantity: {{quantity}} ____'),
  credentialsFooter: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

export const UpdateDeliveryTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  thankYouMessage: z.string().optional().nullable(),
  couponPromotionText: z.string().optional().nullable(),
  supportContactInfo: z.string().optional().nullable(),
  feedbackRequestText: z.string().optional().nullable(),
  credentialsHeader: z.string().optional(),
  credentialsFormat: z.string().optional(),
  credentialsFooter: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export type CreateDeliveryTemplate = z.infer<typeof CreateDeliveryTemplateSchema>
export type UpdateDeliveryTemplate = z.infer<typeof UpdateDeliveryTemplateSchema>

export const CreateAuthEmailTemplateSchema = z.object({
  type: z
    .enum(['VERIFICATION_CODE', 'WELCOME_EMAIL', 'PASSWORD_RESET', 'EMAIL_CONFIRMATION'])
    .describe('Email template type'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  isActive: z.boolean().default(true)
})

export const UpdateAuthEmailTemplateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').optional(),
  body: z.string().min(1, 'Body is required').optional(),
  isActive: z.boolean().optional()
})

export type CreateAuthEmailTemplate = z.infer<typeof CreateAuthEmailTemplateSchema>
export type UpdateAuthEmailTemplate = z.infer<typeof UpdateAuthEmailTemplateSchema>
