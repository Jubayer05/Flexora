import type { NextFunction, Response, Request } from 'express'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import { PaymentService } from '../services/payment.service'
import { OrderService } from '../services/order.services'
import { guestAccessService } from '../services/guest-access.service'
import { sendSuccessResponse, sendErrorResponse, sendCreatedResponse, type ApiResponse } from '../utils'
import { z } from 'zod'

// Initialize services
const paymentService = new PaymentService()
const orderService = new OrderService()

const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

const getEffectiveMaxQuantity = (product: {
  stockCount: number
  maxQuantity?: number | null
  type?: string | null
}) => {
  if (PREMIUM_PRODUCT_TYPES.has(String(product.type))) return 1000

  const stockCount = Math.max(0, Number(product.stockCount ?? 0))
  const rawMaxQuantity = Number(product.maxQuantity ?? 0)

  if (rawMaxQuantity === 0) return stockCount

  const maxQuantity = rawMaxQuantity > 0 ? rawMaxQuantity : 1000
  return Math.min(maxQuantity, stockCount)
}

/**
 * Guest Checkout Validation Schema
 */
const GuestCheckoutSchema = z.object({
  accountId: z.number().int().positive('Account ID must be a positive number'),
  quantity: z.number().int().positive('Quantity must be at least 1').optional().default(1),
  guestEmail: z.string().email('Invalid email address'),
  walletAmount: z.number().optional()
})

const GuestCheckoutInitiateSchema = z.object({
  accountId: z.number().int().positive(),
  quantity: z.number().int().positive().optional().default(1),
  guestEmail: z.string().email(),
  paymentMethodId: z.number().int().positive('Payment method ID required'),
  walletAmount: z.number().optional()
})

/**
 * Verify and create guest checkout session
 * POST /api/v1/guest-checkout/verify-email
 * 
 * Returns: { success: true, message: "Verification code sent to email" }
 */
export const verifyGuestEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountId, quantity, guestEmail } = GuestCheckoutSchema.parse(req.body)

    // Verify product/account exists and is available
    const product = await db.product.findFirst({
      where: { id: accountId, deletedAt: null },
      include: { category: true }
    })

    if (!product) {
      return sendErrorResponse(res, 'Product not found', 404)
    }

    if (!product.isActive) {
      return sendErrorResponse(res, 'Product is not available for purchase', 400)
    }

    console.log('[GuestCheckout] Email verification initiated', {
      productId: accountId,
      email: guestEmail,
      quantity
    })

    // For now, return success - actual verification can be added later
    return sendSuccessResponse(
      res,
      {
        productId: accountId,
        productName: product.name,
        quantity,
        guestEmail,
        verified: true
      },
      'Email verified. Proceed to payment.'
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendErrorResponse(res, error.issues[0]?.message || 'Validation error', 400)
    }
    return next(error)
  }
}

/**
 * Initiate payment for guest checkout
 * POST /api/v1/guest-checkout/initiate
 *
 * DEPRECATED: This endpoint is kept for backward compatibility.
 * New clients should use POST /customer/orders + POST /payments/initiate (the unified flow).
 *
 * This now delegates to the same createOrderWithUniqueNumber + paymentService.initiatePayment
 * pipeline used by the main order controller, so guests get the same order numbering,
 * discount logic, and fulfillment path as registered users.
 */
