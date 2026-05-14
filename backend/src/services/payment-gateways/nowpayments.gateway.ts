/**
 * NOWPayments Gateway Service
 * Implements NOWPayments API for cryptocurrency payments
 * Based on NOWPayments API v1
 */

import type { PaymentStatus } from '@prisma/client';
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
import { buildWebhookUrl, getPublicFrontendUrl } from '../../utils/payment-urls';

interface NOWPaymentsConfig {
  apiKey: string;
  ipnSecret: string;
  testMode: boolean;
}

interface NOWPaymentsCreatePaymentRequest {
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  ipn_callback_url: string;
  order_id: string;
  order_description: string;
  customer_email?: string;
  // NOTE: NOWPayments API does not support return_url/success_url parameter
  // Users must rely on email confirmation and webhook for payment status updates
  // Frontend should implement polling to check payment status
}

interface NOWPaymentsCreateInvoiceRequest {
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  ipn_callback_url: string;
  order_id: string;
  order_description: string;
  success_url?: string;
  cancel_url?: string;
}

interface NOWPaymentsCreatePaymentResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
  amount_received: number;
  payin_extra_id: string | null;
}

interface NOWPaymentsCreateInvoiceResponse {
  id?: number | string;  
  token_id?: string;
  invoice_url?: string;
  order_id?: string;
  order_description?: string;
  price_amount?: number;
  price_currency?: string;
  pay_currency?: string | null;
  success_url?: string;
  cancel_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface NOWPaymentsStatusResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

interface NOWPaymentsIPNPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

export class NOWPaymentsGatewayService implements IPaymentGateway {
  private client: AxiosInstance;
  private ipnSecret: string;
  private testMode: boolean;

  constructor(config: NOWPaymentsConfig) {
    const baseURL = config.testMode
      ? 'https://api-sandbox.nowpayments.io/v1'
      : 'https://api.nowpayments.io/v1';

    // Validate API key format (NOWPayments API keys are typically long alphanumeric strings)
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('NOWPayments API key is required and cannot be empty');
    }

    // Trim whitespace from API key
    const apiKey = config.apiKey.trim();

    // Check for potential issues with the API key
    let apiKeyValid = true;
    let apiKeyWarnings = '';
    
    if (apiKey.includes(' ')) {
      apiKeyValid = false;
      apiKeyWarnings = 'API key contains spaces - this is invalid';
    }
    
    // Check if API key matches test mode
    const isTestKey = apiKey.startsWith('tsk_');
    const isProdKey = apiKey.startsWith('psk_');
    
    if ((isTestKey && !config.testMode) || (isProdKey && config.testMode)) {
      apiKeyWarnings = `API key type mismatch: API key starts with '${isTestKey ? 'tsk_' : isProdKey ? 'psk_' : 'unknown'}' but testMode is ${config.testMode}. Use sandbox keys (tsk_) with testMode=true and production keys (psk_) with testMode=false.`;
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.ipnSecret = config.ipnSecret;
    this.testMode = config.testMode;

    // Log potential configuration issues
    if (apiKeyWarnings) {
      console.error('[NOWPayments] ⚠️  CONFIGURATION WARNING:', apiKeyWarnings);
    }

    console.log('[NOWPayments] Gateway initialized', { 
      testMode: config.testMode,
      baseURL,
      apiKeyLength: apiKey.length,
      apiKeyFirstChar: apiKey.charAt(0),
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      apiKeyValid,
      apiKeyWarnings: apiKeyWarnings || 'none',
      ipnSecretConfigured: !!config.ipnSecret,
    });

    // Validate API key by testing it
    this.validateApiKeyAsync();
  }

  /**
   * Async validation of API key - test with a simple currencies call
   */
  private async validateApiKeyAsync(): Promise<void> {
    try {
      const response = await this.client.get('/currencies', { timeout: 5000 });
      console.log('[NOWPayments] API key validation successful', {
        currenciesAvailable: response.data?.currencies?.length || 0,
      });
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      
      console.error('[NOWPayments] ⚠️  API KEY VALIDATION FAILED', {
        statusCode,
        errorCode: errorData?.code,
        errorMessage: errorData?.message || error.message,
        suggestion: this.getApiKeyValidationSuggestion(statusCode, errorData, this.testMode),
      });
    }
  }

