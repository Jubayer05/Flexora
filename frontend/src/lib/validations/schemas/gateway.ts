import { z } from 'zod'

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE'
}

export const paymentMethodSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Payment method name is required'),
  gateway: z.string().min(1, 'Gateway is required'),
  thumbnail: z.string().optional(),
  apiKey: z.string().nullable().optional(),
  apiSecret: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  webhookSecret: z.string().nullable().optional(),
  minAmount: z.number().nonnegative(),
  bonusThreshold: z.number().nonnegative(),
  bonus: z.number().min(0).max(100), // Percentage 0-100
  feeType: z.nativeEnum(DiscountType),
  feeValue: z.number().min(0).max(100), // Percentage or fixed amount
  isActive: z.boolean()
})

// Export types
export type PaymentMethodType = z.infer<typeof paymentMethodSchema>
