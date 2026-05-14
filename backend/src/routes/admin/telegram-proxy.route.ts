import { Router } from 'express'
import * as proxyController from '../../controllers/admin/telegram-proxy.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/v1/admin/telegram-proxies
 * @desc    Get all proxy configurations
 * @access  Admin only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.getProxies
)

/**
 * @route   POST /api/v1/admin/telegram-proxies/test
 * @desc    Test a proxy connection
 * @access  Admin only
 */
router.post(
  '/test',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.testProxy
)

/**
 * @route   POST /api/v1/admin/telegram-proxies/bulk
 * @desc    Bulk import proxy configurations
 * @access  Admin only
 */
router.post(
  '/bulk',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.bulkImportProxies
)

/**
 * @route   POST /api/v1/admin/telegram-proxies
 * @desc    Add or update proxy configuration
 * @access  Admin only
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.addOrUpdateProxy
)

/**
 * @route   DELETE /api/v1/admin/telegram-proxies/:provider/:host/:port
 * @desc    Delete proxy configuration
 * @access  Admin only
 */
router.delete(
  '/:provider/:host/:port',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.deleteProxy
)

/**
 * @route   GET /api/v1/admin/telegram-proxies/stats
 * @desc    Get proxy statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  proxyController.getProxyStats
)

export default router

