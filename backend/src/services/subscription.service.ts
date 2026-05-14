import { PaymentStatus } from '@prisma/client'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import { cacheService } from './cache.service'
import { NotificationService } from './notification.service'
import { PaymentService } from './payment.service'
import { CACHE_KEYS } from '../configs/cache.config'

interface ActiveSubscription {
  package: {
    id: number
    name: string
    discount: any
    price: any
    duration: number
  } | null
  startDate: Date | null
  endDate: Date | null
  daysRemaining: number
}

export class SubscriptionService {
  private readonly CACHE_PREFIX = 'uhq:subscription:'
  private readonly CACHE_TTL = 3600 // 1 hour
  private paymentService = new PaymentService()
  private notificationService = new NotificationService()

  // ================================
  // PURCHASE & RENEWAL
  // ================================

  /**
   * Purchase a new subscription package
   */
  async purchaseSubscription(userId: number, subscriptionPackageId: number, gateway: string) {
    // Check if user already has an active subscription
    const existingSubscription = await this.getUserActiveSubscription(userId)
    if (existingSubscription) {
      throw new Error('User already has an active subscription')
    }

    // Get subscription package details
    const subscriptionPackage = await db.subscriptionPackage.findUnique({
      where: { id: subscriptionPackageId }
    })

    if (!subscriptionPackage) {
      throw new Error('Subscription package not found')
    }

    if (!subscriptionPackage.isActive) {
      throw new Error('Subscription package is not available')
    }

    // Calculate subscription period
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + subscriptionPackage.duration)

    // Create subscription payment record
    const subscriptionPayment = await db.subscriptionPayment.create({
      data: {
        userId,
        subscriptionPackageId,
        amount: subscriptionPackage.price,
        paymentStatus: PaymentStatus.PENDING,
        periodStart: startDate,
        periodEnd: endDate
      }
    })

    // Initiate payment through payment gateway
    const paymentResult = await this.paymentService.initiateSubscriptionPayment(
      subscriptionPayment.id,
      gateway,
      userId,
      'SUBSCRIPTION_PURCHASE'
    )

