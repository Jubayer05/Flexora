import { Router } from 'express';

import * as telegramTransferController from '../../controllers/admin/telegram-transfer.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession);

// ================================
// ADMIN TELEGRAM TRANSFER ROUTES
// ================================

/**
 * @route   GET /api/v1/admin/telegram-transfers/statistics
 * @desc    Get transfer statistics (must be before /:id route)
 * @access  Admin
 */
router.get('/statistics', telegramTransferController.getTransferStatistics);

/**
 * @route   GET /api/v1/admin/telegram-transfers
 * @desc    Get all transfers with filters and pagination
 * @access  Admin
 */
router.get('/', telegramTransferController.getAllTransfers);

/**
 * @route   GET /api/v1/admin/telegram-transfers/:id
 * @desc    Get single transfer by ID
 * @access  Admin
 */
router.get('/:id', telegramTransferController.getTransferById);

/**
 * @route   PATCH /api/v1/admin/telegram-transfers/:id/status
 * @desc    Update transfer status
 * @access  Admin
 */
router.patch('/:id/status', telegramTransferController.updateTransferStatus);

/**
 * @route   POST /api/v1/admin/telegram-transfers/:id/retry
 * @desc    Retry failed transfer
 * @access  Admin
 */
router.post('/:id/retry', telegramTransferController.retryTransfer);

/**
 * @route   POST /api/v1/admin/telegram-transfers/:id/execute
 * @desc    Execute ownership transfer (promote customer to admin)
 * @access  Admin
 */
router.post('/:id/execute', telegramTransferController.executeTransfer);

/**
 * @route   POST /api/v1/admin/telegram-transfers/:id/manual-complete
 * @desc    Manually complete transfer (admin override)
 * @access  Admin
 */
router.post('/:id/manual-complete', telegramTransferController.manualCompleteTransfer);

/**
 * @route   GET /api/v1/admin/telegram-transfers/:id/proof
 * @desc    Get transfer proof URL
 * @access  Admin
 */
router.get('/:id/proof', telegramTransferController.getTransferProof);

/**
 * @route   DELETE /api/v1/admin/telegram-transfers/:id
 * @desc    Delete transfer record (use with caution)
 * @access  Admin
 */
router.delete('/:id', telegramTransferController.deleteTransfer);

export default router;