  /**
   * Get suggestions for API key validation failures
   */
  private getApiKeyValidationSuggestion(
    statusCode: number | undefined,
    errorData: any,
    testMode: boolean
  ): string {
    if (statusCode === 403 || errorData?.code === 'INVALID_API_KEY') {
      return `API key is invalid or expired. Check Admin Panel: testMode=${testMode}. If using testMode=true, key must start with 'tsk_'. If testMode=false, key must start with 'psk_'.`;
    }
    if (statusCode === 401) {
      return `Authentication failed. Verify API key format and ensure it's correctly configured.`;
    }
    if (!statusCode) {
      return `Cannot reach NOWPayments API. Check your internet connection.`;
    }
    return `API validation failed with status ${statusCode}. Check NOWPayments dashboard.`;
  }

  /**
   * Get list of available currencies from NOWPayments
   */
  private async getAvailableCurrencies(): Promise<string[]> {
    try {
      const response = await this.client.get('/currencies');
      if (response.data?.currencies && Array.isArray(response.data.currencies)) {
        return response.data.currencies.map((c: string) => c.toUpperCase());
      }
      return [];
    } catch (error: any) {
      console.warn('[NOWPayments] Could not fetch available currencies:', error.message);
      // Return empty array if we can't fetch - will use fallback list
      return [];
    }
  }

  /**
   * Try to get an estimate for a currency pair to validate it's available
   * Returns the estimated amount if valid, or null if invalid
   */
  private async validateCurrencyPair(
    priceCurrency: string,
    payCurrency: string,
    amount: number
  ): Promise<{ valid: boolean; estimatedAmount?: number }> {
    try {
      const response = await this.client.get('/estimate', {
        params: {
          amount: amount,
          currency_from: priceCurrency.toUpperCase(),
          currency_to: payCurrency.toUpperCase(),
        },
      });
      const estimatedAmount = response.data?.estimated_amount;
      if (estimatedAmount !== undefined && estimatedAmount !== null) {
        return { valid: true, estimatedAmount };
      }
      return { valid: false };
    } catch (error: any) {
      const errorResponse = error.response?.data;
      if (
        errorResponse?.code === 'INTERNAL_ERROR' &&
        errorResponse?.message?.includes('Can not get estimate')
      ) {
        return { valid: false };
      }
      // For other errors (like minimum amount), return invalid
      if (
        errorResponse?.code === 'AMOUNT_MINIMAL_ERROR' ||
        errorResponse?.message?.includes('less than minimal')
      ) {
        return { valid: false };
      }
      // For other errors, assume the pair might be valid (let the payment creation fail if not)
      return { valid: true };
    }
  }

  /**
   * Prioritize currencies - stablecoins and lower-value coins first
   */
  private prioritizeCurrencies(currencies: string[]): string[] {
    // Define priority order (lower index = higher priority)
    const priorityOrder = [
      // ULTRA-LOWEST minimums - try these FIRST!
      'DOGE', 'LTC', 'XRP', 'TRX',
      // Very low minimums - stablecoins on low-fee networks
      'USDTTRC20', 'USDTTON', 'USDTBSC', 'USDTERC20', 'USDC', 'USDCERC20', 'BUSD', 'TUSD',
      // Medium priority - popular altcoins
      'ETH', 'BCH', 'MATIC', 'AVAX', 'BNB', 'SOL', 'ADA', 'ATOM', 'ALGO',
      // Everything else (low priority)
    ];

    // Create a map of currency to priority index
    const getPriority = (currency: string): number => {
      const upper = currency.toUpperCase();
      const exactIndex = priorityOrder.indexOf(upper);
      if (exactIndex !== -1) return exactIndex;
      
      // Fuzzy match for variations (e.g., USDT* becomes USDT priority)
      for (const priority of priorityOrder) {
        if (upper.includes(priority)) {
          return priorityOrder.indexOf(priority) + 0.5; // Slightly lower priority than exact match
        }
      }
      
      // Return high number for unknown currencies (they go last)
      return priorityOrder.length + 1000;
    };

    // Sort by priority
    return currencies.sort((a, b) => getPriority(a) - getPriority(b));
  }

