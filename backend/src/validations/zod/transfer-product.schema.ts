import { z } from 'zod'
import { ProductBaseSchema } from './product.schema'

/**
 * Transfer Product Meta Schema
 * Specific structure for Telegram ownership transfer products
 */
export const TransferProductMetaSchema = z.object({
  // Transfer type: group or channel
  transferType: z.enum(['group', 'channel']).describe('Type of Telegram entity to transfer'),

  // Bot admin status - can be false if adding bot later
  botAdded: z.boolean().describe('Whether the transfer bot has been added as admin'),

  // Admin phone number for contact
  adminPhone: z
    .string()
    .min(1, 'Admin phone number is required')
    .describe('Admin/owner phone number for contact'),

  // Current member/subscriber count
  members: z
    .number()
    .int()
    .min(0, 'Members count cannot be negative')
    .describe('Current member/subscriber count')
    .optional(),

  // Original owner username or name
  originalOwner: z
    .string()
    .min(1, 'Original owner is required')
    .describe('Original owner username or name'),

  // Year the group/channel was created
  yearCreated: z
    .number()
    .int()
    .min(2013, 'Telegram was founded in 2013')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .describe('Year the group/channel was created')
    .optional(),

  assignedGroupsChannels: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]).optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        type: z.enum(['group', 'channel']),
        members: z.number().int().optional(),
        isPublic: z.boolean().optional(),
        description: z.string().optional(),
        url: z.string().min(1, 'Channel/Group URL is required'),
        accountId: z.union([z.number(), z.string()]).optional()
      })
    )
    .optional(),

  soldGroupsChannels: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]).optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        type: z.enum(['group', 'channel']),
        members: z.number().int().optional(),
        isPublic: z.boolean().optional(),
        description: z.string().optional(),
        url: z.string().min(1, 'Channel/Group URL is required'),
        accountId: z.union([z.number(), z.string()]).optional()
      })
    )
    .optional()
})

/**
 * Create Transfer Product Schema
 * Extends ProductBaseSchema with transfer-specific validations.
 * Slug is optional - backend will auto-generate from name if not provided.
 */
export const CreateTransferProductSchema = ProductBaseSchema.omit({ slug: true })
  .extend({
    sku: ProductBaseSchema.shape.sku.optional(),
    slug: z.string().optional(),
    thumbnail: z.union([z.string().min(2, 'Invalid thumbnail URL'), z.literal('')]).optional(),
  // Platform must be Telegram
  platform: z.literal('TELEGRAM'),

  // Support both legacy SERVICE and the new Telegram channels/groups type
  type: z.enum(['SERVICE', 'TELEGRAM_CHANNEL_GROUPS']),

  // Telegram URL is required for transfers
  telegramUrl: z
    .string()
    .min(1, 'Telegram URL is required for transfer products')
    .regex(
      /^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
      'Invalid Telegram URL format. Example: https://t.me/groupname'
    ),

  // Meta must follow TransferProductMetaSchema
  meta: TransferProductMetaSchema
  })

/**
 * Update Transfer Product Schema
 * Partial version for updates
 */
export const UpdateTransferProductSchema = CreateTransferProductSchema.partial().extend({
  id: z.number().int().positive('Product ID must be a positive integer'),
  sku: z.string().optional(), // SKU should be read-only in updates
  type: z.enum(['SERVICE', 'TELEGRAM_CHANNEL_GROUPS']).optional(),
  thumbnail: z.union([z.string().min(2, 'Invalid thumbnail URL'), z.literal('')]).optional()
})

/**
 * Verify Bot Admin Schema
 * For verifying bot is admin in target group/channel
 */
export const VerifyBotAdminSchema = z.object({
  telegramUrl: z
    .string()
    .min(1, 'Telegram URL is required')
    .regex(/^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/, 'Invalid Telegram URL format')
})

/**
 * Transfer Product Query Schema
 * For filtering transfer products specifically
 */
export const TransferProductQuerySchema = z.object({
  transferType: z.enum(['group', 'channel']).optional(),
  botAdded: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  hasPremium: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  minMemberCount: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Min member count must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  maxMemberCount: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Max member count must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  category: z.string().optional(),
  language: z.string().optional(),
  activityLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional()
})

// Export types
export type TransferProductMeta = z.infer<typeof TransferProductMetaSchema>
export type CreateTransferProduct = z.infer<typeof CreateTransferProductSchema>
export type UpdateTransferProduct = z.infer<typeof UpdateTransferProductSchema>
export type VerifyBotAdmin = z.infer<typeof VerifyBotAdminSchema>
export type TransferProductQuery = z.infer<typeof TransferProductQuerySchema>
