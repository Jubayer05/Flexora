import type { NextFunction, Response } from 'express';
import { BalanceService } from '../../services/balance.service';
import type { AuthRequest } from '../../types/req-res';
import { sendErrorResponse, sendSuccessResponse } from '../../utils';
import { BalanceHistoryQuerySchema } from '../../validations/zod/balance.schema';
import db from '../../configs/db';
import { z } from 'zod';

const balanceService = new BalanceService();

// Validation schema for topup request
const topupRequestSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (isNaN(num)) throw new Error('Amount must be a valid number');
        return num;
      }
      return val;
    })
    .refine((val) => typeof val === 'number', 'Amount must be a number')
    .refine((val) => val > 0, 'Amount must be greater than 0')
    .refine((val) => val >= 10, 'Minimum topup amount is $10'),
  reason: z.string()
    .min(1, 'Reason is required')
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters')
});

type TopupRequest = z.infer<typeof topupRequestSchema>;

// ================================
// CUSTOMER BALANCE OPERATIONS
// ================================

/**
 * Get current user's balance
 * GET /api/v1/customer/balance
 */
export const getMyBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const balance = await balanceService.getBalanceDetails(userId);
    return sendSuccessResponse(res, balance, 'Balance retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current user's balance transaction history
 * GET /api/v1/customer/balance/history
 */
export const getMyBalanceHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const validatedQuery = BalanceHistoryQuerySchema.parse(req.query);
    const history = await balanceService.getTransactionHistory(userId, validatedQuery);

    return sendSuccessResponse(res, history, 'Transaction history retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Request manual balance topup
 * POST /api/v1/customer/balance/topup-request
 */
export const requestTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    console.log('[Topup Request] Received data:', req.body);

    // Validate request data
    let topupData: TopupRequest;
    try {
      topupData = topupRequestSchema.parse(req.body);
    } catch (validationError: any) {
      console.error('[Topup Request] Validation error:', validationError);
      
      if (validationError instanceof z.ZodError) {
        // Extract and format all validation errors
        const errors = validationError.issues
          .map((e: any) => {
            const field = e.path.join('.');
            const message = e.message;
            return `${field}: ${message}`;
          })
          .join('; ');
        console.error('[Topup Request] Formatted errors:', errors);
        return sendErrorResponse(res, errors || 'Validation failed', 400);
      }
      
      if (validationError?.message) {
        return sendErrorResponse(res, validationError.message, 400);
      }
      
      return sendErrorResponse(res, 'Invalid request data', 400);
    }

    console.log('[Topup Request] Validation passed, creating request:', { amount: topupData.amount, reason: topupData.reason });

    // Create topup request record
    const topupRequest = await balanceService.createTopupRequest({
      userId,
      amount: topupData.amount,
      reason: topupData.reason,
      status: 'PENDING',
      requestedAt: new Date()
    });

    return sendSuccessResponse(
      res,
      {
        id: topupRequest.id,
        amount: topupRequest.amount,
        status: topupRequest.status
      },
      'Topup request submitted successfully. Our team will review it shortly.'
    );
  } catch (error) {
    console.error('[Topup Request] Error:', error);
    return next(error);
  }
};

/**
 * Get current user's topup requests
 * GET /api/v1/customer/balance/topup-requests
 */
export const getMyTopupRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const requests = await balanceService.getTopupRequests(userId);
    return sendSuccessResponse(res, requests, 'Topup requests retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Initiate wallet topup using any active payment method
 * POST /api/v1/customer/balance/initiate-topup
 */
export const initiateGatewayTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const schema = z.object({
      amount: z.number().min(1).max(50000),
      paymentMethodId: z.number().int().positive(),
      paygateProviderCode: z.string().min(1).optional()
    });

    const { amount, paymentMethodId, paygateProviderCode } = schema.parse(req.body);
    const result = await balanceService.initiateGatewayTopup(
      userId,
      amount,
      paymentMethodId,
      paygateProviderCode
    );

    return sendSuccessResponse(res, result, 'Topup initiated successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get wallet topup status by request id
 * GET /api/v1/customer/balance/topup-status/:id
 */
export const getGatewayTopupStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const topupRequestId = parseInt(req.params.id || '', 10);
    if (!topupRequestId || Number.isNaN(topupRequestId)) {
      return sendErrorResponse(res, 'Invalid topup request id', 400);
    }

    const result = await balanceService.getGatewayTopupStatus(topupRequestId, userId);
    return sendSuccessResponse(res, result, 'Topup status retrieved');
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify Binance wallet topup using customer-provided Binance Order ID
 * POST /api/v1/customer/balance/verify-binance-topup
 */
export const verifyBinanceTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const schema = z.object({
      topupRequestId: z.number().int().positive(),
      binanceOrderId: z
        .string()
        .trim()
        .min(10, 'Binance Order ID is required')
        .max(20, 'Invalid Binance Order ID')
    });

    const { topupRequestId, binanceOrderId } = schema.parse(req.body);
    const result = await balanceService.verifyBinanceTopup(topupRequestId, userId, binanceOrderId);

    return sendSuccessResponse(res, result, 'Binance topup verified successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Initiate Stripe topup payment
 * POST /api/v1/customer/wallet/topup-payment
 */
export const initiateStripeTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const { amount } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 5) {
      return sendErrorResponse(res, 'Invalid amount. Minimum is $5.00', 400);
    }

    // Create payment intent
    const paymentIntent = await balanceService.createStripePaymentIntent({
      userId,
      amount,
    });

    return sendSuccessResponse(
      res,
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      'Payment intent created successfully'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * Confirm Stripe payment and process topup
 * POST /api/v1/customer/balance/verify-stripe-topup
 * Called by frontend AFTER payment is confirmed
 */
export const verifyStripeTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId || !amount) {
      return sendErrorResponse(res, 'Missing paymentIntentId or amount', 400);
    }

    // Verify payment intent with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return sendErrorResponse(res, 'Payment intent not found', 404);
    }

    // Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      return sendErrorResponse(res, `Payment status: ${paymentIntent.status}. Expected succeeded.`, 400);
    }

    // Verify payment amount matches
    const fee = amount * 0.02;
    const totalAmount = amount + fee;
    if (paymentIntent.amount !== Math.round(totalAmount * 100)) {
      return sendErrorResponse(res, 'Payment amount mismatch', 400);
    }

    // Verify user ID matches metadata
    if (parseInt(paymentIntent.metadata.userId) !== userId) {
      return sendErrorResponse(res, 'Payment intent user mismatch', 403);
    }

    // Check if already processed
    const existingTransaction = await db.balanceTransaction.findFirst({
      where: {
        userId,
        reference: paymentIntentId,
      },
    });

    if (existingTransaction) {
      return sendSuccessResponse(
        res,
        { 
          already_processed: true,
          balance: existingTransaction.balanceAfter,
        },
        'Payment already processed'
      );
    }

    // Process topup (adds balance immediately, no verification needed for Stripe)
    try {
      console.log('[Verify Topup] Processing Stripe topup for user:', userId, 'Amount:', amount);
      await balanceService.processStripeTopup(paymentIntent);
      console.log('[Verify Topup] Successfully processed Stripe topup for user:', userId);
    } catch (processError: any) {
      console.error('[Verify Topup] Error processing Stripe topup:', {
        userId,
        amount,
        paymentIntentId,
        error: processError.message,
        stack: processError.stack,
      });
      throw processError;
    }

    // Get updated balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return sendSuccessResponse(
      res,
      {
        success: true,
        balance: Number(user?.balance || 0),
        message: 'Stripe payment processed. Your balance has been updated immediately.'
      },
      'Wallet topup completed successfully! No verification needed.'
    );
  } catch (error: any) {
    console.error('Stripe verification error:', error);
    return next(error);
  }
};

