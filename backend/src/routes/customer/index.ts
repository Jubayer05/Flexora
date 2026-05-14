import { Router } from 'express'

// Import all customer route modules
import authRoutes from './auth.route'
import balanceRoutes from './balance.route'
import couponRoutes from './coupon.route'
import cartRoutes from './cart.route'
import feedbackRoutes from './feedback.route'
import notificationRoutes from './notification.route'
import orderRoutes from './order.route'
import subscriptionRoutes from './subscription.route'
import telegramTransferRoutes from './telegram-transfer.route'
import telegramAccountRoutes from './telegramAccount.route'
import ticketRoutes from './ticket.routes'
import userRoutes from './user.route'
import withdrawalRoutes from './withdrawal.route'
import affiliateRoutes from './affiliate.route'

const router = Router()

// ================================
// CUSTOMER ROUTE ORGANIZATION
// ================================

// Customer authentication management routes
router.use('/auth', authRoutes)

// Customer order management routes
router.use('/orders', orderRoutes)

// Customer cart (persistent for authenticated users)
router.use('/cart', cartRoutes)

// Customer coupon validation routes
router.use('/coupons', couponRoutes)

// Customer balance management routes
router.use('/balance', balanceRoutes)

// Customer withdrawal management routes
router.use('/withdrawals', withdrawalRoutes)

// Customer affiliate/referral routes
router.use('/affiliate', affiliateRoutes)

// Customer Telegram transfer routes
router.use('/telegram-transfers', telegramTransferRoutes)

// Customer Telegram account access routes
router.use('/telegram-accounts', telegramAccountRoutes)

// Customer notification routes (for OTP notifications)
router.use('/notifications', notificationRoutes)

// Customer subscription management routes
router.use('/subscriptions', subscriptionRoutes)

// Customer feedback/review routes
router.use('/feedbacks', feedbackRoutes)

// Customer ticket management routes (must come before user routes to avoid /:id conflict)
router.use('/tickets', ticketRoutes)

// Customer profile and account management routes (directly under /customer)
router.use('/', userRoutes)

export default router
