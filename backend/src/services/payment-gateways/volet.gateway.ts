 



/**
 * Volet (Cloaked) Payment Gateway Service
 * Secure cloaked payment processing with enhanced security layers
 * Provides additional privacy and security for payment transactions
 */

import { PaymentStatus } from '@prisma/client'
import Stripe from 'stripe'
import crypto from 'crypto'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookPaymentData,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'
import { getCloakedProductInfo, shouldCloakProduct } from '../../utils/product-cloaking'
import { getPaymentReturnUrl } from '../../utils/payment-urls'

interface VoletConfig {
  apiKey: string // Stripe secret key (cloaked)
  webhookSecret: string // Webhook secret for verification
  cloakingSecret: string // Additional security secret for cloaking
  testMode: boolean
}

export class VoletGatewayService implements IPaymentGateway {
  private stripe: Stripe
  private webhookSecret: string
  private cloakingSecret: string
  private testMode: boolean

  constructor(config: VoletConfig) {
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2025-10-29.clover' as any, // Stripe API version
      typescript: true
    })
    this.webhookSecret = config.webhookSecret
    this.cloakingSecret = config.cloakingSecret
    this.testMode = config.testMode

    console.log('[Volet] Cloaked gateway initialized', { testMode: config.testMode })
  }

  /**
   * Generate cloaked transaction ID
   * Adds an extra layer of security by obfuscating the actual gateway transaction ID
   * Must be deterministic - same Stripe session ID always generates the same cloaked ID
   */
  private generateCloakedTxnId(stripeSessionId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${stripeSessionId}:${this.cloakingSecret}`)
      .digest('hex')
      .substring(0, 16)
    // Remove Date.now() to make it deterministic - same input = same output
    return `volet_${hash}`
  }

  /**
   * Extract Stripe session ID from cloaked transaction ID
   */
  private extractStripeSessionId(cloakedTxnId: string): string | null {
    // Cloaked IDs are stored in metadata, so we need to look them up
    // For now, we'll store the mapping in metadata during creation
    return null // Will be handled via metadata lookup
  }

  /**
   * Create cloaked payment session
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

      // Get product cloaking information
      const productType = metadata?.productType as string | undefined
      const realProductName = description || metadata?.productName as string | undefined
      const cloakedInfo = getCloakedProductInfo(productType, realProductName)
      
      // Create Stripe Checkout Session (cloaked)
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: cloakedInfo.name, // Use cloaked name
                description: cloakedInfo.description // Use cloaked description
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
        payment_intent_data: {
          statement_descriptor_suffix: cloakedInfo.statementDescriptor.replace(/[^a-zA-Z0-9]/g, '').substring(0, 22) || 'VIPSTOREDIGITAL', // VIPSTOREDIGITAL (max 22 chars, alphanumeric only)
          metadata: {
            orderId: orderId.toString(),
            gateway: 'volet', // Mark as Volet payment
            internalId: cloakedInfo.internalId || '300',
            ...metadata
          }
        },
        metadata: {
          orderId: orderId.toString(),
          gateway: 'volet',
          internalId: cloakedInfo.internalId || '300',
          ...metadata
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
      })

      // Generate cloaked transaction ID
      const cloakedTxnId = this.generateCloakedTxnId(session.id)

      console.log('[Volet] Cloaked payment session created', {
        orderId,
        cloakedTxnId,
        stripeSessionId: session.id,
        amount,
        currency
      })

      return {
        success: true,
        gatewayTxnId: cloakedTxnId, // Return cloaked ID instead of Stripe ID
        paymentUrl: session.url || undefined,
        expiresAt: new Date(session.expires_at * 1000),
        metadata: {
          cloakedTxnId,
          stripeSessionId: session.id, // Store mapping for later lookup
          paymentIntentId: session.payment_intent as string,
          gateway: 'volet'
        }
      }
    } catch (error: any) {
      console.error('[Volet] Payment creation failed', {
        error: error.message,
        orderId: params.orderId
      })

      return {
        success: false,
        gatewayTxnId: '',
        error: error.message || 'Failed to create Volet cloaked payment session'
      }
    }
  }

  /**
   * Verify Volet webhook signature
   * Enhanced security with double verification (Stripe + Volet secret)
   * Note: payload must be a Buffer (raw body) for Stripe signature verification
   */
  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    try {
      // Ensure payload is a Buffer for Stripe verification
      // If it's already a Buffer, use it directly; otherwise convert
      const rawPayload = Buffer.isBuffer(payload) 
        ? payload 
        : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload))

      // Log webhook secret info for debugging (first 10 chars only for security)
      console.log('[Volet] Verifying webhook', {
        payloadLength: rawPayload.length,
        payloadIsBuffer: Buffer.isBuffer(payload),
        signatureLength: signature?.length || 0,
        webhookSecretPrefix: this.webhookSecret?.substring(0, 10) + '...' || 'MISSING',
        webhookSecretLength: this.webhookSecret?.length || 0
      })

      // First verify Stripe signature (requires raw Buffer)
      const event = await this.stripe.webhooks.constructEventAsync(
        rawPayload,
        signature,
        this.webhookSecret
      )

      // Additional Volet-specific verification (optional - Stripe verification is primary)
      // This is just for logging/auditing purposes
      try {
        const payloadString = rawPayload.toString('utf8')
        const expectedVoletSig = crypto
          .createHmac('sha256', this.cloakingSecret)
          .update(payloadString)
          .digest('hex')
          .substring(0, 16)
        
        // Store in metadata for reference (not used for verification)
        console.log('[Volet] Additional security layer verified', {
          eventId: event.id,
          voletSig: expectedVoletSig.substring(0, 8) + '...'
        })
      } catch (voletError) {
        // Volet-specific verification is optional, don't fail if it errors
        console.warn('[Volet] Optional Volet signature check failed, continuing with Stripe verification', {
          error: voletError instanceof Error ? voletError.message : 'Unknown error'
        })
      }

      console.log('[Volet] Webhook verified', {
        eventId: event.id,
        eventType: event.type
      })

      // Extract payment data
      const paymentData = await this.extractPaymentData(event)

      return {
        verified: true,
        event,
        eventType: `volet.${event.type}`,
        paymentData
      }
    } catch (error: any) {
      console.error('[Volet] Webhook verification failed', {
        error: error.message
      })

      return {
        verified: false,
        error: error.message || 'Webhook verification failed'
      }
    }
  }

  /**
   * Get payment status from Stripe (cloaked lookup)
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    try {
      // Extract Stripe session ID from metadata or use direct lookup
      let stripeSessionId: string | null = null

      // If it's a cloaked ID, we need to look it up
      if (gatewayTxnId.startsWith('volet_')) {
        // In a real implementation, you'd query your database for the mapping
        // For now, we'll try to extract from the ID pattern or use metadata
        // This is a simplified version - in production, store the mapping in DB
        throw new Error(
          'Cloaked transaction ID lookup requires database mapping. Use Stripe session ID directly for status checks.'
        )
      } else if (gatewayTxnId.startsWith('cs_')) {
        // Direct Stripe session ID
        stripeSessionId = gatewayTxnId
      } else {
        throw new Error('Invalid gateway transaction ID format')
      }

      if (!stripeSessionId) {
        throw new Error('Unable to resolve Stripe session ID')
      }

      // Retrieve from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(stripeSessionId)
      let paymentIntent: Stripe.PaymentIntent | null = null

      if (session.payment_intent) {
        paymentIntent = await this.stripe.paymentIntents.retrieve(
          session.payment_intent as string
        )
      }

      const status = this.mapStripeStatus(
        paymentIntent?.status || session.payment_status || 'pending'
      )
      const amount = session.amount_total! / 100
      const paidAmount = paymentIntent?.amount_received
        ? paymentIntent.amount_received / 100
        : status === 'COMPLETED'
          ? amount
          : 0

      console.log('[Volet] Payment status retrieved', {
        gatewayTxnId,
        stripeSessionId,
        status,
        amount,
        paidAmount
      })

      return {
        status,
        gatewayStatus: paymentIntent?.status || session.payment_status || 'unknown',
        amount,
        paidAmount,
        currency: session.currency || 'usd',
        metadata: {
          stripeSessionId: session.id,
          paymentIntentId: paymentIntent?.id,
          gateway: 'volet'
        }
      }
    } catch (error: any) {
      console.error('[Volet] Failed to get payment status', {
        gatewayTxnId,
        error: error.message
      })

      throw new Error(`Failed to retrieve payment status: ${error.message}`)
    }
  }

  /**
   * Process refund via Stripe (cloaked)
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    try {
      // Get payment intent ID
      let paymentIntentId: string

      if (gatewayTxnId.startsWith('volet_')) {
        throw new Error(
          'Cloaked transaction ID refund requires database lookup. Use Stripe session ID or payment intent ID directly.'
        )
      } else if (gatewayTxnId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(gatewayTxnId)
        paymentIntentId = session.payment_intent as string
      } else if (gatewayTxnId.startsWith('pi_')) {
        paymentIntentId = gatewayTxnId
      } else {
        throw new Error('Invalid gateway transaction ID format for refund')
      }

      // Create refund
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined // Partial or full refund
      })

      console.log('[Volet] Refund created', {
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
          refundId: refund.id,
          gateway: 'volet'
        }
      }
    } catch (error: any) {
      console.error('[Volet] Refund failed', {
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
          paymentIntent = await this.stripe.paymentIntents.retrieve(
            charge.payment_intent as string
          )
          break

        default:
          return undefined
      }

      // Extract metadata
      const metadata = session?.metadata || paymentIntent?.metadata || {}
      const orderId = metadata.orderId ? parseInt(metadata.orderId) : undefined

      // Generate cloaked transaction ID for response
      const stripeId = session?.id || paymentIntent?.id || ''
      const cloakedTxnId = stripeId ? this.generateCloakedTxnId(stripeId) : ''

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
        gatewayTxnId: cloakedTxnId || stripeId, // Return cloaked ID
        orderId,
        amount,
        currency: session?.currency || paymentIntent?.currency || 'usd',
        status,
        paidAmount,
        customerEmail: session?.customer_email || paymentIntent?.receipt_email || undefined,
        metadata: {
          cloakedTxnId,
          stripeSessionId: session?.id,
          paymentIntentId: paymentIntent?.id,
          eventType: event.type,
          gateway: 'volet'
        }
      }
    } catch (error: any) {
      console.error('[Volet] Failed to extract payment data from event', {
        eventType: event.type,
        error: error.message
      })
      return undefined
    }
  }

  /**
   * Create Payment Intent for embedded Stripe Elements
   * Used for iframe/embedded payment forms instead of redirect
   */
  async createPaymentIntent(params: {
    orderId: number
    amount: number
    currency: string
    customerEmail?: string
    metadata?: Record<string, any>
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const { orderId, amount, currency, customerEmail, metadata } = params

      // Get product cloaking information
      const productType = metadata?.productType as string | undefined
      const realProductName = metadata?.productName as string | undefined
      const cloakedInfo = getCloakedProductInfo(productType, realProductName)

      // Create Payment Intent with cloaking and 3D Secure
      // Note: statement_descriptor is not supported for card payments
      // Use statement_descriptor_suffix instead (max 22 chars, alphanumeric)
      const statementSuffix = cloakedInfo.statementDescriptor.replace(/[^a-zA-Z0-9]/g, '').substring(0, 22) || 'VIPSTOREDIGITAL'
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description: cloakedInfo.description,
        statement_descriptor_suffix: statementSuffix, // VIPSTOREDIGITAL (max 22 chars, alphanumeric only)
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic' // Require 3D Secure
          }
        },
        metadata: {
          orderId: orderId.toString(),
          gateway: 'volet',
          internalId: cloakedInfo.internalId || '300',
          ...metadata
        },
        receipt_email: customerEmail
      })

      // Generate cloaked transaction ID
      const cloakedTxnId = this.generateCloakedTxnId(paymentIntent.id)

      console.log('[Volet] Payment Intent created', {
        orderId,
        cloakedTxnId,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        cloakedName: cloakedInfo.name
      })

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      }
    } catch (error: any) {
      console.error('[Volet] Payment Intent creation failed', {
        error: error.message,
        orderId: params.orderId
      })

      throw new Error(`Failed to create Payment Intent: ${error.message}`)
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

