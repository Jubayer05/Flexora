/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events
 */

import type { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { BalanceService } from '../services/balance.service';

const paymentService = new PaymentService();
const balanceService = new BalanceService();

/**
 * Handle Stripe webhook events
 * This endpoint receives raw body for signature verification
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      console.error('[Stripe Webhook] Missing signature');
      return res.status(400).json({
        success: false,
        message: 'Missing Stripe signature',
      });
    }

    // Keep raw body for Stripe signature verification in PaymentService.
    const rawPayload = req.body;
    let parsedPayload: any = null;
    try {
      if (Buffer.isBuffer(rawPayload)) {
        parsedPayload = JSON.parse(rawPayload.toString('utf8'));
      } else if (typeof rawPayload === 'string') {
        parsedPayload = JSON.parse(rawPayload);
      } else {
        parsedPayload = rawPayload;
      }
    } catch (parseError: any) {
      console.error('[Stripe Webhook] Failed to parse payload JSON', {
        error: parseError?.message,
      });
    }

    // Process regular payment webhook through payment service
    const result = await paymentService.handleWebhook('stripe', rawPayload, signature);

    // Always return 200 to Stripe, even if payment not found
    // This prevents Stripe from retrying events we can't process
    if (!result.success) {
      console.log('[Stripe Webhook] Event skipped', result);
    } else {
      console.log('[Stripe Webhook] Processed successfully', result);
    }

    // Process wallet topup after signature verification path above.
    if (parsedPayload?.type === 'payment_intent.succeeded') {
      const paymentIntent = parsedPayload?.data?.object;
      if (paymentIntent?.metadata?.type === 'wallet_topup') {
        console.log('[Stripe Webhook] Processing wallet topup payment:', paymentIntent.id);

        try {
          await balanceService.processStripeTopup(paymentIntent);
        } catch (error: any) {
          console.error('[Stripe Webhook] Failed to process wallet topup:', error.message);
          // Keep returning 200 to prevent Stripe retries.
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    console.error('[Stripe Webhook] Processing failed', {
      error: error.message,
    });

    // Return 200 to prevent Stripe retries
    return res.status(200).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
}

