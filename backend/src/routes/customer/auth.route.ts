import { Router } from 'express';
import * as authController from '../../controllers/auth.controller';
import { authMiddleware, validateActiveSession } from '../../middlewares/auth';

const router = Router();

// ================================
// CUSTOMER AUTHENTICATION MANAGEMENT
// ================================

/**
 * @route   POST /api/customer/auth/logout
 * @desc    Customer logout
 * @access  Customer Authentication Required
 */
router.post('/logout', authMiddleware, validateActiveSession, authController.logout);

/**
 * @route   POST /api/customer/auth/logout-all
 * @desc    Logout from all customer sessions
 * @access  Customer Authentication Required
 */
router.post('/logout-all', authMiddleware, validateActiveSession, authController.logoutAll);

/**
 * @route   GET /api/customer/auth/sessions
 * @desc    Get customer active sessions
 * @access  Customer Authentication Required
 */
router.get('/sessions', authMiddleware, validateActiveSession, authController.getActiveSessions);

/**
 * @route   POST /api/customer/auth/sessions/revoke
 * @desc    Revoke customer session by ID
 * @access  Customer Authentication Required
 */
router.post(
  '/sessions/revoke',
  authMiddleware,
  validateActiveSession,
  authController.revokeSession
);

/**
 * @route   POST /api/customer/auth/refresh-token
 * @desc    Refresh customer access token
 * @access  Public (requires valid refresh token)
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   GET /api/customer/auth/verify-token
 * @desc    Verify customer token
 * @access  Customer Authentication Required
 */
router.get('/verify-token', authMiddleware, validateActiveSession, authController.verifyToken);

export default router;
