import { Router } from 'express'
import {
  getGroupEmailStats,
  previewGroupEmail,
  sendGroupEmail
} from '../../controllers/email.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession)

/**
 * GET /api/v1/admin/emails/group-stats
 * Fetch audience counts and available filters.
 */
router.get('/group-stats', getGroupEmailStats)

/**
 * POST /api/v1/admin/emails/group-preview
 * Preview selected recipients before sending.
 */
router.post('/group-preview', previewGroupEmail)

/**
 * POST /api/v1/admin/emails/send-group
 * Send group email to customers, moderators, or admins
 */
router.post('/send-group', sendGroupEmail)

export default router
