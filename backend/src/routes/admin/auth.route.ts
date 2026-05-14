import { Router } from 'express';
import * as adminController from '../../controllers/admin.controller';
import * as authController from '../../controllers/auth.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN AUTHENTICATION
// ================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', adminController.login);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Admin Only
 */
router.post(
  '/logout',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.logout
);

/**
 * @route   POST /api/admin/auth/refresh-token
 * @desc    Refresh admin access token
 * @access  Public
 */
router.post('/refresh-token', adminController.refreshToken);

/**
 * @route   GET /api/admin/auth/verify-token
 * @desc    Verify admin token and get current admin info
 * @access  Admin Only
 */
router.get(
  '/verify-token',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.verifyToken
);

/**
 * @route   GET /api/admin/auth/permissions
 * @desc    Get current admin's permissions for sidebar/UI filtering
 * @access  Admin Only
 */
router.get(
  '/permissions',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.getAdminPermissions
);

/**
 * @route   POST /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Admin Only
 */
router.post(
  '/change-password',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.changePassword
);

// ================================
// ADMIN SESSION MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/auth/sessions
 * @desc    Get admin active sessions
 * @access  Admin Only
 */
router.get(
  '/sessions',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.getAdminSessions
);

/**
 * @route   POST /api/admin/auth/sessions/revoke
 * @desc    Revoke admin session by ID
 * @access  Admin Only
 */
router.post(
  '/sessions/revoke',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.revokeSession
);

/**
 * @route   POST /api/admin/auth/sessions/revoke-all
 * @desc    Revoke all admin sessions except current
 * @access  Admin Only
 */
router.post(
  '/sessions/revoke-all',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminController.revokeAllSessions
);

// ================================
// ADMIN AUTHENTICATION STATISTICS AND MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/auth/stats
 * @desc    Get authentication statistics (admin only)
 * @access  Admin Only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  authController.getAuthStats
);

/**
 * @route   POST /api/admin/auth/cleanup-sessions
 * @desc    Cleanup expired sessions (admin only)
 * @access  Admin Only
 */
router.post(
  '/cleanup-sessions',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  authController.cleanupExpiredSessions
);

export default router;