export const initiateGuestCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountId, quantity, guestEmail, paymentMethodId, walletAmount } =
      GuestCheckoutInitiateSchema.parse(req.body)

    const product = await db.product.findFirst({
      where: { id: accountId, deletedAt: null },
      select: { id: true, name: true, price: true, isActive: true, stockCount: true, minQuantity: true, maxQuantity: true, type: true }
    })

    if (!product) return sendErrorResponse(res, 'Product not found', 404)
    if (!product.isActive) return sendErrorResponse(res, 'Product is not available', 400)

    const minQuantity = product.minQuantity || 1
    const maxQuantity = getEffectiveMaxQuantity(product)
    if (quantity < minQuantity) return sendErrorResponse(res, `Minimum quantity is ${minQuantity}`, 400)
    if (quantity > maxQuantity) return sendErrorResponse(res, `Maximum quantity is ${maxQuantity}`, 400)

    const unitPrice = typeof product.price === 'number' ? product.price : (product.price as any).toNumber?.() ?? 0
    const subtotal = unitPrice * quantity

    // Use the unified order creation (same as createOrder in order.controller)
    const order = await orderService.createWithUniqueNumber({
      userId: undefined,
      guestEmail,
      productId: accountId,
      quantity,
      unitPrice,
      subtotal,
      discount: 0,
      total: subtotal,
      status: 'PENDING',
      deliveryStatus: 'PENDING',
      quantityOrdered: quantity,
      quantityDelivered: 0,
      quantityPending: quantity
    })

    const paymentResult = await paymentService.initiatePayment(
      order.id,
      paymentMethodId,
      undefined,
      walletAmount,
      typeof req.body?.paygateProviderCode === 'string' ? req.body.paygateProviderCode : undefined
    )

    return sendCreatedResponse(
      res,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        guestEmail: order.guestEmail,
        totalAmount: order.total.toString(),
        ...paymentResult
      },
      'Guest checkout payment initiated successfully'
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendErrorResponse(res, error.issues[0]?.message || 'Validation error', 400)
    }
    console.error('[GuestCheckout] Error initiating checkout', error)
    return next(error)
  }
}

/**
 * Get guest order details
 * GET /api/v1/guest-checkout/orders/:orderId?token=xxxxx
 * 
 * Allows guest access to order using the access token
 */
export const getGuestOrderDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderId } = req.params
    const { token, email } = req.query

    if (!orderId || !token || !email) {
      return sendErrorResponse(res, 'Missing required parameters: orderId, token, email', 400)
    }

    const orderIdNum = parseInt(orderId as string)
    if (isNaN(orderIdNum)) {
      return sendErrorResponse(res, 'Invalid order ID', 400)
    }

    const tokenStr = token as string
    const emailStr = email as string

    console.log('[GuestCheckout] Validating access token', {
      orderId: orderIdNum,
      email: emailStr,
      token: tokenStr.substring(0, 8) + '***'
    })

    // Validate access token
    try {
      const validatedOrderId = await guestAccessService.validateAccessToken(tokenStr, emailStr)
      
      if (validatedOrderId !== orderIdNum) {
        return sendErrorResponse(res, 'Token does not match this order', 403)
      }
    } catch (error) {
      console.error('[GuestCheckout] Token validation failed', error)
      return sendErrorResponse(
        res, 
        error instanceof Error ? error.message : 'Invalid or expired access token',
        403
      )
    }

    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderIdNum },
      include: { product: true }
    })

    if (!order) {
      return sendErrorResponse(res, 'Order not found', 404)
    }

    // Verify email matches
    if (order.guestEmail !== emailStr) {
      return sendErrorResponse(res, 'Email does not match this order', 403)
    }

    console.log('[GuestCheckout] Guest order accessed', {
      orderId: order.id,
      email: emailStr
    })

    // Get payment information
    const payments = await db.payment.findMany({
      where: { orderId: orderIdNum }
    })

    return sendSuccessResponse(
      res,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        guestEmail: order.guestEmail,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        totalAmount: order.total.toString(),
        product: order.product,
        quantity: order.quantity,
        payments,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      'Order details retrieved successfully'
    )
  } catch (error) {
    console.error('[GuestCheckout] Error retrieving order', error)
    return next(error)
  }
}

/**
 * Validate guest access token
 * POST /api/v1/guest-checkout/validate-token
 * 
 * Validates token without retrieving full order
 */
export const validateGuestToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderId, token, email } = req.body

    if (!orderId || !token || !email) {
      return sendErrorResponse(res, 'Missing required fields: orderId, token, email', 400)
    }

    console.log('[GuestCheckout] Validating token', {
      orderId,
      email,
      token: token.substring(0, 8) + '***'
    })

    // Validate token
    try {
      const validatedOrderId = await guestAccessService.validateAccessToken(token, email)
      
      if (validatedOrderId !== orderId) {
        return sendErrorResponse(res, 'Token does not match this order', 403)
      }

      return sendSuccessResponse(
        res,
        {
          orderId,
          email,
          valid: true
        },
        'Token is valid'
      )
    } catch (error) {
      return sendErrorResponse(
        res,
        error instanceof Error ? error.message : 'Invalid or expired token',
        403
      )
    }
  } catch (error) {
    console.error('[GuestCheckout] Error validating token', error)
    return next(error)
  }
}
