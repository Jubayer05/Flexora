import { z } from 'zod'

export const telegramSchema = z.object({
  general: z.object({
    token: z.string(),
    chatId: z.string()
  }),
  order: z.object({
    token: z.string(),
    chatId: z.string()
  }),
  transfer: z.object({
    token: z.string(),
    chatId: z.string()
  }),
  premium: z.object({
    token: z.string(),
    chatId: z.string()
  })
})

export type TelegramSchema = z.infer<typeof telegramSchema>

// system_telegram_config
