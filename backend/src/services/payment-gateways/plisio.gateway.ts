import { PaymentStatus } from '@prisma/client'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import crypto from 'crypto'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'
import { buildWebhookUrl, getPaymentReturnUrl } from '../../utils/payment-urls'

interface PlisioConfig {
  apiKey: string
  secretKey: string
  testMode: boolean
}

interface PlisioInvoiceResponse {
  status: string
  data: {
    txn_id: string
    invoice_url: string
    invoice_total_sum?: string
    amount?: string
    pending_amount?: string
    wallet_hash?: string
    psys_cid?: string
    currency?: string
    status?: string
    source_currency?: string
    source_rate?: string
    expire_utc?: number
    expected_confirmations?: string
    qr_code?: string
    verify_hash?: string
    invoice_commission?: string
    invoice_sum?: string
  }
}

interface PlisioTransactionResponse {
  status: string
  data: {
    id: string
    status: string
    amount: string
    currency: string
    source_currency?: string
    source_amount?: string
    confirmations?: number
    expected_confirmations?: number
  }
}

interface PlisioCallbackData {
  txn_id: string
  ipn_type: string
  merchant: string
  merchant_id: string
  amount: string
  currency: string
  order_number: string
  order_name: string
  confirmations: string
  status: string
  source_currency?: string
  source_amount?: string
  source_rate?: string
  comment?: string
  verify_hash: string
  invoice_commission?: string
  invoice_sum?: string
  invoice_total_sum?: string
  switch_id?: string
  psys_cid?: string
  pending_amount?: string
  qr_code?: string
  tx_urls?: string
}

export class PlisioGatewayService implements IPaymentGateway {
  private client: AxiosInstance
  private apiKey: string
  private secretKey: string
  private baseURL: string

  constructor(config: PlisioConfig) {
    this.apiKey = config.apiKey
    this.secretKey = config.secretKey
    this.baseURL = 'https://api.plisio.net/api/v1'

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('[Plisio] Gateway initialized')
  }

  /**
   * Create payment invoice via Plisio API
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      // Check if this is a subscription payment
        const isSubscription =
          params.metadata?.type === 'SUBSCRIPTION_PURCHASE' ||
          params.metadata?.type === 'SUBSCRIPTION_RENEWAL'
        const isWalletTopup = params.metadata?.type === 'wallet_topup'

      const callbackUrl = buildWebhookUrl('/plisio', { json: 'true' })

      // For success URLs - add status=success parameter and provide fallback URLs
        const baseSuccessUrl = isWalletTopup
          ? getPaymentReturnUrl('WALLET_TOPUP_SUCCESS_URL', '/wallet/topup')
          : isSubscription
          ? getPaymentReturnUrl('SUBSCRIPTION_SUCCESS_URL', '/subscription/payment/success')
          : getPaymentReturnUrl('PAYMENT_SUCCESS_URL', '/payment/success')
      
        const successUrl = isWalletTopup
          ? `${baseSuccessUrl}?topup_id=${params.orderId}&status=success&json=true`
          : isSubscription
          ? `${baseSuccessUrl}?payment_id=${params.orderId}&status=success&json=true`
          : `${baseSuccessUrl}?order_id=${params.orderId}&status=success&json=true`

      // For fail URLs - add fallback URL for orders
        const baseFailUrl = isWalletTopup
          ? getPaymentReturnUrl('WALLET_TOPUP_CANCEL_URL', '/wallet/topup')
          : isSubscription
          ? getPaymentReturnUrl('SUBSCRIPTION_CANCEL_URL', '/subscription/payment/cancel')
          : getPaymentReturnUrl('PAYMENT_CANCEL_URL', '/payment/cancel')
      
        const failUrl = isWalletTopup
          ? `${baseFailUrl}?topup_id=${params.orderId}&status=failed&json=true`
          : isSubscription
          ? `${baseFailUrl}?reason=payment_failed&json=true`
          : `${baseFailUrl}?order_id=${params.orderId}&status=failed&json=true`

      // Build query parameters
      const queryParams = {
        api_key: this.apiKey,
        order_name: params.description || `Order #${params.orderId}`,
        order_number: params.orderId.toString(),
        source_currency: params.currency,
        source_amount: params.amount.toString(),
        callback_url: callbackUrl,
        success_callback_url: successUrl,
        fail_callback_url: failUrl,
        email: params.customerEmail,
        expire_min: 60 // 1 hour expiration
      }

      console.log('[Plisio] Creating invoice:', {
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency
      })

      const response = await this.client.get<PlisioInvoiceResponse>('/invoices/new', {
        params: queryParams
      })

      if (response.data.status !== 'success') {
        throw new Error('Failed to create Plisio invoice')
      }

      const invoiceData = response.data.data

      // Calculate expiration (1 hour from now)
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 60)

      console.log('[Plisio] Invoice created:', {
        txn_id: invoiceData.txn_id,
        invoice_url: invoiceData.invoice_url,
        wallet_hash: invoiceData.wallet_hash || 'N/A'
      })

      return {
        success: true,
        gatewayTxnId: invoiceData.txn_id,
        paymentUrl: invoiceData.invoice_url,
        address: invoiceData.wallet_hash,
        qrCode: invoiceData.qr_code,
        expiresAt,
        metadata: {
          invoice_total_sum: invoiceData.invoice_total_sum,
          pending_amount: invoiceData.pending_amount,
          expected_confirmations: invoiceData.expected_confirmations,
          invoice_commission: invoiceData.invoice_commission,
          psys_cid: invoiceData.psys_cid,
          currency: invoiceData.currency
        }
      }
    } catch (error: any) {
      console.error('[Plisio] Payment creation failed:', error.response?.data || error.message)
      throw new Error(
        `Plisio payment creation failed: ${error.response?.data?.data?.message || error.message}`
      )
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA1
   */
  async verifyWebhook(
    payload: PlisioCallbackData,
    signature?: string
  ): Promise<WebhookVerificationResult> {
    try {
      if (!payload.verify_hash) {
        console.error('[Plisio] Missing verify_hash in payload')
        return {
          verified: false,
          error: 'Missing verify_hash in payload'
        }
      }

      const receivedHash = payload.verify_hash

      // Create a copy and remove verify_hash
      const data: any = { ...payload }
      delete data.verify_hash

      // Convert expire_utc to string if exists
      if (data.expire_utc !== undefined) {
        data.expire_utc = String(data.expire_utc)
      }

      // Decode HTML entities in tx_urls if exists
      if (data.tx_urls) {
        data.tx_urls = this.decodeHtmlEntities(data.tx_urls)
      }

      // Sort keys and create serialized string (PHP serialize equivalent)
      const sortedKeys = Object.keys(data).sort()
      const sortedData: any = {}
      sortedKeys.forEach((key) => {
        sortedData[key] = data[key]
      })

      // For Node.js, we use JSON.stringify instead of PHP serialize
      const dataString = JSON.stringify(sortedData)

      // Plisio integrations in the wild may sign with API key or secret key
      // depending on account/app configuration, so we support both for reliability.
      const candidateKeys = [this.secretKey, this.apiKey].filter(Boolean)
      const normalizedReceived = String(receivedHash || '').trim().toLowerCase()

      const isValid = candidateKeys.some((key) => {
        const calculated = crypto.createHmac('sha1', key).update(dataString).digest('hex').toLowerCase()
        if (calculated.length !== normalizedReceived.length) return false
        return crypto.timingSafeEqual(
          Buffer.from(calculated, 'hex'),
          Buffer.from(normalizedReceived, 'hex')
        )
      })

      if (!isValid) {
        console.error('[Plisio] Signature verification failed:', {
          received: normalizedReceived,
          keysTried: candidateKeys.length
        })
        return {
          verified: false,
          error: 'Signature verification failed'
        }
      }

      console.log('[Plisio] Signature verified successfully')

      // Parse payment data from callback
      const paymentData = this.parseCallbackData(payload)

      return {
        verified: true,
        event: payload,
        eventType: `invoice.${payload.status}`,
        paymentData: {
          gatewayTxnId: paymentData.gatewayTxnId,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status,
          paidAmount: paymentData.amount,
          metadata: paymentData.metadata
        }
      }
    } catch (error: any) {
      console.error('[Plisio] Webhook verification error:', error.message)
      return {
        verified: false,
        error: error.message
      }
    }
  }

