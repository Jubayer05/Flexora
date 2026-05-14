import { Router } from 'express'
import * as newsletterController from '../../controllers/newsletter.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

// ================================
// ADMIN NEWSLETTER ROUTES
// ================================

/**
 * @route   GET /api/v1/admin/newsletter
 * @desc    Get all newsletter subscribers with pagination
 * @access  Admin Only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  newsletterController.getAll
)

/**
 * @route   DELETE /api/v1/admin/newsletter/:id
 * @desc    Delete a newsletter subscriber
 * @access  Admin Only
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  newsletterController.deleteSubscriber
)

export default router
