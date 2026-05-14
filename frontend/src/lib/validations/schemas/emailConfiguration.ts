import { z } from 'zod'

// === Helper Types ===
const optionalStr = () => z.string().min(2, 'required') //.optional()
const smtpPortSchema = z.preprocess(
  (value) => {
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') return value.trim()
    return value
  },
  z
    .string()
    .min(1, 'SMTP port is required')
    .regex(/^\d+$/, 'SMTP port must contain only numbers')
)

// ===  Email Configurations Schema ===
export const emailConfigurationSchema = z.object({
  smtpHost: optionalStr(),
  smtpPort: smtpPortSchema,
  mailFromName: optionalStr(),
  mailFromEmail: optionalStr(),
  smtpUsername: optionalStr(),
  smtpPassword: optionalStr()
})

export type EmailConfiguration = z.infer<typeof emailConfigurationSchema>
