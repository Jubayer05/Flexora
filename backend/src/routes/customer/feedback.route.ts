import { Router } from 'express';
import * as feedbackController from '../../controllers/customer/feedback.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

/**
 * @description Customer feedback routes
 * @path /api/v1/customer/feedbacks
 */

// ================================
// CUSTOMER FEEDBACK ROUTES
// ================================

/**
 * @route POST /feedbacks
 * @description Submit a product review
 * @access Customer (authenticated only)
 * @middleware authMiddleware - requires authentication
 * @body productId - Product ID to review (required)
 * @body feedback - Review content (required, min 10 chars, max 1000)
 * @body rating - Rating (required, 1.0-5.0)
 */
router.post('/', authMiddleware, feedbackController.createProductReview);

/**
 * @route GET /feedbacks/summary
 * @description Get authenticated customer's pending/submitted product review summary
 * @access Customer (authenticated only)
 */
router.get('/summary', authMiddleware, feedbackController.getMyFeedbackSummary);

/**
 * @route GET /feedbacks
 * @description Get authenticated customer's own reviews
 * @access Customer (authenticated only)
 * @middleware authMiddleware - requires authentication
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 */
router.get('/', authMiddleware, feedbackController.getMyFeedbacks);

export default router;
