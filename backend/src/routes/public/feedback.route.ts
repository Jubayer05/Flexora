import { Router } from 'express'
import * as feedbackController from '../../controllers/feedback.controller'

const router = Router();

// ================================
// PUBLIC FEEDBACK ROUTES
// ================================

/**
 * @route   GET /api/public/feedbacks
 * @desc    Get all published feedbacks
 * @access  Public
 */
router.get('/', feedbackController.getPublishedFeedbacks);

/**
 * @route   GET /api/public/feedbacks/statistics
 * @desc    Get feedback statistics
 * @access  Public
 */
router.get('/statistics', feedbackController.getFeedbackStatistics);

/**
 * @route   GET /api/public/feedbacks/product/:id
 * @desc    Get all published feedbacks for a specific product
 * @access  Public
 */
router.get('/product/:id', feedbackController.getProductFeedbacks);

/**
 * @route   GET /api/public/feedbacks/:id
 * @desc    Get published feedback by ID
 * @access  Public
 */
router.get('/:id', feedbackController.getFeedback);

export default router;