  /**
   * Find a working cryptocurrency for the given price currency and amount
   */
  private async findWorkingCurrency(
    priceCurrency: string,
    amount: number,
    preferredCurrency?: string
  ): Promise<string> {
    // First, try to get available currencies from NOWPayments API
    const availableCurrencies = await this.getAvailableCurrencies();
    
    // List of fallback cryptocurrencies to try (in order of preference)
    // Ordered by typical minimum amounts (lowest first)
    const fallbackCurrencies = [
      'DOGE', // Dogecoin - very low minimums
      'LTC',  // Litecoin - low minimums
      'XRP',  // Ripple - low minimums
      'USDTTRC20', // USDT on Tron - stablecoin, very low fees
      'USDTBSC', // USDT on BSC - stablecoin, lower fees
      'USDTERC20', // USDT on Ethereum - stablecoin
      'USDC', // USD Coin - stablecoin
      'USDCERC20', // USDC on Ethereum
      'TRX', // Tron - ultra-low fees
      'ETH', // Ethereum - widely supported
      'BCH', // Bitcoin Cash
      'BNB', // Binance Coin
      'MATIC', // Polygon - lower fees on L2
      'SOL', // Solana
      'AVAX', // Avalanche
      'ADA', // Cardano
      'BTC', // Bitcoin - last resort due to high minimums
    ];

    // Use available currencies if we got them, otherwise use fallback list
    const currenciesToCheck = availableCurrencies.length > 0 
      ? availableCurrencies 
      : fallbackCurrencies;

    // Start with preferred currency if provided and it's in the available list
    let currenciesToTry: string[];
    if (preferredCurrency) {
      const preferred = preferredCurrency.toUpperCase();
      if (currenciesToCheck.includes(preferred)) {
        currenciesToTry = [preferred, ...currenciesToCheck.filter(c => c !== preferred)];
      } else {
        currenciesToTry = [preferred, ...currenciesToCheck];
      }
    } else {
      currenciesToTry = currenciesToCheck;
    }

    // Remove duplicates
    let uniqueCurrencies = [...new Set(currenciesToTry)];

    // Prioritize currencies (stablecoins first, then altcoins, then BTC)
    uniqueCurrencies = this.prioritizeCurrencies(uniqueCurrencies);

    console.log('[NOWPayments] Trying to find working currency pair...', {
      priceCurrency,
      amount,
      availableCurrencies: availableCurrencies.length > 0 ? availableCurrencies.length : 'not fetched',
      currenciesToTry: uniqueCurrencies.slice(0, 10), // Log first 10 for brevity
      totalCurrencies: uniqueCurrencies.length,
    });

    // Try each currency until we find one that works
    for (const cryptoCurrency of uniqueCurrencies) {
      const validation = await this.validateCurrencyPair(priceCurrency, cryptoCurrency, amount);
      if (validation.valid) {
        console.log('[NOWPayments] Found working currency:', {
          currency: cryptoCurrency,
          estimatedAmount: validation.estimatedAmount,
        });
        return cryptoCurrency;
      }
      console.log(
        `[NOWPayments] Currency ${cryptoCurrency} not available (estimate failed or below minimum), trying next...`
      );
    }

    // If none work, return the first available currency or ETH as last resort
    const defaultCurrency = availableCurrencies.length > 0 && availableCurrencies[0]
      ? availableCurrencies[0] 
      : 'ETH';
    
    console.warn(
      `[NOWPayments] Could not validate any currency pair, defaulting to ${defaultCurrency}`
    );
    return defaultCurrency;
  }

  /**
   * Build NOWPayments IPN callback URL
   */
  private buildIpnCallbackUrl(): string {
    return buildWebhookUrl('/nowpayments');
  }

  /**
   * Build hosted checkout return URLs.
   */
  private buildHostedReturnUrls(params: CreatePaymentParams): {
    successUrl: string;
    cancelUrl: string;
  } {
    const baseUrl = getPublicFrontendUrl();
    const isWalletTopup = params.metadata?.type === 'wallet_topup';
    const isSubscription = Boolean(params.metadata?.subscriptionPaymentId);

    if (isWalletTopup) {
      return {
        successUrl: `${baseUrl}/wallet/topup?topup_id=${params.orderId}&status=success`,
        cancelUrl: `${baseUrl}/wallet/topup?topup_id=${params.orderId}&status=cancelled`
      };
    }

    if (isSubscription) {
      return {
        successUrl: `${baseUrl}/user/subscription?status=success`,
        cancelUrl: `${baseUrl}/user/subscription?status=cancelled`
      };
    }

    return {
      successUrl: `${baseUrl}/payment/success?order_id=${params.orderId}&status=success`,
      cancelUrl: `${baseUrl}/payment/failed?order_id=${params.orderId}&status=cancelled`
    };
  }

