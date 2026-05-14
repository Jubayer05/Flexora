import { Router } from 'express'
import {
  cancelSubscription,
  getActiveSubscription,
  getSubscriptionHistory,
  purchaseSubscription,
  renewSubscription
} from '../../controllers/customer/subscription.controller'
import { authMiddleware, validateActiveSession } from '../../middlewares/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware, validateActiveSession)

// ================================
// CUSTOMER SUBSCRIPTION ROUTES
// ================================

/**
 * @route   POST /customer/subscriptions/purchase
 * @desc    Purchase a new subscription package
 * @access  Customer (authenticated)
 */
router.post('/purchase', purchaseSubscription)

/**
 * @route   POST /customer/subscriptions/renew
 * @desc    Renew existing subscription
 * @access  Customer (authenticated)
 */
router.post('/renew', renewSubscription)

/**
 * @route   POST /customer/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Customer (authenticated)
 */
router.post('/cancel', cancelSubscription)

/**
 * @route   GET /customer/subscriptions/active
 * @desc    Get active subscription details
 * @access  Customer (authenticated)
 */
router.get('/active', getActiveSubscription)

/**
 * @route   GET /customer/subscriptions/history
 * @desc    Get subscription payment history
 * @access  Customer (authenticated)
 */
router.get('/history', getSubscriptionHistory)

export default router
