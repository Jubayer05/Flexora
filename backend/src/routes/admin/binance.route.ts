/**
 * Admin Binance Routes
 * Manages Binance configuration and session management
 */

import { Router } from 'express'
import * as binanceController from '../../controllers/admin/binance.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession
} from '../../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/v1/admin/binance/config
 * @desc    Get Binance configuration and session status
 * @access  Admin only
 */
router.get(
  '/config',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  binanceController.getBinanceConfig
)

/**
 * @route   GET /api/v1/admin/binance/audit-logs
 * @desc    Get Binance audit logs
 * @access  Admin only
 */
router.get(
  '/audit-logs',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  binanceController.getBinanceAuditLogs
)

/**
 * @route   GET /api/v1/admin/binance/bootstrap-status
 * @desc    Get bootstrap login status and instructions
 * @access  Admin only
 */
router.get(
  '/bootstrap-status',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  binanceController.getBootstrapStatus
)

/**
 * @route   POST /api/v1/admin/binance/test-session
 * @desc    Test if Binance session is valid
 * @access  Admin only
 */
router.post(
  '/test-session',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  binanceController.testBinanceSession
)

/**
 * @route   POST /api/v1/admin/binance/import-session
 * @desc    Import Binance cookies from admin UI
 * @access  Admin only
 */
router.post(
  '/import-session',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  binanceController.importBinanceSession
)

export default router

