/**
 * NOWPayments Webhook Handler
 * Processes NOWPayments IPN (Instant Payment Notifications)
 */

import type { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

/**
 * Handle NOWPayments IPN webhook events
 * Signature verification is done in the gateway service
 */
export async function handleNOWPaymentsWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-nowpayments-sig'];

    if (!signature || typeof signature !== 'string') {
      console.error('[NOWPayments Webhook] Missing signature');
      return res.status(400).json({
        success: false,
        message: 'Missing NOWPayments signature',
      });
    }

    // Get payload (already parsed as JSON by express.json())
    const payload = req.body;

    console.log('[NOWPayments Webhook] Received', {
      paymentId: payload.payment_id,
      paymentStatus: payload.payment_status,
      orderId: payload.order_id,
    });

    // Process webhook through payment service
    const result = await paymentService.handleWebhook('nowpayments', payload, signature);

    console.log('[NOWPayments Webhook] Processed successfully', result);

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    console.error('[NOWPayments Webhook] Processing failed', {
      error: error.message,
    });

    return res.status(400).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
}
