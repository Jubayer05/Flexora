import { BalanceTransactionType } from '@prisma/client';
import { z } from 'zod';

// ================================
// ADMIN BALANCE OPERATIONS
// ================================

export const AddBalanceSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(0.01, 'Minimum amount is $0.01'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  type: z.enum(['BONUS', 'ADJUSTMENT', 'DEPOSIT']).optional().default('ADJUSTMENT'),
});

export const DeductBalanceSchema = z.object({
  amount: z.number().positive('Amount must be positive').min(0.01, 'Minimum amount is $0.01'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
});

export const BulkAddBalanceSchema = z.object({
  userIds: z.array(z.number()).min(1, 'At least one user ID is required'),
  amount: z.number().positive('Amount must be positive').min(0.01, 'Minimum amount is $0.01'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  type: z.enum(['BONUS', 'ADJUSTMENT']).optional().default('BONUS'),
});

// ================================
// BALANCE HISTORY
// ================================

export const BalanceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.nativeEnum(BalanceTransactionType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ================================
// REFUND TO BALANCE
// ================================

export const RefundToBalanceSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().optional(),
});

// ================================
// TYPE EXPORTS
// ================================

export type AddBalanceInput = z.infer<typeof AddBalanceSchema>;
export type DeductBalanceInput = z.infer<typeof DeductBalanceSchema>;
export type BulkAddBalanceInput = z.infer<typeof BulkAddBalanceSchema>;
export type BalanceHistoryQuery = z.infer<typeof BalanceHistoryQuerySchema>;
export type RefundToBalanceInput = z.infer<typeof RefundToBalanceSchema>;
