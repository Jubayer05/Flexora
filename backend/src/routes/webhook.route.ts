/**
 * Webhook Routes
 * Handles payment gateway webhooks
 */

import express, { Router } from 'express';
import { handleCryptomusWebhook } from '../webhooks/cryptomus.webhook';
import { handleNOWPaymentsWebhook } from '../webhooks/nowpayments.webhook';
import { handlePayGateWebhook } from '../webhooks/paygate.webhook';
import { handlePlisioWebhook } from '../webhooks/plisio.webhook';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';
import { handleVoletWebhook } from '../webhooks/volet.webhook';

const router = Router();
const webhookJsonParser = express.json({ limit: '2mb' });
const webhookFormParser = express.urlencoded({ extended: true });

/**
 * @route   POST /api/v1/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (signature verified)
 *
 * Note: This route requires raw body for signature verification
 * The raw body parser must be configured before this route
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

/**
 * @route   POST /api/v1/webhooks/nowpayments
 * @desc    Handle NOWPayments IPN (Instant Payment Notifications)
 * @access  Public (signature verified)
 */
router.post('/nowpayments', webhookJsonParser, handleNOWPaymentsWebhook);

/**
 * @route   POST /api/v1/webhooks/plisio
 * @desc    Handle Plisio IPN (Instant Payment Notifications)
 * @access  Public (signature verified)
 *
 * Note: Callback URL must include ?json=true to receive JSON format
 * Example: http://yoursite.com/api/v1/webhooks/plisio?json=true
 */
router.post('/plisio', webhookJsonParser, webhookFormParser, handlePlisioWebhook);

/**
 * @route   POST /api/v1/webhooks/cryptomus
 * @desc    Handle Cryptomus webhook callbacks
 * @access  Public (signature verified)
 *
 * Note: Cryptomus sends webhooks from IP: 91.227.144.54
 * Signature verification: MD5(base64(JSON) + API_KEY)
 * Signature included in request body as 'sign' field
 */
router.post('/cryptomus', webhookJsonParser, handleCryptomusWebhook);

/**
 * @route   POST /api/v1/webhooks/paygate
 * @desc    Handle PayGate.to webhook callbacks
 * @access  Public (signature verified)
 *
 * Note: PayGate.to sends webhooks with signature in X-PayGate-Signature header or in payload
 * Signature verification: HMAC-SHA256
 */
// Accept GET (PayGate uses GET callback) + also allow POST
router.all('/paygate', webhookJsonParser, webhookFormParser, handlePayGateWebhook);

/**
 * @route   POST /api/v1/webhooks/volet
 * @desc    Handle Volet (Cloaked) webhook events
 * @access  Public (signature verified)
 *
 * Note: Volet uses Stripe webhooks with additional security layers
 * Requires raw body for signature verification
 */
router.post('/volet', express.raw({ type: 'application/json' }), handleVoletWebhook);

// Future webhook endpoints
// router.post('/changenow', handleChangeNowWebhook);

export default router;
