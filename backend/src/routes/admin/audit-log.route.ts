import { Router } from 'express'
import * as auditLogController from '../../controllers/admin/audit-log.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs with pagination and filters
 * @access  Admin only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  auditLogController.getAuditLogs
)

/**
 * @route   GET /api/v1/admin/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  auditLogController.getAuditLogStats
)

export default router