/**
 * Handle Stripe payment webhook
 * POST /api/v1/webhooks/stripe/topup
 */
export const handleStripeTopupWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = req.body;

    // Verify webhook signature
    const isValid = await balanceService.verifyStripeWebhook(req.headers['stripe-signature'] as string, req);

    if (!isValid) {
      return sendErrorResponse(res, 'Invalid webhook signature', 401);
    }

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Process topup
      await balanceService.processStripeTopup(paymentIntent);

      return sendSuccessResponse(res, { received: true }, 'Webhook processed successfully');
    }

    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
};

// ================================
// PAYGATE TOPUP OPERATIONS
// ================================

/**
 * Initiate PayGate card topup
 * POST /api/v1/customer/balance/paygate/card-topup
 */
export const initiatePayGateCardTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const { amount, providerCode, region } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 50000) {
      return sendErrorResponse(res, 'Invalid amount. Range: $1-$50,000', 400);
    }

    if (providerCode !== undefined && typeof providerCode !== 'string') {
      return sendErrorResponse(res, 'providerCode must be a string', 400);
    }

    const result = await balanceService.initiatePayGateCardTopup(
      userId,
      amount,
      providerCode,
      typeof region === 'string' ? region : undefined
    );
    return sendSuccessResponse(res, result, 'PayGate card topup initiated');
  } catch (error: any) {
    console.error('[PayGate Card Topup] Error:', error);
    return sendErrorResponse(res, error.message || 'Failed to initiate topup', 500);
  }
};

/**
 * Initiate PayGate crypto topup
 * POST /api/v1/customer/balance/paygate/crypto-topup
 */
export const initiatePayGateCryptoTopup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendErrorResponse(
      res,
      'PayGate direct crypto top-up is disabled. Please use the card checkout flow.',
      410
    );
  } catch (error: any) {
    console.error('[PayGate Crypto Topup] Error:', error);
    return sendErrorResponse(res, error.message || 'Failed to initiate topup', 500);
  }
};

/**
 * Check PayGate payment status
 * GET /api/v1/customer/balance/paygate/payment-status/:paygateLinkId
 */
export const getPayGatePaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendErrorResponse(res, 'Authentication required', 401);

    const { paygateLinkId } = req.params;

    if (!paygateLinkId) {
      return sendErrorResponse(res, 'Missing paygateLinkId', 400);
    }

    const status = await balanceService.getPayGatePaymentStatus(paygateLinkId, userId);

    if (status.status === 'NOT_FOUND') {
      return sendErrorResponse(res, 'Payment not found', 404);
    }

    return sendSuccessResponse(res, status, 'Payment status retrieved');
  } catch (error: any) {
    console.error('[PayGate Status] Error:', error);
    return sendErrorResponse(res, error.message || 'Failed to get status', 500);
  }
};

/**
 * Handle PayGate webhook callback
 * GET/POST /api/v1/webhooks/paygate
 * (This is called from the main webhook handler)
 */
export const handlePayGateCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get data from query (GET) or body (POST)
    const callbackData = req.method === 'GET' ? req.query : req.body;

    console.log('[PayGate Callback] Received:', callbackData);

    const result = await balanceService.processPayGateCallback(callbackData);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[PayGate Callback] Error:', error);
    // Return 200 so PayGate doesn't retry
    return res.status(200).json({ error: error.message });
  }
};
