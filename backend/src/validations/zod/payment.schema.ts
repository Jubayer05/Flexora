import { z } from 'zod';
import { PaginationSchema } from '../common/pagination.schema';

// Enums
export const PaymentStatus = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'PARTIAL', 'REFUNDED']);

// DEPRECATED: PaymentMethod enum - no longer used
// Payment methods are now stored in PaymentMethod table and referenced by ID
// This enum is kept for backward compatibility with legacy code only
export const PaymentMethod = z.enum([
  'BINANCE',
  'NOWPAYMENT',
  'STRIPE',
  'PLISIO',
  'CHANGENOW',
  'CRYPTOMUS',
  'OTHER',
]);

// DEPRECATED: Base Payment Schema - uses legacy enum
// For new implementations, use InitiatePaymentSchema instead
// This schema is kept for backward compatibility only
export const PaymentBaseSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  method: PaymentMethod,
  amount: z.number().min(0, 'Payment amount cannot be negative'),
  gateway: z.string().min(1, 'Payment gateway is required'),
  meta: z.record(z.string(), z.any()).optional(),
});

// DEPRECATED: Create Payment Schema - uses legacy enum
// For new implementations, use InitiatePaymentSchema instead
export const CreatePaymentSchema = PaymentBaseSchema.extend({
  callbackUrl: z.url('Invalid callback URL').optional(),
  successUrl: z.url('Invalid success URL').optional(),
  failUrl: z.url('Invalid fail URL').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  customerData: z
    .object({
      email: z.email().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

// Update Payment Schema
export const UpdatePaymentSchema = z.object({
  id: z.number().int().positive('Payment ID must be a positive integer'),
  status: PaymentStatus.optional(),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional(),
  gatewayTxnId: z.string().optional(),
  gatewayStatus: z.string().optional(),
  binanceOrderId: z.string().optional(),
  binanceStatus: z.string().optional(),
  failureReason: z.string().max(500, 'Failure reason must be less than 500 characters').optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// Payment Query/Filter Schema
export const PaymentQuerySchema = PaginationSchema.extend({
  orderId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Order ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'Order ID must be positive'),
  method: PaymentMethod.optional(),
  status: PaymentStatus.optional(),
  minAmount: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Min amount must be a valid number')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => !val || val >= 0, 'Min amount cannot be negative'),
  maxAmount: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Max amount must be a valid number')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => !val || val >= 0, 'Max amount cannot be negative'),
  gateway: z.string().optional(),
  gatewayTxnId: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  sortBy: z
    .enum(['amount', 'createdAt', 'updatedAt', 'processedAt', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeOrder: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
});

// Payment ID Schema
export const PaymentIdSchema = z.object({
  id: z.number().int().positive('Payment ID must be a positive integer'),
});

// Payment Verification Schema
export const PaymentVerificationSchema = z.object({
  id: z.number().int().positive('Payment ID must be a positive integer'),
  gatewayResponse: z.record(z.string(), z.any()),
  signature: z.string().optional(),
  verifyAmount: z.boolean().default(true),
});

// Payment Refund Schema
export const PaymentRefundSchema = z.object({
  id: z.number().int().positive('Payment ID must be a positive integer'),
  amount: z.number().min(0, 'Refund amount cannot be negative').optional(), // If not provided, refund available amount
  reason: z
    .string()
    .min(1, 'Refund reason is required')
    .max(500, 'Reason must be less than 500 characters'),
  gatewayRefund: z.boolean().default(true), // Whether to process refund through payment gateway
});

// Payment Webhook Schema
export const PaymentWebhookSchema = z.object({
  gateway: z.string().min(1, 'Gateway is required'),
  payload: z.record(z.string(), z.any()),
  signature: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

// Binance Payment Schemas
export const BinancePaymentCreateSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(255, 'Description must be less than 255 characters'),
  returnUrl: z.url('Invalid return URL').optional(),
  cancelUrl: z.url('Invalid cancel URL').optional(),
});

export const BinancePaymentVerificationSchema = z.object({
  paymentId: z.number().int().positive('Payment ID must be a positive integer'),
  binanceOrderId: z.string().min(1, 'Binance order ID is required'),
  email: z.email('Invalid email format').optional(),
  apiVerification: z.boolean().default(false),
});

// Crypto Payment Schemas
export const CryptoPaymentCreateSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  currency: z.string().min(1, 'Currency is required'),
  cryptoCurrency: z.string().min(1, 'Crypto currency is required'),
  network: z.string().optional(),
  callbackUrl: z.url('Invalid callback URL').optional(),
});

// Payment Analytics Schema
export const PaymentAnalyticsSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  groupBy: z.enum(['day', 'week', 'month', 'year', 'method', 'gateway']).default('day'),
  methods: z.array(PaymentMethod).optional(),
  gateways: z.array(z.string()).optional(),
  status: z.array(PaymentStatus).optional(),
  metrics: z
    .array(z.enum(['count', 'amount', 'successRate', 'avgAmount']))
    .default(['count', 'amount']),
});

// Payment Gateway Config Schema
export const PaymentGatewayConfigSchema = z.object({
  gateway: z.string().min(1, 'Gateway name is required'),
  method: PaymentMethod,
  isEnabled: z.boolean().default(true),
  config: z.record(z.string(), z.any()),
  bonusPercentage: z
    .number()
    .min(0, 'Bonus percentage cannot be negative')
    .max(100, 'Bonus percentage cannot exceed 100%')
    .default(0),
  minAmount: z.number().min(0, 'Minimum amount cannot be negative').optional(),
  maxAmount: z.number().min(0, 'Maximum amount cannot be negative').optional(),
  processingTime: z.string().optional(), // e.g., "instant", "1-2 hours", "24 hours"
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

// Initiate Payment Schema (for customer)
export const InitiatePaymentSchema = z.object({
  orderId: z.number().int().positive('Order ID must be a positive integer'),
  paymentMethodId: z.number().int().positive('Payment method ID must be a positive integer').optional(),
  paygateProviderCode: z.string().min(1).optional(),
  walletAmount: z
    .number()
    .min(0, 'Wallet amount cannot be negative')
    .optional()
    .refine((val) => val === undefined || val >= 0, 'Wallet amount must be non-negative'),
}).refine(
  (data) => {
    // If walletAmount is provided, paymentMethodId is optional
    // If walletAmount is not provided, paymentMethodId is required
    return data.walletAmount !== undefined || data.paymentMethodId !== undefined;
  },
  {
    message: 'Either paymentMethodId or walletAmount must be provided',
    path: ['paymentMethodId']
  }
);

// Refund Request Schema (for admin)
export const RefundRequestSchema = z.object({
  amount: z.number().min(0, 'Refund amount cannot be negative').optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

// Payment Stats Query Schema
export const PaymentStatsQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
});

// Export types
export type PaymentBase = z.infer<typeof PaymentBaseSchema>;
export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type UpdatePayment = z.infer<typeof UpdatePaymentSchema>;
export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;
export type PaymentId = z.infer<typeof PaymentIdSchema>;
export type PaymentVerification = z.infer<typeof PaymentVerificationSchema>;
export type PaymentRefund = z.infer<typeof PaymentRefundSchema>;
export type PaymentWebhook = z.infer<typeof PaymentWebhookSchema>;
export type BinancePaymentCreate = z.infer<typeof BinancePaymentCreateSchema>;
export type BinancePaymentVerification = z.infer<typeof BinancePaymentVerificationSchema>;
export type CryptoPaymentCreate = z.infer<typeof CryptoPaymentCreateSchema>;
export type PaymentAnalytics = z.infer<typeof PaymentAnalyticsSchema>;
export type PaymentGatewayConfig = z.infer<typeof PaymentGatewayConfigSchema>;
export type InitiatePayment = z.infer<typeof InitiatePaymentSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type PaymentStatsQuery = z.infer<typeof PaymentStatsQuerySchema>;
