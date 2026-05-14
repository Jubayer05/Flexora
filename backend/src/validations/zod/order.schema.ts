import { z } from 'zod'
import { PaginationSchema } from '../common/pagination.schema'

// Enums
export const OrderStatus = z.enum([
  'PENDING',
  'CONFIRMED',
  'PARTIAL',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
])
export const DeliveryStatus = z.enum(['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'PARTIAL'])

// Base Order Schema - pricing fields removed, calculated from product table
export const OrderBaseSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer').optional(),
  guestEmail: z.email('Invalid guest email format').optional(),
  // Customer info - only required for guest orders, auto-populated for authenticated users
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(255, 'Customer name must be less than 255 characters')
    .optional(),
  customerPhone: z
    .string()
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .refine(
      (val) => {
        // Must contain at least 10 digits
        const digitCount = (val.match(/\d/g) || []).length
        return digitCount >= 10
      },
      'Phone number must contain at least 10 digits'
    )
    .optional(),
  // Product info - single product per order
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z
    .number()
    .int()
    .positive('Quantity must be a positive integer')
    .max(10000, 'Quantity cannot exceed 10000'),
  // Note: discount is calculated server-side, not accepted from user input
  /**
   * Order metadata (auto-populated by backend)
   *
   * Structure:
   * - subscription: { discountAmount, discountPercent } - Applied first if user has active subscription
   * - rank: { rankName, discountPercent, discountAmount } - Applied second based on user's rank (totalSpent)
   * - coupon: { code, discountAmount, discountPercent } - Applied third if coupon code provided
   *
   * Discount hierarchy: Subscription → Rank → Coupon (all cumulative on order.subtotal)
   */
  meta: z.record(z.string(), z.any()).optional()
})

// Create Order Schema
export const CreateOrderSchema = OrderBaseSchema.extend({
  couponCode: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  // Transfer-specific fields (for TELEGRAM SERVICE products)
  customerTelegram: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true // Optional field
        // Only phone number allowed (format: +1234567890)
        const phoneRegex = /^\+\d{10,15}$/
        return phoneRegex.test(val)
      },
      {
        message: 'Must be a valid phone number with country code (e.g., +1234567890)'
      }
    )
}).refine(
  (data) => {
    // Either userId or guestEmail must be provided
    return data.userId !== undefined || data.guestEmail !== undefined
  },
  {
    message: 'Either user ID or guest email must be provided',
    path: ['userId']
  }
)

// Update Order Schema
export const UpdateOrderSchema = z.object({
  id: z.number().int().positive('Order ID must be a positive integer'),
  status: OrderStatus.optional(),
  deliveryStatus: DeliveryStatus.optional(),
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(255, 'Customer name must be less than 255 characters')
    .optional(),
  customerPhone: z
    .string()
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .refine(
      (val) => {
        // Must contain at least 10 digits
        const digitCount = (val.match(/\d/g) || []).length
        return digitCount >= 10
      },
      'Phone number must contain at least 10 digits'
    )
    .optional(),
  canResend: z.boolean().optional(),
  canReplace: z.boolean().optional(),
  meta: z.record(z.string(), z.any()).optional()
})

// Order Query/Filter Schema
export const OrderQuerySchema = PaginationSchema.extend({
  search: z.string().optional(), // Search by order number, customer name, email
  userId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'User ID must be positive'),
  guestEmail: z.email().optional(),
  userBanStatus: z.enum(['BANNED', 'UNBANNED']).optional(),
  status: OrderStatus.optional(),
  deliveryStatus: DeliveryStatus.optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  sortBy: z
    .enum(['orderNumber', 'createdAt', 'updatedAt', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeItems: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includePayment: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includeDeliveries: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  productType: z.string().optional() // Filter by product type (e.g. TELEGRAM_ACCOUNTS, ACCOUNT, SERVICE, PREMIUM)
})

// Order ID Schema
export const OrderIdSchema = z.object({
  id: z.number().int().positive('Order ID must be a positive integer')
})

// Order Number Schema
export const OrderNumberSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required')
})

// Order Status Update Schema
export const OrderStatusUpdateSchema = z.object({
  id: z.number().int().positive('Order ID must be a positive integer'),
  status: OrderStatus,
  deliveryStatus: DeliveryStatus.optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  notifyCustomer: z.boolean().default(true)
})

// Order Resend Schema
export const OrderResendSchema = z.object({
  id: z.number().int().positive('Order ID must be a positive integer'),
  format: z.enum(['txt', 'xlsx', 'json']).default('txt'),
  email: z.email('Invalid email format').optional() // Override delivery email
})

// Order Refund Schema
export const OrderRefundSchema = z.object({
  id: z.number().int().positive('Order ID must be a positive integer'),
  amount: z.number().min(0, 'Refund amount cannot be negative').optional(), // If not provided, refund full amount
  reason: z
    .string()
    .min(1, 'Refund reason is required')
    .max(500, 'Reason must be less than 500 characters'),
  notifyCustomer: z.boolean().default(true)
})

// Bulk Order Operations
export const BulkOrderUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one order ID is required'),
  updates: z.object({
    status: OrderStatus.optional(),
    deliveryStatus: DeliveryStatus.optional(),
    canResend: z.boolean().optional(),
    canReplace: z.boolean().optional()
  })
})

// Order Analytics Schema
export const OrderAnalyticsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('day'),
  metrics: z
    .array(z.enum(['count', 'revenue', 'avgOrderValue', 'conversionRate']))
    .default(['count', 'revenue']),
  filterBy: z
    .object({
      status: z.array(OrderStatus).optional(),
      userId: z
        .string()
        .optional()
        .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .refine((val) => !val || val > 0, 'User ID must be positive')
    })
    .optional()
})

// Guest Order Restoration Schema
export const GuestOrderRestorationSchema = z.object({
  guestEmail: z.email('Invalid email format'),
  userId: z.number().int().positive('User ID must be a positive integer')
})

// Export types
export type OrderBase = z.infer<typeof OrderBaseSchema>
export type CreateOrder = z.infer<typeof CreateOrderSchema>
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>
export type OrderQuery = z.infer<typeof OrderQuerySchema>
export type OrderId = z.infer<typeof OrderIdSchema>
export type OrderNumber = z.infer<typeof OrderNumberSchema>
export type OrderStatusUpdate = z.infer<typeof OrderStatusUpdateSchema>
export type OrderResend = z.infer<typeof OrderResendSchema>
export type OrderRefund = z.infer<typeof OrderRefundSchema>
export type BulkOrderUpdate = z.infer<typeof BulkOrderUpdateSchema>
export type OrderAnalytics = z.infer<typeof OrderAnalyticsSchema>
export type GuestOrderRestoration = z.infer<typeof GuestOrderRestorationSchema>
