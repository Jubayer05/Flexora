import { Router } from 'express';
import * as adminController from '../../controllers/admin.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requireAdminOnly,
  validateAdminSession,
} from '../../middlewares/auth';
import { clearCache, getCacheHealth, getCacheStats } from '../../middlewares/cache-monitor';

const router = Router();

// ================================
// ADMIN CRUD OPERATIONS
// ================================

/**
 * @route   POST /api/admin/create
 * @desc    Create new admin (admin privilege required)
 * @access  Admin Only
 */
router.post(
  '/create',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  adminController.createAdmin
);

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admins
 * @access  Admin Only
 */
router.get(
  '/admins',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.getAdmins
);

/**
 * @route   GET /api/admin/admins/:id
 * @desc    Get admin by ID
 * @access  Admin Only
 */
router.get(
  '/admins/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.getAdminById
);

/**
 * @route   PUT /api/admin/admins/:id
 * @desc    Update admin by ID
 * @access  Admin Only
 */
router.put(
  '/admins/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  adminController.updateAdmin
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin Only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.getAdminStats
);

// ================================
// CACHE MONITORING ROUTES
// ================================

/**
 * @route   GET /api/admin/cache/health
 * @desc    Get cache health status
 * @access  Admin Only
 */
router.get(
  '/cache/health',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  getCacheHealth
);

/**
 * @route   GET /api/admin/cache/stats
 * @desc    Get cache statistics and metrics
 * @access  Admin Only
 */
router.get(
  '/cache/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  getCacheStats
);

/**
 * @route   DELETE /api/admin/cache/clear
 * @desc    Clear all cache or specific patterns
 * @access  Admin Only
 */
router.delete(
  '/cache/clear',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  clearCache
);

export default router;
