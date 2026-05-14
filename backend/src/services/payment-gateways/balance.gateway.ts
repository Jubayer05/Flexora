/**
 * Balance Payment Gateway
 * Handles payments using user's account balance
 */

import db from '../../configs/db'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'
import { BalanceService } from '../balance.service'

export class BalanceGatewayService implements IPaymentGateway {
  private balanceService: BalanceService

  constructor() {
    this.balanceService = new BalanceService()
  }

  /**
   * Create payment using account balance
   * Deducts balance immediately and returns success
   * Supports both order and subscription payments
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      let userId: number | null = null
      let reference: string = ''
      let description: string = params.description

      // Check if this is a subscription payment (via metadata)
      const isSubscriptionPayment =
        params.metadata?.type === 'SUBSCRIPTION_PURCHASE' ||
        params.metadata?.type === 'SUBSCRIPTION_RENEWAL'

      if (isSubscriptionPayment) {
        // For subscription payments, get userId from metadata
        userId = params.metadata?.userId ? parseInt(params.metadata.userId) : null
        reference = `SUB-${params.orderId}` // orderId actually contains subscriptionPaymentId

        if (!userId) {
          return {
            success: false,
            gatewayTxnId: '',
            error: 'User ID not found in subscription payment metadata'
          }
        }
      } else {
        // For order payments, get user from order
        const order = await db.order.findUnique({
          where: { id: params.orderId },
          select: { userId: true, orderNumber: true }
        })

        if (!order) {
          return {
            success: false,
            gatewayTxnId: '',
            error: 'Order not found'
          }
        }

        if (!order.userId) {
          return {
            success: false,
            gatewayTxnId: '',
            error: 'Cannot use balance payment for guest orders'
          }
        }

        userId = order.userId
        reference = order.orderNumber
      }

      // Validate user status (banned/inactive check)
      await this.balanceService.validateBalanceOperation(userId, params.amount, 'deduct')

      // Check user balance
      const currentBalance = await this.balanceService.getBalance(userId)

      if (currentBalance < params.amount) {
        return {
          success: false,
          gatewayTxnId: '',
          error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Required: $${params.amount.toFixed(2)}`
        }
      }

      // Deduct balance
      const deductResult = await this.balanceService.deductBalance(
        userId,
        params.amount,
        'DEDUCT',
        description,
        {
          reference,
          ...(isSubscriptionPayment
            ? { subscriptionPaymentId: params.orderId }
            : { orderId: params.orderId }),
          meta: {
            customerEmail: params.customerEmail,
            description: params.description,
            type: params.metadata?.type
          }
        }
      )

      // Generate transaction ID
      const gatewayTxnId = `BAL-${reference}-${Date.now()}`

      return {
        success: true,
        gatewayTxnId,
        metadata: {
          transactionId: deductResult.transaction.id,
          balanceBefore: deductResult.balanceBefore,
          balanceAfter: deductResult.balanceAfter,
          ...(isSubscriptionPayment
            ? { subscriptionPaymentId: params.orderId, type: params.metadata?.type }
            : { orderId: params.orderId, orderNumber: reference })
        }
      }
    } catch (error) {
      return {
        success: false,
        gatewayTxnId: '',
        error: error instanceof Error ? error.message : 'Payment failed'
      }
    }
  }

  /**
   * Balance payments don't use webhooks
   * This method is not applicable for balance gateway
   */
  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    return {
      verified: false,
      error: 'Webhooks not supported for balance payments'
    }
  }

  /**
   * Get payment status for balance payment
   * Balance payments are always completed immediately
   */
  async getPaymentStatus(gatewayTxnId: string): Promise<PaymentStatusResponse> {
    // Extract order number from transaction ID
    const parts = gatewayTxnId.split('-')
    if (parts.length < 3 || parts[0] !== 'BAL') {
      throw new Error('Invalid balance transaction ID')
    }

    const orderNumber = parts.slice(1, -1).join('-')

    // Get order to verify payment
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        payment: true
      }
    })

    if (!order || !order.payment) {
      throw new Error('Order or payment not found')
    }

    return {
      status: order.payment.status,
      gatewayStatus: 'completed',
      amount: Number(order.payment.amount),
      paidAmount: Number(order.payment.paidAmount),
      currency: 'USD',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber
      }
    }
  }

  /**
   * Process refund by adding balance back to user account
   */
  async refundPayment(gatewayTxnId: string, amount?: number): Promise<RefundResponse> {
    try {
      // Extract order number from transaction ID
      const parts = gatewayTxnId.split('-')
      if (parts.length < 3 || parts[0] !== 'BAL') {
        return {
          success: false,
          refundId: '',
          amount: 0,
          status: 'failed',
          error: 'Invalid balance transaction ID'
        }
      }

      const orderNumber = parts.slice(1, -1).join('-')

      // Get order
      const order = await db.order.findUnique({
        where: { orderNumber },
        include: {
          payment: true
        }
      })

      if (!order) {
        return {
          success: false,
          refundId: '',
          amount: 0,
          status: 'failed',
          error: 'Order not found'
        }
      }

      if (!order.userId) {
        return {
          success: false,
          refundId: '',
          amount: 0,
          status: 'failed',
          error: 'Cannot refund guest orders to balance'
        }
      }

      const refundAmount = amount || Number(order.total)

      // Add balance back
      const refundResult = await this.balanceService.refundToBalance(
        order.id,
        refundAmount,
        'Refund for balance payment'
      )

      const refundId = `REF-${orderNumber}-${Date.now()}`

      return {
        success: true,
        refundId,
        amount: refundAmount,
        status: 'completed',
        metadata: {
          transactionId: refundResult.transaction.id,
          balanceBefore: refundResult.balanceBefore,
          balanceAfter: refundResult.balanceAfter,
          orderId: order.id,
          orderNumber: order.orderNumber
        }
      }
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Refund failed'
      }
    }
  }
}