  /**
   * Get payment status from Plisio
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    try {
      console.log('[Plisio] Fetching transaction status:', gatewayTxnId)

      const response = await this.client.get<PlisioTransactionResponse>('/operations', {
        params: {
          api_key: this.apiKey,
          id: gatewayTxnId
        }
      })

      if (response.data.status !== 'success') {
        throw new Error('Failed to fetch transaction status')
      }

      const transaction = response.data.data
      const amount = parseFloat(transaction.amount)

      return {
        status: this.mapPlisioStatus(transaction.status),
        gatewayStatus: transaction.status,
        amount,
        paidAmount: amount,
        currency: transaction.currency,
        metadata: {
          confirmations: transaction.confirmations,
          expected_confirmations: transaction.expected_confirmations
        }
      }
    } catch (error: any) {
      console.error('[Plisio] Status check failed:', error.response?.data || error.message)
      throw new Error(`Failed to get payment status: ${error.message}`)
    }
  }

  /**
   * Refund payment (not supported by Plisio API - manual process)
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    console.warn('[Plisio] Refunds not supported via API')
    throw new Error(
      'Plisio does not support automated refunds. Please process refund manually via Plisio dashboard.'
    )
  }

  /**
   * Map Plisio payment status to internal PaymentStatus enum
   */
  private mapPlisioStatus(plisioStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      new: PaymentStatus.PENDING,
      pending: PaymentStatus.PENDING,
      'pending internal': PaymentStatus.PENDING,
      completed: PaymentStatus.COMPLETED,
      mismatch: PaymentStatus.PARTIAL,
      expired: PaymentStatus.FAILED,
      error: PaymentStatus.FAILED,
      cancelled: PaymentStatus.FAILED,
      'cancelled duplicate': PaymentStatus.FAILED
    }

    return statusMap[plisioStatus.toLowerCase()] || PaymentStatus.PENDING
  }

  /**
   * Decode HTML entities (for tx_urls field)
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&#39;': "'"
    }

    return text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match)
  }

  /**
   * Parse Plisio callback data and extract payment information
   */
  parseCallbackData(payload: PlisioCallbackData): {
    orderId: number
    status: PaymentStatus
    amount: number
    currency: string
    gatewayTxnId: string
    metadata?: any
  } {
    const orderId = parseInt(payload.order_number)
    const status = this.mapPlisioStatus(payload.status)
    const amount = parseFloat(payload.amount || '0')

    return {
      orderId,
      status,
      amount,
      currency: payload.currency,
      gatewayTxnId: payload.txn_id,
      metadata: {
        confirmations: payload.confirmations,
        source_currency: payload.source_currency,
        source_amount: payload.source_amount,
        invoice_commission: payload.invoice_commission,
        invoice_sum: payload.invoice_sum,
        invoice_total_sum: payload.invoice_total_sum,
        psys_cid: payload.psys_cid,
        comment: payload.comment
      }
    }
  }
}
