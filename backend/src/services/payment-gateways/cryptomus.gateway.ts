/**
 * Cryptomus Payment Gateway Service
 * Cryptocurrency payment processing via Cryptomus API
 * API Documentation: https://doc.cryptomus.com/
 */

import { PaymentStatus } from '@prisma/client';
import axios, { type AxiosInstance } from 'axios';
import crypto from 'crypto';
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookPaymentData,
  WebhookVerificationResult,
} from '../../types/payment-gateway.types';
import { buildWebhookUrl, getPaymentReturnUrl } from '../../utils/payment-urls';

interface CryptomusConfig {
  merchantId: string; // Merchant UUID
  apiKey: string; // Payment API key
  testMode?: boolean;
}

interface CryptomusCreateInvoiceRequest {
  amount: string;
  currency: string;
  order_id: string;
  url_callback?: string;
  url_return?: string;
  url_success?: string;
  network?: string;
  to_currency?: string;
  is_payment_multiple?: boolean;
  lifetime?: number;
  additional_data?: string;
}

interface CryptomusInvoiceResponse {
  state: number;
  result?: {
    uuid: string;
    order_id: string;
    amount: string;
    payment_amount: string | null;
    payer_amount: string | null;
    payer_currency: string | null;
    currency: string;
    merchant_amount: string | null;
    network: string | null;
    address: string | null;
    from: string | null;
    txid: string | null;
    payment_status: string;
    url: string;
    expired_at: number;
    is_final: boolean;
    additional_data: string | null;
    created_at: string;
    updated_at: string;
  };
  message?: string;
  errors?: Record<string, string[]>;
}

interface CryptomusWebhookPayload {
  type: string;
  uuid: string;
  order_id: string;
  amount: string;
  payment_amount: string;
  payment_amount_usd: string;
  merchant_amount: string;
  commission: string;
  is_final: boolean;
  status: string;
  from: string;
  wallet_address_uuid: string | null;
  network: string;
  currency: string;
  payer_currency: string;
  additional_data: string | null;
  txid: string;
  sign: string;
}

interface CryptomusPaymentInfoResponse {
  state: number;
  result?: {
    uuid: string;
    order_id: string;
    amount: string;
    payment_amount: string;
    payer_amount: string;
    payer_currency: string;
    currency: string;
    merchant_amount: string;
    network: string;
    address: string;
    from: string;
    txid: string;
    payment_status: string;
    url: string;
    expired_at: number;
    is_final: boolean;
    created_at: string;
    updated_at: string;
  };
  message?: string;
}

export class CryptomusGatewayService implements IPaymentGateway {
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly testMode: boolean;
  private readonly baseURL: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(config: CryptomusConfig) {
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.testMode = config.testMode || false;
    this.baseURL = 'https://api.cryptomus.com/v1';

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('[Cryptomus] Gateway initialized', {
      merchantId: this.merchantId,
      testMode: this.testMode,
    });
  }

