import { Router } from 'express';
import * as authController from '../../controllers/auth.controller';

const router = Router();

// ================================
// PUBLIC AUTHENTICATION ENDPOINTS
// ================================

/**
 * @route   POST /api/public/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   GET /api/v1/auth/verify-email
 * @desc    Verify email address using token
 * @access  Public
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address using token (POST body)
 * @access  Public
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/v1/auth/verify-email/code
 * @desc    Verify email address using 6-digit code
 * @access  Public
 */
router.post('/verify-email/code', authController.verifyEmailCode);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', authController.resendVerificationEmail);

/**
 * @route   GET /api/v1/auth/verification-config
 * @desc    Get public email verification configuration
 * @access  Public
 */
router.get('/verification-config', authController.getEmailVerificationConfig);

/**
 * @route   POST /api/public/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/public/auth/guest-login
 * @desc    Guest user login
 * @access  Public
 */
router.post('/guest-login', authController.guestLogin);

/**
 * @route   POST /api/public/auth/password-reset/request
 * @desc    Request password reset
 * @access  Public
 */
router.post('/password-reset/request', authController.requestPasswordReset);

/**
 * @route   POST /api/public/auth/password-reset/confirm
 * @desc    Confirm password reset with token
 * @access  Public
 */
router.post('/password-reset/confirm', authController.resetPassword);

/**
 * @route   POST /api/public/auth/verify-token
 * @desc    Verify token validity
 * @access  Public
 */
router.post('/verify-token/oauth', authController.verifyOauthToken);

/**
 * @route   POST /api/public/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (requires valid refresh token)
 */
router.post('/refresh-token', authController.refreshToken);

export default router;
