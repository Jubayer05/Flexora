/**
 * Payment Gateway Types
 * Base interfaces and types for all payment gateway integrations
 */

import { PaymentStatus } from '@prisma/client';

// ================================
// Base Payment Gateway Interface
// ================================

export interface IPaymentGateway {
  /**
   * Create a new payment session/invoice
   */
  createPayment(params: CreatePaymentParams): Promise<PaymentResponse>;

  /**
   * Verify webhook signature and extract event data
   */
  verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;

  /**
   * Get current payment status from gateway
   */
  getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse>;

  /**
   * Process a refund for a completed payment
   */
  refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse>;
}

// ================================
// Request/Response Types
// ================================

export interface CreatePaymentParams {
  orderId: number;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string; // Internal payment ID
  gatewayTxnId: string; // Gateway transaction/session ID
  paymentUrl?: string; // Redirect URL for payment (Stripe, etc.)
  qrCode?: string; // QR code for crypto payments
  address?: string; // Crypto address
  expiresAt?: Date;
  metadata?: Record<string, any>;
  error?: string;
}

export interface WebhookVerificationResult {
  verified: boolean;
  event?: any; // Gateway-specific event object
  eventType?: string;
  paymentData?: WebhookPaymentData;
  error?: string;
}

export interface WebhookPaymentData {
  gatewayTxnId: string;
  orderId?: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAmount?: number;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  gatewayStatus: string; // Original gateway status
  amount: number;
  paidAmount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  metadata?: Record<string, any>;
  error?: string;
}

// ================================
// Gateway-Specific Types
// ================================

export type PaymentGateway = 'stripe' | 'nowpayment' | 'plisio' | 'changenow' | 'cryptomus' | 'paygate' | 'volet' | 'binance';

export interface GatewayConfig {
  gateway: PaymentGateway;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  webhookSecret?: string;
  testMode: boolean;
  currencies: string[];
  networks?: string[];
}

// ================================
// Stripe-Specific Types
// ================================

export interface StripeCheckoutMetadata {
  orderId: string;
  userId?: string;
  customerEmail: string;
  [key: string]: string | undefined;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

// ================================
// Crypto Gateway Types (for future)
// ================================

export interface CryptoPaymentParams extends CreatePaymentParams {
  network?: string; // BTC, ETH, TRX, etc.
  cryptocurrency?: string; // BTC, USDT, ETH, etc.
}

export interface CryptoPaymentResponse extends PaymentResponse {
  address: string;
  network: string;
  cryptocurrency: string;
  qrCode?: string;
  minimumAmount?: number;
  maximumAmount?: number;
}
