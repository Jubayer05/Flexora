import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// Enums
export const TransferTypeEnum = z.enum(['group', 'channel']);

export const TelegramOwnershipTransferStatus = z.enum([
  'PENDING',
  'VERIFICATION_REQUIRED',
  'CUSTOMER_JOINED',
  'TRANSFER_IN_PROGRESS',
  'WAITING_PERIOD',
  'COMPLETING',
  'COMPLETED',
  'FAILED',
]);

// Telegram URL validation helper
const telegramUrlRegex = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,}$/;

// Transfer Product Meta Schema (for product.meta field)
// Note: targetUrl is stored in product.telegramUrl (top level), not in meta
// Note: product.type = 'SERVICE' identifies this as a transfer product
export const TelegramOwnershipTransferProductMetaSchema = z.object({
  transferType: TransferTypeEnum,
  botAdded: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Bot must be added as admin to the group/channel before creating product',
    })
    .describe('Confirms that the platform bot has been added as admin to the group/channel'),
  members: z
    .number()
    .int()
    .min(0, 'Members count cannot be negative')
    .max(1000000000, 'Members count is too high'),
  originalOwner: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, 'Invalid Telegram username format')
    .optional(),
  transferNotes: z.string().max(500, 'Transfer notes must be less than 500 characters').optional(),
  yearCreated: z
    .number()
    .int()
    .min(2013, 'Telegram launched in 2013')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  chatId: z
    .string()
    .optional()
    .describe('Telegram chat ID (auto-detected by bot, optional for creation)'),
});

// Telegram username or phone validation
const telegramUsernameOrPhone = z
  .string()
  .min(1, 'Telegram username or phone is required')
  .refine(
    (val) => {
      // Check if it's a username (@username or username)
      const usernameRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
      // Check if it's a phone number (+1234567890)
      const phoneRegex = /^\+?[1-9]\d{10,14}$/;
      return usernameRegex.test(val) || phoneRegex.test(val);
    },
    {
      message: 'Must be a valid Telegram username or phone number',
    }
  );

// Create Telegram Transfer Schema
export const CreateOwnershipTransferSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  targetUrl: z.string().regex(telegramUrlRegex, 'Invalid Telegram URL'),
  transferType: TransferTypeEnum,
  customerTelegram: telegramUsernameOrPhone,
  meta: z.record(z.string(), z.any()).optional(),
});

// Update Ownership Transfer Schema
export const UpdateOwnershipTransferSchema = z.object({
  status: TelegramOwnershipTransferStatus.optional(),
  joinVerified: z.boolean().optional(),
  transferProofUrl: z.string().url('Invalid proof URL').optional(),
  proofFileId: z.number().int().positive().optional(),
  failureReason: z.string().max(500, 'Failure reason must be less than 500 characters').optional(),
  adminNotes: z.string().max(1000, 'Admin notes must be less than 1000 characters').optional(),
  manualOverride: z.boolean().optional(),
  verifiedBy: z.string().max(100, 'Verified by must be less than 100 characters').optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// Ownership Transfer ID Schema
export const OwnershipTransferIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Transfer ID must be a valid number')
    .transform((val) => parseInt(val, 10)),
});

// Verify Join Schema
export const VerifyOwnershipTransferJoinSchema = z.object({
  customerTelegram: telegramUsernameOrPhone.optional(), // Optional, can be taken from transfer record
});

// Retry Ownership Transfer Schema
export const RetryOwnershipTransferSchema = z.object({
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  adminUsername: z.string().max(100, 'Admin username must be less than 100 characters').optional(),
});

// Manual Complete Schema
export const ManualCompleteOwnershipTransferSchema = z.object({
  adminUsername: z.string().min(1, 'Admin username is required').max(100),
  proofUrl: z.string().url('Invalid proof URL').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Ownership Transfer Query/Filter Schema
export const TelegramOwnershipTransferQuerySchema = PaginationSchema.extend({
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Support comma-separated statuses
      return val.includes(',') ? val.split(',') : val;
    }),
  transferType: TransferTypeEnum.optional(),
  customerTelegram: z.string().optional(),
  joinVerified: BooleanSchemaString,
  search: z.string().optional(), // Search in targetUrl, customerTelegram, order number
  dateFrom: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  dateTo: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'completedAt', 'status', 'retryCount'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Python Microservice Schemas

// Execute Ownership Transfer Schema (for calling Python service)
export const ExecuteOwnershipTransferRequestSchema = z.object({
  transferId: z.number().int().positive(),
  targetUrl: z.string().regex(telegramUrlRegex),
  transferType: TransferTypeEnum,
  customerTelegram: telegramUsernameOrPhone,
  originalOwnerSession: z.string().min(1, 'Session data is required'),
  proxyConfig: z
    .object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      type: z.enum(['http', 'socks5']),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

// Generate Proof Schema
export const GenerateOwnershipTransferProofRequestSchema = z.object({
  transferId: z.number().int().positive(),
  targetUrl: z.string().regex(telegramUrlRegex),
  sessionData: z.string().min(1, 'Session data is required'),
  screenshotType: z.enum(['ownership', 'admin_rights', 'membership']).default('ownership'),
});

// Checkout Enhancement Schema (for collecting customer Telegram during checkout)
export const CheckoutOwnershipTransferSchema = z.object({
  customerTelegram: telegramUsernameOrPhone,
  preferredTransferDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  specialInstructions: z
    .string()
    .max(500, 'Special instructions must be less than 500 characters')
    .optional(),
});

// Transfer Product Creation/Update Enhancement
export const TelegramOwnershipTransferProductSchema = z.object({
  platform: z.literal('TELEGRAM'),
  type: z.literal('SERVICE'), // Transfer products are services
  telegramUrl: z
    .string()
    .min(1, 'Telegram URL is required')
    .regex(telegramUrlRegex, 'Invalid Telegram URL format (e.g., t.me/groupname)'),
  meta: TelegramOwnershipTransferProductMetaSchema,
});

// Export types
export type TransferType = z.infer<typeof TransferTypeEnum>;
export type TelegramOwnershipTransferProductMeta = z.infer<
  typeof TelegramOwnershipTransferProductMetaSchema
>;
export type CreateOwnershipTransfer = z.infer<typeof CreateOwnershipTransferSchema>;
export type UpdateOwnershipTransfer = z.infer<typeof UpdateOwnershipTransferSchema>;
export type OwnershipTransferId = z.infer<typeof OwnershipTransferIdSchema>;
export type VerifyOwnershipTransferJoin = z.infer<typeof VerifyOwnershipTransferJoinSchema>;
export type RetryOwnershipTransfer = z.infer<typeof RetryOwnershipTransferSchema>;
export type ManualCompleteOwnershipTransfer = z.infer<typeof ManualCompleteOwnershipTransferSchema>;
export type TelegramOwnershipTransferQuery = z.infer<typeof TelegramOwnershipTransferQuerySchema>;
export type GenerateOwnershipTransferProofRequest = z.infer<
  typeof GenerateOwnershipTransferProofRequestSchema
>;
export type CheckoutOwnershipTransfer = z.infer<typeof CheckoutOwnershipTransferSchema>;
export type TelegramOwnershipTransferProduct = z.infer<
  typeof TelegramOwnershipTransferProductSchema
>;
