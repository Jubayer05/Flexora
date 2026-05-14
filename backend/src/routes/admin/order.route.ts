import { Router } from 'express'

import * as adminOrderController from '../../controllers/admin/order.controller'
import * as orderController from '../../controllers/customer/order.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

// ================================
// CUSTOMER ORDER ROUTES
// ================================

/**
 * @route   POST /api/v1/admin/orders
 * @desc    Get Order for Admin
 * @access  Admin Access
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  orderController.getOrdersAdmin
)

/**
 * @route   GET /api/v1/admin/orders/services
 * @desc    Get service orders (manual fulfillment orders)
 * @access  Admin only
 * NOTE: Must be defined BEFORE /:id route to avoid route conflict
 */
router.get(
  '/services',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.getServiceOrders
)

// ================================
// ADMIN MANAGEMENT ROUTES
// ================================

/**
 * @route   PUT /api/v1/admin/orders/:id/status
 * @desc    Update order status (ADMIN)
 * @access  Admin only
 */
router.put(
  '/:id/status',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.updateOrderStatus
)

/**
 * @route   PUT /api/v1/admin/orders/:id/delivery
 * @desc    Update delivery status (ADMIN)
 * @access  Admin only
 */
router.put(
  '/:id/delivery',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.updateOrderDeliveryStatus
)

/**
 * @route   POST /api/v1/admin/orders/:id/manual-assign
 * @desc    Manually assign accounts to order
 * @access  Admin only
 */
router.post(
  '/:id/manual-assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.manualAssignAccounts
)

/**
 * @route   POST /api/v1/admin/orders/:id/force-deliver
 * @desc    Force delivery attempt for order
 * @access  Admin only
 */
router.post(
  '/:id/force-deliver',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.forceDeliver
)

/**
 * @route   POST /api/v1/admin/orders/:id/refund
 * @desc    Refund order
 * @access  Admin only
 */
router.post(
  '/:id/refund',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.refundOrder
)

/**
 * @route   POST /api/v1/admin/orders/:id/resend
 * @desc    Resend order products to customer (same accounts)
 * @access  Admin only
 */
router.post(
  '/:id/resend',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.resendOrder
)

/**
 * @route   POST /api/v1/admin/orders/:id/replace
 * @desc    Replace order products with new accounts
 * @access  Admin only
 */
router.post(
  '/:id/replace',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.replaceOrder
)

/**
 * @route   POST /api/v1/admin/orders/:id/replace-product
 * @desc    Replace order with a different product
 * @access  Admin only
 */
router.post(
  '/:id/replace-product',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.replaceProduct
)

/**
 * @route   GET /api/v1/admin/orders/:id/delivery-history
 * @desc    Get delivery history for an order
 * @access  Admin only
 */
router.get(
  '/:id/delivery-history',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.getOrderDeliveryHistory
)

/**
 * @route   GET /api/v1/admin/orders/:id/invoice
 * @desc    Download invoice PDF for an order
 * @access  Admin only
 */
router.get(
  '/:id/invoice',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.downloadInvoice
)

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Get order by ID
 * @access  Admin only
 * NOTE: This route must be defined AFTER /services to avoid route conflict
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  orderController.getOrderByIdAdmin
)

/**
 * @route   DELETE /api/v1/admin/orders/:id
 * @desc    Delete order by ID (admin only)
 * @access  Admin only
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.deleteOrder
)

/**
 * @route   PUT /api/v1/admin/orders/:id/service-fulfillment
 * @desc    Update service order fulfillment status
 * @access  Admin only
 */
router.put(
  '/:id/service-fulfillment',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  adminOrderController.updateServiceOrderFulfillment
)

export default router
