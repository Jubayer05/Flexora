import { z } from 'zod'

// Google reCAPTCHA
export const RecaptchaSettingsSchema = z
  .object({
    isActive: z.boolean(),
    siteKey: z.string().optional().nullable(),
    secretKey: z.string().optional().nullable()
    // version: z.enum(['v2', 'v3']).default('v3'),
    // scoreThreshold: z.number().min(0).max(1).optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.isActive) {
      if (!val.siteKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['siteKey'],
          message: 'Site key is required'
        })
      }
      if (!val.secretKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['secretKey'],
          message: 'Secret key is required'
        })
      }
    }
  })

// Trustpilot
export const TrustpilotSettingsSchema = z
  .object({
    isActive: z.boolean(),
    businessUnitId: z.string().optional().nullable(),
    apiKey: z.string().optional().nullable()
    // locale: z.string().optional().nullable(),
    // templateId: z.string().optional().nullable(),
    // reviewLink: z.string().optional().nullable(),
    // scriptSrc: z.string().optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.isActive && !val.businessUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['businessUnitId'],
        message: 'Business Unit ID is required'
      })
    }
  })

// Google Analytics (GA4 / gtag)
export const GoogleAnalyticsSettingsSchema = z
  .object({
    isActive: z.boolean(),
    trackingId: z.string().optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.isActive && !val.trackingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trackingId'],
        message: 'Tracking ID is required'
      })
    }
  })

// Microsoft Clarity
export const MicrosoftClaritySettingsSchema = z
  .object({
    isActive: z.boolean(),
    projectId: z.string().optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.isActive && !val.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projectId'],
        message: 'Project ID is required'
      })
    }
  })

// Cloudflare Turnstile
export const CloudflareTurnstileSettingsSchema = z
  .object({
    isActive: z.boolean(),
    siteKey: z.string().optional().nullable(),
    secretKey: z.string().optional().nullable()
    // widgetTheme: z.enum(['auto', 'light', 'dark']).default('auto')
  })
  .superRefine((val, ctx) => {
    if (val.isActive) {
      if (!val.siteKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['siteKey'],
          message: 'Site key is required'
        })
      }
      if (!val.secretKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['secretKey'],
          message: 'Secret key is required'
        })
      }
    }
  })

// GetButton.io
export const GetButtonSettingsSchema = z.object({
  isActive: z.boolean(),
  widgetId: z.string().optional().nullable()
  // whatsappNumber: z.string().optional().nullable(),
  // phoneNumber: z.string().optional().nullable(),
  // text: z.string().optional().nullable(),
  // position: z.enum(['left', 'right']).default('right'),
  // scriptSrc: z.string().optional().nullable()
})

// Tawk.to
export const TawkToSettingsSchema = z
  .object({
    isActive: z.boolean(),
    propertyId: z.string().optional().nullable(),
    widgetId: z.string().optional().nullable()
  })
  .superRefine((val, ctx) => {
    if (val.isActive) {
      if (!val.propertyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['propertyId'],
          message: 'Property ID is required'
        })
      }
      if (!val.widgetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['widgetId'],
          message: 'Widget ID is required'
        })
      }
    }
  })

export const AddonsSettingsSchema = z.object({
  recaptcha: RecaptchaSettingsSchema,
  trustpilot: TrustpilotSettingsSchema,
  googleAnalytics: GoogleAnalyticsSettingsSchema,
  microsoftClarity: MicrosoftClaritySettingsSchema,
  cloudflareTurnstile: CloudflareTurnstileSettingsSchema,
  getButton: GetButtonSettingsSchema,
  tawkTo: TawkToSettingsSchema
})

export type AddonsSettingsType = z.infer<typeof AddonsSettingsSchema>
