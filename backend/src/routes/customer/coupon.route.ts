import { Router } from 'express'
import * as couponController from '../../controllers/coupon.controller'
import { authMiddleware } from '../../middlewares/auth'

const router = Router()

// ================================
// CUSTOMER COUPON OPERATIONS
// ================================

/**
 * @route   POST /api/v1/customer/coupons/validate
 * @desc    Validate coupon for authenticated customer (checks user-specific usage limits)
 * @access  Private (Customer)
 */
router.post('/validate', authMiddleware, couponController.validateCoupon)

/**
 * @route   GET /api/v1/customer/coupons/:code
 * @desc    Get coupon details by code for authenticated customer
 * @access  Private (Customer)
 */
router.get('/:code', authMiddleware, couponController.getCouponByCode)

export default router
