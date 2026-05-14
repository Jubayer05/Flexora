import type { NextFunction, Response } from 'express'
import { z } from 'zod'
import { analyticsService } from '../../services/analytics.service'
import type { AuthRequest } from '../../types/req-res'
import { sendSuccessResponse } from '../../utils'

const timeframeSchema = z.object({
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly')
})

export const getTrafficAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeframe } = timeframeSchema.parse(req.query)
    const data = await analyticsService.getTrafficAnalytics(timeframe)
    return sendSuccessResponse(res, data, 'Traffic analytics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getSalesAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeframe } = timeframeSchema.parse(req.query)
    const data = await analyticsService.getSalesAnalytics(timeframe)
    return sendSuccessResponse(res, data, 'Sales analytics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getProductPerformanceAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { timeframe } = timeframeSchema.parse(req.query)
    const data = await analyticsService.getProductPerformanceAnalytics(timeframe)
    return sendSuccessResponse(res, data, 'Product performance analytics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
