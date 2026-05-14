import type { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

/**
 * Handle Plisio IPN (Instant Payment Notification) webhook
 *
 * Plisio sends POST request to callback URL with payment updates
 * Must include ?json=true in callback URL to receive JSON format
 *
 * Signature verification: HMAC-SHA1 with verify_hash parameter
 */
export async function handlePlisioWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;

    console.log('[Plisio Webhook] Received IPN:', {
      txn_id: payload.txn_id,
      status: payload.status,
      order_number: payload.order_number,
    });

    // Verify webhook signature is handled in gateway service
    // No separate signature header for Plisio (verify_hash is in body)

    // Process webhook through payment service
    // Plisio includes verify_hash in payload (no separate signature header)
    await paymentService.handleWebhook('plisio', payload, '');

    console.log('[Plisio Webhook] Processed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    console.error('[Plisio Webhook] Processing failed:', error.message);

    // Still return 200 to prevent Plisio from retrying
    res.status(200).json({
      success: false,
      message: error.message,
    });
  }
}
