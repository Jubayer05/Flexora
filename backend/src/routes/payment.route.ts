/**
 * Payment Routes
 * Customer-facing payment endpoints
 */

import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth';
import { binanceVerifyLimiter } from '../utils/rateLimit';

const router = Router();

/**
 * @route   POST /api/v1/payments/initiate
 * @desc    Initiate payment for an order
 * @access  Private (Customer) or Public (Guest)
 */
router.post('/initiate', optionalAuthMiddleware, paymentController.initiatePayment);

/**
 * @route   POST /api/v1/payments/calculate-breakdown
 * @desc    Calculate payment breakdown (bonus/fee) for display
 * @access  Public
 */
router.post('/calculate-breakdown', paymentController.calculatePaymentBreakdown);

/**
 * @route   POST /api/v1/payments/binance/verify
 * @desc    Verify Binance internal transfer payment with Order ID
 * @access  Private (Customer) or Public (Guest)
 * @note    Must be defined BEFORE /:id/verify to avoid route conflict
 */
router.post('/binance/verify', binanceVerifyLimiter, optionalAuthMiddleware, paymentController.verifyBinancePayment);

/**
 * @route   POST /api/v1/payments/volet/create-intent
 * @desc    Create Payment Intent for Volet (embedded Stripe Elements)
 * @access  Private (Customer) or Public (Guest)
 */
router.post('/volet/create-intent', optionalAuthMiddleware, paymentController.createVoletPaymentIntent);

/**
 * @route   GET /api/v1/payments/paygate/providers
 * @desc    Get available PayGate providers (filtered by region/type)
 * @access  Public
 */
router.get('/paygate/providers', paymentController.getPayGateProviders);

/**
 * @route   GET /api/v1/payments/:id/status
 * @desc    Get payment status
 * @access  Private (Customer) or Public (Guest)
 */
router.get('/:id/status', optionalAuthMiddleware, paymentController.getPaymentStatus);

/**
 * @route   POST /api/v1/payments/:id/verify
 * @desc    Verify payment status from gateway
 * @access  Private (Customer) or Public (Guest)
 */
router.post('/:id/verify', optionalAuthMiddleware, paymentController.verifyPayment);

/**
 * @route   GET /api/v1/payments/my-payments
 * @desc    Get user's payment history
 * @access  Private (Customer)
 */
router.get('/my-payments', authMiddleware, paymentController.getMyPayments);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment details by ID
 * @access  Private (Customer) or Public (Guest)
 */
router.get('/:id', optionalAuthMiddleware, paymentController.getPaymentById);

export default router;
