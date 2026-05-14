/**
 * Unified Payment Service
 * Orchestrates payment processing across all payment gateways
 * Handles payment lifecycle: initiation, verification, completion, refunds
 */

import { PaymentStatus, Prisma } from '@prisma/client'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  WebhookVerificationResult
} from '../types/payment-gateway.types'
import { transformDecimals } from '../utils'
import { decrypt } from '../utils/encryption'
import { validatePaymentRequest, isDuplicatePayment } from '../utils/risk-management'
import { isTelegramTransferProduct } from '../utils/product-type'
import { NotificationService } from './notification.service'
import { OrderService } from './order.services'
import { telegramPremiumService } from './telegram/premium.service'
import { BalanceGatewayService } from './payment-gateways/balance.gateway'
import { NOWPaymentsGatewayService } from './payment-gateways/nowpayments.gateway'
import { StripeGatewayService } from './payment-gateways/stripe.gateway'
import rankService from './rank.service'
import { PayGateProviderService } from './paygate-provider.service'

export class PaymentService {
  private orderService = new OrderService()
  private notificationService = new NotificationService()
  private payGateProviderService = new PayGateProviderService()
  private gatewayInstances: Map<string, IPaymentGateway> = new Map()

  /**
   * Initialize payment gateway instance with decrypted keys from PaymentMethod
   */
  private async getGatewayInstance(
    paymentMethodId: number,
    testMode: boolean = false
  ): Promise<IPaymentGateway> {
    const cacheKey = `${paymentMethodId}-${testMode}`

    if (this.gatewayInstances.has(cacheKey)) {
      return this.gatewayInstances.get(cacheKey)!
    }

    // Fetch payment method from database
    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!paymentMethod) {
      throw new Error(`Payment method not found: ${paymentMethodId}`)
    }

    // Decrypt sensitive fields with error handling
    let apiKey: string | null = null
    let apiSecret: string | null = null
    let webhookSecret: string | null = null
    let merchantId: string | null = null

    try {
      if (paymentMethod.apiKey) {
        apiKey = decrypt(paymentMethod.apiKey)
      }
    } catch (error) {
      console.error(`[PaymentService] Failed to decrypt apiKey for payment method ${paymentMethodId}:`, error)
      throw new Error(`Payment method configuration error: apiKey decryption failed. Please reconfigure the payment method.`)
    }

    try {
      if (paymentMethod.apiSecret) {
        apiSecret = decrypt(paymentMethod.apiSecret)
      }
    } catch (error) {
      console.error(`[PaymentService] Failed to decrypt apiSecret for payment method ${paymentMethodId}:`, error)
      throw new Error(`Payment method configuration error: apiSecret decryption failed. Please reconfigure the payment method.`)
    }

    try {
      if (paymentMethod.webhookSecret) {
        webhookSecret = decrypt(paymentMethod.webhookSecret)
      }
    } catch (error) {
      console.error(`[PaymentService] Failed to decrypt webhookSecret for payment method ${paymentMethodId}:`, error)
      throw new Error(`Payment method configuration error: webhookSecret decryption failed. Please reconfigure the payment method.`)
    }

    try {
      if (paymentMethod.merchantId) {
        merchantId = decrypt(paymentMethod.merchantId)
      }
    } catch (error) {
      console.error(`[PaymentService] Failed to decrypt merchantId for payment method ${paymentMethodId}:`, error)
      throw new Error(`Payment method configuration error: merchantId decryption failed. Please reconfigure the payment method.`)
    }

    let gatewayInstance: IPaymentGateway

    switch (paymentMethod.gateway) {
      case 'balance':
        // Balance gateway doesn't need API keys
        gatewayInstance = new BalanceGatewayService()
        break

      case 'stripe':
        if (!apiKey || !webhookSecret) {
          throw new Error(
            `Stripe payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing required credentials. ` +
            `Please configure apiKey and webhookSecret in the payment method settings.`
          )
        }

        // Validate API Key format - must be a secret key (sk_test_ or sk_live_)
        if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
          throw new Error(
            `Stripe payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) has an invalid API key format. ` +
            `The API Key must be a SECRET key starting with "sk_test_" (test mode) or "sk_live_" (live mode). ` +
            `You cannot use a publishable key (pk_test_ or pk_live_). ` +
            `Please update the API Key in the payment method settings with your Stripe Secret Key.`
          )
        }

        // Validate Webhook Secret format - must start with whsec_
        if (!webhookSecret.startsWith('whsec_')) {
          throw new Error(
            `Stripe payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) has an invalid webhook secret format. ` +
            `The Webhook Secret must start with "whsec_". ` +
            `You can find your webhook secret in Stripe Dashboard → Developers → Webhooks → [Your Webhook] → Signing secret. ` +
            `Please update the Webhook Secret in the payment method settings.`
          )
        }

        gatewayInstance = new StripeGatewayService(apiKey, webhookSecret, testMode)
        break

      case 'nowpayments':
        if (!apiKey || !apiSecret) {
          throw new Error(
            `NOWPayments payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing required credentials. ` +
            `Please configure apiKey and apiSecret (IPN secret) in the payment method settings.`
          )
        }
        gatewayInstance = new NOWPaymentsGatewayService({
          apiKey,
          ipnSecret: apiSecret,
          testMode
        })
        break

      case 'plisio':
        if (!apiKey || !apiSecret) {
          throw new Error(
            `Plisio payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing required credentials. ` +
            `Please configure apiKey and apiSecret (secret key) in the payment method settings.`
          )
        }
        const { PlisioGatewayService } = await import('./payment-gateways/plisio.gateway')
        gatewayInstance = new PlisioGatewayService({
          apiKey,
          secretKey: apiSecret,
          testMode
        })
        break

      case 'cryptomus':
        if (!apiKey || !merchantId) {
          throw new Error(
            `Cryptomus payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing required credentials. ` +
            `Please configure apiKey (Payment API Key) and merchantId (Merchant UUID) in the payment method settings.`
          )
        }
        const { CryptomusGatewayService } = await import('./payment-gateways/cryptomus.gateway')
        gatewayInstance = new CryptomusGatewayService({
          merchantId,
          apiKey,
          testMode
        })
        break


      case 'paygate':
        const envPayGateWalletAddress =
          (process.env.PAYGATE_WALLET_ADDRESS || '').trim() ||
          (process.env.PAYGATE_RECEIVING_WALLET || '').trim()

        const resolvedPayGateWalletAddress = (envPayGateWalletAddress || apiKey || '').trim()

        if (!resolvedPayGateWalletAddress) {
          throw new Error(
            `PayGate.to payment method (ID: ${paymentMethodId}) is missing wallet address. ` +
            `Set API Key in payment settings or configure PAYGATE_WALLET_ADDRESS in environment.`
          )
        }

        if (envPayGateWalletAddress) {
          console.log('[Payment] Using PayGate wallet from environment override')
        }

        const { PayGateGatewayService } = await import('./payment-gateways/paygate.gateway')
        gatewayInstance = new PayGateGatewayService({
          walletAddress: resolvedPayGateWalletAddress,
          testMode
        })
        break

      case 'volet':
        if (!apiKey || !webhookSecret) {
          throw new Error(
            `Volet (cloaked) payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing required credentials. ` +
            `Please configure apiKey (Stripe secret key) and webhookSecret (Stripe webhook secret) in the payment method settings.`
          )
        }

