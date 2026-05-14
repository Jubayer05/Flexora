import type { NextFunction, Request, Response } from 'express'
import { FeedbackService } from '../services/feedback.services'
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import {
  bulkAssignFeedbackSchema,
  bulkFeedbackActionSchema,
  createFeedbackSchema,
  feedbackParamsSchema,
  feedbackQuerySchema,
  updateFeedbackSchema
} from '../validations/zod/feedback.schema'

// Initialize service
const feedbackService = new FeedbackService()

// ================================
// CRUD OPERATIONS
// ================================

export const createFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = createFeedbackSchema.parse(req.body)
    const feedback = await feedbackService.create(validatedData)

    return sendCreatedResponse(res, feedback, 'Feedback created successfully')
  } catch (error) {
    return next(error)
  }
}

export const getFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = feedbackParamsSchema.parse(req.params)
    const feedback = await feedbackService.findById(id)

    return sendSuccessResponse(res, feedback, 'Feedback retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = feedbackQuerySchema.parse(req.query)
    const result = await feedbackService.findMany(query)

    return sendSuccessResponse(res, result, 'Feedbacks retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const updateFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = feedbackParamsSchema.parse(req.params)
    const validatedData = updateFeedbackSchema.parse(req.body)
    const feedback = await feedbackService.update(id, validatedData)

    return sendSuccessResponse(res, feedback, 'Feedback updated successfully')
  } catch (error) {
    return next(error)
  }
}

export const deleteFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = feedbackParamsSchema.parse(req.params)
    const result = await feedbackService.delete(id)

    return sendSuccessResponse(res, result, 'Feedback deleted successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// BULK OPERATIONS
// ================================

export const bulkFeedbackAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = bulkFeedbackActionSchema.parse(req.body)
    const result = await feedbackService.bulkAction(validatedData)

    return sendSuccessResponse(res, result, result.message)
  } catch (error) {
    return next(error)
  }
}

export const bulkAssignFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = bulkAssignFeedbackSchema.parse(req.body)
    const result = await feedbackService.bulkAssignFeedbacks(validatedData)

    return sendSuccessResponse(res, result, 'Product reviews assigned successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// STATISTICS
// ================================

export const getFeedbackStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : undefined
    const stats = await feedbackService.getStatistics(productId)

    return sendSuccessResponse(res, stats, 'Feedback statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// PUBLIC OPERATIONS
// ================================

export const getPublishedFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = feedbackQuerySchema.parse(req.query)
    const result = await feedbackService.getPublishedFeedbacks(query)

    return sendSuccessResponse(res, result, 'Published feedbacks retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getProductFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = feedbackParamsSchema.parse(req.params)
    const query = feedbackQuerySchema.parse(req.query)
    const result = await feedbackService.getProductFeedbacks(id, query)

    return sendSuccessResponse(res, result, 'Product feedbacks retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
