import { Router } from 'express'
import * as couponController from '../../controllers/coupon.controller'

const router = Router();

// ================================
// PUBLIC COUPON OPERATIONS
// ================================

/**
 * @route   POST /api/v1/public/coupons/validate
 * @desc    Validate coupon for order checkout
 * @access  Public
 */
router.post('/validate', couponController.validateCoupon);

/**
 * @route   GET /api/v1/public/coupons/:code
 * @desc    Get basic coupon information by code (for display purposes)
 * @access  Public
 */
router.get('/:code', couponController.getCouponByCode);

export default router;