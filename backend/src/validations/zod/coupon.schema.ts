import { CouponScope, CouponStatus, CouponType } from '@prisma/client';
import { z } from 'zod';

// ================================
// COUPON ENUMS VALIDATION
// ================================

export const CouponTypeSchema = z.enum(CouponType);
export const CouponStatusSchema = z.enum(CouponStatus);
export const CouponScopeSchema = z.enum(CouponScope);

// ================================
// BASIC VALIDATIONS
// ================================

export const CouponIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const CouponCodeSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[A-Z0-9_-]+$/,
      'Coupon code must contain only uppercase letters, numbers, underscores, and hyphens'
    ),
});

// ================================
// QUERY SCHEMAS
// ================================

export const CouponQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: CouponStatusSchema.optional(),
  type: CouponTypeSchema.optional(),
  scope: CouponScopeSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'code', 'usageCount', 'expiresAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeExpired: z.coerce.boolean().default(false),
});

export const CouponStatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// ================================
// CREATE SCHEMA
// ================================

export const CreateCouponSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(50, 'Coupon code must not exceed 50 characters')
      .regex(
        /^[A-Z0-9_-]+$/,
        'Coupon code must contain only uppercase letters, numbers, underscores, and hyphens'
      )
      .transform((val) => val.toUpperCase()),

    name: z
      .string()
      .min(1, 'Coupon name is required')
      .max(100, 'Coupon name must not exceed 100 characters')
      .optional(),
    type: CouponTypeSchema,
    status: CouponStatusSchema.default(CouponStatus.ACTIVE),
    scope: CouponScopeSchema.default(CouponScope.ALL_PRODUCTS),
    // Discount configuration
    discountValue: z.number().min(0, 'Discount value must be positive'),
    // maxDiscountAmount: z.number().min(0, 'Maximum discount amount must be positive').optional(),
    // minOrderAmount: z.number().min(0, 'Minimum order amount must be positive').optional(),
    // Usage limits
    // usageLimit: z.number().int().min(1, 'Usage limit must be at least 1').optional(),
    // userUsageLimit: z.number().int().min(1, 'User usage limit must be at least 1').optional(),
    // Validity period
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),

    // Scope restrictions
    applicableProductIds: z.array(z.number().int().positive()).default([]),
    applicableCategoryIds: z.array(z.number().int().positive()).default([]),

    meta: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) => {
      // Validate percentage discount
      if (data.type === CouponType.PERCENTAGE && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      // Validate date range
      if (data.startsAt && data.expiresAt) {
        return new Date(data.startsAt) < new Date(data.expiresAt);
      }
      return true;
    },
    {
      message: 'Start date must be before expiry date',
      path: ['expiresAt'],
    }
  );

// ================================
// UPDATE SCHEMA
// ================================

export const UpdateCouponSchema = CreateCouponSchema.partial()
  .extend({
    id: z.number().int().positive(),
  });

// ================================
// BULK OPERATIONS
// ================================

export const BulkCouponUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one coupon ID is required'),
  data: z
    .object({
      status: CouponStatusSchema.optional(),
      expiresAt: z.string().datetime().optional(),
      usageLimit: z.number().int().min(1).optional(),
      userUsageLimit: z.number().int().min(1).optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, 'At least one field must be provided for update'),
});

export const BulkCouponDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one coupon ID is required'),
  confirmText: z.string().refine((val) => val === 'DELETE', "Please type 'DELETE' to confirm"),
});

// ================================
// COUPON APPLICATION SCHEMAS
// ================================

export const ApplyCouponSchema = z
  .object({
    code: z.string().min(1, 'Coupon code is required'),
    orderAmount: z.number().min(0, 'Order amount must be positive'),
    productIds: z.array(z.number().int().positive()).min(1, 'At least one product is required'),
    userId: z.number().int().positive().optional(), // For registered users
    guestEmail: z.email().optional(), // For guest users
  })
  .refine(
    (data) => {
      // Either userId or guestEmail must be provided
      return data.userId || data.guestEmail;
    },
    {
      message: 'Either user ID or guest email must be provided',
      path: ['userId'],
    }
  );

export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  productIds: z.array(z.number().int().positive()).min(1, 'At least one product is required'),
  orderAmount: z.number().min(0, 'Order amount must be positive').optional(),
});

// ================================
// COUPON USAGE SCHEMAS
// ================================

export const CouponUsageQuerySchema = z.object({
  couponId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  guestEmail: z.email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'discountAmount', 'orderAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ================================
// TYPE EXPORTS
// ================================

export type CouponQueryInput = z.infer<typeof CouponQuerySchema>;
export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>;
export type BulkCouponUpdateInput = z.infer<typeof BulkCouponUpdateSchema>;
export type BulkCouponDeleteInput = z.infer<typeof BulkCouponDeleteSchema>;
export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
export type ValidateCouponInput = z.infer<typeof ValidateCouponSchema>;
export type CouponUsageQueryInput = z.infer<typeof CouponUsageQuerySchema>;
export type CouponStatsQueryInput = z.infer<typeof CouponStatsQuerySchema>;