  /**
   * Create a hosted NOWPayments invoice and return the invoice URL.
   */
  private async attemptInvoiceCreation(
    params: CreatePaymentParams,
    ipnCallbackUrl: string
  ): Promise<PaymentResponse> {
    const { orderId, amount, currency, description } = params;
    const { successUrl, cancelUrl } = this.buildHostedReturnUrls(params);

    const invoiceRequest: NOWPaymentsCreateInvoiceRequest = {
      price_amount: amount,
      price_currency: currency.toUpperCase(),
      ipn_callback_url: ipnCallbackUrl,
      order_id: orderId.toString(),
      order_description: description,
      success_url: successUrl,
      cancel_url: cancelUrl
    };

    const response = await this.client.post<NOWPaymentsCreateInvoiceResponse>('/invoice', invoiceRequest);
    const invoice = response.data;

    if (!invoice?.invoice_url) {
      throw new Error('NOWPayments invoice creation succeeded but no invoice_url was returned');
    }

    const invoiceId = String(invoice.id ?? invoice.token_id ?? `order-${orderId}`);

    console.log('[NOWPayments] Hosted invoice created', {
      orderId,
      invoiceId,
      invoiceUrl: invoice.invoice_url
    });

    return {
      success: true,
      gatewayTxnId: `np-invoice:${invoiceId}`,
      paymentUrl: invoice.invoice_url,
      metadata: {
        invoiceId,
        invoiceUrl: invoice.invoice_url,
        nowpaymentsMode: 'invoice',
        orderId: orderId.toString()
      }
    };
  }

  /**
   * Create NOWPayments hosted invoice checkout
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const networks = params.metadata?.networks as string[] | undefined;
      if (networks && networks.length > 0) {
        console.log(
          '[NOWPayments] Hosted invoice mode enabled; customer will choose currency on NOWPayments page'
        );
      }

      const ipnCallbackUrl = this.buildIpnCallbackUrl();
      new URL(ipnCallbackUrl);

      return await this.attemptInvoiceCreation(params, ipnCallbackUrl);
    } catch (error: any) {
      const errorResponse = error.response?.data;
      const statusCode = error.response?.status;
      
      console.error('[NOWPayments] Payment creation failed', {
        error: error.message,
        statusCode,
        response: errorResponse,
        orderId: params.orderId,
        apiKeyConfigured: !!this.client.defaults.headers['x-api-key'],
        apiKeyLength: (this.client.defaults.headers['x-api-key'] as string)?.length || 0,
        testMode: this.testMode,
      });

      // Provide more detailed error messages
      let errorMessage = 'Failed to create payment';
      
      if (statusCode === 403 && errorResponse?.code === 'INVALID_API_KEY') {
        errorMessage = 'Invalid NOWPayments API key. Please verify your API key in the payment method settings. ' +
          'Make sure you are using the correct API key for your account (sandbox keys for test mode, production keys for live mode). ' +
          'Also check that the API Key field contains the API Key (not the Webhook Secret) and the API Secret field contains the Webhook Secret. ' +
          `Current Test Mode: ${this.testMode}. If true, use sandbox API key (tsk_...). If false, use production API key (psk_...).`;
      } else if (statusCode === 401) {
        errorMessage = 'Authentication failed with NOWPayments. Check your API key and ensure it\'s correctly configured.';
      } else if (errorResponse?.message) {
        errorMessage = errorResponse.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        gatewayTxnId: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Verify NOWPayments IPN webhook signature
   */
  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    try {
      if (!payload || typeof payload !== 'object') {
        return {
          verified: false,
          error: 'Invalid webhook payload',
        };
      }

      if (!signature || typeof signature !== 'string') {
        return {
          verified: false,
          error: 'Missing NOWPayments signature',
        };
      }

      // NOWPayments sends JSON payload
      const ipnData: NOWPaymentsIPNPayload = payload;

      // Sort parameters alphabetically
      const sortedData = Object.keys(ipnData)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = ipnData[key as keyof NOWPaymentsIPNPayload];
          return acc;
        }, {});

      // Create string from sorted data
      const sortedJson = JSON.stringify(sortedData);

