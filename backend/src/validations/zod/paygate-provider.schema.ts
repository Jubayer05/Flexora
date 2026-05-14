import { z } from 'zod';

export const payGateProviderTypeSchema = z.enum(['card', 'crypto', 'bank']);

export const payGateProviderSchema = z.object({
  code: z.string().min(1, 'Provider code is required'),
  name: z.string().min(1, 'Provider name is required'),
  type: payGateProviderTypeSchema,
  method: z.string().min(1).default('polygon/usdc'),
  regions: z.array(z.string().min(1)).default(['GLOBAL']),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().positive().default(1),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  feePercent: z.number().min(0).max(100).optional(),
  icon: z.string().optional(),
  description: z.string().optional()
});

export const payGateProviderQuerySchema = z.object({
  region: z.string().optional(),
  type: payGateProviderTypeSchema.optional(),
  includeInactive: z.coerce.boolean().optional().default(false)
});

export const updatePayGateProvidersSchema = z.object({
  providers: z.array(payGateProviderSchema).min(1, 'At least one provider is required')
});

export type PayGateProviderInput = z.infer<typeof payGateProviderSchema>;
export type PayGateProviderQueryInput = z.infer<typeof payGateProviderQuerySchema>;
export type UpdatePayGateProvidersInput = z.infer<typeof updatePayGateProvidersSchema>;
