import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// ================================
// ADMIN AUTHENTICATION SCHEMAS
// ================================

export const AdminLoginSchema = z.object({
  email: z.email('Invalid email format').max(255, 'Email is too long'),
  password: z.string().min(1, 'Password is required').max(100, 'Password is too long'),
});

export const AdminRefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ================================
// ADMIN MANAGEMENT SCHEMAS
// ================================

export const CreateAdminSchema = z.object({
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
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .or(z.literal(''))
    .optional(),
  telegramUsername: z
    .string()
    .min(5, 'Telegram username must be at least 5 characters')
    .max(32, 'Telegram username is too long')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Telegram username can only contain letters, numbers, and underscores'
    )
    .or(z.literal(''))
    .optional(),
  role: z.enum(['ADMIN', 'MODERATOR']).optional(), // Allow specifying role
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(), // Required when role is MODERATOR - links to custom Role
});

// ================================
// ADMIN SESSION SCHEMAS
// ================================

export const AdminSessionIdSchema = z.object({
  sessionId: z.uuid('Invalid session ID format'),
});

export const RevokeAdminSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
});

// ================================
// ADMIN QUERY SCHEMAS
// ================================

export const AdminQuerySchema = PaginationSchema.extend({
  limit: z
    .string()
    .optional()
    .default('20') // Override default to 20 for admins
    .refine((val) => /^\d+$/.test(val), 'Limit must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  search: z.string().max(100, 'Search term is too long').optional(),
  isActive: BooleanSchemaString,
  isVerified: BooleanSchemaString,
  isBanned: BooleanSchemaString,
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastLoginAt', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  role: z.enum(['ADMIN', 'MODERATOR']).optional(),
});

// ================================
// ADMIN UPDATE SCHEMAS
// ================================

export const UpdateAdminSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .or(z.literal(''))
    .optional(),
  telegramUsername: z
    .string()
    .min(5, 'Telegram username must be at least 5 characters')
    .max(32, 'Telegram username is too long')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Telegram username can only contain letters, numbers, and underscores'
    )
    .or(z.literal(''))
    .optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(['ADMIN', 'MODERATOR']).optional(),
  roleId: z.number().int().positive().optional().nullable(),
});

export const AdminPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(100, 'New password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'New password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ================================
// ADMIN ID SCHEMA
// ================================

export const AdminIdSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error('Invalid admin ID');
    }
    return num;
  }),
});
