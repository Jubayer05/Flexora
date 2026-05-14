import type { NextFunction, Request, Response } from 'express'
import { newsletterService } from '../services/newsletter.service'
import type { Pagination } from '../types/req-res'
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import {
  NewsletterIdSchema,
  NewsletterQuerySchema,
  SubscribeNewsletterSchema
} from '../validations/zod/newsletter.schema'

// ================================
// PUBLIC OPERATIONS
// ================================

export const subscribe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<{ id: number; email: string; createdAt: Date }>> | void> => {
  try {
    const validatedData = SubscribeNewsletterSchema.parse(req.body)
    const subscriber = await newsletterService.subscribe(validatedData.email)

    return sendCreatedResponse(
      res,
      subscriber,
      'Successfully subscribed to newsletter! Check your email for confirmation.'
    )
  } catch (error) {
    next(error)
  }
}

// ================================
// ADMIN OPERATIONS
// ================================

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<
  ApiResponse<{
    subscribers: Array<{ id: number; email: string; createdAt: Date }>
    pagination: Pagination
  }>
> | void> => {
  try {
    const validatedQuery = NewsletterQuerySchema.parse(req.query)
    const result = await newsletterService.findAll(validatedQuery)

    return sendSuccessResponse(
      res,
      {
        subscribers: result.data,
        pagination: result.pagination
      },
      'Newsletter subscribers retrieved successfully'
    )
  } catch (error) {
    next(error)
  }
}

export const deleteSubscriber = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<null>> | void> => {
  try {
    const { id } = NewsletterIdSchema.parse(req.params)
    await newsletterService.delete(id)

    return sendSuccessResponse(res, null, 'Subscriber deleted successfully')
  } catch (error) {
    next(error)
  }
}
