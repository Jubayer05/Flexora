import { Router } from 'express';

import * as telegramTransferController from '../../controllers/customer/telegram-transfer.controller';
import { optionalAuthMiddleware } from '../../middlewares/auth';

const router = Router();

// ================================
// CUSTOMER TELEGRAM TRANSFER ROUTES
// ================================

/**
 * @route   GET /api/v1/customer/telegram-transfers
 * @desc    Get customer's all Telegram transfers
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/', optionalAuthMiddleware, telegramTransferController.getCustomerTransfers);

/**
 * @route   GET /api/v1/customer/telegram-transfers/:id/status
 * @desc    Get transfer status
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id/status', optionalAuthMiddleware, telegramTransferController.getTransferStatus);

/**
 * @route   POST /api/v1/customer/telegram-transfers/:id/verify
 * @desc    Verify customer has joined the Telegram group/channel and execute transfer
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.post('/:id/verify', optionalAuthMiddleware, telegramTransferController.verifyCustomerJoined);

/**
 * @route   POST /api/v1/customer/telegram-transfers/:id/verify-membership
 * @desc    Verify customer has joined the Telegram group/channel (alias for verify)
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.post(
  '/:id/verify-membership',
  optionalAuthMiddleware,
  telegramTransferController.verifyCustomerJoined
);

/**
 * @route   GET /api/v1/customer/telegram-transfers/:id
 * @desc    Get single transfer by ID
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id', optionalAuthMiddleware, telegramTransferController.getTransferById);

export default router;
