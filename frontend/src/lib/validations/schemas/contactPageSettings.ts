import { z } from 'zod'

// === Helper Types ===
const optionalStr = () => z.string().optional()
const relaxedUrl = () => z.union([z.string(), z.literal(''), z.literal(null)]).optional()

// === Main Site Settings Schema ===
export const siteSettingsSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: optionalStr(),
  address: optionalStr(),
  website: relaxedUrl(),
  // Contact Page additions
  businessHours: optionalStr(),
  supportMessage: optionalStr(),
  supportTicket: z
    .object({
      enabled: z.boolean().optional(),
      supportEmail: z.string().email().optional().or(z.literal('')),
      buttonText: optionalStr(),
      successMessage: optionalStr()
    })
    .optional()
})

export type SiteSettings = z.infer<typeof siteSettingsSchema>