  /**
   * Generate MD5 signature for Cryptomus API requests
   * Algorithm: MD5(base64_encode(JSON_body) + API_KEY)
   */
  private generateSignature(data: any): string {
    const jsonString = JSON.stringify(data);
    const base64Data = Buffer.from(jsonString).toString('base64');
    const signatureString = base64Data + this.apiKey;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  /**
   * Verify webhook signature
   * Extract sign from payload, regenerate hash, compare
   */
  private verifyWebhookSignature(payload: CryptomusWebhookPayload): boolean {
    const receivedSign = payload.sign;
    const data = { ...payload };
    delete (data as any).sign;

    // Generate expected signature
    const expectedSign = this.generateSignature(data);

    return receivedSign === expectedSign;
  }

  /**
   * Create payment invoice
   * POST /payment
   */
    async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
      try {
        const isWalletTopup = params.metadata?.type === 'wallet_topup';

        console.log('[Cryptomus] Creating invoice', {
          orderId: params.orderId,
          amount: params.amount,
        currency: params.currency,
      });

      const requestData: CryptomusCreateInvoiceRequest = {
        amount: params.amount.toString(),
        currency: params.currency,
          order_id: params.orderId.toString(),
          url_callback: buildWebhookUrl('/cryptomus'),
          url_success: isWalletTopup
            ? `${getPaymentReturnUrl('WALLET_TOPUP_SUCCESS_URL', '/wallet/topup')}?topup_id=${params.orderId}&status=success`
            : `${getPaymentReturnUrl('PAYMENT_SUCCESS_URL', '/payment/success')}?order_id=${params.orderId}&status=success`,
        is_payment_multiple: true, // Allow partial payments
        lifetime: 3600, // 1 hour expiration
        additional_data: JSON.stringify({
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          description: params.description,
        }),
      };

      // Generate signature
      const sign = this.generateSignature(requestData);

      const response = await this.axiosInstance.post<CryptomusInvoiceResponse>(
        '/payment',
        requestData,
        {
          headers: {
            merchant: this.merchantId,
            sign: sign,
          },
        }
      );

      if (response.data.state !== 0 || !response.data.result) {
        throw new Error(response.data.message || 'Failed to create Cryptomus invoice');
      }

      const invoice = response.data.result;

      console.log('[Cryptomus] Invoice created successfully', {
        uuid: invoice.uuid,
        order_id: invoice.order_id,
        payment_url: invoice.url,
        address: invoice.address,
      });

      return {
        success: true,
        gatewayTxnId: invoice.uuid,
        paymentUrl: invoice.url,
        address: invoice.address || undefined,
        expiresAt: new Date(invoice.expired_at * 1000),
        metadata: {
          payment_status: invoice.payment_status,
          payer_currency: invoice.payer_currency,
          network: invoice.network,
          is_final: invoice.is_final,
        },
      };
    } catch (error: any) {
      console.error('[Cryptomus] Payment creation failed', {
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        gatewayTxnId: '',
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Verify webhook signature and extract payment data
   */
  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    try {
      const webhookData = payload as CryptomusWebhookPayload;

      // Verify signature
      const isValid = this.verifyWebhookSignature(webhookData);

      if (!isValid) {
        console.error('[Cryptomus] Webhook signature verification failed', {
          receivedSign: webhookData.sign,
        });

        return {
          verified: false,
          error: 'Invalid webhook signature',
        };
      }

      console.log('[Cryptomus] Webhook verified successfully', {
        uuid: webhookData.uuid,
        status: webhookData.status,
        order_id: webhookData.order_id,
      });

      // Extract payment data
      const paymentData: WebhookPaymentData = {
        gatewayTxnId: webhookData.uuid,
        orderId: parseInt(webhookData.order_id),
        amount: parseFloat(webhookData.amount),
        currency: webhookData.currency,
        status: this.mapCryptomusStatus(webhookData.status),
        paidAmount: parseFloat(webhookData.payment_amount),
        metadata: {
          payment_amount_usd: webhookData.payment_amount_usd,
          merchant_amount: webhookData.merchant_amount,
          commission: webhookData.commission,
          network: webhookData.network,
          payer_currency: webhookData.payer_currency,
          from: webhookData.from,
          txid: webhookData.txid,
          is_final: webhookData.is_final,
          type: webhookData.type,
        },
      };

      return {
        verified: true,
        eventType: webhookData.status,
        paymentData,
      };
    } catch (error: any) {
      console.error('[Cryptomus] Webhook verification error', {
        error: error.message,
      });

      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status from Cryptomus
   * POST /payment/info
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    try {
      const requestData = {
        uuid: gatewayTxnId,
      };

      const sign = this.generateSignature(requestData);

      const response = await this.axiosInstance.post<CryptomusPaymentInfoResponse>(
        '/payment/info',
        requestData,
        {
          headers: {
            merchant: this.merchantId,
            sign: sign,
          },
        }
      );

      if (response.data.state !== 0 || !response.data.result) {
        throw new Error(response.data.message || 'Failed to get payment status');
      }

      const payment = response.data.result;

      return {
        status: this.mapCryptomusStatus(payment.payment_status),
        gatewayStatus: payment.payment_status,
        amount: parseFloat(payment.amount),
        paidAmount: parseFloat(payment.payment_amount || '0'),
        currency: payment.currency,
        metadata: {
          payer_amount: payment.payer_amount,
          payer_currency: payment.payer_currency,
          merchant_amount: payment.merchant_amount,
          network: payment.network,
          address: payment.address,
          from: payment.from,
          txid: payment.txid,
          is_final: payment.is_final,
          expired_at: payment.expired_at,
        },
      };
    } catch (error: any) {
      console.error('[Cryptomus] Get payment status failed', {
        gatewayTxnId,
        error: error.message,
      });

      throw new Error(
        `Failed to get payment status: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Refund payment
   * Cryptomus supports refunds via dashboard, not automated API
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    console.warn('[Cryptomus] Refund requested but not supported via API', {
      gatewayTxnId,
      amount,
    });

    throw new Error(
      'Cryptomus refunds must be processed manually via dashboard. Please contact support or process refund at https://app.cryptomus.com/'
    );
  }

  /**
   * Map Cryptomus payment status to internal PaymentStatus enum
   */
  private mapCryptomusStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      // Success statuses
      paid: PaymentStatus.COMPLETED,
      paid_over: PaymentStatus.COMPLETED,

      // Pending statuses
      check: PaymentStatus.PENDING,
      confirm_check: PaymentStatus.PENDING,
      process: PaymentStatus.PENDING,
      wrong_amount_waiting: PaymentStatus.PENDING,

      // Failed statuses
      wrong_amount: PaymentStatus.FAILED,
      fail: PaymentStatus.FAILED,
      cancel: PaymentStatus.FAILED,
      system_fail: PaymentStatus.FAILED,

      // Refund statuses
      refund_process: PaymentStatus.REFUNDED,
      refund_paid: PaymentStatus.REFUNDED,
      refund_fail: PaymentStatus.FAILED,

      // Locked
      locked: PaymentStatus.FAILED,
    };

    return statusMap[status] || PaymentStatus.PENDING;
  }

  /**
   * Parse callback data from webhook payload
   */
  parseCallbackData(payload: CryptomusWebhookPayload): {
    orderId: number;
    status: PaymentStatus;
    amount: number;
    paidAmount: number;
  } {
    return {
      orderId: parseInt(payload.order_id),
      status: this.mapCryptomusStatus(payload.status),
      amount: parseFloat(payload.amount),
      paidAmount: parseFloat(payload.payment_amount),
    };
  }
}
