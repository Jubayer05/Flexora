import { Router } from 'express'
import { getStatistics } from '../../controllers/admin/statistics.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/v1/admin/statistics
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/', adminAuthMiddleware, requireAdminAuth, validateAdminSession, getStatistics)

export default router
