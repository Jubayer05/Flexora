import { Router } from 'express'

// Import all admin route modules
import { createNotification } from '../../controllers/notification.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession
} from '../../middlewares/auth'
import accountRoutes from './accounts.route'
import adminRoutes from './admin.route'
import analyticsRoutes from './analytics.route'
import authRoutes from './auth.route'
import balanceRoutes from './balance.route'
import blogAuthorRoutes from './blog-author.route'
import blogRoutes from './blog.route'
import blogSubcategoryRoutes from './blog-subcategory.route'
import categoryRoutes from './category.route'
import couponRoutes from './coupon.route'
import customPageRoutes from './custom-page.route'
import customerRoutes from './customer.route'
import deliveryTemplateRoutes from './delivery-template.route'
import emailRoutes from './email.route'
import emailTemplateRoutes from './emailTemplate.route'
import fakeNamesRoutes from './fake-names.route'
import feedbackRoutes from './feedback.route'
import galleryRoutes from './gallery.route'
import newsletterRoutes from './newsletter.route'
import notificationRoutes from './notification.route'
import orderRoutes from './order.route'
import paymentMethodRoutes from './payment-method.route'
import paymentRoutes from './payment.route'
import paygateProviderRoutes from './paygate-provider.route'
import productGroupRoutes from './product-group.route'
import productRoutes from './product.route'
import rankRoutes from './rank.route'
import roleRoutes from './role.route'
import settingRoutes from './setting.route'
import statisticsRoutes from './statistics.route'
import subscriptionPackageRoutes from './subscription-package.route'
import subscriptionRoutes from './subscription.route'
import ticketRoutes from './ticket.routes'
import auditLogRoutes from './audit-log.route'
import userRoutes from './user.route'
import withdrawalRoutes from './withdrawal.route'
import binanceRoutes from './binance.route'
import urlTrackingRoutes from './url-tracking.route'

const router = Router()

// ================================
// ADMIN ROUTE ORGANIZATION
// ================================

// Admin authentication and management routes
router.use('/', adminRoutes)

// Admin authentication statistics and session management
router.use('/auth', authRoutes)

// Admin user management routes
router.use('/users', userRoutes)

// Admin analytics routes
router.use('/analytics', analyticsRoutes)

// Admin balance management routes
router.use('/', balanceRoutes)

// Admin withdrawal management routes
router.use('/withdrawals', withdrawalRoutes)

// Orders
router.use('/orders', orderRoutes)

// Admin customer management routes
router.use('/customers', customerRoutes)

// Admin product management routes
router.use('/products', productRoutes)

// Admin product group management routes
router.use('/product-groups', productGroupRoutes)

// Admin account management routes (all platforms)
router.use('/accounts', accountRoutes)

// Admin category management routes
router.use('/categories', categoryRoutes)

// Admin coupon management routes
router.use('/coupons', couponRoutes)

// Admin payment management routes
router.use('/payments', paymentRoutes)

// Admin payment method management routes
router.use('/payment-methods', paymentMethodRoutes)

// Admin PayGate provider management routes
router.use('/paygate-providers', paygateProviderRoutes)

// Admin subscription package management routes
router.use('/subscription-packages', subscriptionPackageRoutes)

// Admin subscription management routes
router.use('/subscriptions', subscriptionRoutes)

// Admin blog management routes
router.use('/blogs', blogRoutes)

// Admin blog authors (author pool)
router.use('/blog-authors', blogAuthorRoutes)

// Admin blog subcategories
router.use('/blog-subcategories', blogSubcategoryRoutes)

// Admin role and permission management routes
router.use('/roles', roleRoutes)

// Admin rank management routes
router.use('/ranks', rankRoutes)

// Admin ticket management routes
router.use('/tickets', ticketRoutes)

// Admin gallery management routes
router.use('/gallery', galleryRoutes)

// Admin email template management routes
router.use('/email-templates', emailTemplateRoutes)

// Admin delivery template management routes
router.use('/delivery-templates', deliveryTemplateRoutes)

// Admin email management routes (group email broadcast)
router.use('/emails', emailRoutes)

// Admin feedback management routes
router.use('/feedbacks', feedbackRoutes)

// Admin fake names management routes
router.use('/fake-names', fakeNamesRoutes)

// Admin newsletter management routes
router.use('/newsletter', newsletterRoutes)
router.use('/subscribers', newsletterRoutes) // Alias for newsletter

// Admin notification management routes
router.use('/notifications', notificationRoutes)

// Admin URL tracking routes
router.use('/url-tracking', urlTrackingRoutes)

// send-notification endpoint
router.post(
  '/send-notification',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'CREATE'),
  createNotification
)

// Admin settings management routes
router.use('/settings', settingRoutes)

// Admin Binance management routes
router.use('/binance', binanceRoutes)

// Admin custom pages management routes
router.use('/custom-pages', customPageRoutes)

// Admin statistics route
router.use('/statistics', statisticsRoutes)

// Admin audit log routes
router.use('/audit-logs', auditLogRoutes)

export default router
