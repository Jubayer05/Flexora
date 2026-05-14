import type { NextFunction, Response } from 'express';
import { FeedbackService } from '../../services/feedback.services';
import type { AuthRequest } from '../../types/req-res';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../../utils';
import {
  customerCreateFeedbackSchema,
  feedbackQuerySchema,
} from '../../validations/zod/feedback.schema';

// Initialize service
const feedbackService = new FeedbackService();

// ================================
// CUSTOMER FEEDBACK OPERATIONS
// ================================

/**
 * Create a product review (authenticated customer)
 */
export const createProductReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = customerCreateFeedbackSchema.parse(req.body);
    const feedback = await feedbackService.createCustomerFeedback(userId, validatedData);

    return sendCreatedResponse(
      res,
      feedback,
      'Review submitted successfully. It will be published after admin approval.'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * Get authenticated customer's own feedbacks/reviews
 */
export const getMyFeedbacks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const query = feedbackQuerySchema.parse(req.query);
    const result = await feedbackService.getCustomerFeedbacks(userId, query);

    return sendSuccessResponse(res, result, 'Your feedbacks retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get authenticated customer's pending/submitted product review summary
 */
export const getMyFeedbackSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await feedbackService.getCustomerReviewSummary(userId);

    return sendSuccessResponse(res, result, 'Your review summary retrieved successfully');
  } catch (error) {
    return next(error);
  }
};
