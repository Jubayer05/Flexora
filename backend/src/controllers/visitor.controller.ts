import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { visitorService } from '../services/visitor.service'
import { sendSuccessResponse, type ApiResponse } from '../utils'

// Validation schemas
const trackVisitorSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
})

const visitorStatsQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .default('90')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(365))
})

// ================================
// CONTROLLERS
// ================================

/**
 * Track a visitor (increment count for a specific date)
 * POST /api/visitor/track
 * Public endpoint - no auth required
 */
export const trackVisitor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { date } = trackVisitorSchema.parse(req.body)

    // Convert string date to Date object
    const visitorDate = new Date(date)

    await visitorService.incrementVisitorCount(visitorDate)

    return res.status(200).json({})
  } catch (error) {
    return next(error)
  }
}

/**
 * Get visitor statistics for last N days
 * GET /api/visitor/stats?days=90
 * Public endpoint for chart data
 */
export const getVisitorStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { days } = visitorStatsQuerySchema.parse(req.query)

    const stats = await visitorService.getStats(days)

    return sendSuccessResponse(res, stats, 'Visitor stats retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get total visitor count
 * GET /api/visitor/total
 * Public endpoint
 */
export const getTotalVisitors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const total = await visitorService.getTotalCount()

    return sendSuccessResponse(res, { total }, 'Total visitors retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
