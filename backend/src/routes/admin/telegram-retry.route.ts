import { Router } from 'express';
import * as retryController from '../../controllers/admin/telegram-retry.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// All routes require authentication and admin role
router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession);

/**
 * @route   GET /api/v1/admin/telegram-retry/stats
 * @desc    Get retry statistics
 * @access  Admin
 */
router.get('/stats', retryController.getRetryStats);

/**
 * @route   POST /api/v1/admin/telegram-retry/trigger
 * @desc    Manually trigger retry job
 * @access  Admin
 */
router.post('/trigger', retryController.triggerRetryJob);

export default router;
