/**
 * Stripe Payment Gateway Service
 * Implements Stripe Checkout Sessions API for payment processing
 * Based on Stripe API v2024-10-28.acacia
 */

import type { PaymentStatus } from '@prisma/client'
import Stripe from 'stripe'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookPaymentData,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'
import { getPaymentReturnUrl } from '../../utils/payment-urls'

export class StripeGatewayService implements IPaymentGateway {
  private stripe: Stripe
  private webhookSecret: string

  constructor(apiKey: string, webhookSecret: string, testMode: boolean = false) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
      typescript: true
    })
    this.webhookSecret = webhookSecret

    console.log('[Stripe] Gateway initialized', { testMode })
  }

  /**
   * Create Stripe Checkout Session
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const { orderId, amount, currency, customerEmail, description, metadata } = params

      // Check if this is a subscription payment
        const isSubscription =
          metadata?.type === 'SUBSCRIPTION_PURCHASE' || metadata?.type === 'SUBSCRIPTION_RENEWAL'
        const isWalletTopup = metadata?.type === 'wallet_topup'

      // Validate and construct redirect URLs
        const baseSuccessUrl = isWalletTopup
          ? getPaymentReturnUrl('WALLET_TOPUP_SUCCESS_URL', '/wallet/topup')
          : isSubscription
          ? getPaymentReturnUrl('SUBSCRIPTION_SUCCESS_URL', '/subscription/payment/success')
          : getPaymentReturnUrl('PAYMENT_SUCCESS_URL', '/payment/success')

        const baseCancelUrl = isWalletTopup
          ? getPaymentReturnUrl('WALLET_TOPUP_CANCEL_URL', '/wallet/topup')
          : isSubscription
          ? getPaymentReturnUrl('SUBSCRIPTION_CANCEL_URL', '/subscription/payment/cancel')
          : getPaymentReturnUrl('PAYMENT_CANCEL_URL', '/payment/cancel')

      // Construct URLs with appropriate parameters
        const successUrl = isWalletTopup
          ? `${baseSuccessUrl}?topup_id=${orderId}&status=success`
          : isSubscription
          ? `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}&payment_id=${orderId}&status=success`
          : `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&status=success`

        const cancelUrl = isWalletTopup
          ? `${baseCancelUrl}?topup_id=${orderId}&status=cancelled`
          : isSubscription
          ? `${baseCancelUrl}?reason=user_cancelled`
          : `${baseCancelUrl}?order_id=${orderId}`

      // Create Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description,
                description: `Order #${orderId}`
              },
              unit_amount: Math.round(amount * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          orderId: orderId.toString(),
          ...metadata
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
      })

      console.log('[Stripe] Checkout Session created', {
        orderId,
        sessionId: session.id,
        amount,
        currency
      })

      return {
        success: true,
        gatewayTxnId: session.id,
        paymentUrl: session.url || undefined,
        expiresAt: new Date(session.expires_at * 1000),
        metadata: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent as string
        }
      }
    } catch (error: any) {
      console.error('[Stripe] Payment creation failed', {
        error: error.message,
        orderId: params.orderId
      })

      return {
        success: false,
        gatewayTxnId: '',
        error: error.message || 'Failed to create Stripe payment session'
      }
    }
  }

  /**
   * Verify Stripe webhook signature and parse event
   */
  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    try {
      // Construct event from webhook payload using async method
      const event = await this.stripe.webhooks.constructEventAsync(
        payload,
        signature,
        this.webhookSecret
      )

      console.log('[Stripe] Webhook verified', {
        eventId: event.id,
        eventType: event.type
      })

      // Extract payment data based on event type
      const paymentData = await this.extractPaymentData(event)

      return {
        verified: true,
        event,
        eventType: event.type,
        paymentData
      }
    } catch (error: any) {
      console.error('[Stripe] Webhook verification failed', {
        error: error.message
      })

      return {
        verified: false,
        error: error.message || 'Webhook verification failed'
      }
    }
  }

  /**
   * Get payment status from Stripe
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    try {
      // Determine if it's a session ID or payment intent ID
      let session: Stripe.Checkout.Session | null = null
      let paymentIntent: Stripe.PaymentIntent | null = null

      if (gatewayTxnId.startsWith('cs_')) {
        // It's a checkout session
        session = await this.stripe.checkout.sessions.retrieve(gatewayTxnId)
        if (session.payment_intent) {
          paymentIntent = await this.stripe.paymentIntents.retrieve(
            session.payment_intent as string
          )
        }
      } else if (gatewayTxnId.startsWith('pi_')) {
        // It's a payment intent
        paymentIntent = await this.stripe.paymentIntents.retrieve(gatewayTxnId)
      }

      const status = this.mapStripeStatus(
        paymentIntent?.status || session?.payment_status || 'pending'
      )
      const amount = session
        ? session.amount_total! / 100
        : paymentIntent
          ? paymentIntent.amount / 100
          : 0
      const paidAmount = paymentIntent?.amount_received
        ? paymentIntent.amount_received / 100
        : status === 'COMPLETED'
          ? amount
          : 0

      console.log('[Stripe] Payment status retrieved', {
        gatewayTxnId,
        status,
        amount,
        paidAmount
      })

      return {
        status,
        gatewayStatus: paymentIntent?.status || session?.payment_status || 'unknown',
        amount,
        paidAmount,
        currency: session?.currency || paymentIntent?.currency || 'usd',
        metadata: {
          sessionId: session?.id,
          paymentIntentId: paymentIntent?.id
        }
      }
    } catch (error: any) {
      console.error('[Stripe] Failed to get payment status', {
        gatewayTxnId,
        error: error.message
      })

      throw new Error(`Failed to retrieve payment status: ${error.message}`)
    }
  }

  /**
   * Process refund via Stripe
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    try {
      // Get payment intent ID
      let paymentIntentId: string

      if (gatewayTxnId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(gatewayTxnId)
        paymentIntentId = session.payment_intent as string
      } else {
        paymentIntentId = gatewayTxnId
      }

      // Create refund
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined // Partial or full refund
      })

      console.log('[Stripe] Refund created', {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      })

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status || 'pending',
        metadata: {
          paymentIntentId,
          refundId: refund.id
        }
      }
    } catch (error: any) {
      console.error('[Stripe] Refund failed', {
        gatewayTxnId,
        error: error.message
      })

      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        error: error.message || 'Failed to process refund'
      }
    }
  }

  /**
   * Extract payment data from Stripe webhook event
   */
  private async extractPaymentData(event: Stripe.Event): Promise<WebhookPaymentData | undefined> {
    try {
      let session: Stripe.Checkout.Session | null = null
      let paymentIntent: Stripe.PaymentIntent | null = null

      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.expired':
          session = event.data.object as Stripe.Checkout.Session
          break

        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          paymentIntent = event.data.object as Stripe.PaymentIntent
          break

        case 'charge.refunded':
          const charge = event.data.object as Stripe.Charge
          paymentIntent = await this.stripe.paymentIntents.retrieve(charge.payment_intent as string)
          break

        default:
          return undefined
      }

      // Extract metadata
      const metadata = session?.metadata || paymentIntent?.metadata || {}
      const orderId = metadata.orderId ? parseInt(metadata.orderId) : undefined

      // Determine status
      let status: PaymentStatus
      if (
        event.type === 'checkout.session.completed' ||
        event.type === 'payment_intent.succeeded'
      ) {
        status = 'COMPLETED'
      } else if (
        event.type === 'checkout.session.expired' ||
        event.type === 'payment_intent.payment_failed'
      ) {
        status = 'FAILED'
      } else if (event.type === 'charge.refunded') {
        status = 'REFUNDED'
      } else {
        status = 'PENDING'
      }

      const amount = session
        ? session.amount_total! / 100
        : paymentIntent
          ? paymentIntent.amount / 100
          : 0

      const paidAmount =
        paymentIntent?.amount_received && paymentIntent.amount_received > 0
          ? paymentIntent.amount_received / 100
          : status === 'COMPLETED'
            ? amount
            : 0

      return {
        gatewayTxnId: session?.id || paymentIntent?.id || '',
        orderId,
        amount,
        currency: session?.currency || paymentIntent?.currency || 'usd',
        status,
        paidAmount,
        customerEmail: session?.customer_email || paymentIntent?.receipt_email || undefined,
        metadata: {
          sessionId: session?.id,
          paymentIntentId: paymentIntent?.id,
          eventType: event.type
        }
      }
    } catch (error: any) {
      console.error('[Stripe] Failed to extract payment data from event', {
        eventType: event.type,
        error: error.message
      })
      return undefined
    }
  }

  /**
   * Map Stripe status to internal PaymentStatus
   */
  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      succeeded: 'COMPLETED',
      paid: 'COMPLETED',
      complete: 'COMPLETED',
      processing: 'PENDING',
      requires_payment_method: 'PENDING',
      requires_confirmation: 'PENDING',
      requires_action: 'PENDING',
      unpaid: 'PENDING',
      canceled: 'FAILED',
      failed: 'FAILED',
      expired: 'FAILED'
    }

    return statusMap[stripeStatus] || 'PENDING'
  }
}
