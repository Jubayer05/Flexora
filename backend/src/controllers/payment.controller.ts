/**
 * Payment Controller
 * Handles customer payment operations
 */

import type { NextFunction, Response } from 'express'
import { PaymentService } from '../services/payment.service'
import { PayGateProviderService } from '../services/paygate-provider.service'
import type { AuthRequest } from '../types/req-res'
import { sendCreatedResponse, sendErrorResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import { payGateProviderQuerySchema } from '../validations/zod/paygate-provider.schema'
import { InitiatePaymentSchema } from '../validations/zod/payment.schema'
import { z } from 'zod'

const paymentService = new PaymentService()
const payGateProviderService = new PayGateProviderService()

/**
 * Initiate payment for an order
 * POST /api/v1/payments/initiate
 */
export const initiatePayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    // Validate request body
    const validatedData = InitiatePaymentSchema.parse(req.body)
    const { orderId, paymentMethodId, walletAmount, paygateProviderCode } = validatedData
    const userId = req.user?.userId // From auth middleware

    const result = await paymentService.initiatePayment(
      orderId,
      paymentMethodId,
      userId,
      walletAmount,
      paygateProviderCode
    )

    return sendCreatedResponse(res, result, 'Payment initiated successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get payment status
 * GET /api/v1/payments/:id/status
 */
export const getPaymentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentId = parseInt(req.params.id!)

    if (isNaN(paymentId)) {
      throw new Error('Invalid payment ID')
    }

    const payment = await paymentService.getPaymentById(paymentId)

    // Verify ownership (if authenticated and payment is for an order)
    if (req.user && payment.order && payment.order.userId !== req.user.userId) {
      throw new Error('Unauthorized access to payment')
    }

    return sendSuccessResponse(
      res,
      {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        gateway: payment.gateway,
        createdAt: payment.createdAt
      },
      'Payment status retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Verify payment (manually check status from gateway)
 * POST /api/v1/payments/:id/verify
 */
export const verifyPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentId = parseInt(req.params.id!)

    if (isNaN(paymentId)) {
      throw new Error('Invalid payment ID')
    }

    const payment = await paymentService.verifyPayment(paymentId)

    return sendSuccessResponse(
      res,
      {
        id: payment.id,
        status: payment.status,
        paidAmount: payment.paidAmount
      },
      'Payment verified successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Verify Binance internal transfer payment
 * POST /api/v1/payments/binance/verify
 */
export const verifyBinancePayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    console.log('[VerifyBinancePayment] ========== REQUEST START ==========')
    console.log('[VerifyBinancePayment] Full request body:', JSON.stringify(req.body), typeof req.body)
    console.log('[VerifyBinancePayment] Raw paymentId:', req.body?.paymentId, 'Type:', typeof req.body?.paymentId)
    console.log('[VerifyBinancePayment] Raw orderId:', req.body?.orderId, 'Type:', typeof req.body?.orderId)
    console.log('[VerifyBinancePayment] Raw binanceOrderId:', req.body?.binanceOrderId, 'Type:', typeof req.body?.binanceOrderId)

    // Validate request body structure first
    if (!req.body || typeof req.body !== 'object') {
      console.log('[VerifyBinancePayment] ERROR: Invalid request body')
      return sendErrorResponse(res, 'Invalid request body - must be JSON object', 400)
    }

    // Validate with Zod
    const schema = z.object({
      paymentId: z
        .number('Payment ID must be a number')
        .int('Payment ID must be an integer')
        .positive('Payment ID must be greater than 0'),
      orderId: z
        .number('Order ID must be a number')
        .int('Order ID must be an integer')
        .positive('Order ID must be greater than 0'),
      binanceOrderId: z
        .string('Binance Order ID must be a string')
        .min(6, 'Binance Order ID must be at least 6 characters')
        .max(20, 'Binance Order ID must not exceed 20 characters')
    })

    let validatedData
    try {
      validatedData = schema.parse(req.body)
      console.log('[VerifyBinancePayment] Validation passed:', validatedData)
    } catch (validationError) {
      console.log('[VerifyBinancePayment] Zod validation failed:', validationError)
      throw validationError
    }

    const { paymentId, orderId, binanceOrderId } = validatedData

    // Get user ID, IP address, and user agent for audit logging
    const userId = req.user?.userId || undefined
    const ipAddress = req.ip || req.socket.remoteAddress || undefined
    const userAgent = req.get('user-agent') || undefined

    const result = await paymentService.verifyBinancePayment(
      paymentId,
      orderId,
      binanceOrderId,
      userId,
      ipAddress,
      userAgent
    )

    console.log('[VerifyBinancePayment] ========== REQUEST SUCCESS ==========')
    return sendSuccessResponse(res, result, 'Binance payment verified successfully')
  } catch (error) {
    console.error('[VerifyBinancePayment] ========== REQUEST ERROR ==========')
    console.error('[VerifyBinancePayment] Error instance check:', {
      isZodError: error instanceof z.ZodError,
      isError: error instanceof Error,
      name: (error as any)?.name,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return next(error)
  }
}

/**
 * Get user's payment history
 * GET /api/v1/payments/my-payments
 */
export const getMyPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      throw new Error('User not authenticated')
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await paymentService.getUserPayments(userId, page, limit)

    return sendSuccessResponse(res, result, 'Payment history retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Calculate payment breakdown (bonus/fee) for display
 * POST /api/v1/payments/calculate-breakdown
 */
export const calculatePaymentBreakdown = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderTotal, paymentMethodId } = req.body

    if (!orderTotal || !paymentMethodId) {
      throw new Error('orderTotal and paymentMethodId are required')
    }

    const breakdown = await paymentService.calculatePaymentBreakdown(
      parseFloat(orderTotal),
      parseInt(paymentMethodId)
    )

    return sendSuccessResponse(res, breakdown, 'Payment breakdown calculated successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get single payment details
 * GET /api/v1/payments/:id
 */
export const getPaymentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentId = parseInt(req.params.id!)

    if (isNaN(paymentId)) {
      throw new Error('Invalid payment ID')
    }

    const payment = await paymentService.getPaymentById(paymentId)

    // Verify ownership (if authenticated and payment is for an order)
    if (req.user && payment.order && payment.order.userId !== req.user.userId) {
      throw new Error('Unauthorized access to payment')
    }

    return sendSuccessResponse(res, payment, 'Payment retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Create Payment Intent for Volet (embedded Stripe Elements)
 * POST /api/v1/payments/volet/create-intent
 */
export const createVoletPaymentIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const schema = z.object({
      orderId: z.number().int().positive('Order ID is required'),
      paymentMethodId: z.number().int().positive('Payment method ID is required')
    })

    const { orderId, paymentMethodId } = schema.parse(req.body)
    const userId = req.user?.userId

    // Get IP address and user agent for risk management
    const ipAddress = req.ip || req.socket.remoteAddress || undefined
    const userAgent = req.get('user-agent') || undefined

    const result = await paymentService.createVoletPaymentIntent(
      orderId,
      paymentMethodId,
      userId,
      ipAddress,
      userAgent
    )

    return sendCreatedResponse(res, result, 'Payment Intent created successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get available PayGate providers
 * GET /api/v1/payments/paygate/providers
 */
export const getPayGateProviders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = payGateProviderQuerySchema.parse(req.query)
    const providers = await payGateProviderService.listProviders({
      ...query,
      // Customer-facing PayGate is card-to-crypto only. Do not expose direct
      // crypto/bank provider lists even if a stale client passes ?type=crypto.
      type: 'card'
    })

    return sendSuccessResponse(res, providers, 'PayGate providers retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
