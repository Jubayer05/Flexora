import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from './common'

/**
 * Coupon Validation Schemas
 *
 * This file contains all Zod validation schemas for Coupon operations:
 * - CouponBaseSchema: Core coupon fields validation
 * - CreateCouponSchema: For creating new coupons
 * - UpdateCouponSchema: For updating existing coupons (includes ID)
 * - CouponQuerySchema: For filtering and searching coupons
 * - CouponIdSchema: For validating coupon ID parameters
 */

// Coupon Type Enum
export const CouponType = z.enum(['PERCENTAGE', 'FIXED_AMOUNT'])

// Coupon Status Enum
export const CouponStatus = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED'])

// Coupon Scope Enum
export const CouponScope = z.enum(['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES'])

// Core Coupon Schema (no refinements)
const CouponCoreSchema = z.object({
    code: z
      .string('Coupon code is required')
      .min(1, 'Coupon code is required')
      .max(50, 'Coupon code must be less than 50 characters')
      .regex(
        /^[A-Z0-9_-]+$/,
        'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'
      )
      .trim(),
    name: z
      .string('Coupon name is required')
      .min(1, 'Coupon name is required')
      .max(255, 'Coupon name must be less than 255 characters')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be less than 2000 characters')
      .optional()
      .nullable(),
    type: CouponType,
    status: CouponStatus.default('ACTIVE'),
    scope: CouponScope.default('ALL_PRODUCTS'),
    discountValue: z
      .number('Discount value is required')
      .min(0, 'Discount value cannot be negative')
      .max(10000, 'Discount value is too high'),
    maxDiscountAmount: z
      .number('Max discount amount must be a number')
      .min(0, 'Max discount amount cannot be negative')
      .optional()
      .nullable(),
    minOrderAmount: z
      .number('Minimum order amount must be a number')
      .min(0, 'Minimum order amount cannot be negative')
      .optional()
      .nullable(),
    usageLimit: z
      .number('Usage limit must be a number')
      .int('Usage limit must be an integer')
      .min(1, 'Usage limit must be at least 1')
      .optional()
      .nullable(),
    userUsageLimit: z
      .number('User usage limit must be a number')
      .int('User usage limit must be an integer')
      .min(1, 'User usage limit must be at least 1')
      .optional()
      .nullable(),
    startsAt: z.date('Start date is required'),
    expiresAt: z.date('Expiry date is required'),
    applicableProductIds: z.array(z.number().int().positive()).default([]),
    applicableCategoryIds: z.array(z.number().int().positive()).default([]),
    applicableGroupIds: z.array(z.number().int().positive()).default([])
  })

type CouponCore = z.infer<typeof CouponCoreSchema>

const expiryAfterStart = (data: Partial<CouponCore>) => {
  if (data.startsAt && data.expiresAt) {
    return data.expiresAt > data.startsAt
  }
  return true
}

const percentageDiscountLimit = (data: Partial<CouponCore>) => {
  if (data.type === 'PERCENTAGE' && data.discountValue !== undefined) {
    return data.discountValue <= 100
  }
  return true
}

const requireProductIds = (data: Partial<CouponCore>) => {
  if (data.scope === 'SPECIFIC_PRODUCTS') {
    return Array.isArray(data.applicableProductIds) && data.applicableProductIds.length > 0
  }
  return true
}

const requireCategoryIds = (data: Partial<CouponCore>) => {
  if (data.scope === 'SPECIFIC_CATEGORIES') {
    return Array.isArray(data.applicableCategoryIds) && data.applicableCategoryIds.length > 0
  }
  return true
}

// Base Coupon Schema
export const CouponBaseSchema = CouponCoreSchema.refine(expiryAfterStart, {
  message: 'Expiry date must be after start date',
  path: ['expiresAt']
})
  .refine(percentageDiscountLimit, {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue']
  })
  .refine(requireProductIds, {
    message: 'At least one product must be selected for product-specific coupons',
    path: ['applicableProductIds']
  })
  .refine(requireCategoryIds, {
    message: 'At least one category must be selected for category-specific coupons',
    path: ['applicableCategoryIds']
  })

// Create Coupon Schema
export const CreateCouponSchema = CouponBaseSchema

// Update Coupon Schema (without refinements first, then add them)
const UpdateCouponCoreSchema = z.object({
  id: z.number().int().positive('Coupon ID must be a positive integer'),
  code: z
    .string('Coupon code is required')
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code must be less than 50 characters')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'
    )
    .trim()
    .optional(),
  name: z
    .string('Coupon name is required')
    .min(1, 'Coupon name is required')
    .max(255, 'Coupon name must be less than 255 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  type: CouponType.optional(),
  status: CouponStatus.optional(),
  scope: CouponScope.optional(),
  discountValue: z
    .number('Discount value is required')
    .min(0, 'Discount value cannot be negative')
    .max(10000, 'Discount value is too high')
    .optional(),
  maxDiscountAmount: z
    .number('Max discount amount must be a number')
    .min(0, 'Max discount amount cannot be negative')
    .optional()
    .nullable(),
  minOrderAmount: z
    .number('Minimum order amount must be a number')
    .min(0, 'Minimum order amount cannot be negative')
    .optional()
    .nullable(),
  usageLimit: z
    .number('Usage limit must be a number')
    .int('Usage limit must be an integer')
    .min(1, 'Usage limit must be at least 1')
    .optional()
    .nullable(),
  userUsageLimit: z
    .number('User usage limit must be a number')
    .int('User usage limit must be an integer')
    .min(1, 'User usage limit must be at least 1')
    .optional()
    .nullable(),
  startsAt: z.date('Start date is required').optional(),
  expiresAt: z.date('Expiry date is required').optional(),
  applicableProductIds: z.array(z.number().int().positive()).optional(),
  applicableCategoryIds: z.array(z.number().int().positive()).optional(),
  applicableGroupIds: z.array(z.number().int().positive()).optional()
})

export const UpdateCouponSchema = UpdateCouponCoreSchema
  .refine(expiryAfterStart, {
    message: 'Expiry date must be after start date',
    path: ['expiresAt']
  })
  .refine(percentageDiscountLimit, {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue']
  })
  .refine(requireProductIds, {
    message: 'At least one product must be selected for product-specific coupons',
    path: ['applicableProductIds']
  })
  .refine(requireCategoryIds, {
    message: 'At least one category must be selected for category-specific coupons',
    path: ['applicableCategoryIds']
  })

// Coupon Query/Filter Schema
export const CouponQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  type: CouponType.optional(),
  status: CouponStatus.optional(),
  scope: CouponScope.optional(),
  isExpired: BooleanSchemaString,
  sortBy: z
    .enum(['code', 'name', 'type', 'status', 'discountValue', 'startsAt', 'expiresAt', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Coupon ID Schema
export const CouponIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Coupon ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

// Export types
export type CouponBase = z.infer<typeof CouponBaseSchema>
export type CreateCoupon = z.infer<typeof CreateCouponSchema>
export type UpdateCoupon = z.infer<typeof UpdateCouponSchema>
export type CouponQuery = z.infer<typeof CouponQuerySchema>
export type CouponId = z.infer<typeof CouponIdSchema>
