import { Router } from 'express';
import * as balanceController from '../../controllers/admin/balance.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession);

/**
 * @route   POST /api/v1/admin/balance/add-user-balance
 * @desc    Add balance to user (for admin dashboard)
 * @access  Admin only
 */
router.post('/balance/add-user-balance', balanceController.addUserBalanceDashboard);

/**
 * @route   GET /api/v1/admin/users/:id/balance
 * @desc    Get user balance details
 * @access  Admin only
 */
router.get('/users/:id/balance', balanceController.getUserBalance);

/**
 * @route   POST /api/v1/admin/users/:id/balance/add
 * @desc    Add balance to user
 * @access  Admin only
 */
router.post('/users/:id/balance/add', balanceController.addUserBalance);

/**
 * @route   POST /api/v1/admin/users/:id/balance/deduct
 * @desc    Deduct balance from user
 * @access  Admin only
 */
router.post('/users/:id/balance/deduct', balanceController.deductUserBalance);

/**
 * @route   GET /api/v1/admin/users/:id/balance/history
 * @desc    Get user balance transaction history
 * @access  Admin only
 */
router.get('/users/:id/balance/history', balanceController.getUserBalanceHistory);

// ================================
// BULK OPERATIONS
// ================================

/**
 * @route   POST /api/v1/admin/balance/bulk-add
 * @desc    Bulk add balance to multiple users
 * @access  Admin only
 */
router.post('/balance/bulk-add', balanceController.bulkAddBalance);

// ================================
// BALANCE STATISTICS
// ================================

/**
 * @route   GET /api/v1/admin/balance/statistics
 * @desc    Get balance system statistics
 * @access  Admin only
 */
router.get('/balance/statistics', balanceController.getBalanceStatistics);

/**
 * @route   GET /api/v1/admin/balance/users
 * @desc    Get users by balance (high/low)
 * @access  Admin only
 */
router.get('/balance/users', balanceController.getUsersByBalance);

// ================================
// TOPUP REQUEST MANAGEMENT
// ================================

/**
 * @route   GET /api/v1/admin/balance/topup-requests
 * @desc    Get all topup requests (with filters)
 * @access  Admin only
 */
router.get('/balance/topup-requests', balanceController.getTopupRequests);

/**
 * @route   POST /api/v1/admin/balance/approve-topup/:id
 * @desc    Approve topup request and add balance
 * @access  Admin only
 */
router.post('/balance/approve-topup/:id', balanceController.approveTopupRequest);

/**
 * @route   POST /api/v1/admin/balance/reject-topup/:id
 * @desc    Reject topup request
 * @access  Admin only
 */
router.post('/balance/reject-topup/:id', balanceController.rejectTopupRequest);

// Note: Refund to balance is now handled via /api/v1/admin/orders/:id/refund
// with { refundTo: 'BALANCE' } parameter

export default router;
