import { Router } from 'express';
import * as telegramNotificationController from '../../controllers/admin/telegram-notification.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// All routes require admin authentication
router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession);

/**
 * @route   POST /api/v1/admin/telegram/send
 * @desc    Send Telegram message to a single user
 * @access  Private (Admin)
 * @body    { userId: number, message: string }
 */
router.post('/send', telegramNotificationController.sendMessageToUser);

/**
 * @route   POST /api/v1/admin/telegram/send-bulk
 * @desc    Send Telegram message to multiple users
 * @access  Private (Admin)
 * @body    { userIds: number[], message: string }
 */
router.post('/send-bulk', telegramNotificationController.sendMessageToMultipleUsers);

/**
 * @route   POST /api/v1/admin/telegram/test-config
 * @desc    Send a test Telegram notification using saved or provided config
 * @access  Private (Admin)
 * @body    { type: 'general' | 'order' | 'transfer' | 'premium', token?: string, chatId?: string }
 */
router.post('/test-config', telegramNotificationController.sendTestTelegramNotification);

export default router;
