import { Router } from 'express';
import * as balanceController from '../../controllers/customer/balance.controller';
import { authMiddleware, requireNonGuest, validateActiveSession } from '../../middlewares/auth';

const router = Router();

// Apply customer authentication to all routes
router.use(authMiddleware, requireNonGuest, validateActiveSession);

// ================================
// CUSTOMER BALANCE OPERATIONS
// ================================

/**
 * @route   GET /api/v1/customer/balance
 * @desc    Get current user's balance
 * @access  Customer only
 */
router.get('/', balanceController.getMyBalance);

/**
 * @route   GET /api/v1/customer/balance/history
 * @desc    Get current user's balance transaction history
 * @access  Customer only
 */
router.get('/history', balanceController.getMyBalanceHistory);

/**
 * @route   GET /api/v1/customer/balance/topup-requests
 * @desc    Get current user's topup requests
 * @access  Customer only
 */
router.get('/topup-requests', balanceController.getMyTopupRequests);
router.post('/initiate-topup', balanceController.initiateGatewayTopup);
router.get('/topup-status/:id', balanceController.getGatewayTopupStatus);
router.post('/verify-binance-topup', balanceController.verifyBinanceTopup);

// ================================
// STRIPE TOPUP OPERATIONS
// ================================

/**
 * @route   POST /api/v1/customer/balance/wallet/topup-payment
 * @desc    Initiate Stripe payment for wallet topup
 * @access  Customer only
 */
router.post('/wallet/topup-payment', balanceController.initiateStripeTopup);

/**
 * @route   POST /api/v1/customer/balance/verify-stripe-topup
 * @desc    Verify Stripe payment and process topup (call this AFTER payment succeeds on frontend)
 * @access  Customer only
 */
router.post('/verify-stripe-topup', balanceController.verifyStripeTopup);

// ================================
// PAYGATE TOPUP OPERATIONS
// ================================

/**
 * @route   POST /api/v1/customer/balance/paygate/card-topup
 * @desc    Initiate PayGate card topup
 * @access  Customer only
 */
router.post('/paygate/card-topup', balanceController.initiatePayGateCardTopup);

/**
 * @route   POST /api/v1/customer/balance/paygate/crypto-topup
 * @desc    Initiate PayGate crypto topup
 * @access  Customer only
 */
router.post('/paygate/crypto-topup', balanceController.initiatePayGateCryptoTopup);

/**
 * @route   GET /api/v1/customer/balance/paygate/payment-status/:paygateLinkId
 * @desc    Get PayGate payment status
 * @access  Customer only
 */
router.get('/paygate/payment-status/:paygateLinkId', balanceController.getPayGatePaymentStatus);

export default router;
