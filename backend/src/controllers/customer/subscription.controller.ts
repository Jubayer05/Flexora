import type { NextFunction, Response } from 'express'
import { subscriptionService } from '../../services/subscription.service'
import type { AuthRequest } from '../../types/req-res'
import { sendSuccessResponse, type ApiResponse } from '../../utils'
import {
  purchaseSubscriptionSchema,
  renewSubscriptionSchema,
  subscriptionHistoryQuerySchema
} from '../../validations/zod/subscription.schema'

// ================================
// PURCHASE & RENEWAL
// ================================

/**
 * Purchase a new subscription package
 * @route POST /customer/subscriptions/purchase
 */
export const purchaseSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    const validatedData = purchaseSubscriptionSchema.parse(req.body)

    const result = await subscriptionService.purchaseSubscription(
      userId!,
      validatedData.subscriptionPackageId,
      validatedData.gateway
    )

    return sendSuccessResponse(
      res,
      result,
      'Subscription purchase initiated. Please complete payment.',
      201
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Renew existing subscription
 * @route POST /customer/subscriptions/renew
 */
export const renewSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    const validatedData = renewSubscriptionSchema.parse(req.body)

    const result = await subscriptionService.renewSubscription(userId!, validatedData.gateway)

    return sendSuccessResponse(
      res,
      result,
      'Subscription renewal initiated. Please complete payment.',
      201
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// CANCELLATION
// ================================

/**
 * Cancel subscription
 * @route POST /customer/subscriptions/cancel
 */
export const cancelSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    const result = await subscriptionService.cancelSubscription(userId!)

    return sendSuccessResponse(res, result, 'Subscription cancelled successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// QUERIES
// ================================

/**
 * Get active subscription
 * @route GET /customer/subscriptions/active
 */
export const getActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    const subscription = await subscriptionService.getUserActiveSubscription(userId!)

    if (!subscription) {
      return sendSuccessResponse(res, null, 'No active subscription found')
    }

    return sendSuccessResponse(res, subscription, 'Active subscription retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get subscription payment history
 * @route GET /customer/subscriptions/history
 */
export const getSubscriptionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    const validatedQuery = subscriptionHistoryQuerySchema.parse(req.query)

    const result = await subscriptionService.getUserSubscriptionHistory(
      userId!,
      validatedQuery.page,
      validatedQuery.limit
    )

    return sendSuccessResponse(res, result, 'Subscription history retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
