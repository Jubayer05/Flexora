import { Router } from 'express';
import * as transferProductController from '../../controllers/admin/transfer-product.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN TRANSFER PRODUCTS MANAGEMENT
// ================================

/**
 * @route   GET /api/v1/admin/transfer-products
 * @desc    Get all transfer products with pagination and filters
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  transferProductController.getTransferProducts
);

/**
 * @route   POST /api/v1/admin/transfer-products
 * @desc    Create new transfer product
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  transferProductController.createTransferProduct
);

/**
 * @route   PUT /api/v1/admin/transfer-products/:id
 * @desc    Update transfer product by ID
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  transferProductController.updateTransferProduct
);

/**
 * @route   DELETE /api/v1/admin/transfer-products/:id
 * @desc    Delete transfer product by ID
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  transferProductController.deleteTransferProduct
);

/**
 * @route   POST /api/v1/admin/transfer-products/verify-bot
 * @desc    Verify bot is admin in target group/channel
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/verify-bot',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  transferProductController.verifyBotAdmin
);

/**
 * @route   POST /api/v1/admin/transfer-products/chat-info
 * @desc    Get chat information (member count, title, etc.)
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/chat-info',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  transferProductController.getChatInfo
);

export default router;
