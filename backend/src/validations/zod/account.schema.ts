import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema'
import { PlatformType } from './product.schema'

// Base Account Schema
export const AccountBaseSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  platform: PlatformType,
  credentials: z.object({
    id: z.string().optional(),
    email: z.string().trim().optional(),
    password: z.string().optional(),
    phone: z.string().optional(),
    note: z.string().optional()
  }),
  isValid: z.boolean().default(true),
  requiresOtp: z.boolean().default(false),
  hasPremium: z.boolean().default(false),
  meta: z.any().optional()
})

// Create Account Schema
export const CreateAccountSchema = AccountBaseSchema

// Bulk Account Create Schema
export const BulkCreateAccountSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  platform: PlatformType,
  accounts: z
    .array(
      z.object({
        credentials: z.object({
          id: z.string().optional(),
          username: z.string().optional(),
          email: z.string().trim().optional(),
          password: z.string().optional(),
          phone: z.string().optional(),
          sessionData: z.string().optional(),
          additionalData: z.any().optional(),
          note: z.string().optional() // Customer-visible note
        }),
        isValid: z.boolean().default(true),
        requiresOtp: z.boolean().default(false),
        hasPremium: z.boolean().default(false),
        meta: z
          .object({
            adminNote: z.string().max(1000, 'Admin note must be less than 1000 characters').optional() // Admin-only private note
          })
          .passthrough()
          .optional()
      })
    )
    .min(1, 'At least one account is required')
    .max(1000, 'Cannot create more than 1000 accounts at once')
})

// Update Account Schema
export const UpdateAccountSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer').optional(),

  // Allow credentials at root level for easy frontend integration
  phone: z.string().optional(),
  email: z.string().trim().optional().or(z.literal('')),
  username: z.string().optional(),
  password: z.string().optional(),

  // Also allow nested credentials object for backward compatibility
  credentials: z
    .object({
      id: z.string().optional(),
      username: z.string().optional(),
      email: z.string().trim().optional(),
      password: z.string().optional(),
      phone: z.string().optional(),
      sessionData: z.string().optional(),
      additionalData: z.any().optional()
    })
    .optional(),
  isValid: z.boolean().optional(),
  requiresOtp: z.boolean().optional(),
  hasPremium: z.boolean().optional(),
  archived: z.boolean().optional(), // Allow archiving/unarchiving accounts
  isUsed: z.boolean().optional(), // Allow marking account as used/sold
  usedAt: z.string().datetime().optional().or(z.date().optional()), // Allow setting used timestamp
  meta: z.any().optional()
})

// Account Query/Filter Schema
export const AccountQuerySchema = PaginationSchema.extend({
  productId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Product ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'Product ID must be positive'),
  platform: PlatformType.optional(),
  isUsed: BooleanSchemaString,
  isValid: BooleanSchemaString,
  requiresOtp: BooleanSchemaString,
  hasPremium: BooleanSchemaString,
  archived: BooleanSchemaString, // Filter by archived status - defaults to false
  sortBy: z.enum(['createdAt', 'updatedAt', 'usedAt', 'platform']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeCredentials: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)) // For admin access only
})

// Account ID Schema
export const AccountIdSchema = z.object({
  id: z
    .string()
    .refine((val) => /^\d+$/.test(val), 'Account ID must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Account ID must be positive')
})

// Account Import Schema
export const AccountImportSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  platform: PlatformType,
  format: z.enum(['txt', 'csv', 'json']),
  data: z.string().min(1, 'Import data is required'),
  delimiter: z.string().default(':'), // For txt format (username:password)
  skipInvalid: z.boolean().default(true),
  validateCredentials: z.boolean().default(false)
})

// Account Export Schema
export const AccountExportSchema = z.object({
  productId: z.number().int().positive().optional(),
  platform: PlatformType.optional(),
  format: z.enum(['txt', 'csv', 'xlsx', 'json']).default('txt'),
  onlyUnused: z.boolean().default(false),
  onlyValid: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
  delimiter: z.string().default(':') // For txt format
})

// Bulk Account Operations
export const BulkAccountUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one account ID is required'),
  updates: z.object({
    isValid: z.boolean().optional(),
    requiresOtp: z.boolean().optional(),
    hasPremium: z.boolean().optional(),
    archived: z.boolean().optional() // Allow bulk archiving/unarchiving
  })
})

export const BulkAccountDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one account ID is required')
})

// Account Validation Schema
export const AccountValidationSchema = z.object({
  id: z.number().int().positive('Account ID must be a positive integer'),
  validateCredentials: z.boolean().default(true),
  updateStatus: z.boolean().default(true)
})

// Account Assignment Schema (for orders)
export const AccountAssignmentSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  platform: PlatformType.optional(),
  requiresOtp: z.boolean().optional(),
  hasPremium: z.boolean().optional(),
  excludeIds: z.array(z.number().int().positive()).optional() // Exclude specific account IDs
})

// Account Statistics Schema
export const AccountStatsSchema = z.object({
  productId: z.number().int().positive().optional(),
  platform: PlatformType.optional(),
  groupBy: z.enum(['product', 'platform', 'status', 'date']).default('product'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Export types
export type AccountBase = z.infer<typeof AccountBaseSchema>
export type CreateAccount = z.infer<typeof CreateAccountSchema>
export type BulkCreateAccount = z.infer<typeof BulkCreateAccountSchema>
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>
export type AccountQuery = z.infer<typeof AccountQuerySchema>
export type AccountId = z.infer<typeof AccountIdSchema>
export type AccountImport = z.infer<typeof AccountImportSchema>
export type AccountExport = z.infer<typeof AccountExportSchema>
export type BulkAccountUpdate = z.infer<typeof BulkAccountUpdateSchema>
export type BulkAccountDelete = z.infer<typeof BulkAccountDeleteSchema>
export type AccountValidation = z.infer<typeof AccountValidationSchema>
export type AccountAssignment = z.infer<typeof AccountAssignmentSchema>
export type AccountStats = z.infer<typeof AccountStatsSchema>

// Telegram-specific schemas
export const CreateTelegramAccountSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer').optional().nullable(),
  phone: z.string().min(5, 'Phone number is required'),
  password: z.string().optional(),
  sessionData: z.string().optional(),
  username: z.string().optional(),
  sessionFile: z.string().optional(),
  hasPremium: z.boolean().default(false),

  // Simplified meta information
  sessionString: z.string().optional(),
  notes: z.string().optional(),

  // Proxy configuration
  proxy: z
    .object({
      host: z.string(),
      port: z.number().int().min(1).max(65535),
      type: z.enum(['http', 'socks5']),
      username: z.string().optional(),
      password: z.string().optional()
    })
    .optional()
})

// Account access schema (for OTP verification)
export const AccountAccessSchema = z.object({
  accountId: z.number().int().positive('Account ID must be a positive integer'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits')
})

// Export Telegram types
export type CreateTelegramAccount = z.infer<typeof CreateTelegramAccountSchema>
export type AccountAccess = z.infer<typeof AccountAccessSchema>
