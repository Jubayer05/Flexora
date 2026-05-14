import type { NextFunction, Response } from 'express'
import type { AuthRequest } from '../types/req-res'
import { handleControllerError, sendErrorResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import { UrlTrackingService } from '../services/url-tracking.service'
import {
  CreateUrlTrackingSchema,
  UpdateUrlTrackingSchema,
  TrackClickSchema,
  UrlTrackingQuerySchema,
  AnalyticsQuerySchema
} from '../validations/zod/url-tracking.schema'

const urlTrackingService = new UrlTrackingService()

function getBaseUrl(req: AuthRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
  return `${proto}://${host}`
}

export async function listUrlTrackings(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const validation = UrlTrackingQuerySchema.safeParse(req.query)
    if (!validation.success) {
      return sendErrorResponse(res, 'Invalid query', 400, validation.error.issues)
    }
    const result = await urlTrackingService.list(validation.data)
    return sendSuccessResponse(res, result.data, 'URL trackings retrieved', 200)
  } catch (error) {
    return handleControllerError(res, error, 'Failed to fetch URL trackings')
  }
}

export async function getUrlTrackingById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return sendErrorResponse(res, 'Invalid ID', 400)
    const data = await urlTrackingService.getById(id)
    return sendSuccessResponse(res, data, 'URL tracking retrieved')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to fetch URL tracking')
  }
}

export async function createUrlTracking(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const userId = req.user?.userId
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401)

    const validation = CreateUrlTrackingSchema.safeParse(req.body)
    if (!validation.success) {
      return sendErrorResponse(res, 'Validation failed', 400, validation.error.issues)
    }
    const data = await urlTrackingService.create(validation.data, userId)
    return sendSuccessResponse(res, data, 'URL tracking created', 201)
  } catch (error) {
    return handleControllerError(res, error, 'Failed to create URL tracking')
  }
}

export async function updateUrlTracking(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return sendErrorResponse(res, 'Invalid ID', 400)

    const validation = UpdateUrlTrackingSchema.safeParse(req.body)
    if (!validation.success) {
      return sendErrorResponse(res, 'Validation failed', 400, validation.error.issues)
    }
    const data = await urlTrackingService.update(id, validation.data)
    return sendSuccessResponse(res, data, 'URL tracking updated')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to update URL tracking')
  }
}

export async function deleteUrlTracking(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return sendErrorResponse(res, 'Invalid ID', 400)
    await urlTrackingService.delete(id)
    return sendSuccessResponse(res, { id }, 'URL tracking deleted')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to delete URL tracking')
  }
}

export async function trackClick(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const validation = TrackClickSchema.safeParse(req.body)
    if (!validation.success) {
      return sendErrorResponse(res, 'Validation failed', 400, validation.error.issues)
    }
    const baseUrl = process.env.FRONTEND_URL || getBaseUrl(req)
    const result = await urlTrackingService.trackClick(validation.data, req, baseUrl)
    return sendSuccessResponse(res, result, 'Click tracked')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to track click')
  }
}

export async function getAnalytics(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return sendErrorResponse(res, 'Invalid ID', 400)
    const validation = AnalyticsQuerySchema.safeParse(req.query)
    const query = validation.success ? validation.data : { period: 'all' as const }
    const data = await urlTrackingService.getAnalytics(id, query)
    return sendSuccessResponse(res, data, 'Analytics retrieved')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to fetch analytics')
  }
}

/**
 * Public optional page-view tracking (no redirect).
 * If slug has no tracking entry, returns success anyway.
 */
export async function trackPageView(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> {
  try {
    const validation = TrackClickSchema.safeParse(req.body)
    if (!validation.success) {
      return sendErrorResponse(res, 'Validation failed', 400, validation.error.issues)
    }

    const result = await urlTrackingService.trackPageViewOptional(validation.data, req)
    return sendSuccessResponse(res, result, 'Page view tracked')
  } catch (error) {
    return handleControllerError(res, error, 'Failed to track page view')
  }
}
