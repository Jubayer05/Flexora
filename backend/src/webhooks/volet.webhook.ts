import type { Request, Response } from 'express'
import { PaymentService } from '../services/payment.service'

const paymentService = new PaymentService()

/**
 * Handle Volet (Cloaked) webhook events
 * Volet uses Stripe webhooks with additional security verification.
 *
 * Local testing with Stripe CLI:
 *   stripe listen --forward-to http://localhost:5015/api/v1/webhooks/volet
 * Use the signing secret printed by the CLI (whsec_...) in Admin → Payment Gateways
 * → Volet → Webhook Secret. Do not use the Dashboard webhook secret when using the CLI.
 */
export async function handleVoletWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['stripe-signature'] as string

    if (!signature || typeof signature !== 'string') {
      console.error('[Volet Webhook] Missing Stripe signature header')
      return res.status(400).json({
        success: false,
        message: 'Missing Stripe signature',
      })
    }

    // Get raw body (Buffer) for signature verification
    // When using express.raw(), req.body is a Buffer, not parsed JSON
    const payload = req.body

    if (!payload || !Buffer.isBuffer(payload)) {
      console.error('[Volet Webhook] Invalid payload - must be raw Buffer')
      return res.status(400).json({
        success: false,
        message: 'Invalid payload format',
      })
    }

    console.log('[Volet Webhook] Received event', {
      signature: signature.substring(0, 20) + '...',
      signatureFull: signature, // Log full signature for debugging
      payloadLength: payload.length,
      payloadType: Buffer.isBuffer(payload) ? 'Buffer' : typeof payload,
      payloadPreview: Buffer.isBuffer(payload) 
        ? payload.toString('utf8').substring(0, 100) + '...' 
        : 'Not a Buffer'
    })

    // Pass raw Buffer to payment service for processing
    // The signature will be verified by VoletGatewayService
    const result = await paymentService.handleWebhook('volet', payload, signature)

    // Always return 200 to Stripe, even if payment not found
    // This prevents Stripe from retrying events we can't process
    if (!result.success) {
      console.log('[Volet Webhook] Event skipped', result)
    } else {
      console.log('[Volet Webhook] Processed successfully', result)
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    })
  } catch (error: any) {
    console.error('[Volet Webhook] Processing failed', {
      error: error.message,
    })

    // Return 400 only for actual errors (signature verification, etc)
    return res.status(400).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    })
  }
}

