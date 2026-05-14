import { Router } from 'express';
import * as telegramPremiumController from '../../controllers/admin/telegram-premium.controller'; 

import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';
const router = Router();

/**
 * @route   GET /api/admin/telegram-premium/config
 * @desc    Get Premium configuration
 * @access  Admin with SETTINGS permission
 */
router.get(
  '/config',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  telegramPremiumController.getPremiumConfig
);

/**
 * @route   POST /api/admin/telegram-premium/config
 * @desc    Update Premium configuration
 * @access  Admin with SETTINGS permission
 */
router.post(
  '/config',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'UPDATE'),
  telegramPremiumController.updatePremiumConfig
);

/**
 * @route   POST /api/admin/telegram-premium/test-connection
 * @desc    Test Premium API connection
 * @access  Admin with SETTINGS permission
 */
router.post(
  '/test-connection',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  telegramPremiumController.testPremiumConnection
);

/**
 * @route   GET /api/admin/telegram-premium/prices
 * @desc    Get Premium prices from Fragment API
 * @access  Admin with SETTINGS permission
 */
router.get(
  '/prices',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  telegramPremiumController.getPremiumPrices
);

/**
 * @route   GET /api/admin/telegram-premium/orders
 * @desc    Get Premium order history
 * @access  Admin with ORDERS permission
 */
router.get(
  '/orders',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ORDERS', 'INDEX'),
  telegramPremiumController.getPremiumOrderHistory
);

export default router;

