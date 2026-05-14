import { Router } from 'express'

// Import all public route modules
import {
  getProductGroup,
  getProductGroupBySlug,
  getProductGroups
} from '../../controllers/product-group.controller'
import * as settingController from '../../controllers/setting.controller'
import authRoutes from './auth.route'
import blogRoutes from './blog.route'
import categoryRoutes from './category.route'
import couponRoutes from './coupon.route'
import feedbackRoutes from './feedback.route'
import guestCheckoutRoutes from '../guest-checkout.route'
import newsletterRoutes from './newsletter.route'
import pagesRoutes from './pages.route'
import paymentMethodRoutes from './payment-method.route'
import productRoutes from './product.route'
import subscriptionPackageRoutes from './subscription-package.route'
import visitorRoutes from './visitor.route'
import urlTrackingPublicRoutes from './url-tracking.route'

const router = Router();

// ================================
// PUBLIC ROUTE ORGANIZATION
// ================================

// Public authentication endpoints (register, login, password reset)
router.use('/auth', authRoutes);

// Public product browsing and access
router.use('/products', productRoutes);

// Public category browsing and hierarchy
router.use('/categories', categoryRoutes);

// Public coupon validation for checkout
router.use('/coupons', couponRoutes);

// Public guest checkout flow (no authentication required)
router.use('/guest-checkout', guestCheckoutRoutes);

// Public payment methods for checkout
router.use('/payment-methods', paymentMethodRoutes);

// Public subscription package browsing
router.use('/subscription-packages', subscriptionPackageRoutes);

// Public blog routes
 router.use('/blogs', blogRoutes);

 // Public feedback routes
 router.use('/feedbacks', feedbackRoutes);

 router.use('/pages', pagesRoutes)

 // Visitor tracking routes
 router.use('/visitor', visitorRoutes)

 // URL tracking (track click by slug - public, no auth)
 router.use('/url-tracking', urlTrackingPublicRoutes)

 // Newsletter subscription routes
 router.use('/newsletter', newsletterRoutes)

 // Others routes
 router.get('/settings/key/:key', settingController.getSettingByKey)

// Others 
router.get('/product-groups', getProductGroups)
router.get('/product-groups/slug/:slug', getProductGroupBySlug)
// Public single product-group (used by storefront group pages)
router.get('/product-groups/:id', getProductGroup)

export default router;