    return {
      subscriptionPayment,
      subscriptionPackage,
      payment: paymentResult.payment,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      address: paymentResult.address,
      expiresAt: paymentResult.expiresAt,
      periodStart: startDate,
      periodEnd: endDate
    }
  }

  /**
   * Process successful subscription payment
   */
  async processSuccessfulPayment(subscriptionPaymentId: number, gatewayTxnId?: string) {
    const subscriptionPayment = await db.subscriptionPayment.findUnique({
      where: { id: subscriptionPaymentId },
      include: { subscriptionPackage: true }
    })

    if (!subscriptionPayment) {
      throw new Error('Subscription payment not found')
    }

    // Update payment status
    await db.subscriptionPayment.update({
      where: { id: subscriptionPaymentId },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        processedAt: new Date(),
        gatewayTxnId
      }
    })

    // Activate subscription for user
    await db.user.update({
      where: { id: subscriptionPayment.userId },
      data: {
        subscriptionPackageId: subscriptionPayment.subscriptionPackageId,
        subscriptionStartDate: subscriptionPayment.periodStart,
        subscriptionEndDate: subscriptionPayment.periodEnd,
        subscriptionNotified: false
      }
    })

    // Invalidate cache
    await this.invalidateUserCache(subscriptionPayment.userId)

    // Send confirmation email
    const user = await db.user.findUnique({ where: { id: subscriptionPayment.userId } })
    if (user?.email) {
      const emailText = `
        Hi ${user.firstName || 'Customer'},
        
        Your subscription has been activated successfully!
        
        Package: ${subscriptionPayment.subscriptionPackage.name}
        Discount: ${subscriptionPayment.subscriptionPackage.discount}%
        Start Date: ${subscriptionPayment.periodStart.toLocaleDateString()}
        End Date: ${subscriptionPayment.periodEnd.toLocaleDateString()}
        Price: $${subscriptionPayment.amount}
        
        You will now receive ${subscriptionPayment.subscriptionPackage.discount}% discount on all orders.
        
        Thank you for your purchase!
      `

      await sendEmail(user.email, emailText, 'Subscription Activated - UHQ Account')
    }

    // Notify admins about the subscription purchase
    try {
      await this.notificationService.notifyAdminsSubscriptionPurchase({
        customerName: user?.firstName || user?.email || 'Guest',
        customerEmail: user?.email || '',
        packageName: subscriptionPayment.subscriptionPackage.name,
        amount: subscriptionPayment.amount.toNumber(),
        subscriptionPaymentId: subscriptionPaymentId
      })
      console.log('[Subscription] Admin notification sent for subscription purchase', {
        subscriptionPaymentId
      })
    } catch (error) {
      console.error('[Subscription] Failed to send admin notification', {
        subscriptionPaymentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return subscriptionPayment
  }

  /**
   * Renew existing subscription
   */
  async renewSubscription(userId: number, gateway: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscriptionPackage: true }
    })

    if (!user?.subscriptionPackage) {
      throw new Error('No subscription package found for renewal')
    }

    const subscriptionPackage = user.subscriptionPackage

    // Calculate new period (extends from current end date or now, whichever is later)
    const now = new Date()
    const currentEndDate = user.subscriptionEndDate || now
    const startDate = currentEndDate > now ? currentEndDate : now
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + subscriptionPackage.duration)

    // Create renewal payment record
    const subscriptionPayment = await db.subscriptionPayment.create({
      data: {
        userId,
        subscriptionPackageId: subscriptionPackage.id,
        amount: subscriptionPackage.price,
        paymentStatus: PaymentStatus.PENDING,
        periodStart: startDate,
        periodEnd: endDate
      }
    })

    // Initiate payment through payment gateway
    const paymentResult = await this.paymentService.initiateSubscriptionPayment(
      subscriptionPayment.id,
      gateway,
      userId,
      'SUBSCRIPTION_RENEWAL'
    )

    return {
      subscriptionPayment,
      subscriptionPackage,
      payment: paymentResult.payment,
      paymentUrl: paymentResult.paymentUrl,
      qrCode: paymentResult.qrCode,
      address: paymentResult.address,
      expiresAt: paymentResult.expiresAt,
      periodStart: startDate,
      periodEnd: endDate
    }
  }

  /**
   * Process successful renewal payment
   */
  async processSuccessfulRenewal(subscriptionPaymentId: number, gatewayTxnId?: string) {
    const subscriptionPayment = await db.subscriptionPayment.findUnique({
      where: { id: subscriptionPaymentId },
      include: { subscriptionPackage: true }
    })

    if (!subscriptionPayment) {
      throw new Error('Subscription payment not found')
    }

    // Update payment status
    await db.subscriptionPayment.update({
      where: { id: subscriptionPaymentId },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        processedAt: new Date(),
        gatewayTxnId
      }
    })

    // Extend subscription
    await db.user.update({
      where: { id: subscriptionPayment.userId },
      data: {
        subscriptionEndDate: subscriptionPayment.periodEnd,
        subscriptionNotified: false // Reset notification flag
      }
    })

    // Invalidate cache
    await this.invalidateUserCache(subscriptionPayment.userId)

    // Send renewal confirmation email
    const user = await db.user.findUnique({ where: { id: subscriptionPayment.userId } })
    if (user?.email) {
      const emailText = `
        Hi ${user.firstName || 'Customer'},
        
        Your subscription has been renewed successfully!
        
        Package: ${subscriptionPayment.subscriptionPackage.name}
        New End Date: ${subscriptionPayment.periodEnd.toLocaleDateString()}
        Price: $${subscriptionPayment.amount}
        
        Your subscription discount will continue without interruption.
        
        Thank you!
        UHQ Account Team
      `

      await sendEmail(user.email, emailText, 'Subscription Renewed - UHQ Account')
    }

    // Notify admins about subscription renewal
    try {
      if (user) {
        const customerName = user.firstName || user.email
        await this.notificationService.notifyAdminsSubscriptionRenewal({
          customerName,
          customerEmail: user.email,
          packageName: subscriptionPayment.subscriptionPackage.name,
          amount: subscriptionPayment.amount.toNumber(),
          subscriptionPaymentId: subscriptionPayment.id,
          renewalType: 'manual' // Default to manual, can be auto if triggered by cron
        })
        console.log('[Subscription] Admin notification sent for renewal', {
          subscriptionPaymentId: subscriptionPayment.id,
          userId: user.id
        })
      }
    } catch (error) {
      console.error('[Subscription] Failed to send admin notification for renewal', {
        subscriptionPaymentId: subscriptionPayment.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return subscriptionPayment
  }

  // ================================
  // CANCELLATION
  // ================================

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscriptionPackage: true }
    })

    if (!user?.subscriptionPackageId) {
      throw new Error('No active subscription found')
    }

    const packageName = user.subscriptionPackage?.name || 'Unknown Package'

    // Remove subscription from user
    await db.user.update({
      where: { id: userId },
      data: {
        subscriptionPackageId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        subscriptionNotified: false
      }
    })

    // Invalidate cache
    await this.invalidateUserCache(userId)

    // Notify admins about subscription cancellation
    try {
      const customerName = user.firstName || user.email
      await this.notificationService.notifyAdminsSubscriptionCancellation({
        customerName,
        customerEmail: user.email,
        packageName,
        subscriptionId: user.subscriptionPackageId
      })
      console.log('[Subscription] Admin notification sent for cancellation', {
        userId,
        packageName
      })
    } catch (error) {
      console.error('[Subscription] Failed to send admin notification for cancellation', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return { message: 'Subscription cancelled successfully' }
  }

  // ================================
  // EXPIRATION & NOTIFICATIONS
  // ================================

  /**
   * Check and send expiration notifications (Day 29)
   */
  async sendExpirationNotifications() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find users whose subscription expires tomorrow and not yet notified
    const expiringUsers = await db.user.findMany({
      where: {
        subscriptionEndDate: {
          gte: today,
          lte: tomorrow
        },
        subscriptionNotified: false
      },
      include: { subscriptionPackage: true }
    })

    console.log(`Found ${expiringUsers.length} subscriptions expiring tomorrow`)

    for (const user of expiringUsers) {
      try {
        // Send expiration warning email
        const emailText = `
          Hi ${user.firstName || 'Customer'},
          
          This is a reminder that your subscription will expire tomorrow!
          
          Package: ${user.subscriptionPackage?.name || 'Subscription'}
          Expiry Date: ${user.subscriptionEndDate?.toLocaleDateString()}
          
          Renew now to continue enjoying ${user.subscriptionPackage?.discount}% discount on all orders.
          
          Renew at: ${process.env.FRONTEND_URL || 'https://uhqaccount.com'}/user/subscription/renew
          
          UHQ Account Team
        `

        await sendEmail(user.email, emailText, 'Your Subscription Expires Tomorrow - UHQ Account')

        // Mark as notified
        await db.user.update({
          where: { id: user.id },
          data: { subscriptionNotified: true }
        })

        console.log(`Notification sent to user ${user.id}`)
      } catch (error) {
        console.error(`Failed to send notification to user ${user.id}:`, error)
      }
    }

    return { notificationsSent: expiringUsers.length }
  }

  /**
   * Expire subscriptions that have passed their end date
   */
  async expireSubscriptions() {
    const now = new Date()

    // Find users with expired subscriptions
    const expiredUsers = await db.user.findMany({
      where: {
        subscriptionEndDate: {
          lt: now
        },
        subscriptionPackageId: {
          not: null
        }
      },
      include: { subscriptionPackage: true }
    })

    console.log(`Found ${expiredUsers.length} expired subscriptions`)

    for (const user of expiredUsers) {
      try {
        // Remove subscription
        await db.user.update({
          where: { id: user.id },
          data: {
            subscriptionPackageId: null,
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            subscriptionNotified: false
          }
        })

        // Invalidate cache
        await this.invalidateUserCache(user.id)

        // Send expiration email
        const emailText = `
          Hi ${user.firstName || 'Customer'},
          
          Your subscription has expired.
          
          Package: ${user.subscriptionPackage?.name || 'Subscription'}
          
          You can renew anytime to start enjoying discounts on your orders again.
          
          Renew at: ${process.env.FRONTEND_URL || 'https://uhqaccount.com'}/user/subscription
          
          UHQ Account Team
        `

        await sendEmail(user.email, emailText, 'Your Subscription Has Expired - UHQ Account')

        console.log(`Expired subscription for user ${user.id}`)
      } catch (error) {
        console.error(`Failed to expire subscription for user ${user.id}:`, error)
      }
    }

    return { subscriptionsExpired: expiredUsers.length }
  }

  // ================================
  // QUERIES
  // ================================

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(userId: number): Promise<ActiveSubscription | null> {
    const cacheKey = `${this.CACHE_PREFIX}user:${userId}`

    // Try cache
    const cached = await cacheService.get<ActiveSubscription>(cacheKey)
    if (cached) {
      return cached
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscriptionPackage: true }
    })

    if (!user?.subscriptionPackageId || !user.subscriptionEndDate) {
      return null
    }

    // Check if still active
    const now = new Date()
    if (user.subscriptionEndDate < now) {
      return null
    }

    const result: ActiveSubscription = {
      package: user.subscriptionPackage,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      daysRemaining: Math.ceil(
        (user.subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Cache result
    await cacheService.set(cacheKey, result, this.CACHE_TTL)

    return result
  }

  /**
   * Get user's subscription payment history
   */
  async getUserSubscriptionHistory(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit

    const [payments, total] = await Promise.all([
      db.subscriptionPayment.findMany({
        where: { userId },
        include: {
          subscriptionPackage: true,
          paymentMethod: { select: { name: true, gateway: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.subscriptionPayment.count({ where: { userId } })
    ])

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }

  /**
   * Apply subscription discount to order
   */
  async applySubscriptionDiscount(userId: number, orderTotal: number) {
    const subscription = await this.getUserActiveSubscription(userId)

    if (!subscription) {
      return { discount: 0, discountedTotal: orderTotal }
    }

    const discountPercent = Number(subscription.package?.discount || 0)
    const discountAmount = Math.round(((orderTotal * discountPercent) / 100) * 100) / 100 // Round to 2 decimal places

    return {
      discount: discountAmount,
      discountedTotal: orderTotal - discountAmount,
      discountPercent,
      packageName: subscription.package?.name
    }
  }

  // ================================
  // ADMIN OPERATIONS
  // ================================

  /**
   * Get all active subscriptions (admin)
   */
  async getActiveSubscriptions(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const now = new Date()

    const [users, total] = await Promise.all([
      db.user.findMany({
        where: {
          subscriptionPackageId: { not: null },
          subscriptionEndDate: { gte: now }
        },
        include: {
          subscriptionPackage: true
        },
        orderBy: { subscriptionEndDate: 'asc' },
        skip,
        take: limit
      }),
      db.user.count({
        where: {
          subscriptionPackageId: { not: null },
          subscriptionEndDate: { gte: now }
        }
      })
    ])

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get subscriptions expiring soon (admin)
   */
  async getExpiringSubscriptions(daysAhead = 7) {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const users = await db.user.findMany({
      where: {
        subscriptionPackageId: { not: null },
        subscriptionEndDate: {
          gte: now,
          lte: futureDate
        }
      },
      include: {
        subscriptionPackage: true
      },
      orderBy: { subscriptionEndDate: 'asc' }
    })

    return users
  }

  /**
   * Manually extend subscription (admin)
   */
  async extendSubscription(userId: number, days: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscriptionPackage: true }
    })

    if (!user?.subscriptionEndDate) {
      throw new Error('User does not have an active subscription')
    }

    const newEndDate = new Date(user.subscriptionEndDate)
    newEndDate.setDate(newEndDate.getDate() + days)

    await db.user.update({
      where: { id: userId },
      data: {
        subscriptionEndDate: newEndDate,
        subscriptionNotified: false
      }
    })

    // Invalidate cache
    await this.invalidateUserCache(userId)

    return { message: `Subscription extended by ${days} days`, newEndDate }
  }

  /**
   * Get all subscription payments (admin)
   */
  async getAllSubscriptionPayments(page = 1, limit = 20, status?: PaymentStatus) {
    const skip = (page - 1) * limit

    const where = status ? { paymentStatus: status } : {}

    const [payments, total] = await Promise.all([
      db.subscriptionPayment.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true } },
          subscriptionPackage: true,
          paymentMethod: { select: { name: true, gateway: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.subscriptionPayment.count({ where })
    ])

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  private async invalidateUserCache(userId: number) {
    await cacheService.del(`${this.CACHE_PREFIX}user:${userId}`)
    await cacheService.del(`${CACHE_KEYS.USER_PROFILE}:${userId}`)
  }
}

export const subscriptionService = new SubscriptionService()
