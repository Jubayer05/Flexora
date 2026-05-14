import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema'

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\+?[1-9]\d{1,14}$/.test(value), {
    message: 'Invalid phone number format'
  })
  .optional()

const optionalTelegramUsernameSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || (value.length >= 5 && value.length <= 32), {
    message: 'Telegram username must be 5 to 32 characters long'
  })
  .optional()

// ================================
// BASE SCHEMAS
// ================================

export const UserIdSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10)
    if (isNaN(num)) {
      throw new Error('Invalid user ID')
    }
    return num
  })
})

// ================================
// AUTHENTICATION SCHEMAS
// ================================

export const RegisterSchema = z.object({
  email: z.email('Valid Email is required').max(255, 'Email is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: z
    .string()
    // .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  telegramUsername: z.string().optional(),
  country: z.string().optional(),
  ref: z.string().max(100, 'Referral code is too long').optional()
})

export const LoginSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long'),
  password: z.string().min(1, 'Password is required').max(100, 'Password is too long')
})

export const GuestLoginSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long')
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export const PasswordResetRequestSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long')
})

export const PasswordResetSchema = z
  .object({
    resetToken: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password is too long'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export const EmailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

export const EmailVerificationCodeSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  captchaToken: z.string().optional()
})

export const ResendVerificationSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long')
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password is too long')
})

// ================================
// USER MANAGEMENT SCHEMAS
// ================================

export const CreateUserSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .optional(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: z.string().optional(),
  telegramUsername: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['CUSTOMER', 'GUEST'] as const).optional(),
  isGuest: z.boolean().optional(),
  referredById: z.number().int().positive().optional(),
  meta: z.record(z.string(), z.any()).optional()
})

export const UpdateUserSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .optional(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: z.string().optional(),
  telegramUsername: z.string().optional(),
  role: z.enum(['ADMIN', 'CUSTOMER', 'GUEST'] as const).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500, 'Ban reason is too long').optional(),
  tags: z.array(z.string().max(50, 'Tag is too long')).optional(),
  note: z.string().max(1000, 'Note is too long').optional(),
  meta: z.record(z.string(), z.any()).optional(),
  photoUrl: z.string().url('Invalid image URL').optional().or(z.literal(''))
})

export const UpdateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: optionalPhoneSchema,
  telegramUsername: optionalTelegramUsernameSchema,
  photoUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  email: z.email('Invalid email format').max(255, 'Email is too long').optional()
})

// ================================
// QUERY SCHEMAS
// ================================

export const UserQuerySchema = PaginationSchema.extend({
  limit: z
    .string()
    .optional()
    .default('20') // Override default to 20 for users
    .refine((val) => /^\d+$/.test(val), 'Limit must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  search: z.string().max(100, 'Search term is too long').optional(),
  role: z.enum(['ADMIN', 'CUSTOMER', 'GUEST', 'MODERATOR'] as const).optional(),
  isActive: BooleanSchemaString,
  isVerified: BooleanSchemaString,
  isBanned: BooleanSchemaString,
  isGuest: BooleanSchemaString,
  country: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'totalSpent', 'totalOrders', 'lastLoginAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// ================================
// ADMIN SCHEMAS
// ================================

export const BanUserSchema = z.object({
  reason: z.string().min(1, 'Ban reason is required').max(500, 'Ban reason is too long')
})

export const SetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
})

export const BulkUserUpdateSchema = z.object({
  userIds: z
    .array(z.number().positive('User ID must be positive'))
    .min(1, 'At least one user ID is required')
    .max(100, 'Too many user IDs provided'),
  data: UpdateUserSchema
})

export const BulkUserDeleteSchema = z.object({
  userIds: z
    .array(z.number().positive('User ID must be positive'))
    .min(1, 'At least one user ID is required')
    .max(100, 'Too many user IDs provided')
})

// ================================
// SESSION SCHEMAS
// ================================

export const SessionIdSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
})

export const RevokeSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
})

// ================================
// GUEST CONVERSION SCHEMA
// ================================

export const ConvertGuestSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username is too long')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password is too long'),
    confirmPassword: z.string(),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export type CreateUserData = z.infer<typeof CreateUserSchema>
export type UpdateUserData = z.infer<typeof UpdateUserSchema>
export type UserQueryParams = z.infer<typeof UserQuerySchema>
export type PasswordChangeData = Omit<z.infer<typeof ChangePasswordSchema>, 'confirmPassword'>
export type ConvertGuestData = Omit<z.infer<typeof ConvertGuestSchema>, 'confirmPassword'>
export type BulkUserUpdateData = z.infer<typeof BulkUserUpdateSchema>
export type BulkUserDeleteData = z.infer<typeof BulkUserDeleteSchema>
export type LoginCredentials = z.infer<typeof LoginSchema>
export type RegisterData = Omit<z.infer<typeof RegisterSchema>, 'confirmPassword'>
export type GuestLoginData = z.infer<typeof GuestLoginSchema>
export type PasswordResetRequestData = z.infer<typeof PasswordResetRequestSchema>
export type PasswordResetData = Omit<z.infer<typeof PasswordResetSchema>, 'confirmPassword'>
export type EmailVerificationData = z.infer<typeof EmailVerificationSchema>
export type EmailVerificationCodeData = z.infer<typeof EmailVerificationCodeSchema>
export type ResendVerificationData = z.infer<typeof ResendVerificationSchema>
