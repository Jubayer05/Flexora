import { z } from 'zod';

/**
 * Customer: Create withdrawal request
 */
export const CreateWithdrawalSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .refine((val) => val >= 1, 'Minimum withdrawal amount is $1'),
  method: z.string().min(1, 'Payment method is required'),
  meta: z.record(z.string(), z.any()).optional(), // For account details like wallet address, bank info, etc.
  source: z.enum(['balance', 'referral']).optional().default('balance'), // Deduct from main balance or referral earnings
});

/**
 * Admin: Update withdrawal status
 */
export const UpdateWithdrawalSchema = z.object({
  status: z.enum(['PENDING', 'DONE']).optional(),
  method: z.string().optional(),
  amount: z.number().positive().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type CreateWithdrawal = z.infer<typeof CreateWithdrawalSchema>;
export type UpdateWithdrawal = z.infer<typeof UpdateWithdrawalSchema>;
