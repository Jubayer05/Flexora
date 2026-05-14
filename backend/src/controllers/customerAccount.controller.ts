import type { NextFunction, Response } from 'express'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import { AuthService } from '../services/auth.services'
import { NotificationService } from '../services/notification.service'
import { OrderService } from '../services/order.services'
import { telegramCustomerCodeSecurityService } from '../services/telegram/customer-code-security.service'
import { TelegramAccountService } from '../services/telegram-account.service'
import type { AuthRequest } from '../types/req-res'
import { sendErrorResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import { AccountIdSchema } from '../validations/zod/account.schema'

// Initialize services
const orderService = new OrderService()
const notificationService = new NotificationService()
const telegramAccountService = new TelegramAccountService()
const authService = new AuthService()

// ================================
// CUSTOMER ACCOUNT ACCESS
// ================================

// ================================
// CUSTOMER ORDER MANAGEMENT
// ================================

/**
 * Get customer's accounts from their orders
 * Shows accounts that are available for the customer
 */
export const getCustomerAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId
    const guestEmail = req.user?.email

    if (!userId && !guestEmail) {
      return next(new Error('User authentication required'))
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100) // Max 100 items per page
    const skip = (page - 1) * limit

    // Get customer's orders with account details
    const orders = userId
      ? await db.order.findMany({
          where: {
            userId: userId,
            product: {
              platform: 'TELEGRAM'
            }
          },
          include: {
            product: true,
            usedAccounts: {
              where: {
                platform: 'TELEGRAM'
              },
              select: {
                id: true,
                meta: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
      : []

    // Transform orders to account-like structure for response
    // Each order can have multiple accounts, so we create one entry per account
    const telegramAccounts: any[] = []
    
    for (const order of orders) {
      // If order has accounts linked, create one entry per account
      if (order.usedAccounts && order.usedAccounts.length > 0) {
        for (const account of order.usedAccounts) {
          // Get phone number from account meta
          let phoneNumber = ''
          if (account.meta) {
            const meta = account.meta as any
            phoneNumber = meta.phone || ''
          }

          telegramAccounts.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            phoneNumber: phoneNumber,
            productName: order.product?.name || 'Telegram Account',
            platform: order.product?.platform,
            quantity: order.quantity,
            status: order.status,
            deliveryStatus: order.deliveryStatus,
            orderDate: order.createdAt,
            isDelivered: order.deliveryStatus === 'DELIVERED',
            requiresOtp: order.product?.platform === 'TELEGRAM',
            accountId: account.id
          })
        }
      } else {
        // If no accounts linked yet, still show the order (for pending/delivery status)
        telegramAccounts.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          phoneNumber: '',
          productName: order.product?.name || 'Telegram Account',
          platform: order.product?.platform,
          quantity: order.quantity,
          status: order.status,
          deliveryStatus: order.deliveryStatus,
          orderDate: order.createdAt,
          isDelivered: order.deliveryStatus === 'DELIVERED',
          requiresOtp: order.product?.platform === 'TELEGRAM',
          accountId: null
        })
      }
    }

    // Calculate pagination metadata
    const total = telegramAccounts.length
    const totalPages = Math.ceil(total / limit)
    const paginatedAccounts = telegramAccounts.slice(skip, skip + limit)

    return sendSuccessResponse(
      res,
      {
        accounts: paginatedAccounts,
        total: total,
        pendingOTP: telegramAccounts.filter((acc: any) => !acc.isDelivered).length,
        delivered: telegramAccounts.filter((acc: any) => acc.isDelivered).length,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      'Customer Telegram accounts retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Check account delivery status
 * Customer can check if their account is ready for access
 */
export const checkAccountStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const userId = req.user?.userId

    // Get account status (simplified - using existing order service)
    const account = await orderService.findById(id)

    if (!account) {
      return sendErrorResponse(res, 'Account not found', 404)
    }

    // Basic access control - in real implementation, verify account belongs to user
    return sendSuccessResponse(
      res,
      {
        accountId: id,
        status: 'pending', // Simplified status
        requiresOTP: true, // All Telegram accounts require OTP
        isValid: true // Default to valid
      },
      'Account status retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// CUSTOMER SUPPORT HELPERS
// ================================

// ================================
// GUEST USER SUPPORT
// ================================

/**
 * Get guest user accounts by order number and email
 * Allows guest users to access their accounts
 */
export const getGuestAccountsByOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderNumber, email } = req.body

    if (!orderNumber || !email) {
      return next(new Error('Order number and email are required'))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return next(new Error('Invalid email format'))
    }

    // Get order by order number
    const order = await orderService.findByOrderNumber(orderNumber)

    if (!order || order.guestEmail !== email) {
      return sendErrorResponse(res, 'Order not found or email mismatch', 404)
    }

    // For guest users, just return the order details (no getCustomerAccounts for guests)
    const orderAccount = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      productName: order.product?.name,
      platform: order.product?.platform,
      quantity: order.quantity,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      isDelivered: order.deliveryStatus === 'DELIVERED',
      requiresOtp: order.product?.platform === 'TELEGRAM'
    }

    return sendSuccessResponse(
      res,
      {
        orderNumber,
        orderId: order.id,
        accounts: [orderAccount],
        total: 1,
        pendingOTP: orderAccount.isDelivered ? 0 : 1,
        delivered: orderAccount.isDelivered ? 1 : 0
      },
      'Guest accounts retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// DIRECT TELEGRAM OTP API
// ================================

/**
 * Request OTP directly for Telegram account access
 * Customer requests OTP to access their Telegram account credentials
 */
export const requestTelegramOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { OTPRequestSchema } = await import('../validations/zod/telegram.schema')

    const validatedData = OTPRequestSchema.parse(req.body)
    const { orderId, orderNumber, guestEmail } = validatedData
    const userId = req.user?.userId

    // For authenticated users, use userId. For guests, validate order
    let userIdToUse: number
    let targetOrder: any = null
    let userEmail: string = ''

    if (userId) {
      userIdToUse = userId

      // Get user's email
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404)
      }

      userEmail = user.email

      // For authenticated users with orderId, verify they own the order
      if (orderId) {
        const userOrder = await db.order.findFirst({
          where: {
            id: orderId,
            userId: userId
          },
          include: {
            product: true
          }
        })

        if (!userOrder) {
          return sendErrorResponse(res, 'Order not found or does not belong to you', 404)
        }
        targetOrder = userOrder
      }
    } else {
      // For guests, validate order and email
      if (!orderNumber || !guestEmail) {
        return sendErrorResponse(res, 'Order number and email are required for guest users', 400)
      }

      const guestOrder = await db.order.findFirst({
        where: {
          orderNumber,
          guestEmail: guestEmail
        },
        include: {
          product: true
        }
      })

      if (!guestOrder) {
        return sendErrorResponse(res, 'Invalid order number or email', 404)
      }

      targetOrder = guestOrder
      userIdToUse = guestOrder.userId || 0 // For guest orders without userId
      userEmail = guestEmail
    }

    // Find Telegram accounts from order
    if (!targetOrder) {
      return sendErrorResponse(res, 'Order not found', 404)
    }

    const productType = String(targetOrder.product?.type || '')
    const isTelegramAccountOrder =
      targetOrder.product?.platform === 'TELEGRAM' &&
      (productType === 'ACCOUNT' || productType === 'TELEGRAM_ACCOUNTS')

    if (!isTelegramAccountOrder) {
      return sendErrorResponse(
        res,
        'OTP is only available for Telegram account orders',
        400
      )
    }

    const multiItemOrder = (targetOrder.meta as any)?.multiItemOrder
    if (multiItemOrder?.isParent === true) {
      return sendErrorResponse(
        res,
        'OTP is not available at the grouped order level',
        400
      )
    }

    // Try to find account from delivery first (for delivered orders)
    const delivery = await db.delivery.findFirst({
      where: { orderId: targetOrder.id },
      orderBy: { createdAt: 'desc' }
    })

    let phoneNumber: string = ''
    let accountId: number | null = null

    if (delivery && delivery.accounts) {
      // Extract phone from delivered accounts JSON
      const accounts = delivery.accounts as any
      if (Array.isArray(accounts) && accounts.length > 0) {
        phoneNumber = accounts[0].phone || accounts[0].username
        accountId = accounts[0].id
      } else if (accounts.phone) {
        phoneNumber = accounts.phone || accounts.username
        accountId = accounts.id
      }
    }

    // If no delivery found, try to find the account directly
    if (!phoneNumber) {
      const account = await db.account.findFirst({
        where: {
          productId: targetOrder.productId,
          platform: 'TELEGRAM',
          usedByOrderId: targetOrder.id
        }
      })

      if (!account) {
        return sendErrorResponse(res, 'Telegram account not found or not accessible', 404)
      }

      accountId = account.id

      // Get phone number from account credentials
      const { TelegramAccountService } = await import('../services/telegram-account.service')
      const telegramAccountService = new TelegramAccountService()

      try {
        const credentials = await telegramAccountService.getAccountCredentials(accountId)
        if (!credentials) {
          return sendErrorResponse(res, 'Telegram account not found or invalid', 404)
        }
        phoneNumber = credentials.phone
      } catch (error) {
        console.error('❌ Failed to retrieve account credentials:', error)
        return sendErrorResponse(res, 'Failed to access account information', 500)
      }
    }

    if (!phoneNumber) {
      return sendErrorResponse(res, 'Unable to retrieve phone number for this account', 500)
    }

    // Auto-start OTP monitoring with Node.js Telegram service
    try {
      const { OtpService } = await import('../services/telegram/otp')
      const { BotService } = await import('../services/telegram/bot')

      // Fetch account proxy configuration for OTP request
      let accountProxy = undefined
      if (accountId) {
        try {
          const accountWithProxy = await db.account.findUnique({
            where: { id: accountId },
            select: { meta: true }
          })

          if (accountWithProxy?.meta) {
            const meta = accountWithProxy.meta as any
            if (meta.proxy) {
              accountProxy = meta.proxy
            }
          }
        } catch (error) {
          console.warn('Failed to fetch account proxy, will use global config:', error)
        }
      }

      // Trigger bot messaging to request OTP (optional)
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || '@flexorabot'
      try {
        await BotService.sendBotMessage(phoneNumber, botUsername, '/start', accountProxy)
      } catch (botError) {
        console.warn('Bot message failed (non-critical):', botError)
      }

      // Check for recent OTP using Node.js service
      const otpResult = await OtpService.checkRecentOtp(
        phoneNumber,
        userIdToUse,
        30,
        accountProxy
      )

      // If OTP is available, send it via email instead of returning in response
      if (otpResult.success && otpResult.otp) {
        const emailSubject = 'Your Telegram Account Access OTP - UHQ Accounts'
        const emailText = `
Hello,

Your OTP for Telegram account access is: ${otpResult.otp}

Account ID: ${accountId}
Phone Number: ${phoneNumber}
Order Number: ${targetOrder.orderNumber}

This OTP is valid for 30 minutes.
Please use this OTP to access your Telegram account credentials.

Best regards,
UHQ Accounts Team
        `.trim()

        try {
          await sendEmail(userEmail, emailText, emailSubject)
        } catch (emailError) {
          console.error('❌ Failed to send OTP email:', emailError)
        }

        return sendSuccessResponse(
          res,
          {
            message: 'OTP has been sent to your email address',
            accountId: accountId,
            orderNumber: targetOrder.orderNumber
          },
          'OTP sent to your email successfully'
        )
      }

      // OTP monitoring started but no OTP yet
      return sendSuccessResponse(
        res,
        {
          message: 'OTP monitoring started. Please check your email in a few moments.',
          accountId: accountId,
          orderNumber: targetOrder.orderNumber
        },
        'OTP monitoring started successfully'
      )
    } catch (error) {
      console.error('❌ Failed to start OTP monitoring:', error)
      return sendErrorResponse(res, 'Failed to start OTP monitoring', 500)
    }
  } catch (error) {
    return next(error)
  }
}

