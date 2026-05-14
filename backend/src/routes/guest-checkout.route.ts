/**
 * Guest Checkout Routes
 * Public-facing guest checkout endpoints (no authentication required)
 */

import { Router } from 'express'
import * as guestCheckoutController from '../controllers/guest-checkout.controller'

const router = Router()

/**
 * @route   POST /api/v1/guest-checkout/verify-email
 * @desc    Verify guest email and validate product availability
 * @access  Public
 */
router.post('/verify-email', guestCheckoutController.verifyGuestEmail)

/**
 * @route   POST /api/v1/guest-checkout/initiate
 * @desc    Initiate payment for guest checkout
 * @access  Public
 */
router.post('/initiate', guestCheckoutController.initiateGuestCheckout)

/**
 * @route   GET /api/v1/guest-checkout/orders/:orderId
 * @desc    Get guest order details using access token
 * @access  Public (with valid token)
 */
router.get('/orders/:orderId', guestCheckoutController.getGuestOrderDetails)

/**
 * @route   POST /api/v1/guest-checkout/validate-token
 * @desc    Validate guest access token
 * @access  Public
 */
router.post('/validate-token', guestCheckoutController.validateGuestToken)

export default router