      // Create HMAC signature
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      hmac.update(sortedJson);
      const calculatedSignature = hmac.digest('hex').toLowerCase();
      const receivedSignature = signature.trim().toLowerCase();

      // Verify signature
      const signaturesMatch =
        calculatedSignature.length === receivedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(calculatedSignature, 'hex'),
          Buffer.from(receivedSignature, 'hex')
        );

      if (!signaturesMatch) {
        console.error('[NOWPayments] Webhook signature verification failed', {
          expected: calculatedSignature.substring(0, 20) + '...',
          received: receivedSignature.substring(0, 20) + '...',
        });

        return {
          verified: false,
          error: 'Invalid signature',
        };
      }

      console.log('[NOWPayments] Webhook verified', {
        paymentId: ipnData.payment_id,
        paymentStatus: ipnData.payment_status,
      });

      // Extract payment data
      const paymentData = this.extractPaymentData(ipnData);

      return {
        verified: true,
        event: ipnData,
        eventType: `payment.${ipnData.payment_status}`,
        paymentData,
      };
    } catch (error: any) {
      console.error('[NOWPayments] Webhook verification failed', {
        error: error.message,
      });

      return {
        verified: false,
        error: error.message || 'Webhook verification failed',
      };
    }
  }

  /**
   * Get payment status from NOWPayments
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.client.get<NOWPaymentsStatusResponse>(`/payment/${gatewayTxnId}`);

      const payment = response.data;
      const status = this.mapNOWPaymentsStatus(payment.payment_status);

      console.log('[NOWPayments] Payment status retrieved', {
        paymentId: gatewayTxnId,
        status,
        paymentStatus: payment.payment_status,
        actuallyPaid: payment.actually_paid,
      });

      return {
        status,
        gatewayStatus: payment.payment_status,
        amount: payment.price_amount,
        paidAmount: payment.actually_paid,
        currency: payment.price_currency.toLowerCase(),
        metadata: {
          paymentId: payment.payment_id,
          purchaseId: payment.purchase_id,
          payAddress: payment.pay_address,
          payCurrency: payment.pay_currency,
          outcomeAmount: payment.outcome_amount,
          outcomeCurrency: payment.outcome_currency,
        },
      };
    } catch (error: any) {
      console.error('[NOWPayments] Failed to get payment status', {
        paymentId: gatewayTxnId,
        error: error.message,
        response: error.response?.data,
      });

      throw new Error(`Failed to retrieve payment status: ${error.message}`);
    }
  }

  /**
   * Process refund via NOWPayments
   * Note: NOWPayments doesn't support automated refunds via API
   * Refunds must be processed manually through their dashboard
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    console.warn('[NOWPayments] Automated refunds not supported', {
      paymentId: gatewayTxnId,
      amount,
    });

    return {
      success: false,
      refundId: '',
      amount: 0,
      status: 'failed',
      error:
        'NOWPayments does not support automated refunds. Please process refund manually through NOWPayments dashboard.',
    };
  }

  /**
   * Extract payment data from IPN payload
   */
  private extractPaymentData(ipnData: NOWPaymentsIPNPayload): WebhookPaymentData {
    const orderId = ipnData.order_id ? parseInt(ipnData.order_id) : undefined;
    const status = this.mapNOWPaymentsStatus(ipnData.payment_status);

    return {
      gatewayTxnId: ipnData.payment_id.toString(),
      orderId,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency.toLowerCase(),
      status,
      paidAmount: ipnData.actually_paid,
      metadata: {
        paymentId: ipnData.payment_id,
        purchaseId: ipnData.purchase_id,
        payAddress: ipnData.pay_address,
        payAmount: ipnData.pay_amount,
        payCurrency: ipnData.pay_currency,
        outcomeAmount: ipnData.outcome_amount,
        outcomeCurrency: ipnData.outcome_currency,
        paymentStatus: ipnData.payment_status,
      },
    };
  }

  /**
   * Map NOWPayments status to internal PaymentStatus
   */
  private mapNOWPaymentsStatus(nowpaymentsStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      waiting: 'PENDING',
      confirming: 'PENDING',
      confirmed: 'PENDING',
      sending: 'PENDING',
      partially_paid: 'PARTIAL',
      finished: 'COMPLETED',
      failed: 'FAILED',
      refunded: 'REFUNDED',
      expired: 'FAILED',
    };

    return statusMap[nowpaymentsStatus] || 'PENDING';
  }
}
