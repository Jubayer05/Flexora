import { Router } from 'express';
import * as couponController from '../../controllers/coupon.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requireAdminOnly,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN COUPON CRUD OPERATIONS
// ================================

/**
 * @route   POST /api/v1/admin/coupons
 * @desc    Create new coupon (admin only)
 * @access  Admin Only
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  couponController.createCoupon
);

/**
 * @route   PUT /api/v1/admin/coupons/:id
 * @desc    Update coupon by ID (admin only)
 * @access  Admin Only
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  couponController.updateCoupon
);

/**
 * @route   DELETE /api/v1/admin/coupons/:id
 * @desc    Delete coupon by ID (admin only)
 * @access  Admin Only
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  couponController.deleteCoupon
);

// ================================
// ADMIN BULK OPERATIONS
// ================================

/**
 * @route   POST /api/v1/admin/coupons/bulk-update
 * @desc    Bulk update coupons (admin only)
 * @access  Admin Only
 */
router.post(
  '/bulk-update',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  couponController.bulkUpdateCoupons
);

/**
 * @route   POST /api/v1/admin/coupons/bulk-delete
 * @desc    Bulk delete coupons (admin only)
 * @access  Admin Only
 */
router.post(
  '/bulk-delete',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  couponController.bulkDeleteCoupons
);

// ================================
// ADMIN COUPON MANAGEMENT
// ================================

/**
 * @route   GET /api/v1/admin/coupons
 * @desc    Get all coupons with pagination and filters (admin only)
 * @access  Admin Only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.getCoupons
);

/**
 * @route   GET /api/v1/admin/coupons/code/:code
 * @desc    Get coupon by code (admin only)
 * @access  Admin Only
 */
router.get(
  '/code/:code',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.getCouponByCode
);

// ================================
// ADMIN COUPON ANALYTICS & USAGE
// ================================

/**
 * @route   GET /api/v1/admin/coupons/stats
 * @desc    Get coupon analytics and statistics (admin only)
 * @access  Admin Only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.getCouponStats
);

/**
 * @route   GET /api/v1/admin/coupons/usage
 * @desc    Get coupon usage history (admin only)
 * @access  Admin Only
 */
router.get(
  '/usage',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.getCouponUsage
);

/**
 * @route   POST /api/v1/admin/coupons/validate
 * @desc    Validate coupon (admin only)
 * @access  Admin Only
 */
router.post(
  '/validate',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.validateCoupon
);

/**
 * @route   GET /api/v1/admin/coupons/:id
 * @desc    Get coupon by ID (admin only)
 * @access  Admin Only
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  couponController.getCoupon
);

export default router;
