import { Router } from 'express'

import * as guestOrderController from '../../controllers/customer/guest-order.controller'
import * as orderDownloadController from '../../controllers/customer/order-download.controller'
import * as orderController from '../../controllers/customer/order.controller'
import * as telegramTransferController from '../../controllers/customer/telegram-transfer.controller'
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth'

const router = Router()

// ================================
// CUSTOMER ORDER ROUTES
// ================================

/**
 * @route   POST /api/v1/customer/orders
 * @desc    Create a new order (with payment bypass for testing)
 * @access  Private (Customer) or Public (Guest with email)
 */
router.post(
  '/',
  optionalAuthMiddleware, // Optional auth for guest orders
  orderController.createOrder
)

/**
 * @route   POST /api/v1/customer/orders/cart
 * @desc    Create multiple orders from cart (mixed order)
 * @access  Private (Customer) or Public (Guest with email)
 */
router.post('/cart', optionalAuthMiddleware, orderController.createCartOrders)

/**
 * @route   GET /api/v1/customer/orders
 * @desc    Get customer's orders
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/', optionalAuthMiddleware, orderController.getOrders)

/**
 * @route   GET /api/v1/customer/orders/:id
 * @desc    Get order by ID
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id', optionalAuthMiddleware, orderController.getOrderById)

/**
 * @route   GET /api/v1/customer/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/number/:orderNumber', optionalAuthMiddleware, orderController.getOrderByNumber)

/**
 * @route   GET /api/v1/customer/orders/:id/delivery-status
 * @desc    Get delivery status for an order
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id/delivery-status', optionalAuthMiddleware, orderController.getOrderDeliveryStatus)

/**
 * @route   GET /api/v1/customer/orders/:orderId/transfers
 * @desc    Get all Telegram transfers for a specific order
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get(
  '/:orderId/transfers',
  optionalAuthMiddleware,
  telegramTransferController.getOrderTransfers
)

/**
 * @route   GET /api/v1/customer/accounts
 * @desc    Get customer's accessible accounts
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/accounts', optionalAuthMiddleware, orderController.getAccessibleAccounts)

/**
 * @route   POST /api/v1/customer/orders/send-otp
 * @desc    Send OTP for order verification
 * @access  Private (Customer) or Public (Guest)
 */
router.post('/send-otp', optionalAuthMiddleware, orderController.sendOrderOTP)

/**
 * @route   POST /api/v1/customer/orders/verify-otp
 * @desc    Verify OTP for order verification
 * @access  Private (Customer) or Public (Guest)
 */
router.post('/verify-otp', optionalAuthMiddleware, orderController.verifyOrderOTP)

/**
 * @route   GET /api/v1/customer/orders/:orderId/telegram-accounts
 * @desc    Get Telegram account details for a specific order (phone, password, etc.)
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get(
  '/:orderId/telegram-accounts',
  optionalAuthMiddleware,
  orderController.getTelegramAccountDetails
)

/**
 * @route   GET /api/v1/customer/orders/:id/invoice
 * @desc    Download invoice PDF for customer's order
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id/invoice', optionalAuthMiddleware, orderController.getMyInvoice)

/**
 * @route   GET /api/v1/customer/orders/:id/invoice/view
 * @desc    View invoice in browser (HTML view)
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.get('/:id/invoice/view', optionalAuthMiddleware, orderController.viewInvoice)

/**
 * @route   POST /api/v1/customer/orders/:id/invoice/send
 * @desc    Send invoice via email
 * @access  Private (Customer) or Public (Guest with email query param)
 */
router.post('/:id/invoice/send', optionalAuthMiddleware, orderController.sendInvoiceEmail)

// ================================
// ORDER DELIVERY DOWNLOAD ROUTES (with OTP verification)
// ================================

/**
 * @route   POST /api/v1/customer/orders/download/request-otp
 * @desc    Request OTP for order delivery download
 * @access  Public (requires orderId and email)
 */
router.post('/download/request-otp', orderDownloadController.requestDownloadOTP)

/**
 * @route   POST /api/v1/customer/orders/download/verify-otp
 * @desc    Verify OTP and get download token
 * @access  Public (requires orderId, email, and otp)
 */
router.post('/download/verify-otp', orderDownloadController.verifyDownloadOTP)

/**
 * @route   GET /api/v1/customer/orders/download/:token
 * @desc    Download order delivery details as text file
 * @access  Public (requires valid download token from OTP verification)
 */
router.get('/download/:token', orderDownloadController.downloadOrderDelivery)

// ================================
// GUEST ORDER ROUTES
// ================================

/**
 * @route   POST /api/v1/customer/orders/guest/verify
 * @desc    Verify guest order access with email and verification code
 * @access  Public (guest users)
 */
router.post('/guest/verify', guestOrderController.verifyGuestOrder)

/**
 * @route   POST /api/v1/customer/orders/guest/send-code
 * @desc    Generate and send verification code to guest email
 * @access  Public (guest users)
 */
router.post('/guest/send-code', guestOrderController.sendGuestVerificationCode)

/**
 * @route   GET /api/v1/customer/orders/guest/download
 * @desc    Download guest order in different formats (txt, excel, json)
 * @access  Public or Private (supports both guest and authenticated users)
 * 
 * NOTE: This route MUST come before /:id/download to avoid route conflicts
 * Express matches routes in order, so /guest/download would match /:id/download with id="guest"
 */
router.get(
  '/guest/download',
  optionalAuthMiddleware, // Optional auth - supports both guest and authenticated users
  guestOrderController.downloadGuestOrder
)

/**
 * @route   GET /api/v1/customer/orders/:id/download
 * @desc    Download authenticated user's order in different formats (txt, excel, json)
 * @access  Private (requires authentication)
 */
router.get(
  '/:id/download',
  authMiddleware,
  guestOrderController.downloadGuestOrder
)

export default router