export const getTelegramCodeSecurityConfig = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const verificationConfig = await authService.getPublicEmailVerificationConfig()
    const securityConfig = telegramCustomerCodeSecurityService.getConfig()

    return sendSuccessResponse(
      res,
      {
        ...securityConfig,
        captchaEnabled: verificationConfig.captchaEnabled,
        captchaSiteKey: verificationConfig.captchaSiteKey
      },
      'Telegram code security config retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Get the latest Telegram login code for a purchased account.
 * If no recent code exists, request a fresh one and let the client retry shortly.
 */
export const getTelegramLoginCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId
    const { orderId, captchaToken } = req.body as { orderId?: number; captchaToken?: string }

    if (!userId) {
      return sendErrorResponse(res, 'User authentication required', 401)
    }

    await authService.validateCaptchaToken(captchaToken)

    const parsedOrderId = Number(orderId)
    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      return sendErrorResponse(res, 'A valid order ID is required', 400)
    }

    const targetOrder = await db.order.findFirst({
      where: {
        id: parsedOrderId,
        userId,
        product: {
          platform: 'TELEGRAM',
          OR: [{ type: 'ACCOUNT' }, { type: 'TELEGRAM_ACCOUNTS' }]
        }
      },
      include: {
        product: true
      }
    })

    if (!targetOrder) {
      return sendErrorResponse(res, 'Order not found or does not belong to you', 404)
    }

    const multiItemOrder = (targetOrder.meta as any)?.multiItemOrder
    if (multiItemOrder?.isParent === true) {
      return sendErrorResponse(res, 'Get Code is not available at the grouped order level', 400)
    }

    const delivery = await db.delivery.findFirst({
      where: { orderId: targetOrder.id },
      orderBy: { createdAt: 'desc' }
    })

    let phoneNumber = ''
    let accountId: number | null = null

    if (delivery?.accounts) {
      const accounts = delivery.accounts as any
      if (Array.isArray(accounts) && accounts.length > 0) {
        phoneNumber = accounts[0]?.phoneNumber || accounts[0]?.phone || accounts[0]?.username || ''
        accountId = Number(accounts[0]?.id) || null
      } else if (accounts) {
        phoneNumber = accounts.phoneNumber || accounts.phone || accounts.username || ''
        accountId = Number(accounts.id) || null
      }
    }

    if (!phoneNumber) {
      const account = await db.account.findFirst({
        where: {
          productId: targetOrder.productId,
          platform: 'TELEGRAM',
          usedByOrderId: targetOrder.id
        }
      })

      if (!account) {
        return sendErrorResponse(res, 'Telegram account not found or not accessible', 404)
      }

      accountId = account.id

      try {
        const credentials = await telegramAccountService.getAccountCredentials(account.id)
        if (!credentials?.phone) {
          return sendErrorResponse(res, 'Unable to retrieve phone number for this account', 404)
        }
        phoneNumber = credentials.phone
      } catch (error) {
        console.error('Failed to resolve Telegram account credentials:', error)
        return sendErrorResponse(res, 'Failed to access account information', 500)
      }
    }

    let accountProxy: any = undefined
    if (accountId) {
      try {
        const accountWithProxy = await db.account.findUnique({
          where: { id: accountId },
          select: { meta: true }
        })

        if (accountWithProxy?.meta) {
          const meta = accountWithProxy.meta as any
          if (meta.proxy) {
            accountProxy = meta.proxy
          }
        }
      } catch (error) {
        console.warn('Failed to fetch account proxy, continuing without it:', error)
      }
    }

    const { OtpService } = await import('../services/telegram/otp')
    const recentOtp = await OtpService.checkRecentOtp(phoneNumber, userId, 30, accountProxy)

    if (recentOtp.success && recentOtp.otp) {
      const currentRateLimits = await telegramCustomerCodeSecurityService.getCurrentState(
        phoneNumber,
        targetOrder.id,
        userId
      )

      return sendSuccessResponse(
        res,
        {
          code: recentOtp.otp,
          phoneNumber,
          orderId: targetOrder.id,
          orderNumber: targetOrder.orderNumber,
          requestedFreshCode: false,
          expiresAt: recentOtp.expiresAt || null,
          rateLimits: currentRateLimits
        },
        'Telegram login code retrieved successfully'
      )
    }

    const { TelegramClientSessionService } = await import(
      '../services/telegram/client-session.service'
    )
    const clientSessionService = new TelegramClientSessionService()
    const requestedCode = await clientSessionService.reRequestCode(
      phoneNumber,
      targetOrder.id,
      userId,
      accountProxy
    )

    if (!requestedCode.success) {
      return sendErrorResponse(
        res,
        requestedCode.error || 'Failed to request a fresh code',
        requestedCode.timeout ? 429 : 500,
        requestedCode.rateLimit ? [requestedCode.rateLimit] : undefined
      )
    }

    const refreshedOtp = await OtpService.checkRecentOtp(phoneNumber, userId, 2, accountProxy)

    return sendSuccessResponse(
      res,
      {
        code: refreshedOtp.success ? refreshedOtp.otp || null : null,
        phoneNumber,
        orderId: targetOrder.id,
        orderNumber: targetOrder.orderNumber,
        requestedFreshCode: true,
        expiresAt: refreshedOtp.success ? refreshedOtp.expiresAt || null : null,
        nextRetrySeconds: requestedCode.timeout || 60,
        rateLimits: requestedCode.rateLimit || null
      },
      refreshedOtp.success && refreshedOtp.otp
        ? 'Telegram login code retrieved successfully'
        : 'A fresh code was requested. Please try again in a few seconds.'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Get Telegram account credentials using OTP
 * Customer provides OTP from their Telegram chat to access credentials
 */
export const getTelegramCredentialsWithOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountId, otp } = req.body
    const userId = req.user?.userId

    if (!accountId || !otp) {
      return sendErrorResponse(res, 'Account ID and OTP are required', 400)
    }

    // Get phone number from account
    const { TelegramAccountService } = await import('../services/telegram-account.service')
    const telegramAccountService = new TelegramAccountService()

    let phoneNumber: string
    let accountCredentials: any

    try {
      accountCredentials = await telegramAccountService.getAccountCredentials(accountId)
      if (!accountCredentials) {
        return sendErrorResponse(res, 'Account not found or invalid', 404)
      }
      phoneNumber = accountCredentials.phone
    } catch (error) {
      return sendErrorResponse(res, 'Failed to access account information', 500)
    }

    // Verify user owns this account through order
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        platform: 'TELEGRAM',
        isUsed: true,
        isValid: true,
        usedByOrder: userId ? { userId } : undefined
      },
      include: {
        usedByOrder: true,
        product: {
          select: {
            id: true,
            name: true,
            platform: true
          }
        }
      }
    })

    if (!account) {
      return sendErrorResponse(res, 'Account not found in your orders or not accessible', 404)
    }

    // Verify OTP with Node.js Telegram service
    try {
      const { OtpService } = await import('../services/telegram/otp')

      // Fetch account proxy configuration for OTP verification
      let accountProxy = undefined
      try {
        const accountWithProxy = await db.account.findUnique({
          where: { id: account.id },
          select: { meta: true }
        })

        if (accountWithProxy?.meta) {
          const meta = accountWithProxy.meta as any
          if (meta.proxy) {
            accountProxy = meta.proxy
          }
        }
      } catch (error) {
        console.warn('Failed to fetch account proxy, will use global config:', error)
      }

      const result = await OtpService.checkRecentOtp(
        phoneNumber,
        userId || 0,
        30,
        accountProxy
      )

      if (!result.success || result.otp !== otp) {
        return sendErrorResponse(res, 'Invalid or expired OTP. Please try again.', 400)
      }

      // OTP verified, return account credentials
      return sendSuccessResponse(
        res,
        {
          account: {
            id: account.id,
            productName: account.product?.name || 'Telegram Account',
            platform: account.platform,
            hasPremium: account.hasPremium,
            accessedAt: new Date().toISOString()
          },
          credentials: {
            phone: accountCredentials.phone,
            password: accountCredentials.password,
            sessionData: accountCredentials.sessionData,
            hasPremium: account.hasPremium
          },
          order: {
            orderId: account.usedByOrder?.id,
            orderNumber: account.usedByOrder?.orderNumber
          },
          accessInfo: {
            accessedAt: new Date().toISOString(),
            securityNote: 'Keep these credentials secure. Change password after first login.'
          }
        },
        'Account credentials delivered successfully'
      )
    } catch (error) {
      console.error('❌ Failed to verify OTP:', error)
      return sendErrorResponse(res, 'Failed to verify OTP', 500)
    }
  } catch (error) {
    return next(error)
  }
}

