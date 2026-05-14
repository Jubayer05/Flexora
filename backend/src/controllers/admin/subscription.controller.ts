import type { NextFunction, Request, Response } from 'express'
import { subscriptionService } from '../../services/subscription.service'
import { sendSuccessResponse, type ApiResponse } from '../../utils'
import {
  activeSubscriptionsQuerySchema,
  expiringSubscriptionsQuerySchema,
  extendSubscriptionSchema,
  subscriptionPaymentsQuerySchema
} from '../../validations/zod/subscription.schema'

// ================================
// SUBSCRIPTIONS MANAGEMENT
// ================================

/**
 * Get all active subscriptions
 * @route GET /admin/subscriptions/active
 */
export const getActiveSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = activeSubscriptionsQuerySchema.parse(req.query)

    const result = await subscriptionService.getActiveSubscriptions(
      validatedQuery.page,
      validatedQuery.limit
    )

    return sendSuccessResponse(res, result, 'Active subscriptions retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get subscriptions expiring soon
 * @route GET /admin/subscriptions/expiring
 */
export const getExpiringSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = expiringSubscriptionsQuerySchema.parse(req.query)

    const result = await subscriptionService.getExpiringSubscriptions(validatedQuery.daysAhead)

    return sendSuccessResponse(res, result, 'Expiring subscriptions retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get all subscription payments
 * @route GET /admin/subscriptions/payments
 */
export const getSubscriptionPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = subscriptionPaymentsQuerySchema.parse(req.query)

    const result = await subscriptionService.getAllSubscriptionPayments(
      validatedQuery.page,
      validatedQuery.limit,
      validatedQuery.status
    )

    return sendSuccessResponse(res, result, 'Subscription payments retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// ADMIN ACTIONS
// ================================

/**
 * Manually extend a user's subscription
 * @route POST /admin/subscriptions/:userId/extend
 */
export const extendUserSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = parseInt(req.params.userId!)
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const validatedData = extendSubscriptionSchema.parse(req.body)

    const result = await subscriptionService.extendSubscription(userId, validatedData.days)

    return sendSuccessResponse(res, result, 'Subscription extended successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Cancel a user's subscription (admin)
 * @route POST /admin/subscriptions/:userId/cancel
 */
export const cancelUserSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = parseInt(req.params.userId!)
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      })
    }

    const result = await subscriptionService.cancelSubscription(userId)

    return sendSuccessResponse(res, result, 'User subscription cancelled successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Trigger expiration notification manually
 * @route POST /admin/subscriptions/notify-expiring
 */
export const triggerExpirationNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const result = await subscriptionService.sendExpirationNotifications()

    return sendSuccessResponse(res, result, 'Expiration notifications sent successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Trigger subscription expiration manually
 * @route POST /admin/subscriptions/expire
 */
export const triggerSubscriptionExpiration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const result = await subscriptionService.expireSubscriptions()

    return sendSuccessResponse(res, result, 'Subscriptions expired successfully')
  } catch (error) {
    return next(error)
  }
}
