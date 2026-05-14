/**
 * Binance Internal Transfer (Manual) Payment Gateway
 *
 * Matches the provided requirement:
 * - Admin config: Pay ID + static QR code
 * - Customer pays in Binance app (internal transfer)
 * - Customer pastes Binance "Order ID" into your site and clicks Verify
 * - Backend verifies by checking Binance transfer history (Playwright + saved cookies)
 *
 * IMPORTANT:
 * - This gateway DOES NOT auto-charge the customer (no merchant API).
 * - Webhooks are NOT used. Verification is manual via a dedicated endpoint.
 */

import { PaymentStatus } from '@prisma/client'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookPaymentData,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'

interface BinanceConfig {
  payId: string // Binance Pay ID (recipient Binance ID shown to customers)
  qrCodeUrl?: string // Static QR code image URL shown to customers
  testMode: boolean
}

export class BinanceGatewayService implements IPaymentGateway {
  private payId: string
  private qrCodeUrl?: string
  private testMode: boolean

  constructor(config: BinanceConfig) {
    this.payId = config.payId.trim()
    this.qrCodeUrl = config.qrCodeUrl?.trim() || undefined
    this.testMode = config.testMode

    console.log('[Binance] Internal transfer gateway initialized', {
      testMode: this.testMode,
      payId: this.payId ? `${this.payId.slice(0, 3)}***` : undefined,
      hasQrCodeUrl: Boolean(this.qrCodeUrl)
    })
  }

  /**
   * Create a payment "instruction" for the customer:
   * - Show payId + QR + exact amount
   * - Customer pays in Binance app
   * - Customer returns with Binance "Order ID" to verify
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const { orderId, amount, currency } = params

      // The "transaction id" here is just a local identifier; real Binance Order ID is provided by customer later.
      const gatewayTxnId = `binance_it_${orderId}_${Date.now()}`

      console.log('[Binance] Payment instructions created', {
        orderId,
        gatewayTxnId,
        amount,
        currency,
        payId: this.payId ? `${this.payId.slice(0, 3)}***` : undefined
      })

      // Ensure address is always set (required for frontend redirect logic)
      // Must be a non-empty string, not empty string (empty string is falsy)
      if (!this.payId || this.payId.trim() === '') {
        throw new Error('Binance Pay ID is required but not configured in payment method settings')
      }
      
      const address = this.payId.trim()
      const qrCode = this.qrCodeUrl?.trim() || undefined

      console.log('[Binance] Returning payment response', {
        hasAddress: Boolean(address),
        addressValue: address,
        addressLength: address.length,
        hasQrCode: Boolean(qrCode),
        qrCodeValue: qrCode
      })

      return {
        success: true,
        gatewayTxnId,
        paymentUrl: undefined, // No redirect needed (handled by our /payment/crypto-details page)
        // Reuse existing "crypto-details" fields to show Pay ID + QR in frontend
        address: address, // Always set (even if empty string) so frontend can detect Binance payment
        qrCode: qrCode, // Optional QR code URL
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        metadata: {
          expectedAmount: amount,
          expectedCurrency: currency,
          payId: this.payId,
          qrCodeUrl: this.qrCodeUrl,
          note:
            'Customer must pay in Binance app and then submit Binance Order ID for verification.'
        }
      }
    } catch (error: any) {
      console.error('[Binance] Payment initiation failed', {
        error: error.message,
        orderId: params.orderId,
      })

      return {
        success: false,
        gatewayTxnId: '',
        error: error.message || 'Failed to create Binance internal transfer instructions'
      }
    }
  }

  /**
   * Webhooks are not used for this flow.
   */
  async verifyWebhook(payload: any, signature?: string): Promise<WebhookVerificationResult> {
    return {
      verified: false,
      error: 'Binance internal transfer does not use webhooks. Use manual verify endpoint.'
    }
  }

  /**
   * Status can't be determined from gatewayTxnId alone (Binance Order ID is required).
   * Keep PENDING until customer submits Binance Order ID and verification succeeds.
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    return {
      status: PaymentStatus.PENDING,
      gatewayStatus: 'pending_manual_verification',
      amount: 0,
      paidAmount: 0,
      currency: 'USDT',
      metadata: {
        note:
          'Binance internal transfer requires customer-provided Binance Order ID. Use /api/v1/payments/binance/verify.'
      }
    }
  }

  /**
   * Refunds are not supported automatically for this manual flow.
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    return {
      success: false,
      refundId: '',
      amount: amount || 0,
      status: 'failed',
      error: 'Refunds are not supported automatically for Binance internal transfer.'
    }
  }
}
