import { z } from 'zod'

const providerSchema = (provider: string) =>
  z
    .object({
      isActive: z.boolean(),
      appId: z.string().optional().nullable(),
      appSecret: z.string().optional().nullable()
    })
    .superRefine((val, ctx) => {
      if (val.isActive) {
        if (!val.appId?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['appId'],
            message: `${provider} Client/App ID is required when enabled`
          })
        }
        if (!val.appSecret?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['appSecret'],
            message: `${provider} Client/App Secret is required when enabled`
          })
        }
      }
    })

export const SocialLoginSettingsSchema = z.object({
  google: providerSchema('Google'),
  facebook: providerSchema('Facebook'),
  twitter: providerSchema('Twitter'),
  telegram: providerSchema('Telegram')
})

export type SocialLoginSettingsType = z.infer<typeof SocialLoginSettingsSchema>
