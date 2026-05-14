import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// Enums
export const TelegramTransferStatus = z.enum([
  'PENDING',
  'VERIFICATION_REQUIRED',
  'CUSTOMER_JOINED',
  'TRANSFER_IN_PROGRESS',
  'COMPLETED',
  'FAILED',
]);

// Base Telegram Transfer Schema
export const TelegramTransferBaseSchema = z.object({
  orderItemId: z.number().int().positive('Order Item ID must be a positive integer'),
  targetUrl: z.url('Invalid target URL'),
  customerTelegram: z.string().regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Invalid Telegram username'),
  meta: z.record(z.string(), z.any()).optional(),
});

// Create Telegram Transfer Schema
export const CreateTelegramTransferSchema = TelegramTransferBaseSchema.extend({
  autoVerify: z.boolean().default(false),
  notifyCustomer: z.boolean().default(true),
});

// Update Telegram Transfer Schema
export const UpdateTelegramTransferSchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
  status: TelegramTransferStatus.optional(),
  targetUrl: z.url('Invalid target URL').optional(),
  customerTelegram: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Invalid Telegram username')
    .optional(),
  joinVerified: z.boolean().optional(),
  screenshotUrl: z.url('Invalid screenshot URL').optional(),
  proofData: z.record(z.string(), z.any()).optional(),
  failureReason: z.string().max(500, 'Failure reason must be less than 500 characters').optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// Telegram Transfer Query Schema
export const TelegramTransferQuerySchema = PaginationSchema.extend({
  orderItemId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Order Item ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'Order Item ID must be positive'),
  status: TelegramTransferStatus.optional(),
  customerTelegram: z.string().optional(),
  joinVerified: BooleanSchemaString,
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'status', 'transferCompletedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeOrder: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
});

// Telegram Transfer ID Schema
export const TelegramTransferIdSchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
});

// Join Verification Schema
export const JoinVerificationSchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
  verified: z.boolean(),
  verificationMethod: z.enum(['manual', 'api', 'screenshot']).default('manual'),
  verificationData: z.record(z.string(), z.any()).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Transfer Execution Schema
export const TransferExecutionSchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
  executionMethod: z.enum(['python_script', 'manual', 'api']).default('python_script'),
  scriptParams: z.record(z.string(), z.any()).optional(),
  generateProof: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(true),
});

// Transfer Retry Schema
export const TransferRetrySchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
  retryReason: z
    .string()
    .min(1, 'Retry reason is required')
    .max(500, 'Retry reason must be less than 500 characters'),
  resetStatus: z.boolean().default(false), // Whether to reset status to PENDING
  maxRetries: z.number().int().min(1).max(10).default(3),
});

// Bulk Transfer Operations Schema
export const BulkTransferUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one transfer ID is required'),
  updates: z.object({
    status: TelegramTransferStatus.optional(),
    joinVerified: z.boolean().optional(),
  }),
});

// Transfer Analytics Schema
export const TransferAnalyticsSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  groupBy: z.enum(['day', 'week', 'month', 'status']).default('day'),
  metrics: z
    .array(z.enum(['count', 'successRate', 'avgCompletionTime', 'retryRate']))
    .default(['count', 'successRate']),
  filterBy: z
    .object({
      status: z.array(TelegramTransferStatus).optional(),
      customerTelegram: z.string().optional(),
    })
    .optional(),
});

// Telegram Entity Info Schema (for URL validation)
export const TelegramEntityInfoSchema = z.object({
  url: z.url('Invalid URL'),
  validateAccess: z.boolean().default(true),
  extractMetadata: z.boolean().default(true),
});

// Customer Verification Schema
export const CustomerVerificationSchema = z.object({
  transferId: z.number().int().positive('Transfer ID must be a positive integer'),
  customerTelegram: z.string().regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Invalid Telegram username'),
  verificationCode: z.string().optional(),
  autoJoinCheck: z.boolean().default(true),
});

// Transfer Status Update Schema
export const TransferStatusUpdateSchema = z.object({
  id: z.number().int().positive('Transfer ID must be a positive integer'),
  status: TelegramTransferStatus,
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  notifyCustomer: z.boolean().default(true),
  updateTimestamp: z.boolean().default(true),
});

// ================================
// TELEGRAM OTP SCHEMAS (SIMPLIFIED)
// ================================

// Simplified OTP Request Schema
export const OTPRequestSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  orderNumber: z.string().min(1, 'Order number is required').optional(),
  guestEmail: z.string().email('Invalid email address').optional(),
});

// Export types
export type TelegramTransferBase = z.infer<typeof TelegramTransferBaseSchema>;
export type CreateTelegramTransfer = z.infer<typeof CreateTelegramTransferSchema>;
export type UpdateTelegramTransfer = z.infer<typeof UpdateTelegramTransferSchema>;
export type TelegramTransferQuery = z.infer<typeof TelegramTransferQuerySchema>;
export type TelegramTransferId = z.infer<typeof TelegramTransferIdSchema>;
export type JoinVerification = z.infer<typeof JoinVerificationSchema>;
export type TransferExecution = z.infer<typeof TransferExecutionSchema>;
export type TransferRetry = z.infer<typeof TransferRetrySchema>;
export type BulkTransferUpdate = z.infer<typeof BulkTransferUpdateSchema>;
export type TransferAnalytics = z.infer<typeof TransferAnalyticsSchema>;
export type TelegramEntityInfo = z.infer<typeof TelegramEntityInfoSchema>;
export type CustomerVerification = z.infer<typeof CustomerVerificationSchema>;
export type TransferStatusUpdate = z.infer<typeof TransferStatusUpdateSchema>;

// Simplified OTP type
export type OTPRequest = z.infer<typeof OTPRequestSchema>;
