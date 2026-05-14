import { z } from 'zod'

// Email template types enum
export enum EmailTemplateTypeEnum {
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  VERIFICATION_EMAIL = 'VERIFICATION_EMAIL',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  TELEGRAM_ACCOUNT_DELIVERY = 'TELEGRAM_ACCOUNT_DELIVERY',
  TRANSFER_COMPLETION = 'TRANSFER_COMPLETION',
  PREMIUM_ACTIVATION = 'PREMIUM_ACTIVATION',
  SUPPORT_TICKET_UPDATE = 'SUPPORT_TICKET_UPDATE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  NEWSLETTER = 'NEWSLETTER',
  PROMOTIONAL = 'PROMOTIONAL'
}

// Email template schema (for form submission)
export const EmailTemplateSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  htmlBody: z.string().optional(),
  type: z.nativeEnum(EmailTemplateTypeEnum, {
    message: 'Please select a valid template type'
  }),
  isActive: z.boolean(),
  variables: z.array(z.string()),
  description: z.string().optional()
})

// Create email template schema (for API requests)
// Same as base schema - defaults are handled in form defaultValues
export const CreateEmailTemplateSchema = EmailTemplateSchema

// Update email template schema (for API requests)
export const UpdateEmailTemplateSchema = EmailTemplateSchema.partial().extend({
  id: z.number().optional()
})

// TypeScript types
export type EmailTemplateFormType = z.infer<typeof EmailTemplateSchema>
export type CreateEmailTemplateType = z.infer<typeof CreateEmailTemplateSchema>
export type UpdateEmailTemplateType = z.infer<typeof UpdateEmailTemplateSchema>

// Email template response type (matches API response)
export interface EmailTemplate {
  id: number
  type: EmailTemplateTypeEnum
  subject: string
  body: string
  htmlBody?: string | null
  isActive?: boolean
  variables?: string[]
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export type EmailTemplateResponseType = EmailTemplate
