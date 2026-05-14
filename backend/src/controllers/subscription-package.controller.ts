import type { NextFunction, Request, Response } from 'express'
import { SubscriptionPackageService } from '../services/subscription-package.service'
import { sendSuccessResponse, type ApiResponse } from '../utils'
import {
  createSubscriptionPackageSchema,
  subscriptionPackageIdParamsSchema,
  subscriptionPackageQuerySchema,
  updateSubscriptionPackageSchema
} from '../validations/zod/subscription-package.schema'

// Initialize service
const subscriptionPackageService = new SubscriptionPackageService()

// ================================
// CREATE
// ================================
export const createSubscriptionPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = createSubscriptionPackageSchema.parse(req.body)
    const subscriptionPackage = await subscriptionPackageService.create(validatedData)

    return sendSuccessResponse(
      res,
      subscriptionPackage,
      'Subscription package created successfully',
      201
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// READ
// ================================
export const getSubscriptionPackages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = subscriptionPackageQuerySchema.parse(req.query)
    const result = await subscriptionPackageService.findMany(validatedQuery)

    return sendSuccessResponse(res, result, 'Subscription packages retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getSubscriptionPackageById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = subscriptionPackageIdParamsSchema.parse(req.params)
    const subscriptionPackage = await subscriptionPackageService.findById(id)

    return sendSuccessResponse(
      res,
      subscriptionPackage,
      'Subscription package retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// UPDATE
// ================================
export const updateSubscriptionPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = subscriptionPackageIdParamsSchema.parse(req.params)
    const validatedData = updateSubscriptionPackageSchema.parse(req.body)

    const subscriptionPackage = await subscriptionPackageService.update(id, validatedData)

    return sendSuccessResponse(
      res,
      subscriptionPackage,
      'Subscription package updated successfully'
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// DELETE
// ================================
export const deleteSubscriptionPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = subscriptionPackageIdParamsSchema.parse(req.params)
    const result = await subscriptionPackageService.delete(id)

    return sendSuccessResponse(res, result, 'Subscription package deleted successfully')
  } catch (error) {
    return next(error)
  }
}
