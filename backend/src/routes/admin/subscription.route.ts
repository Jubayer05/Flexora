import { Router } from 'express'
import {
  cancelUserSubscription,
  extendUserSubscription,
  getActiveSubscriptions,
  getExpiringSubscriptions,
  getSubscriptionPayments,
  triggerExpirationNotifications,
  triggerSubscriptionExpiration
} from '../../controllers/admin/subscription.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession)

// ================================
// ADMIN SUBSCRIPTION ROUTES
// ================================

/**
 * @route   GET /admin/subscriptions/active
 * @desc    Get all active subscriptions
 * @access  Admin Only
 */
router.get('/active', getActiveSubscriptions)

/**
 * @route   GET /admin/subscriptions/expiring
 * @desc    Get subscriptions expiring soon
 * @access  Admin Only
 */
router.get('/expiring', getExpiringSubscriptions)

/**
 * @route   GET /admin/subscriptions/payments
 * @desc    Get all subscription payments
 * @access  Admin Only
 */
router.get('/payments', getSubscriptionPayments)

/**
 * @route   POST /admin/subscriptions/notify-expiring
 * @desc    Manually trigger expiration notifications
 * @access  Admin Only
 */
router.post('/notify-expiring', triggerExpirationNotifications)

/**
 * @route   POST /admin/subscriptions/expire
 * @desc    Manually trigger subscription expiration
 * @access  Admin Only
 */
router.post('/expire', triggerSubscriptionExpiration)

/**
 * @route   POST /admin/subscriptions/:userId/extend
 * @desc    Manually extend user's subscription
 * @access  Admin Only
 */
router.post('/:userId/extend', extendUserSubscription)

/**
 * @route   POST /admin/subscriptions/:userId/cancel
 * @desc    Cancel user's subscription
 * @access  Admin Only
 */
router.post('/:userId/cancel', cancelUserSubscription)

export default router
