import { z } from 'zod'

// === Helper Types ===
const optionalStr = () => z.string()

// ===  Currency Schema ===
export const currencySchema = z.object({
  id: z.number().min(0).optional(),
  name: optionalStr(),
  code: optionalStr(),
  symbol: optionalStr(),
  exchangeRate: z.number().min(0),
  status: optionalStr().optional(),
  isDefault: z.boolean().default(false).optional()
})

export type CurrencyType = z.infer<typeof currencySchema>