        // Validate API Key format - must be a secret key (sk_test_ or sk_live_)
        if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
          throw new Error(
            `Volet payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) has an invalid API key format. ` +
            `The API Key must be a Stripe SECRET key starting with "sk_test_" (test mode) or "sk_live_" (live mode).`
          )
        }

        // Validate Webhook Secret format - must start with whsec_
        if (!webhookSecret.startsWith('whsec_')) {
          throw new Error(
            `Volet payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) has an invalid webhook secret format. ` +
            `The Webhook Secret must start with "whsec_".`
          )
        }

        // Cloaking secret (apiSecret) - use default if not configured
        // In production, a custom secret should be configured for enhanced security
        const cloakingSecret = apiSecret || `volet-default-secret-${paymentMethodId}-${process.env.NODE_ENV || 'development'}`
        
        if (!apiSecret) {
          console.warn(
            `[Payment] Volet payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is using default cloaking secret. ` +
            `For production, please configure a custom apiSecret (cloaking secret) in the payment method settings for enhanced security.`
          )
        }

        const { VoletGatewayService } = await import('./payment-gateways/volet.gateway')
        gatewayInstance = new VoletGatewayService({
          apiKey,
          webhookSecret,
          cloakingSecret,
          testMode
        })
        break

      case 'binance': {
        // Manual Binance internal transfer:
        // - apiKey: recipient Binance Pay ID (shown to customer)
        // - merchantId: static QR code image URL (optional)

        if (!apiKey) {
          throw new Error(
            `Binance internal transfer payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) is missing Pay ID. ` +
            `Please configure apiKey (Binance Pay ID) in the payment method settings.`
          )
        }

        const payId = apiKey.trim()
        if (!/^\d{5,20}$/.test(payId)) {
          throw new Error(
            `Binance internal transfer payment method (ID: ${paymentMethodId}, Name: ${paymentMethod.name}) has an invalid Pay ID. ` +
            `apiKey must be the numeric Binance Pay ID (e.g. 986642974).`
          )
        }

        const qrCodeUrl = merchantId?.trim() || undefined

        const { BinanceGatewayService } = await import('./payment-gateways/binance.gateway')
        gatewayInstance = new BinanceGatewayService({
          payId,
          qrCodeUrl,
          testMode
        })
        break
      }

      // Future gateways
      case 'changenow':
        throw new Error(`Gateway ${paymentMethod.gateway} not yet implemented`)

      default:
        throw new Error(`Unsupported payment gateway: ${paymentMethod.gateway}`)
    }

    this.gatewayInstances.set(cacheKey, gatewayInstance)
    return gatewayInstance
  }

  async createGatewayPaymentForMethod(
    paymentMethodId: number,
    params: CreatePaymentParams
  ): Promise<{
    paymentMethod: any
    paymentResponse: PaymentResponse
  }> {
    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!paymentMethod || !paymentMethod.isActive) {
      throw new Error('Payment method not available')
    }

    const gateway = await this.getGatewayInstance(paymentMethod.id, paymentMethod.testMode)
    const paymentResponse = await gateway.createPayment(params)

    if (!paymentResponse.success) {
      throw new Error(paymentResponse.error || 'Failed to create payment')
    }

    return { paymentMethod, paymentResponse }
  }

  async getGatewayStatusForMethod(
    paymentMethodId: number,
    gatewayTxnId: string
  ): Promise<{
    paymentMethod: any
    statusResponse: PaymentStatusResponse
  }> {
    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!paymentMethod) {
      throw new Error('Payment method not found')
    }

    const gateway = await this.getGatewayInstance(paymentMethod.id, paymentMethod.testMode)
    const statusResponse = await gateway.getPaymentStatus(gatewayTxnId)

    return { paymentMethod, statusResponse }
  }

  /**
   * Initiate payment for an order
   * @param orderId - Order ID
   * @param paymentMethodId - Payment method ID
   * @param userId - Optional user ID (for authenticated users)
   * @param walletAmount - Optional wallet amount to use (for registered users)
   */
  async initiatePayment(
    orderId: number,
    paymentMethodId: number | undefined,
    userId?: number,
    walletAmount?: number,
    paygateProviderCode?: string
  ) {

    try {
      // Fetch order with details
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          product: true
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      // Verify order ownership (if authenticated user)
      if (userId && order.userId !== userId) {
        throw new Error('Unauthorized: Order does not belong to this user')
      }

      // // Verify product stock availability before payment
      // if (order.product.stockCount < order.quantity) {
      //   throw new Error(
      //     `Insufficient stock for "${order.product.name}". Available: ${order.product.stockCount}, Required: ${order.quantity}`
      //   );
      // }

      // Check if order already has a payment
      const existingPayment = await db.payment.findUnique({
        where: { orderId }
      })

      if (existingPayment && existingPayment.status === 'COMPLETED') {
        throw new Error('Order already paid')
      }

      // Fetch payment method (optional if using wallet)
      let paymentMethod: any = null
      if (paymentMethodId) {
        paymentMethod = await db.paymentMethod.findUnique({
          where: { id: paymentMethodId }
        })

        if (!paymentMethod || !paymentMethod.isActive) {
          throw new Error('Payment method not available')
        }

        // Check minimum amount
        if (order.total.lt(paymentMethod.minAmount)) {
          throw new Error(
            `Minimum payment amount is ${paymentMethod.minAmount.toString()} ${paymentMethod.currencies[0] || 'USD'}`
          )
        }
      }

      // Calculate final amount (with fees and bonus)
      let finalAmount = this.calculateFinalAmount(order.total, paymentMethod)

      // Handle wallet balance usage (for registered users only)
      let walletAmountUsed = 0
      let gatewayAmount = finalAmount

      if (userId && walletAmount && walletAmount > 0) {
        const { BalanceService } = await import('./balance.service')
        const balanceService = new BalanceService()

        // Get user's current balance
        const userBalance = await balanceService.getBalance(userId)

        if (walletAmount > userBalance) {
          throw new Error(
            `Insufficient wallet balance. Available: $${userBalance.toFixed(2)}, Requested: $${walletAmount.toFixed(2)}`
          )
        }

        // Ensure wallet amount doesn't exceed order total
        const maxWalletAmount = Number(finalAmount)
        walletAmountUsed = Math.min(walletAmount, maxWalletAmount)

        // Deduct from wallet
        await balanceService.deductBalance(
          userId,
          walletAmountUsed,
          'DEDUCT',
          `Payment for Order #${order.orderNumber}`,
          { orderId: order.id, meta: { paymentMethodId } }
        )

        // Calculate remaining amount to pay via gateway
        gatewayAmount = finalAmount.sub(walletAmountUsed)

        console.log('[Payment] Wallet balance used', {
          orderId,
          userId,
          walletAmountUsed: walletAmountUsed.toFixed(2),
          remainingAmount: gatewayAmount.toString()
        })
      }

      // If wallet covers full amount, no need for gateway payment
      if (gatewayAmount.lte(0)) {
        // Update order status
        await db.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' }
        })

        // Create payment record (without payment method if wallet-only)
        const paymentData: any = {
          type: 'ORDER',
          order: { connect: { id: orderId } },
          status: 'COMPLETED',
          amount: finalAmount,
          paidAmount: finalAmount,
          refundedAmount: 0,
          gateway: 'balance',
          gatewayTxnId: `wallet-${orderId}-${Date.now()}`,
          gatewayStatus: 'completed',
          paidAt: new Date(),
          meta: {
            walletAmountUsed,
            paymentMethod: paymentMethod?.gateway || 'wallet'
          }
        }

        // Only connect to method if paymentMethodId provided
        if (paymentMethodId && paymentMethod) {
          paymentData.method = { connect: { id: paymentMethodId } }
        }

        const payment = existingPayment
          ? await db.payment.update({
            where: { id: existingPayment.id },
            data: paymentData as Prisma.PaymentUpdateInput
          })
          : await db.payment.create({
            data: paymentData as Prisma.PaymentCreateInput
          })

        // Deliver order accounts
        await this.orderService.deliverOrderAccounts(orderId)

        return {
          success: true,
          payment: transformDecimals(payment),
          redirectUrl: `/user/purchased-items`,
          message: 'Payment completed successfully using wallet balance. Order has been delivered.'
        }
      }

      // If no payment method and wallet doesn't cover full amount, error
      if (!paymentMethodId) {
        throw new Error('Payment method is required when wallet balance does not cover full amount')
      }

      if (paymentMethod && gatewayAmount.lt(paymentMethod.minAmount)) {
        throw new Error(
          `${paymentMethod.name} requires at least ${paymentMethod.minAmount.toString()} ${paymentMethod.currencies[0] || 'USD'} after wallet balance and discounts.`
        )
      }

      // Initialize gateway with decrypted keys
      const gateway = await this.getGatewayInstance(paymentMethod.id, paymentMethod.testMode)

      let paygateProvider: any = null
      if (paymentMethod.gateway === 'paygate' && paygateProviderCode) {
        const providerList = await this.payGateProviderService.listProviders({ includeInactive: true })
        paygateProvider = providerList.providers.find(
          (provider) => provider.code.toLowerCase() === paygateProviderCode.toLowerCase()
        )

        if (!paygateProvider) {
          throw new Error(`Invalid PayGate provider: ${paygateProviderCode}`)
        }

        if (!paygateProvider.isActive) {
          throw new Error(`PayGate provider is disabled: ${paygateProviderCode}`)
        }

        if (
          typeof paygateProvider.maxAmount === 'number' &&
          Number(gatewayAmount) > Number(paygateProvider.maxAmount)
        ) {
          throw new Error(
            `Maximum amount for ${paygateProvider.name} is ${Number(paygateProvider.maxAmount).toFixed(2)} USD`
          )
        }

        if (paygateProvider.type !== 'card') {
          throw new Error('PayGate only supports card checkout for customer payments')
        }
      }

      const paymentResponse: PaymentResponse = await gateway.createPayment({
        orderId: order.id,
        amount: Number(gatewayAmount),
        currency: paymentMethod.currencies[0] || 'USD',
        customerEmail: order.user?.email || order.guestEmail || '',
        customerName: order.user?.firstName || order.customerName || '',
        description: `Payment for Order #${order.orderNumber}${walletAmountUsed > 0 ? ` (Wallet: $${walletAmountUsed.toFixed(2)})` : ''}`,
        metadata: {
          orderId: order.id.toString(),
          userId: order.userId?.toString(),
          productId: order.productId.toString(),
          productType: order.product?.type || undefined, // For product cloaking
          productName: order.product?.name || undefined, // For product cloaking
          walletAmountUsed: walletAmountUsed > 0 ? walletAmountUsed.toString() : undefined,
          networks: paymentMethod.networks || [], // Pass networks for crypto gateways
          paygateProviderCode: paygateProvider?.code || paygateProviderCode || undefined,
          paygateProviderType: paygateProvider?.type || undefined,
          paygateMethod: paygateProvider?.method || undefined
        }
      })

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment')
      }

      // For balance payments, status is already COMPLETED (deduction happened in gateway)
      const isBalancePayment = paymentMethod.gateway === 'balance'
      const paymentStatus: PaymentStatus = isBalancePayment ? 'COMPLETED' : 'PENDING'

      // Create or update payment record in database
      const paymentData: Prisma.PaymentCreateInput | Prisma.PaymentUpdateInput = {
        type: 'ORDER',
        order: { connect: { id: orderId } },
        method: { connect: { id: paymentMethodId } },
        status: paymentStatus,
        amount: finalAmount,
        paidAmount: isBalancePayment ? finalAmount : walletAmountUsed,
        refundedAmount: 0,
        gateway: paymentMethod.gateway,
        gatewayTxnId: paymentResponse.gatewayTxnId,
        gatewayStatus: isBalancePayment ? 'completed' : 'pending',
        meta: {
          ...(paymentResponse.metadata || {}),
          ...(paymentResponse.address && { address: paymentResponse.address }),
          ...(paymentResponse.qrCode && { qrCodeUrl: paymentResponse.qrCode }),
          ...(walletAmountUsed > 0 && { walletAmountUsed })
        },
        ...(isBalancePayment && { paidAt: new Date() })
      }

      const payment = existingPayment
        ? await db.payment.update({
          where: { id: existingPayment.id },
          data: paymentData as Prisma.PaymentUpdateInput
        })
        : await db.payment.create({
          data: paymentData as Prisma.PaymentCreateInput
        })

      console.log('[Payment] Payment initiated', {
        paymentId: payment.id,
        orderId,
        gateway: paymentMethod.gateway,
        amount: finalAmount.toString(),
        status: paymentStatus
      })

      // For balance payments, complete the order immediately
      if (isBalancePayment) {
        // Update order status
        await db.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' }
        })

        // Deliver order accounts (handles stock updates internally based on actual delivery)
        await this.orderService.deliverOrderAccounts(orderId)

        console.log('[Payment] Balance payment completed instantly, order fulfilled', {
          orderId,
          paymentId: payment.id
        })

        return {
          success: true,
          payment: transformDecimals(payment),
          redirectUrl: `/user/purchased-items`,
          message: 'Payment completed successfully. Order has been delivered.'
        }
      }



      // Build response - ensure address and qrCode are included
      const responseData = {
        success: true,
        payment: transformDecimals(payment),
        paymentUrl: paymentResponse.paymentUrl || undefined,
        qrCode: paymentResponse.qrCode || undefined,
        address: paymentResponse.address || undefined,
        expiresAt: paymentResponse.expiresAt || undefined
      }

      // Debug log for Binance payments
      if (paymentMethod.gateway === 'binance') {
        console.log('[Payment] Returning Binance response:', {
          hasAddress: Boolean(responseData.address),
          address: responseData.address,
          hasQrCode: Boolean(responseData.qrCode),
          qrCode: responseData.qrCode
        })
      }

      return responseData
    } catch (error: any) {
      // } catch (error: any) {
      console.error('[Payment] Payment initiation failed', {
        orderId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Initiate payment for a subscription (purchase or renewal)
   */
  async initiateSubscriptionPayment(
    subscriptionPaymentId: number,
    gateway: string,
    userId: number,
    type: 'SUBSCRIPTION_PURCHASE' | 'SUBSCRIPTION_RENEWAL'
  ) {
    try {
      // Fetch subscription payment with details
      const subscriptionPayment = await db.subscriptionPayment.findUnique({
        where: { id: subscriptionPaymentId },
        include: {
          user: true,
          subscriptionPackage: true
        }
      })

      if (!subscriptionPayment) {
        throw new Error('Subscription payment not found')
      }

      // Verify ownership
      if (subscriptionPayment.userId !== userId) {
        throw new Error('Unauthorized: Subscription payment does not belong to this user')
      }

      // Fetch payment method by gateway name
      const paymentMethod = await db.paymentMethod.findFirst({
        where: { gateway }
      })

      if (!paymentMethod || !paymentMethod.isActive) {
        throw new Error('Payment method not available')
      }

      // Check minimum amount
      if (subscriptionPayment.amount.lt(paymentMethod.minAmount)) {
        throw new Error(
          `Minimum payment amount is ${paymentMethod.minAmount.toString()} ${paymentMethod.currencies[0] || 'USD'}`
        )
      }

      // Calculate final amount (with fees and bonus)
      const finalAmount = this.calculateFinalAmount(subscriptionPayment.amount, paymentMethod)

      // Initialize gateway instance with decrypted keys
      const gatewayInstance = await this.getGatewayInstance(
        paymentMethod.id,
        paymentMethod.testMode
      )

      // Create payment in gateway
      const paymentResponse: PaymentResponse = await gatewayInstance.createPayment({
        orderId: subscriptionPaymentId, // Use subscriptionPaymentId as reference
        amount: Number(finalAmount),
        currency: paymentMethod.currencies[0] || 'USD',
        customerEmail: subscriptionPayment.user.email,
        customerName: subscriptionPayment.user.firstName || subscriptionPayment.user.email,
        description: `${type === 'SUBSCRIPTION_PURCHASE' ? 'Purchase' : 'Renewal'} - ${subscriptionPayment.subscriptionPackage.name}`,
        metadata: {
          subscriptionPaymentId: subscriptionPaymentId.toString(),
          userId: userId.toString(),
          subscriptionPackageId: subscriptionPayment.subscriptionPackageId.toString(),
          type
        }
      })

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment')
      }

      // For balance payments, status is already COMPLETED
      const isBalancePayment = paymentMethod.gateway === 'balance'
      const paymentStatus: PaymentStatus = isBalancePayment ? 'COMPLETED' : 'PENDING'

      // Create payment record (no orderId for subscription payments)
      const payment = await db.payment.create({
        data: {
          type,
          method: { connect: { id: paymentMethod.id } },
          status: paymentStatus,
          amount: finalAmount,
          paidAmount: isBalancePayment ? finalAmount : 0,
          refundedAmount: 0,
          gateway: paymentMethod.gateway,
          gatewayTxnId: paymentResponse.gatewayTxnId,
          gatewayStatus: isBalancePayment ? 'completed' : 'pending',
          meta: {
            ...paymentResponse.metadata,
            subscriptionPaymentId,
            type
          },
          ...(isBalancePayment && { paidAt: new Date() })
        }
      })

      console.log('[Payment] Subscription payment initiated', {
        paymentId: payment.id,
        subscriptionPaymentId,
        gateway: paymentMethod.gateway,
        amount: finalAmount.toString(),
        status: paymentStatus,
        type
      })

      // For balance payments, process subscription immediately
      if (isBalancePayment) {
        // Import SubscriptionService dynamically to avoid circular dependency
        const { subscriptionService } = await import('./subscription.service')

        if (type === 'SUBSCRIPTION_PURCHASE') {
          await subscriptionService.processSuccessfulPayment(
            subscriptionPaymentId,
            paymentResponse.gatewayTxnId
          )
        } else {
          await subscriptionService.processSuccessfulRenewal(
            subscriptionPaymentId,
            paymentResponse.gatewayTxnId
          )
        }

        console.log('[Payment] Balance payment completed instantly, subscription activated', {
          subscriptionPaymentId,
          paymentId: payment.id
        })

        return {
          success: true,
          payment: transformDecimals(payment),
          redirectUrl: `/customer/subscriptions`,
          message:
            type === 'SUBSCRIPTION_PURCHASE'
              ? 'Subscription activated successfully.'
              : 'Subscription renewed successfully.'
        }
      }

      return {
        success: true,
        payment: transformDecimals(payment),
        paymentUrl: paymentResponse.paymentUrl,
        qrCode: paymentResponse.qrCode,
        address: paymentResponse.address,
        expiresAt: paymentResponse.expiresAt
      }
    } catch (error: any) {
      console.error('[Payment] Subscription payment initiation failed', {
        subscriptionPaymentId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Handle webhook from payment gateway
   */
  async handleWebhook(gateway: string, payload: any, signature: string) {
    try {
      // Get payment method config for this gateway.
      // Prefer active method, but fall back to any method so pending webhooks
      // can still be verified/processed if admin deactivated the gateway.
      let paymentMethod = await db.paymentMethod.findFirst({
        where: { gateway, isActive: true },
        orderBy: { id: 'asc' }
      })

      if (!paymentMethod) {
        paymentMethod = await db.paymentMethod.findFirst({
          where: { gateway },
          orderBy: { id: 'asc' }
        })
      }

      if (!paymentMethod) {
        throw new Error(`No active payment method found for gateway: ${gateway}`)
      }

      // Initialize gateway with decrypted keys
      const gatewayInstance = await this.getGatewayInstance(
        paymentMethod.id,
        paymentMethod.testMode
      )

      // Verify webhook
      const verification: WebhookVerificationResult = await gatewayInstance.verifyWebhook(
        payload,
        signature
      )

      if (!verification.verified) {
        throw new Error('Webhook verification failed')
      }

      // If no payment data extracted (unsupported event type), skip gracefully
      if (!verification.paymentData) {
        console.log('[Payment] Event type not handled, skipping', {
          gateway,
          eventType: verification.eventType
        })
        return { success: false, message: 'Event type not handled' }
      }

      const { paymentData } = verification

      // Find payment by gatewayTxnId
        let payment = await db.payment.findFirst({
          where: { gatewayTxnId: paymentData.gatewayTxnId },
          include: { 
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true
                  }
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        })


      // For NOWPayments hosted invoices, the initial record stores an invoice reference.
      // When the IPN arrives, reconcile by order/subscription reference and update to the real payment_id.
      if (!payment && gateway === 'nowpayments') {
        const referenceId = paymentData.orderId ? String(paymentData.orderId) : null
        const purchaseId = paymentData.metadata?.purchaseId ? String(paymentData.metadata.purchaseId) : null

        const pendingPayments = await db.payment.findMany({
          where: {
            gateway: 'nowpayments',
            status: 'PENDING'
          },
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true
                  }
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        })

        const foundPayment =
          pendingPayments.find((p) => {
            const meta = (p.meta as any) || {}
            return (
              (referenceId && (String(p.orderId || '') === referenceId || String(meta.subscriptionPaymentId || '') === referenceId)) ||
              (purchaseId && String(meta.purchaseId || '') === purchaseId)
            )
          }) || null

        if (foundPayment) {
          console.log('[Payment] NOWPayments: matched hosted invoice webhook to pending payment', {
            paymentId: foundPayment.id,
            oldGatewayTxnId: foundPayment.gatewayTxnId,
            newGatewayTxnId: paymentData.gatewayTxnId,
            referenceId
          })

          await db.payment.update({
            where: { id: foundPayment.id },
            data: { gatewayTxnId: paymentData.gatewayTxnId }
          })

          payment = await db.payment.findUnique({
            where: { id: foundPayment.id },
            include: {
              order: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true
                    }
                  },
                  product: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          })
        }
      }

      // For Volet (cloaked), if not found by cloaked ID, try lookup by Payment Intent ID or Stripe session ID from metadata
      if (!payment && gateway === 'volet') {
        const paymentIntentId = paymentData.metadata?.paymentIntentId
        const stripeSessionId = paymentData.metadata?.stripeSessionId
        
        console.log('[Payment] Volet: Payment not found by cloaked ID, trying Payment Intent ID or Session ID lookup', {
          cloakedTxnId: paymentData.gatewayTxnId,
          paymentIntentId,
          stripeSessionId
        })

        // Search for pending Volet payments
        const payments = await db.payment.findMany({
          where: {
            gateway: 'volet',
            status: 'PENDING'
          },
          include: { order: true }
        })

        // Find payment by Payment Intent ID (stored in gatewayTxnId) or by Payment Intent ID in metadata
        const foundPayment = payments.find(p => {
          // Check if gatewayTxnId matches the Payment Intent ID
          if (paymentIntentId && p.gatewayTxnId === paymentIntentId) {
            return true
          }
          // Check metadata for Payment Intent ID
          const meta = p.meta as any
          if (paymentIntentId && meta?.paymentIntentId === paymentIntentId) {
            return true
          }
          // Check metadata for Stripe session ID
          if (stripeSessionId && meta?.stripeSessionId === stripeSessionId) {
            return true
          }
          return false
        }) || null

        if (foundPayment) {
          console.log('[Payment] Volet: Found payment by Payment Intent ID or Session ID, updating gatewayTxnId', {
            paymentId: foundPayment.id,
            oldGatewayTxnId: foundPayment.gatewayTxnId,
            newGatewayTxnId: paymentData.gatewayTxnId
          })
          // Update the payment with the correct cloaked ID for consistency
          await db.payment.update({
            where: { id: foundPayment.id },
            data: { gatewayTxnId: paymentData.gatewayTxnId }
          })
          // Reload with order, user, and product (including all fields needed for email)
          payment = await db.payment.findUnique({
            where: { id: foundPayment.id },
            include: { 
              order: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true
                    }
                  },
                  product: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          })
        }
      }


        if (!payment) {
          const { BalanceService } = await import('./balance.service')
          const balanceService = new BalanceService()
          const topupResult = await balanceService.processGatewayTopupWebhook(gateway, paymentData)

          if (topupResult.handled) {
            console.log('[Payment] Wallet topup webhook processed', {
              gateway,
              gatewayTxnId: paymentData.gatewayTxnId,
              topupRequestId: topupResult.topupRequestId || paymentData.orderId || null
            })
            return { success: true, message: topupResult.message || 'Wallet topup processed' }
          }

          console.warn('[Payment] Payment not found for webhook', {
            gatewayTxnId: paymentData.gatewayTxnId,
            gateway,
          eventType: verification.eventType
        })
        // Return success=false but don't throw - this is expected for some events
        // like payment_intent.created that happen before we save the payment
        return { success: false, message: 'Payment not found' }
      }

      const alreadyTerminal = ['COMPLETED', 'PARTIAL', 'REFUNDED'].includes(String(payment.status))
      const incomingTerminal = paymentData.status === 'COMPLETED' || paymentData.status === 'PARTIAL'

      // Idempotency guard: do not run fulfillment side effects multiple times.
      if (alreadyTerminal && incomingTerminal) {
        console.log('[Payment] Webhook already processed, skipping duplicate side-effects', {
          paymentId: payment.id,
          currentStatus: payment.status,
          incomingStatus: paymentData.status,
          gatewayTxnId: paymentData.gatewayTxnId
        })
        return { success: true, message: 'Already processed' }
      }

      // Update payment status
      await this.updatePaymentStatus(
        payment.id,
        paymentData.status,
        paymentData.paidAmount || paymentData.amount,
        paymentData.metadata
      )

      // If payment completed or partial, process accordingly
      if (paymentData.status === 'COMPLETED' || paymentData.status === 'PARTIAL') {
        // Check payment type to route correctly
        if (payment.type === 'SUBSCRIPTION_PURCHASE' || payment.type === 'SUBSCRIPTION_RENEWAL') {
          // Subscription payment
          const meta = payment.meta as any
          const subscriptionPaymentId = meta?.subscriptionPaymentId
            ? parseInt(meta.subscriptionPaymentId)
            : null

          if (!subscriptionPaymentId) {
            console.error('[Payment] Subscription payment missing subscriptionPaymentId in meta', {
              paymentId: payment.id,
              type: payment.type
            })
            throw new Error('Subscription payment missing required metadata')
          }

          await this.processCompletedSubscriptionPayment(
            subscriptionPaymentId,
            payment.type,
            paymentData.gatewayTxnId
          )
        } else if (payment.type === 'ORDER') {
          // Regular order payment
          if (!payment.orderId || !payment.order) {
            console.error('[Payment] Order payment missing order data', {
              paymentId: payment.id,
              orderId: payment.orderId
            })
            throw new Error('Order payment missing required order data')
          }
          await this.processCompletedPayment(payment.orderId, payment.order)
        } else {
          console.warn('[Payment] Unknown payment type', {
            paymentId: payment.id,
            type: payment.type
          })
        }
      }

      console.log('[Payment] Webhook processed successfully', {
        paymentId: payment.id,
        type: payment.type,
        orderId: payment.orderId || 'N/A',
        status: paymentData.status,
        eventType: verification.eventType
      })

      return { success: true, message: 'Webhook processed' }
    } catch (error: any) {
      console.error('[Payment] Webhook processing failed', {
        gateway,
        error: error.message
      })
      // Re-throw error for actual failures (signature verification, etc)
      throw error
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: number) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        method: true,
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    // Initialize gateway with decrypted keys
    const gateway = await this.getGatewayInstance(payment.method.id, payment.method.testMode)

    // Hosted NOWPayments invoices are reconciled via webhook after the user completes the
    // provider checkout, so there is no payment_id to poll until NOWPayments creates one.
    if (payment.gateway === 'nowpayments' && !/^\d+$/.test(payment.gatewayTxnId || '')) {
      return transformDecimals(payment)
    }

    // Get payment status from gateway
    const statusResponse = await gateway.getPaymentStatus(payment.gatewayTxnId!)

    // Update payment status if changed
    if (statusResponse.status !== payment.status) {
      await this.updatePaymentStatus(
        payment.id,
        statusResponse.status,
        statusResponse.paidAmount,
        statusResponse.metadata
      )

      // Process order if payment completed
      if (statusResponse.status === 'COMPLETED' || statusResponse.status === 'PARTIAL') {
        // Check payment type to route correctly
        if (payment.type === 'SUBSCRIPTION_PURCHASE' || payment.type === 'SUBSCRIPTION_RENEWAL') {
          // Subscription payment
          const meta = payment.meta as any
          const subscriptionPaymentId = meta?.subscriptionPaymentId
            ? parseInt(meta.subscriptionPaymentId)
            : null

          if (subscriptionPaymentId) {
            await this.processCompletedSubscriptionPayment(
              subscriptionPaymentId,
              payment.type,
              payment.gatewayTxnId || undefined
            )
          }
        } else if (payment.type === 'ORDER' && payment.orderId && payment.order) {
          // Regular order payment
          await this.processCompletedPayment(payment.orderId, payment.order)
        }
      }
    }

    return transformDecimals(payment)
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: number) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        method: true,
        order: {
          include: {
            product: true
          }
        }
      }
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    return transformDecimals(payment)
  }

  /**
   * Get payments for a user
   */
  async getUserPayments(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where: {
          order: { userId }
        },
        include: {
          method: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.payment.count({
        where: {
          order: { userId }
        }
      })
    ])

    return {
      payments: transformDecimals(payments),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Process refund
   */
  async processRefund(paymentId: number, amount?: number) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { method: true }
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'COMPLETED') {
      throw new Error('Only completed payments can be refunded')
    }

    // Initialize gateway with decrypted keys
    const gateway = await this.getGatewayInstance(payment.method.id, payment.method.testMode)

    // Process refund
    const refundResponse = await gateway.refundPayment(
      payment.gatewayTxnId!,
      amount ? Number(amount) : undefined
    )

    if (!refundResponse.success) {
      throw new Error(refundResponse.error || 'Refund failed')
    }

    // Update payment status
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAmount: refundResponse.amount,
        meta: {
          ...(payment.meta as any),
          refund: refundResponse.metadata
        }
      }
    })

    // Update order status (only if this is an order payment)
    if (payment.orderId) {
      await db.order.update({
        where: { id: payment.orderId },
        data: { status: 'REFUNDED' }
      })
    }

    console.log('[Payment] Refund processed', {
      paymentId,
      amount: refundResponse.amount,
      orderId: payment.orderId || 'N/A (subscription)'
    })

    return refundResponse
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Calculate final payment amount with gateway fees.
   * Payment bonuses are wallet credit perks, not discounts from the payable amount.
   */
  private calculateFinalAmount(orderTotal: Prisma.Decimal, paymentMethod: any): Prisma.Decimal {
    let amount = new Prisma.Decimal(orderTotal.toString())

    // If no payment method (wallet-only payment), return original amount
    if (!paymentMethod) {
      return amount
    }

    // Apply payment method fee
    if (paymentMethod.feeType && paymentMethod.feeValue) {
      if (paymentMethod.feeType === 'PERCENTAGE') {
        const fee = amount.mul(paymentMethod.feeValue).div(100)
        amount = amount.add(fee)
      } else if (paymentMethod.feeType === 'FIXED') {
        amount = amount.add(paymentMethod.feeValue)
      }
    }

    return amount
  }

  /**
   * Calculate payment breakdown (bonus/fee) for display
   * Returns the breakdown without modifying the order
   */
  async calculatePaymentBreakdown(orderTotal: number, paymentMethodId: number) {
    const method = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!method) {
      throw new Error('Payment method not found')
    }

    const baseAmount = new Prisma.Decimal(orderTotal)
    let feeAmount = 0
    let bonusAmount = 0
    let finalAmount = baseAmount

    // Calculate fee
    if (method.feeType && method.feeValue) {
      if (method.feeType === 'PERCENTAGE') {
        feeAmount = Number(baseAmount.mul(method.feeValue).div(100))
        finalAmount = finalAmount.add(feeAmount)
      } else if (method.feeType === 'FIXED') {
        feeAmount = Number(method.feeValue)
        finalAmount = finalAmount.add(feeAmount)
      }
    }

    // Calculate wallet bonus separately. It is extra wallet credit, not a payment discount.
    if (method.bonus) {
      const bonusThreshold = new Prisma.Decimal(method.bonusThreshold || 0)
      if (baseAmount.gte(bonusThreshold)) {
        bonusAmount = Number(baseAmount.mul(method.bonus).div(100))
      }
    }

    const walletCreditAmount = Number(baseAmount.add(bonusAmount))

    return {
      baseAmount: Number(baseAmount),
      feeAmount,
      bonusAmount,
      finalAmount: Number(finalAmount),
      walletCreditAmount,
      hasFee: feeAmount > 0,
      hasBonus: bonusAmount > 0,
      feeType: method.feeType,
      feeValue: method.feeValue ? Number(method.feeValue) : null,
      bonus: method.bonus ? Number(method.bonus) : null,
      bonusThreshold: method.bonusThreshold !== null && method.bonusThreshold !== undefined
        ? Number(method.bonusThreshold)
        : null
    }
  }

  /**
   * Update payment status in database
   */
  private async updatePaymentStatus(
    paymentId: number,
    status: PaymentStatus,
    paidAmount: number,
    metadata?: any
  ) {
    const existing = await db.payment.findUnique({
      where: { id: paymentId },
      select: { meta: true }
    })

    const existingMeta =
      existing?.meta && typeof existing.meta === 'object' && !Array.isArray(existing.meta)
        ? (existing.meta as Record<string, any>)
        : {}
    const nextMeta =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...existingMeta, ...metadata }
        : existingMeta

    return await db.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paidAmount,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
        failedAt: status === 'FAILED' ? new Date() : undefined,
        gatewayStatus: metadata?.gatewayStatus || status.toLowerCase(),
        meta: nextMeta
      }
    })
  }

  /**
   * Send guest order access token email
   * Includes link for guest to access their order without login
   */
  private async sendGuestOrderAccessEmail(order: any, accessUrl: string, accessToken: string) {
    try {
      const email = order.guestEmail
      if (!email) return

      const productName = order.items?.[0]?.product?.name || 'Your Product'
      const orderNumber = order.orderNumber
      
      const emailSubject = `Your Order Access - ${orderNumber}`
      
      const emailHTML = `
        <h2>Thank you for your purchase!</h2>
        <p>Order Number: <strong>${orderNumber}</strong></p>
        <p>Product: <strong>${productName}</strong></p>
        <p>Total: <strong>${order.totalAmount}</strong></p>
        <br/>
        <h3>Access Your Order</h3>
        <p>Click the link below to view and access your order details:</p>
        <p><a href="${accessUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Order</a></p>
        <p>Or copy this link: <code>${accessUrl}</code></p>
        <br/>
        <p>Your access code: <code>${accessToken}</code></p>
        <p>This token will remain valid for 30 days.</p>
      `

      const emailText = `
Thank you for your purchase!
Order Number: ${orderNumber}
Product: ${productName}
Total: ${order.totalAmount}

Access Your Order:
${accessUrl}

Your access code: ${accessToken}
This token will remain valid for 30 days.
      `

      await sendEmail(email, emailText, emailSubject, emailHTML)
      
      console.log('[Payment] Guest order access email sent', {
        orderId: order.id,
        email,
        orderNumber
      })
    } catch (error) {
      console.error('[Payment] Failed to send guest order access email', {
        orderId: order.id,
        email: order.guestEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process completed payment and trigger order fulfillment
   * This method should only be called for ORDER type payments
   */
  private async processCompletedPayment(orderId: number, order: any) {
    try {
      const payment = await db.payment.findUnique({
        where: { orderId }
      })

      if (!payment) {
        throw new Error('Payment not found')
      }

      // Regular order payment processing
      const orderTotal = order.total
      const paidAmount = payment.paidAmount
      const shortage = orderTotal.sub(paidAmount)
      const shortagePercent = shortage.div(orderTotal).mul(100)

      // Check if shortage is within acceptable range (≤10%)
      if (shortagePercent.gt(10)) {
        console.warn('[Payment] Payment shortage exceeds 10%', {
          orderId,
          shortage: shortage.toString(),
          shortagePercent: shortagePercent.toString()
        })
        return
      }

      // Determine order status
      let orderStatus = 'COMPLETED'
      if (shortagePercent.gt(0) && shortagePercent.lte(10)) {
        orderStatus = 'PARTIAL'
        console.log('[Payment] Partial payment accepted', {
          orderId,
          shortage: shortage.toString(),
          shortagePercent: shortagePercent.toString()
        })
      }

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: { status: orderStatus as any }
      })

      // Stock is decremented by deliverOrderAccounts (per actual accounts assigned).
      // Do NOT decrement stock here to avoid a double-deduction.

      // Send order completion email notification
      if (orderStatus === 'COMPLETED') {
        try {
          const userEmail = order.user?.email || order.guestEmail
          if (userEmail) {
            const emailSubject = `✅ Order Completed - ${order.orderNumber}`
            const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

🎉 Your order has been completed successfully!

📋 ORDER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: ${order.orderNumber}
Product: ${order.product.name}
Quantity: ${order.quantity}
Total Paid: $${paidAmount.toString()}
Status: COMPLETED
Payment Date: ${new Date().toLocaleDateString()}

${(order.product.type === 'SERVICE' && order.product.platform !== 'TELEGRAM') || order.product.type === 'PREMIUM' || isTelegramTransferProduct(order.product)
  ? 'Your service will be processed and delivered shortly. You will receive another email once it\'s ready.' 
  : 'Your order is being processed and will be delivered shortly. You will receive another email with your account credentials once delivery is complete.'}

📊 VIEW YOUR ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can track your order status anytime:
${order.userId 
  ? '• Dashboard: https://uhqaccounts.com/user/purchased-items' 
  : `• Guest Access: https://uhqaccounts.com/guest/access
• Order Number: ${order.orderNumber}
• Email: ${userEmail}`}

Thank you for your purchase!

Best regards,
UHQ Accounts Team

---
Support: support@uhqaccounts.com
            `.trim()

            await sendEmail(userEmail, emailText, emailSubject)
            console.log('[Payment] Order completion email sent', {
              orderId,
              orderNumber: order.orderNumber,
              email: userEmail
            })

            // Send payment receipt email
            try {
              const { sendPaymentReceiptEmail } = await import('../utils/email-helpers')
              await sendPaymentReceiptEmail(userEmail, {
                orderNumber: order.orderNumber,
                amount: paidAmount.toNumber(),
                paymentMethod: payment.gateway || 'Unknown',
                transactionId: payment.gatewayTxnId || undefined,
                userName: order.user?.firstName || order.customerName || undefined,
                orderDate: new Date().toLocaleDateString()
              })
            } catch (receiptError) {
              console.error('[Payment] Failed to send payment receipt email', {
                orderId,
                error: receiptError instanceof Error ? receiptError.message : 'Unknown error'
              })
              // Don't fail payment processing if receipt email fails
            }
          }
        } catch (emailError) {
          console.error('[Payment] Failed to send order completion email', {
            orderId,
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          // Don't fail payment processing if email fails
        }
      }

      // Update user statistics if authenticated user
      if (order.userId) {
        await db.user.update({
          where: { id: order.userId },
          data: {
            totalSpent: { increment: paidAmount.toNumber() },
            totalOrders: { increment: 1 }
          }
        })

        // Check and update user rank based on new totalSpent
        const updatedRank = await rankService.updateUserRank(order.userId)
        if (updatedRank) {
          // Rank upgraded! Send notification
          console.log('[Payment] User rank upgraded', {
            userId: order.userId,
            newRank: updatedRank.name,
            orderId
          })

          // TODO: Send rank upgrade notification
          // await notificationService.sendRankUpgrade(order.userId, updatedRank)
        }

        // Affiliate: credit referrer when referred user completes first order
        try {
          const orderingUser = await db.user.findUnique({
            where: { id: order.userId },
            select: { referredById: true }
          })
          if (orderingUser?.referredById) {
            const setting = await db.settings.findUnique({
              where: { key: 'affiliate_settings' }
            })
            const pct = Number((setting?.value as any)?.affiliateCommissionPct ?? 10)
            const commission = (paidAmount.toNumber() * pct) / 100
            if (commission > 0) {
              await db.user.update({
                where: { id: orderingUser.referredById },
                data: { referralEarnings: { increment: commission } }
              })
              console.log('[Payment] Referral commission credited', {
                referrerId: orderingUser.referredById,
                orderId,
                commission,
                pct
              })
            }
          }
        } catch (refErr) {
          console.error('[Payment] Failed to credit referral commission', {
            orderId,
            error: refErr instanceof Error ? refErr.message : 'Unknown error'
          })
        }
      }

      // Increment coupon usage count if coupon was used
      const orderMeta = order.meta as any
      const isGroupedSecondary = orderMeta?.cartGroup && orderMeta.cartGroup.isPrimary === false
      if (orderMeta?.coupon?.code && !isGroupedSecondary) {
        try {
          const coupon = await db.coupon.findUnique({
            where: { code: orderMeta.coupon.code }
          })

          if (coupon) {
            await db.coupon.update({
              where: { id: coupon.id },
              data: { usageCount: { increment: 1 } }
            })

            console.log('[Payment] Coupon usage incremented', {
              couponCode: orderMeta.coupon.code,
              orderId
            })
          }
        } catch (error) {
          // Don't fail payment processing if coupon update fails
          console.error('[Payment] Failed to increment coupon usage', {
            orderId,
            couponCode: orderMeta.coupon.code,
            error
          })
        }
      }

      const multiItemMeta = order.meta as any
      const childOrderIds = Array.isArray(multiItemMeta?.multiItemOrder?.childOrderIds)
        ? multiItemMeta.multiItemOrder.childOrderIds
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isInteger(value) && value > 0)
        : []

      if (multiItemMeta?.multiItemOrder?.isParent === true && childOrderIds.length > 0) {
        const childOrders = await db.order.findMany({
          where: {
            id: { in: childOrderIds }
          },
          include: {
            user: true,
            product: true
          }
        })

        const nonPremiumChildOrders = childOrders.filter(
          (childOrder) =>
            !['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(childOrder.product.type)
        )
        const premiumChildOrders = childOrders.filter((childOrder) =>
          ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(childOrder.product.type)
        )

        for (const childOrder of [...nonPremiumChildOrders, ...premiumChildOrders]) {
          await db.order.update({
            where: { id: childOrder.id },
            data: { status: orderStatus as any }
          })

          await this.adjustNonAccountProductInventory(childOrder)

          const isPremiumChildOrder = ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(
            childOrder.product.type
          )

          if (isPremiumChildOrder) {
            try {
              const premiumResult = await telegramPremiumService.processPremiumOrder(childOrder.id)

              if (premiumResult.success) {
                console.log('[Payment] Premium child order activated successfully', {
                  parentOrderId: orderId,
                  childOrderId: childOrder.id,
                  transactionId: premiumResult.result?.transactionId
                })
              } else {
                console.error('[Payment] Failed to activate premium child order', {
                  parentOrderId: orderId,
                  childOrderId: childOrder.id,
                  error: premiumResult.message
                })
              }
            } catch (error: any) {
              console.error('[Payment] Error processing premium child order', {
                parentOrderId: orderId,
                childOrderId: childOrder.id,
                error: error.message
              })
            }
          } else {
            await this.orderService.deliverOrderAccounts(childOrder.id)
          }
        }

        const refreshedChildOrders = await db.order.findMany({
          where: {
            id: { in: childOrderIds }
          },
          select: {
            deliveredAt: true,
            deliveryStatus: true,
            quantityDelivered: true,
            quantityPending: true
          }
        })

        const quantityDelivered = refreshedChildOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityDelivered || 0),
          0
        )
        const quantityPending = refreshedChildOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityPending || 0),
          0
        )
        const deliveryStatuses = new Set(refreshedChildOrders.map((childOrder) => childOrder.deliveryStatus))

        await db.order.update({
          where: { id: orderId },
          data: {
            deliveryStatus: deliveryStatuses.has('PARTIAL')
              ? 'PARTIAL'
              : deliveryStatuses.has('PROCESSING')
                ? 'PROCESSING'
                : deliveryStatuses.has('DELIVERED')
                  ? 'DELIVERED'
                  : 'PENDING',
            deliveredAt:
              refreshedChildOrders
                .map((childOrder) => childOrder.deliveredAt)
                .filter(Boolean)
                .sort((left, right) => right!.getTime() - left!.getTime())[0] || null,
            quantityDelivered,
            quantityPending
          }
        })
      } else {
        // Products without account-backed inventory (premium, transfer/manual services, one-time files, etc.)
        // still need stock/sales counters updated when payment completes.
        await this.adjustNonAccountProductInventory(order)

        const isPremiumOrder = ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(
          order.product.type
        )

        if (isPremiumOrder) {
          try {
            // Process premium order activation
            const premiumResult = await telegramPremiumService.processPremiumOrder(orderId)

            if (premiumResult.success) {
              console.log('[Payment] Premium order activated successfully', {
                orderId,
                transactionId: premiumResult.result?.transactionId
              })
            } else {
              console.error('[Payment] Failed to activate premium order', {
                orderId,
                error: premiumResult.message
              })
              // Don't fail the payment, but log the error
            }
          } catch (error: any) {
            console.error('[Payment] Error processing premium order', {
              orderId,
              error: error.message
            })
            // Don't fail the payment if premium activation fails
          }
        } else {
          // Trigger order delivery for non-premium orders (this will handle stock updates internally based on actual delivery)
          await this.orderService.deliverOrderAccounts(orderId)
        }
      }

      // For guest orders, generate and send access token
      if (!order.userId && order.guestEmail) {
        try {
          const { guestAccessService } = await import('./guest-access.service')
          
          // Generate access token with 30-day expiration
          const accessToken = await guestAccessService.generateAccessToken(
            orderId,
            order.guestEmail,
            24 * 30 // 30 days
          )

          console.log('[Payment] Guest access token generated', {
            orderId,
            email: order.guestEmail,
            token: accessToken.substring(0, 8) + '***'
          })

          // Send email with access link to guest - Points to guest orders page
          const accessUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/orders?token=${accessToken}&email=${encodeURIComponent(order.guestEmail)}`
          
          await this.sendGuestOrderAccessEmail(order, accessUrl, accessToken)
        } catch (error) {
          console.error('[Payment] Failed to generate/send guest access token', {
            orderId,
            email: order.guestEmail,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          // Don't fail the payment if token generation fails
        }
      }

      console.log('[Payment] Order processed and delivered', {
        orderId,
        status: orderStatus,
        isGuest: !order.userId
      })

      // Notify admins about the product purchase
      try {
        const customerName = order.user
          ? order.user.firstName || order.user.email
          : order.guestEmail || 'Guest'
        const customerEmail = order.user?.email || order.guestEmail || ''

        await this.notificationService.notifyAdminsProductPurchase({
          customerName,
          customerEmail,
          orderNumber: order.orderNumber,
          productName: order.product.name,
          quantity: order.quantity,
          total: order.total.toNumber(),
          orderId: order.id
        })
        console.log('[Payment] Admin notification sent for product purchase', {
          orderId,
          orderNumber: order.orderNumber
        })
      } catch (error) {
        console.error('[Payment] Failed to send admin notification', {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } catch (error: any) {
      console.error('[Payment] Failed to process completed payment', {
        orderId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update stock/sales counters for products that are not backed by Account rows.
   * Account-backed products already decrement stock during delivery assignment.
   */
  private async adjustNonAccountProductInventory(order: any) {
    if (!order?.id || !order?.productId || !order?.quantity) {
      return
    }

    if (order.product?.type === 'FILE') {
      return
    }

    const orderMeta =
      order.meta && typeof order.meta === 'object' && !Array.isArray(order.meta)
        ? (order.meta as Record<string, any>)
        : {}

    if (orderMeta.inventoryAdjustedAt) {
      return
    }

    const accountBackedStockCount = await db.account.count({
      where: { productId: order.productId }
    })

    // Account-backed products manage stock from delivery assignment.
    if (accountBackedStockCount > 0) {
      return
    }

    await db.$transaction([
      db.product.update({
        where: { id: order.productId },
        data: {
          stockCount: { decrement: order.quantity },
          soldCount: { increment: order.quantity }
        }
      }),
      db.order.update({
        where: { id: order.id },
        data: {
          meta: {
            ...orderMeta,
            inventoryAdjustedAt: new Date().toISOString()
          }
        }
      })
    ])

    console.log('[Payment] Manual inventory adjusted for completed order', {
      orderId: order.id,
      productId: order.productId,
      quantity: order.quantity,
      productType: order.product?.type,
      platform: order.product?.platform || 'N/A'
    })
  }

  /**
   * Process completed subscription payment
   */
  private async processCompletedSubscriptionPayment(
    subscriptionPaymentId: number,
    type: 'SUBSCRIPTION_PURCHASE' | 'SUBSCRIPTION_RENEWAL',
    gatewayTxnId?: string
  ) {
    try {
      console.log('[Payment] Processing subscription payment', {
        subscriptionPaymentId,
        type,
        gatewayTxnId
      })

      // Import SubscriptionService dynamically to avoid circular dependency
      const { subscriptionService } = await import('./subscription.service')

      if (type === 'SUBSCRIPTION_PURCHASE') {
        await subscriptionService.processSuccessfulPayment(subscriptionPaymentId, gatewayTxnId)
      } else if (type === 'SUBSCRIPTION_RENEWAL') {
        await subscriptionService.processSuccessfulRenewal(subscriptionPaymentId, gatewayTxnId)
      }

      console.log('[Payment] Subscription payment processed successfully', {
        subscriptionPaymentId,
        type
      })
    } catch (error: any) {
      console.error('[Payment] Failed to process subscription payment', {
        subscriptionPaymentId,
        type,
        error: error.message
      })
      throw error
    }
  }

  /**
 * Verify Binance Internal Transfer payment
 * Customer provides Binance Order ID after making payment in Binance app
 * 
 * @param paymentId - Payment record ID
 * @param orderId - Order ID to update
 * @param binanceOrderId - Binance Order ID provided by customer
 * @param userId - Optional user ID for audit logging
 * @param ipAddress - Optional IP address for audit logging
 * @param userAgent - Optional user agent for audit logging
 */
  async verifyBinancePayment(
    paymentId: number,
    orderId: number,
    binanceOrderId: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    console.log('[Payment] Verifying Binance payment', {
      paymentId,
      orderId,
      binanceOrderId
    })

    // Log verification attempt
    const logAudit = async (result: string, error?: string, meta?: any) => {
      try {
        const auditLog = await db.binanceAuditLog.create({
          data: {
            type: 'verifyAttempt',
            orderId: orderId || null,
            paymentId: paymentId || null,
            binanceOrderId: binanceOrderId.trim() || null,
            result,
            userId: userId || null,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            meta: meta || {}
          }
        })
        console.log('[Payment] Audit log created successfully:', {
          id: auditLog.id,
          result,
          orderId,
          paymentId,
          binanceOrderId: binanceOrderId.trim()
        })
      } catch (e: any) {
        console.error('[Payment] Failed to log audit:', e)
        console.error('[Payment] Audit log error details:', {
          message: e.message,
          code: e.code,
          meta: e.meta
        })
      }
    }

    // Find payment and verify it belongs to the order
    const payment = await db.payment.findFirst({
      where: {
        id: paymentId,
        orderId: orderId,
        gateway: 'binance'
      },
      include: {
        order: {
          include: {
            product: true,
            user: true
          }
        },
        method: {
          select: {
            apiKey: true, // This contains the Pay ID
            name: true
          }
        }
      }
    })

    if (!payment) {
      await logAudit('payment_not_found', 'Payment not found or does not match order')
      throw new Error('Binance payment not found or does not match the order')
    }

    if (payment.status === 'COMPLETED' || payment.status === 'PARTIAL') {
      await logAudit('already_completed', 'Payment already completed')
      throw new Error('Payment is already completed')
    }

    if (payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      await logAudit('invalid_status', `Payment status: ${payment.status}`)
      throw new Error(`Cannot verify payment with status: ${payment.status}`)
    }

    const trimmedOrderId = binanceOrderId.trim()

    // Basic validation: Binance Order IDs are typically numeric and 10-20 digits
    if (!/^\d{10,20}$/.test(trimmedOrderId)) {
      await logAudit('invalid_format', 'Invalid Order ID format')
      throw new Error(
        `Invalid Binance Order ID format "${trimmedOrderId}". Order ID must be a numeric value between 10-20 digits. ` +
        'Please check the Order ID from your Binance transaction and try again.'
      )
    }

    // Check if this Binance Order ID was already used for another payment
    const existingPayment = await db.payment.findFirst({
      where: {
        binanceOrderId: trimmedOrderId,
        id: { not: paymentId }, // Exclude current payment
        status: { in: ['COMPLETED', 'PARTIAL'] } // Only check completed payments
      }
    })

    if (existingPayment) {
      await logAudit('duplicate_order_id', 'Order ID already used', {
        existingPaymentId: existingPayment.id
      })
      throw new Error(
        `This Binance Order ID "${trimmedOrderId}" has already been used for another payment (Payment ID: ${existingPayment.id}). ` +
        'Each Binance Order ID can only be used once for verification. Please verify you entered the correct Order ID from your Binance transaction.'
      )
    }

    // Get expected Pay ID from payment method
    const expectedPayId = (payment.method as any)?.apiKey || null
    const expectedAmount = Number(payment.amount)

    // Verify against Binance transfer history using Playwright
    let verificationResult: {
      verified: boolean
      transfer?: any
      error?: string
    } | null = null

    try {
      const { verifyBinanceTransfer } = await import('../lib/binance')
      console.log('[Payment] Starting Binance verification...', {
        orderId: trimmedOrderId,
        expectedAmount,
        expectedPayId
      })
      verificationResult = await verifyBinanceTransfer(
        trimmedOrderId,
        expectedAmount,
        expectedPayId || undefined
      )
      console.log('[Payment] Verification result:', verificationResult)
    } catch (error: any) {
      console.error('[Payment] Playwright verification error:', error)
      console.error('[Payment] Error stack:', error.stack)

      // If session expired, log it but don't fail the verification
      // Allow manual verification to proceed (admin can verify later)
      if (error.message.includes('SESSION_EXPIRED') || error.message.includes('NO_SESSION_COOKIES')) {
        await logAudit('session_expired', error.message, {
          note: 'Manual verification allowed. Admin should verify against Binance.'
        })
        console.warn('[Payment] Binance session expired. Allowing manual verification.')
        // Continue with manual verification (without Playwright check)
        verificationResult = null // Set to null so manual verification proceeds
      } else {
        await logAudit('verification_error', error.message, {
          error: error.message,
          stack: error.stack
        })
        // Don't throw - allow manual verification to proceed
        console.warn('[Payment] Verification error occurred, but allowing manual verification to proceed.')
        verificationResult = {
          verified: false,
          error: 'VERIFICATION_ERROR',
          transfer: undefined
        }
      }
    }

    // If Playwright verification was attempted and failed
    if (verificationResult && !verificationResult.verified) {
      // Check if failure is due to technical issues (browser launch, session expired, etc.)
      const isTechnicalFailure = 
        verificationResult.error?.includes('Timeout') ||
        verificationResult.error?.includes('launch') ||
        verificationResult.error?.includes('SESSION_EXPIRED') ||
        verificationResult.error?.includes('NO_SESSION_COOKIES') ||
        verificationResult.error?.includes('VERIFICATION_ERROR') ||
        verificationResult.error?.includes('Failed to fetch')

      if (isTechnicalFailure) {
        // Technical failure - allow manual verification to proceed
        console.warn('[Payment] Playwright verification failed due to technical issue. Allowing manual verification.', {
          error: verificationResult.error
        })
        await logAudit('playwright_technical_failure', verificationResult.error || 'Technical failure', {
          expectedAmount,
          expectedPayId,
          note: 'Manual verification allowed due to technical issues with Playwright. Admin should verify manually.'
        })
        // Set verificationResult to null so manual verification proceeds
        verificationResult = null
      } else {
        // Business logic failure (Order ID not found, amount mismatch, etc.) - reject
        const errorMessages: Record<string, string> = {
          ORDER_NOT_FOUND: 'Order ID not found in Binance transfer history. Please verify the Order ID is correct.',
          AMOUNT_MISMATCH: `Amount mismatch. Expected ${expectedAmount} ${payment.order?.product?.type || 'USDT'}, but found ${verificationResult.transfer?.amount || 'N/A'} ${verificationResult.transfer?.currency || ''} in Binance.`,
          RECIPIENT_MISMATCH: 'Transfer recipient does not match configured Pay ID. Please verify the transfer was sent to the correct recipient.'
        }

        await logAudit(verificationResult.error || 'verification_failed', verificationResult.error, {
          expectedAmount,
          expectedPayId,
          transfer: verificationResult.transfer
        })

        throw new Error(errorMessages[verificationResult.error || ''] || 'Verification failed. Please check the Order ID and try again.')
      }
    }

    // Update payment with Binance Order ID and mark as completed
    await db.payment.update({
      where: { id: paymentId },
      data: {
        binanceOrderId: trimmedOrderId,
        binanceStatus: verificationResult?.verified ? 'verified' : 'manual',
        status: 'COMPLETED',
        paidAmount: payment.amount,
        paidAt: new Date(),
        processedAt: new Date(),
        meta: {
          ...((payment.meta as any) || {}),
          binanceOrderId: trimmedOrderId,
          verifiedAt: new Date().toISOString(),
          verifiedBy: verificationResult?.verified ? 'playwright' : 'manual',
          transfer: verificationResult?.transfer || null,
          note: verificationResult?.verified
            ? 'Verified against Binance transfer history using Playwright.'
            : 'Manually verified by customer-provided Binance Order ID. Playwright verification unavailable.'
        }
      }
    })

    // Log successful verification
    await logAudit('ok', undefined, {
      verifiedBy: verificationResult?.verified ? 'playwright' : 'manual',
      transfer: verificationResult?.transfer || null
    })

    console.log('[Payment] Binance payment verified and marked as completed', {
      paymentId,
      orderId,
      binanceOrderId,
      verifiedBy: verificationResult?.verified ? 'playwright' : 'manual'
    })

    // Process the completed order (deliver accounts, update stock, etc.)
    if (payment.order) {
      await this.processCompletedPayment(orderId, payment.order)
    }

    // Return updated payment
    const updatedPayment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    return transformDecimals(updatedPayment)
  }

  /**
   * Create Payment Intent for Volet (embedded Stripe Elements)
   * @param orderId - Order ID
   * @param paymentMethodId - Payment method ID
   * @param userId - Optional user ID
   * @param ipAddress - Client IP address for risk management
   * @param userAgent - Client user agent for risk management
   */
  async createVoletPaymentIntent(
    orderId: number,
    paymentMethodId: number,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // Fetch order with details
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          product: true
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      // Verify order ownership (if authenticated user)
      if (userId && order.userId !== userId) {
        throw new Error('Unauthorized: Order does not belong to this user')
      }

      // Fetch payment method
      const paymentMethod = await db.paymentMethod.findUnique({
        where: { id: paymentMethodId }
      })

      if (!paymentMethod || !paymentMethod.isActive) {
        throw new Error('Payment method not available')
      }

      if (paymentMethod.gateway !== 'volet') {
        throw new Error('Payment method is not Volet')
      }

      // Risk management validation
      const riskValidation = await validatePaymentRequest({
        ipAddress,
        email: order.user?.email || order.guestEmail || undefined,
        orderId
      })

      if (!riskValidation.allowed) {
        throw new Error(`Payment blocked: ${riskValidation.reasons.join(', ')}`)
      }

      // Calculate final amount
      const finalAmount = this.calculateFinalAmount(order.total, paymentMethod)

      if (finalAmount.lt(paymentMethod.minAmount)) {
        throw new Error(
          `${paymentMethod.name} requires at least ${paymentMethod.minAmount.toString()} ${paymentMethod.currencies[0] || 'USD'}`
        )
      }

      // Get gateway instance
      const gateway = await this.getGatewayInstance(paymentMethod.id, paymentMethod.testMode)

      // Check if gateway supports Payment Intent creation
      if (typeof (gateway as any).createPaymentIntent !== 'function') {
        throw new Error('Payment method does not support Payment Intent creation')
      }

      // Create Payment Intent
      const { clientSecret, paymentIntentId } = await (gateway as any).createPaymentIntent({
        orderId: order.id,
        amount: Number(finalAmount),
        currency: paymentMethod.currencies[0] || 'USD',
        customerEmail: order.user?.email || order.guestEmail || '',
        metadata: {
          orderId: order.id.toString(),
          userId: order.userId?.toString(),
          productId: order.productId.toString(),
          productType: order.product?.type || undefined,
          productName: order.product?.name || undefined
        }
      })

      // Generate cloaked transaction ID for Volet (same algorithm as in VoletGatewayService)
      // This ensures webhook can find the payment by cloaked ID
      const crypto = await import('crypto')
      const cloakingSecret = paymentMethod.apiSecret || crypto.createHash('sha256').update(`${paymentMethod.id}:${process.env.APP_SECRET || 'default_app_secret'}`).digest('hex')
      const hash = crypto.createHash('sha256').update(`${paymentIntentId}:${cloakingSecret}`).digest('hex').substring(0, 16)
      const cloakedTxnId = `volet_${hash}`

      // Check for duplicate payment
      if (await isDuplicatePayment(paymentIntentId, orderId)) {
        throw new Error('Duplicate payment detected')
      }

      // Create or update payment record
      const existingPayment = await db.payment.findUnique({
        where: { orderId }
      })

      const paymentData: Prisma.PaymentCreateInput | Prisma.PaymentUpdateInput = {
        type: 'ORDER',
        order: { connect: { id: orderId } },
        method: { connect: { id: paymentMethodId } },
        status: 'PENDING',
        amount: finalAmount,
        paidAmount: 0,
        refundedAmount: 0,
        gateway: 'volet',
        gatewayTxnId: cloakedTxnId, // Use cloaked ID so webhook can find it
        gatewayStatus: 'requires_payment_method',
        meta: {
          paymentIntentId, // Store actual Payment Intent ID in metadata for lookup
          clientSecret: clientSecret.substring(0, 20) + '...', // Partial for logging only
          productType: order.product?.type,
          productName: order.product?.name
        }
      }

      const payment = existingPayment
        ? await db.payment.update({
            where: { id: existingPayment.id },
            data: paymentData
          })
        : await db.payment.create({
            data: paymentData as Prisma.PaymentCreateInput
          })

      console.log('[Payment] Volet Payment Intent created', {
        orderId,
        paymentId: payment.id,
        paymentIntentId
      })

      return {
        clientSecret,
        paymentIntentId,
        paymentId: payment.id
      }
    } catch (error: any) {
      console.error('[Payment] Failed to create Volet Payment Intent', {
        error: error.message,
        orderId,
        paymentMethodId
      })
      throw error
    }
  }
}
