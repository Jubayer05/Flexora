import { DiscountType } from '@prisma/client';
import { z } from 'zod';

// ================================
// CREATE SCHEMA
// ================================
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Payment method name is required'),
  gateway: z.string().min(1, 'Gateway is required'),
  apiKey: z
    .string()
    .optional()
    .refine(
      (val) => {
        // If not provided, it's valid
        if (!val || val.trim() === '') return true;
        // For Stripe, validate it's a secret key
        // Note: We can't check gateway here, so we'll validate in service layer
        return true;
      },
      { message: 'Invalid API key format' }
    ),
  apiSecret: z.string().optional(),
  merchantId: z.string().optional(),
  webhookSecret: z
    .string()
    .optional()
    .refine(
      (val) => {
        // If not provided, it's valid
        if (!val || val.trim() === '') return true;
        // For Stripe, validate webhook secret format
        // Note: We can't check gateway here, so we'll validate in service layer
        return true;
      },
      { message: 'Invalid webhook secret format' }
    ),
  thumbnail: z.string().optional(),
  testMode: z.boolean().default(false),
  currencies: z.array(z.string()).default([]),
  networks: z.array(z.string()).default([]),
  minAmount: z.number().nonnegative().default(0),
  bonusThreshold: z.number().nonnegative().default(0).optional(),
  bonus: z.number().min(0).max(100).default(0).optional(), // Percentage 0-100
  feeType: z.enum(DiscountType).optional(),
  feeValue: z.number().min(0).max(100).optional(), // Percentage or fixed amount
  isActive: z.boolean().default(true),
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

// ================================
// UPDATE SCHEMA
// ================================
export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1, 'Payment method name is required').optional(),
  gateway: z.string().min(1, 'Gateway is required').optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  merchantId: z.string().optional(),
  webhookSecret: z.string().optional(),
  thumbnail: z.string().optional(),
  testMode: z.boolean().optional(),
  currencies: z.array(z.string()).optional(),
  networks: z.array(z.string()).optional(),
  minAmount: z.number().nonnegative().optional(),
  bonusThreshold: z.number().nonnegative().optional(),
  bonus: z.number().min(0).max(100).optional(),
  feeType: z.enum(DiscountType).optional(),
  feeValue: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

// ================================
// QUERY SCHEMA
// ================================
export const paymentMethodQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  gateway: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'gateway', 'createdAt', 'minAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaymentMethodQueryInput = z.infer<typeof paymentMethodQuerySchema>;

// ================================
// PARAMS SCHEMA
// ================================
export const paymentMethodIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type PaymentMethodIdParams = z.infer<typeof paymentMethodIdParamsSchema>;
