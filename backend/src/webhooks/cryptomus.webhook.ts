import type { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

/**
 * Handle Cryptomus webhook callback
 *
 * Cryptomus sends POST request to url_callback with payment updates
 * Signature verification: MD5(base64(JSON) + API_KEY)
 * Signature included in request body as 'sign' field
 * IP Whitelist: 91.227.144.54
 */
export async function handleCryptomusWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;

    console.log('[Cryptomus Webhook] Received callback:', {
      uuid: payload.uuid,
      status: payload.status,
      order_id: payload.order_id,
      payment_amount: payload.payment_amount,
    });

    // Verify IP address (optional but recommended)
    const clientIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress;

    console.log('[Cryptomus Webhook] Client IP:', clientIp);

    // Process webhook through payment service
    // Signature verification is handled in gateway service
    // Cryptomus includes sign in payload (no separate header)
    await paymentService.handleWebhook('cryptomus', payload, '');

    console.log('[Cryptomus Webhook] Processed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    console.error('[Cryptomus Webhook] Processing failed:', error.message);

    // Still return 200 to prevent Cryptomus from retrying
    res.status(200).json({
      success: false,
      message: error.message,
    });
  }
}
