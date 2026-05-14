import { Router } from 'express';
import * as feedbackController from '../../controllers/feedback.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// FEEDBACK MANAGEMENT ROUTES (ADMIN)
// ================================

/**
 * @route   GET /api/admin/feedbacks
 * @desc    Get all feedbacks with filtering and pagination
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'INDEX'),
  feedbackController.getFeedbacks
);

/**
 * @route   GET /api/admin/feedbacks/statistics
 * @desc    Get feedback statistics
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/statistics',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'INDEX'),
  feedbackController.getFeedbackStatistics
);

/**
 * @route   POST /api/admin/feedbacks/bulk-action
 * @desc    Perform bulk actions on feedbacks (publish/unpublish/delete)
 * @access  Admin/Moderator with UPDATE/DELETE permission
 */
router.post(
  '/bulk-action',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  feedbackController.bulkFeedbackAction
);

router.post(
  '/bulk-assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'CREATE'),
  feedbackController.bulkAssignFeedbacks
);

/**
 * @route   POST /api/admin/feedbacks
 * @desc    Create new feedback (can be fake feedback by admin)
 * @access  Admin/Moderator with CREATE permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'CREATE'),
  feedbackController.createFeedback
);

/**
 * @route   GET /api/admin/feedbacks/:id
 * @desc    Get feedback by ID
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'INDEX'),
  feedbackController.getFeedback
);

/**
 * @route   PUT /api/admin/feedbacks/:id
 * @desc    Update feedback by ID
 * @access  Admin/Moderator with UPDATE permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'UPDATE'),
  feedbackController.updateFeedback
);

/**
 * @route   DELETE /api/admin/feedbacks/:id
 * @desc    Delete feedback by ID
 * @access  Admin/Moderator with DELETE permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('FEEDBACKS', 'DELETE'),
  feedbackController.deleteFeedback
);

export default router;