/**
 * Re-request Telegram verification code for customer's account
 * POST /api/customer/telegram-accounts/re-request-code
 */
export const reRequestTelegramCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderId, phoneNumber, captchaToken } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return sendErrorResponse(res, 'User authentication required', 401)
    }

    await authService.validateCaptchaToken(captchaToken)

    if (!orderId && !phoneNumber) {
      return sendErrorResponse(res, 'Order ID or phone number is required', 400)
    }

    // Get order to verify ownership
    let order: any = null
    let accountPhone: string = phoneNumber || ''

    if (orderId) {
      order = await db.order.findFirst({
        where: {
          id: parseInt(orderId.toString()),
          userId: userId,
          product: {
            platform: 'TELEGRAM'
          }
        },
        include: {
          usedAccounts: {
            where: {
              platform: 'TELEGRAM'
            },
            select: {
              id: true,
              meta: true
            }
          },
          product: true,
          user: {
            select: {
              id: true,
              phone: true
            }
          }
        }
      })

      if (!order) {
        return sendErrorResponse(res, 'Order not found or you do not have access to it', 404)
      }

      // Get phone number from order's accounts
      if (order.usedAccounts && order.usedAccounts.length > 0) {
        const account = order.usedAccounts[0]
        if (account && account.meta) {
          const meta = account.meta as any
          accountPhone = meta.phone || ''
        }
      }

      // Fallback: Get phone number from user profile if not found in account
      if (!accountPhone && !phoneNumber && order.user?.phone) {
        accountPhone = order.user.phone
      }

      if (!accountPhone && !phoneNumber) {
        return sendErrorResponse(res, 'Phone number not found for this order. Please provide phone number directly.', 404)
      }
    }

    // Get proxy configuration
    let proxy: any = undefined
    try {
      const account = await db.account.findFirst({
        where: {
          platform: 'TELEGRAM',
          meta: {
            path: ['phone'],
            equals: accountPhone
          }
        }
      })

      if (account?.meta) {
        const meta = account.meta as any
        if (meta.proxy) {
          proxy = {
            host: meta.proxy.host,
            port: meta.proxy.port,
            username: meta.proxy.username,
            password: meta.proxy.password,
            type: (meta.proxy.type as 'socks5' | 'http') || 'socks5'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch account proxy:', error)
    }

    // Use TelegramClientSessionService to re-request code
    const { TelegramClientSessionService } = await import('../services/telegram/client-session.service')
    const clientSessionService = new TelegramClientSessionService()

    const result = await clientSessionService.reRequestCode(
      accountPhone,
      orderId ? parseInt(orderId.toString()) : 0,
      userId,
      proxy
    )

    if (!result.success) {
      // Handle specific error messages
      if (result.error?.includes('session not found') || result.error?.includes('Account session not found')) {
        return sendErrorResponse(
          res,
          'Account session not found. Please contact support for assistance.',
          404
        )
      }

      return sendErrorResponse(
        res,
        result.error || 'Failed to re-request code',
        result.timeout ? 429 : 500,
        result.rateLimit ? [result.rateLimit] : undefined
      )
    }

    return sendSuccessResponse(
      res,
      {
        message: 'Code re-requested successfully. Please check your Telegram messages.',
        phoneNumber: accountPhone,
        timeout: result.timeout,
        rateLimits: result.rateLimit || null
      },
      'Code re-requested successfully'
    )
  } catch (error) {
    console.error('Failed to re-request code:', error)
    return sendErrorResponse(res, 'Failed to re-request code', 500)
  }
}

/**
 * Kick admin session from customer's Telegram account
 * POST /api/customer/telegram-accounts/kick-admin-session
 */
export const kickAdminSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { orderId, phoneNumber } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return sendErrorResponse(res, 'User authentication required', 401)
    }

    if (!orderId && !phoneNumber) {
      return sendErrorResponse(res, 'Order ID or phone number is required', 400)
    }

    // Get order to verify ownership
    let order: any = null
    let accountPhone: string = phoneNumber || ''

    if (orderId) {
      order = await db.order.findFirst({
        where: {
          id: parseInt(orderId.toString()),
          userId: userId,
          product: {
            platform: 'TELEGRAM'
          }
        },
        include: {
          usedAccounts: {
            where: {
              platform: 'TELEGRAM'
            },
            select: {
              id: true,
              meta: true
            }
          },
          product: true,
          user: {
            select: {
              id: true,
              phone: true
            }
          }
        }
      })

      if (!order) {
        return sendErrorResponse(res, 'Order not found or you do not have access to it', 404)
      }

      // Get phone number from order's accounts
      if (order.usedAccounts && order.usedAccounts.length > 0) {
        const account = order.usedAccounts[0]
        if (account && account.meta) {
          const meta = account.meta as any
          accountPhone = meta.phone || ''
        }
      }

      // Fallback: Get phone number from user profile if not found in account
      if (!accountPhone && !phoneNumber && order.user?.phone) {
        accountPhone = order.user.phone
      }

      if (!accountPhone && !phoneNumber) {
        return sendErrorResponse(res, 'Phone number not found for this order. Please provide phone number directly.', 404)
      }
    }

    // Get proxy configuration
    let proxy: any = undefined
    try {
      const account = await db.account.findFirst({
        where: {
          platform: 'TELEGRAM',
          meta: {
            path: ['phone'],
            equals: accountPhone
          }
        }
      })

      if (account?.meta) {
        const meta = account.meta as any
        if (meta.proxy) {
          proxy = {
            host: meta.proxy.host,
            port: meta.proxy.port,
            username: meta.proxy.username,
            password: meta.proxy.password,
            type: (meta.proxy.type as 'socks5' | 'http') || 'socks5'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch account proxy:', error)
    }

    // Use TelegramClientSessionService to kick other sessions (admin sessions)
    const { TelegramClientSessionService } = await import('../services/telegram/client-session.service')
    const clientSessionService = new TelegramClientSessionService()

    const result = await clientSessionService.kickOtherSessions(accountPhone, proxy)

    if (!result.success) {
      // Handle specific error messages
      if (result.error?.includes('session not found') || result.error?.includes('No session found')) {
        return sendErrorResponse(
          res,
          'Account session not found. Please contact support for assistance.',
          404
        )
      }

      return sendErrorResponse(
        res,
        result.error || 'Failed to kick admin session',
        500
      )
    }

    return sendSuccessResponse(
      res,
      {
        message: 'Admin session kicked successfully. Note: You will no longer be able to get codes from us.',
        phoneNumber: accountPhone,
        sessionsKicked: result.kicked || 0,
        remainingSessions: result.remaining || 0
      },
      'Admin session kicked successfully'
    )
  } catch (error) {
    console.error('Failed to kick admin session:', error)
    return sendErrorResponse(res, 'Failed to kick admin session', 500)
  }
}
