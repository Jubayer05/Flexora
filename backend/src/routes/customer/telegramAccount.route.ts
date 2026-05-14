import { Router } from 'express';
import * as customerAccountController from '../../controllers/customerAccount.controller';
import {
  authMiddleware,
  optionalAuthMiddleware,
  validateActiveSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// AUTHENTICATED CUSTOMER ROUTES
// ================================

/**
 * @route   GET /api/customer/telegram-accounts
 * @desc    Get customer's Telegram accounts from their orders
 * @access  Customer Authentication Required
 */
router.get(
  '/',
  authMiddleware,
  validateActiveSession,
  customerAccountController.getCustomerAccounts
);

router.get(
  '/security-config',
  authMiddleware,
  validateActiveSession,
  customerAccountController.getTelegramCodeSecurityConfig
);

/**
 * @route   GET /api/customer/telegram-accounts/:id/status
 * @desc    Check Telegram account delivery status
 * @access  Customer Authentication Required
 */
router.get(
  '/:id/status',
  authMiddleware,
  validateActiveSession,
  customerAccountController.checkAccountStatus
);

// ================================
// GUEST USER ACCESS (PUBLIC ROUTES)
// ================================

/**
 * @route   POST /api/customer/telegram-accounts/guest/accounts
 * @desc    Get guest user accounts by order number and email
 * @access  Public (no authentication required)
 */
router.post('/guest/accounts', customerAccountController.getGuestAccountsByOrder);

// ================================
// TELEGRAM OTP API (SIMPLIFIED)
// ================================

/**
 * @route   POST /api/customer/telegram-accounts/request-otp
 * @desc    Request OTP for Telegram account access (auto-starts monitoring)
 * @access  Public (supports both authenticated and guest users)
 */
router.post('/request-otp', optionalAuthMiddleware, customerAccountController.requestTelegramOTP);

/**
 * @route   POST /api/customer/telegram-accounts/get-code
 * @desc    Get latest Telegram login code for a purchased account
 * @access  Customer Authentication Required
 */
router.post(
  '/get-code',
  authMiddleware,
  validateActiveSession,
  customerAccountController.getTelegramLoginCode
);

/**
 * @route   POST /api/customer/telegram-accounts/get-credentials
 * @desc    Get account credentials using OTP
 * @access  Customer Authentication Required
 */
router.post(
  '/get-credentials',
  authMiddleware,
  validateActiveSession,
  customerAccountController.getTelegramCredentialsWithOTP
);

/**
 * @route   POST /api/customer/telegram-accounts/re-request-code
 * @desc    Re-request Telegram verification code for customer's account
 * @access  Customer Authentication Required
 */
router.post(
  '/re-request-code',
  authMiddleware,
  validateActiveSession,
  customerAccountController.reRequestTelegramCode
);

/**
 * @route   POST /api/customer/telegram-accounts/kick-admin-session
 * @desc    Kick admin session from customer's Telegram account
 * @access  Customer Authentication Required
 */
router.post(
  '/kick-admin-session',
  authMiddleware,
  validateActiveSession,
  customerAccountController.kickAdminSession
);

export default router;
