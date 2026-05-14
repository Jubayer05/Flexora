/**
 * Guest Order Controller
 * Handles guest user order access and verification
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import db from '../../configs/db'
import { sendEmail } from '../../libs/email'
import { cacheService } from '../../services/cache.service'
import { deliveryTemplateService } from '../../services/delivery-template.service'
import { guestAccessService } from '../../services/guest-access.service'
import { UserService } from '../../services/user.services'
import { decrypt } from '../../utils/encryption'
import {
  issueGuestDashboardToken,
  normalizeGuestEmail,
  validateGuestSessionAccess
} from '../../utils/guest-dashboard-auth'
import type { AuthRequest } from '../../types/req-res'

const userService = new UserService()

const normalizeDeliveryAccounts = (accounts: unknown) => {
  const rawAccounts = Array.isArray(accounts) ? accounts : accounts ? [accounts] : []

  return rawAccounts.map((entry: any, index: number) => {
    const credentials = entry?.credentials || entry || {}

    return {
      id: entry?.id || credentials?.id || index + 1,
      username: entry?.username || credentials?.username || '',
      email: entry?.email || credentials?.email || '',
      phone: entry?.phone || credentials?.phone || entry?.phoneNumber || credentials?.phoneNumber || '',
      password: entry?.password || credentials?.password || '',
      note: entry?.note || credentials?.note || '',
      recoveryEmail: entry?.recoveryEmail || credentials?.recoveryEmail || '',
      twoFactorSecret: entry?.twoFactorSecret || credentials?.twoFactorSecret || '',
      sessionData: entry?.sessionData || credentials?.sessionData || '',
      hasPremium: Boolean(entry?.hasPremium ?? credentials?.hasPremium),
      backupCodes: entry?.backupCodes || credentials?.backupCodes || [],
      fileUrl: entry?.fileUrl || credentials?.fileUrl || entry?.meta?.fileUrl || '',
      fileName: entry?.fileName || credentials?.fileName || entry?.meta?.fileName || '',
      fileType: entry?.fileType || credentials?.fileType || entry?.meta?.fileType || '',
      credentials
    }
  })
}

// Validation schemas
const GuestVerifyOrderSchema = z.object({
  email: z.string().email(),
  orderNumber: z.string().min(1).optional(),
  verificationCode: z.string().length(6).optional(),
  accessToken: z.string().min(1).optional()
}).refine((data) => Boolean(data.verificationCode || data.accessToken), {
  message: 'Verification code or access token is required',
  path: ['verificationCode']
})

const GuestDownloadSchema = z.object({
  orderId: z.number().int().positive(),
  email: z.string().email(),
  format: z.enum(['txt', 'excel', 'json'])
})

const normalizeOrderNumber = (orderNumber: string) => orderNumber.trim().toUpperCase()

const getMultiItemOrderMeta = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null
  }

  const multiItemOrder = (meta as Record<string, any>).multiItemOrder
  return multiItemOrder && typeof multiItemOrder === 'object' && !Array.isArray(multiItemOrder)
    ? multiItemOrder
    : null
}

const getChildOrderIds = (meta: unknown) => {
  const multiItemOrder = getMultiItemOrderMeta(meta)
  return Array.isArray(multiItemOrder?.childOrderIds)
    ? multiItemOrder.childOrderIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
    : []
}

/**
 * Verify guest order access with email and verification code
 * GET /api/v1/customer/orders/guest/verify
 * or
 * POST /api/v1/customer/orders/guest/verify
 */
export const verifyGuestOrder = async (req: Request, res: Response) => {
  try {
    const validatedData = GuestVerifyOrderSchema.parse(req.body)
    const normalizedEmail = normalizeGuestEmail(validatedData.email)
    const normalizedOrderNumber = validatedData.orderNumber
      ? normalizeOrderNumber(validatedData.orderNumber)
      : undefined

    if (validatedData.accessToken) {
      try {
        await guestAccessService.validateAccessToken(validatedData.accessToken.trim(), normalizedEmail)
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Invalid or expired access token'
        })
      }
    } else {
      const verificationCode = validatedData.verificationCode!.trim()
      const emailCodeKey = `guest_order_code:${normalizedEmail}`
      const orderCodeKey = normalizedOrderNumber
        ? `guest_order_code:${normalizedEmail}:${normalizedOrderNumber}`
        : null
      const storedCode =
        (orderCodeKey ? await cacheService.get<string>(orderCodeKey) : null) ||
        (await cacheService.get<string>(emailCodeKey))

      if (!storedCode || storedCode !== verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        })
      }

      await cacheService.del(emailCodeKey)
      if (orderCodeKey) {
        await cacheService.del(orderCodeKey)
      }
    }

    const guestOrders = await db.order.findMany({
      where: {
        guestEmail: normalizedEmail,
        status: { not: 'CANCELLED' }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        createdAt: true
      }
    })

    await userService.ensureGuestCheckoutUser({
      email: normalizedEmail,
      firstName: null,
      phone: null
    })

    res.json({
      success: true,
      token: issueGuestDashboardToken(normalizedEmail),
      data: {
        email: normalizedEmail,
        orderCount: guestOrders.length,
        latestOrder: guestOrders[0] || null
      },
      message: 'Guest access verified successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.issues
      })
    }

    console.error('Guest order verification error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify order'
    })
  }
}

/**
 * Generate and send verification code to guest email
 * POST /api/v1/customer/orders/guest/send-code
 */
export const sendGuestVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email, orderNumber } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      })
    }

    const normalizedEmail = normalizeGuestEmail(email)
    const normalizedOrderNumber =
      typeof orderNumber === 'string' && orderNumber.trim()
        ? normalizeOrderNumber(orderNumber)
        : undefined

    const existingRegisteredUser = await db.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        },
        isGuest: false
      },
      select: {
        id: true
      }
    })

    if (existingRegisteredUser) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_ALREADY_EXISTS',
        message:
          'You are already a UHQ Accounts user. Please sign in with this email to continue.'
      })
    }

    // Find order
    let order = await db.order.findFirst({
      where: {
        guestEmail: normalizedEmail,
        status: { not: 'CANCELLED' },
        ...(normalizedOrderNumber ? { orderNumber: normalizedOrderNumber } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (normalizedOrderNumber && !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or email does not match'
      })
    }

    order = order || ({
      orderNumber: '',
      customerName: 'Customer'
    } as any)

    // Check rate limit
    const rateLimitKey = `guest_code_rate:${normalizedEmail}`
    const attempts = parseInt((await cacheService.get(rateLimitKey)) || '0')

    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification code requests. Please try again later.'
      })
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code in cache (10 minutes expiration)
    const emailCodeKey = `guest_order_code:${normalizedEmail}`
    await cacheService.set(emailCodeKey, verificationCode, 600)
    if (normalizedOrderNumber) {
      const orderCodeKey = `guest_order_code:${normalizedEmail}:${normalizedOrderNumber}`
      await cacheService.set(orderCodeKey, verificationCode, 600)
    }

    // Increment rate limit counter (1 hour expiration)
    await cacheService.set(rateLimitKey, (attempts + 1).toString(), 3600)

    // Send email with verification code (use AuthEmailTemplate VERIFICATION_CODE if set)
    const frontendUrl = process.env.FRONTEND_URL || 'https://flexora.com'
    const guestAccessUrl = `${frontendUrl}/guest-login`
    const signUpUrl = `${frontendUrl}/sign-up`
    const customerName = order?.customerName || 'Customer'
    const latestOrderNumber = order?.orderNumber

    const defaultSubject = latestOrderNumber
      ? `Your Guest Login OTP - ${latestOrderNumber} | UHQ Accounts`
      : 'Your Guest Login OTP | UHQ Accounts'
    const defaultEmailText = `
Hello ${customerName},

Your guest login OTP is ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR VERIFICATION CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your verification code to access your guest dashboard:

    ${verificationCode}

⏱️  Code Expires In: 10 minutes
📦 Order Number: ${order.orderNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 QUICK START - 2 WAYS TO ACCESS YOUR ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 1: Quick Access (No Account Needed)
───────────────────────────────────────────
Perfect if you want to open your guest dashboard quickly!

1. Open guest login: ${guestAccessUrl}
2. Enter your email: ${normalizedEmail}
3. Enter this OTP: ${verificationCode}
4. Verify your access
5. Open your guest dashboard
6. Access your downloads and purchases with limited guest access

OPTION 2: Create Account (Recommended)
───────────────────────────────────────
Get access to exclusive features and manage all your orders in one place!

✅ Benefits of creating an account:
   • Access all your orders anytime (not just this one)
   • Track order status in real-time
   • View complete order history
   • Unlock the Rank System & earn rewards
   • Get access to Affiliate Program
   • Subscriber discounts & exclusive offers
   • 24/7 customer support access

Create your free account here: ${signUpUrl}

After creating an account with the same email, your purchases can be managed from one place.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ FREQUENTLY ASKED QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Do I need an account to access my purchases?
A: No. You can use guest access with the OTP above, but signing up gives you full dashboard access.

Q: What if I lose my code?
A: No problem. You can request a new OTP anytime from the guest access section on the login page.

Q: How long is the code valid?
A: 10 minutes. Request a new OTP if it expires.

Q: Can I create an account with this email?
A: Yes. Sign up with the same email to unlock full dashboard access and keep your purchases safe.

Q: What formats can I download my credentials in?
A: TXT, Excel (.csv), or JSON - choose what works best for you!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 SECURITY REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Keep this code confidential - never share it with anyone
⚠️  This is a secure, automated message - do not reply
⚠️  If you didn't place this order, please contact us immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 NEED HELP?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Email: support@flexora.com
🌐 Website: ${frontendUrl}
📋 Order Number: ${order.orderNumber}

We're here to help! Just reply to this email or contact support.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The UHQ Accounts Team

P.S. Creating an account takes less than 1 minute and gives you access to
all your orders, exclusive rewards, and special offers! 🎁
    `.trim()

    let emailSubject = defaultSubject
    let emailText = defaultEmailText
    try {
      const authTemplate = await deliveryTemplateService.getAuthTemplate('VERIFICATION_CODE')
      if (authTemplate?.body) {
        emailSubject = deliveryTemplateService.replaceVariables(authTemplate.subject, {
          orderNumber: order.orderNumber,
          customerName,
          verificationCode,
          guestAccessUrl,
          signUpUrl,
          email
        })
        emailText = deliveryTemplateService.replaceVariables(authTemplate.body, {
          orderNumber: order.orderNumber,
          customerName,
          verificationCode,
          guestAccessUrl,
          signUpUrl,
          email
        })
      }
    } catch (_) {
      // use default subject and body
    }

    await sendEmail(normalizedEmail, emailText, emailSubject)

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        expiresIn: 600 // seconds
      }
    })
  } catch (error) {
    console.error('Send guest verification code error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send verification code'
    })
  }
}

/**
 * Download guest order in different formats (TXT, Excel, JSON)
 * GET /api/v1/customer/orders/guest/download
 * Supports both guest users (via email) and authenticated users (via token)
 */
export const downloadGuestOrder = async (req: AuthRequest, res: Response) => {
  try {
    // Get orderId from either route params (/:id/download) or query params (guest/download)
    const orderIdParam = req.params.id || req.query.orderId
    const { email, format, simple } = req.query
    const userId = req.user?.userId // Get userId from token if authenticated
    const useSimpleFormat = simple === '1' || simple === 'true'

    // Handle orderId - could be string, array, ParsedQs, or undefined
    let orderId: string | undefined
    if (orderIdParam) {
      if (Array.isArray(orderIdParam)) {
        orderId = typeof orderIdParam[0] === 'string' ? orderIdParam[0] : String(orderIdParam[0] || '')
      } else if (typeof orderIdParam === 'string') {
        orderId = orderIdParam
      } else {
        orderId = String(orderIdParam)
      }
    }

    if (!orderId || !format) {
      return res.status(400).json({
        success: false,
        message: 'orderId and format are required'
      })
    }

    // For authenticated users, email is optional (will get from user relationship)
    // For guest users, email is required
    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for guest users, or user must be authenticated'
      })
    }

    // Validate format
    if (!['txt', 'excel', 'json'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: txt, excel, json'
      })
    }

    // Parse and validate orderId
    const orderIdStr = String(orderId).trim()
    const orderIdNum = parseInt(orderIdStr, 10)
    
    // Validate orderId is a valid number
    if (isNaN(orderIdNum) || orderIdNum <= 0 || orderIdStr === '' || orderIdStr === 'NaN') {
      console.error('[downloadGuestOrder] Invalid orderId:', {
        orderId,
        orderIdParam,
        orderIdStr,
        parsed: orderIdNum,
        type: typeof orderId,
        isNaN: isNaN(orderIdNum),
        userId,
        email
      })
      return res.status(400).json({
        success: false,
        message: `Invalid order ID: ${orderId}. Please provide a valid numeric order ID.`
      })
    }
    
    // Handle email - could be string, array, ParsedQs, or empty
    let emailStr: string | undefined
    if (email) {
      if (Array.isArray(email)) {
        emailStr = typeof email[0] === 'string' ? email[0] : undefined
      } else if (typeof email === 'string') {
        emailStr = email
      } else {
        // Handle ParsedQs or other types - convert to string if possible
        emailStr = String(email) || undefined
      }
      // Remove empty strings
      if (emailStr === '' || emailStr === 'undefined' || emailStr === 'null') {
        emailStr = undefined
      }
    }

    if (!userId && emailStr) {
      const guestAccess = validateGuestSessionAccess(req, emailStr)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }

      emailStr = guestAccess.email
    }
    
    const formatStr = format as 'txt' | 'excel' | 'json'

    // Build where clause - use AND to combine id with access control
    const orConditions = []
    if (userId) {
      orConditions.push({ userId })
    }
    if (emailStr) {
      orConditions.push({ guestEmail: emailStr })
    }
    
    // Validate we have at least one access condition
    if (orConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Access denied: Email or authentication required'
      })
    }

    // Find order - use AND to combine id filter with access control OR
    const order = await db.order.findFirst({
      where: {
        AND: [
          { id: orderIdNum },
          {
            OR: orConditions
          }
        ]
      },
      include: {
        user: {
          select: {
            email: true
          }
        },
        deliveries: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            accounts: true
          }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have access to this order'
      })
    }

    // For authenticated users, verify email matches if provided
    if (userId && emailStr && order.user?.email !== emailStr) {
      return res.status(403).json({
        success: false,
        message: 'Email does not match the order owner'
      })
    }

    // Use email from order user if authenticated, otherwise use provided email
    const userEmail = order.user?.email || emailStr || ''

    // Get product and accounts
    const [product, accounts] = await Promise.all([
      db.product.findFirst({
        where: { id: order.productId, deletedAt: null },
        select: {
          id: true,
          name: true,
          platform: true,
          type: true
        }
      }),
      db.account.findMany({
        where: { usedByOrderId: order.id },
        select: {
          id: true,
          encryptedData: true,
          platform: true
        }
      })
    ])

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const childOrderIds = getChildOrderIds(order.meta)
    let summaryProduct = product
    let resolvedAccounts: any[] = []
    let resolvedOrder = order

    if (childOrderIds.length > 0) {
      const childOrders = await db.order.findMany({
        where: {
          id: { in: childOrderIds }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              platform: true,
              type: true
            }
          },
          deliveries: {
            orderBy: { createdAt: 'desc' },
            select: {
              accounts: true
            }
          }
        }
      })

      const combinedAccounts = childOrders.flatMap((childOrder) =>
        normalizeDeliveryAccounts(childOrder.deliveries[0]?.accounts).map((account) => ({
          ...account,
          productName: childOrder.product.name,
          childOrderNumber: childOrder.orderNumber
        }))
      )

      resolvedAccounts = combinedAccounts
      summaryProduct = {
        ...product,
        name:
          childOrders.length > 1
            ? `${childOrders[0]?.product?.name || product.name} + ${childOrders.length - 1} more`
            : childOrders[0]?.product?.name || product.name
      }
      resolvedOrder = {
        ...order,
        quantityDelivered: childOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityDelivered || 0),
          0
        ),
        quantityPending: childOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityPending || 0),
          0
        )
      }
    }

    // Attach product to order for generation functions
    const orderWithProduct = {
      ...resolvedOrder,
      product: summaryProduct
    }

    // Decrypt accounts data
    const decryptedAccounts = accounts.map((acc) => {
      try {
        const decrypted = decrypt(acc.encryptedData)
        return {
          ...acc,
          ...JSON.parse(decrypted)
        }
      } catch (error) {
        console.error('Failed to decrypt account:', error)
        return {
          ...acc,
          username: 'Error decrypting account'
        }
      }
    })

    if (resolvedAccounts.length === 0) {
      const deliverySnapshotAccounts = normalizeDeliveryAccounts(order.deliveries[0]?.accounts)
      resolvedAccounts =
        deliverySnapshotAccounts.length > 0 ? deliverySnapshotAccounts : decryptedAccounts
    }

    if (summaryProduct.type === 'FILE' && formatStr === 'json') {
      return res.status(400).json({
        success: false,
        message: 'JSON download is not available for file products'
      })
    }

    // Check if order is marked DELIVERED but has no accounts (data inconsistency)
    if (order.deliveryStatus === 'DELIVERED' && product.type === 'ACCOUNT' && resolvedAccounts.length === 0) {
      console.error(`[downloadGuestOrder] Order ${order.id} (${order.orderNumber}) is marked DELIVERED but has no assigned accounts`)
      return res.status(400).json({
        success: false,
        message: `Order ${order.orderNumber} is marked as delivered, but no accounts have been assigned yet. ` +
                 `Please contact support or wait for account assignment to complete. ` +
                 `This may be a temporary issue that will be resolved shortly.`
      })
    }

    // Generate file content based on format
    let fileContent: string | Buffer
    let fileName: string
    let contentType: string

    if (formatStr === 'txt') {
      const deliveryTemplate = await deliveryTemplateService.getDefaultTemplate()
      const normalizedDeliveryTemplate = deliveryTemplate
        ? {
            credentialsHeader: deliveryTemplate.credentialsHeader || undefined,
            credentialsFooter: deliveryTemplate.credentialsFooter || undefined
          }
        : null
      const header =
        deliveryTemplate?.credentialsFormat?.replace(/\{\{itemName\}\}/gi, product.name)
          .replace(/\{\{orderNumber\}\}/gi, order.orderNumber)
          .replace(/\{\{quantity\}\}/gi, String(order.quantity)) ??
        `____ Item Order #${order.orderNumber} ____`
      const footer =
        deliveryTemplate?.credentialsFooter ?? '____ end of goods ____'
      if (useSimpleFormat) {
        fileContent = generateTxtContentSimple(
          orderWithProduct,
          resolvedAccounts,
          header,
          footer
        )
      } else {
        fileContent = generateTxtContent(
          orderWithProduct,
          resolvedAccounts,
          userEmail,
          normalizedDeliveryTemplate
        )
      }
      fileName = `Order_${order.orderNumber}_Delivery.txt`
      contentType = 'text/plain; charset=utf-8'
    } else if (formatStr === 'excel') {
      fileContent = generateExcelContent(orderWithProduct, resolvedAccounts, userEmail)
      fileName = `Order_${order.orderNumber}_Delivery.csv`
      contentType = 'text/csv;charset=utf-8'
    } else {
      fileContent = generateJsonContent(orderWithProduct, resolvedAccounts, userEmail)
      fileName = `Order_${order.orderNumber}_Delivery.json`
      contentType = 'application/json; charset=utf-8'
    }

    // Set response headers
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    if (typeof fileContent === 'string') {
      res.send(fileContent)
    } else {
      res.send(fileContent)
    }
  } catch (error) {
    console.error('Guest order download error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to download order'
    })
  }
}

/**
 * Generate simple TXT format: header, one line per account (email:password or phone:password), footer
 * Matches "Hotmail format" with ____ Item Order #... ____ and ____ end of goods ____
 */
function generateTxtContentSimple(
  order: any,
  accounts: any[],
  header: string,
  footer: string
): string {
  if (order.product.type === 'FILE') {
    const lines: string[] = [header, '']
    accounts.forEach((file: any, index: number) => {
      lines.push(`${file.fileName || `File ${index + 1}`}: ${file.fileUrl || 'N/A'}`)
    })
    lines.push('', footer)
    return lines.join('\n')
  }

  const lines: string[] = [header, '']
  for (const acc of accounts) {
    const creds = acc.credentials || acc
    const login =
      acc.phone ||
      creds.username ||
      creds.id ||
      creds.email ||
      creds.phone ||
      acc.email ||
      acc.username ||
      acc.id ||
      'N/A'
    const pass = acc.password || creds.password || 'N/A'
    lines.push(`${login}:${pass}`)
  }
  lines.push('', footer)
  return lines.join('\n')
}

/**
 * Generate TXT format content (detailed)
 */
function generateTxtContent(
  order: any,
  accounts: any[],
  email: string,
  deliveryTemplate?: { credentialsHeader?: string; credentialsFooter?: string } | null
): string {
  if (order.product.type === 'FILE') {
    const fileLines = accounts
      .map(
        (file: any, index: number) =>
          `File #${index + 1}\nFile Name: ${file.fileName || `File ${index + 1}`}\nDownload URL: ${file.fileUrl || 'N/A'}`
      )
      .join('\n\n')

    return `
UHQ ACCOUNTS - FILE DELIVERY

Order Number: ${order.orderNumber}
Product: ${order.product.name}
Quantity Ordered: ${order.quantity}
Delivery Status: ${order.deliveryStatus}
Customer Email: ${email}

DELIVERED FILES
${fileLines}
    `.trim()
  }

  const credsHeader = deliveryTemplate?.credentialsHeader ?? 'ACCOUNT CREDENTIALS'
  const credsFooter = deliveryTemplate?.credentialsFooter ?? ''

  let content = `
╔════════════════════════════════════════════════════════════════╗
║           UHQ ACCOUNTS - ORDER DELIVERY DETAILS                ║
╚════════════════════════════════════════════════════════════════╝

ORDER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number:       ${order.orderNumber}
Order Date:         ${order.createdAt.toISOString().split('T')[0]}
Delivery Status:    ${order.deliveryStatus}
Product:            ${order.product.name}
Platform:           ${order.product.platform}
Total Amount:       $${parseFloat(order.total).toFixed(2)}
Quantity Ordered:   ${order.quantity}
Quantity Delivered: ${order.quantityDelivered}
${order.quantityPending > 0 ? `Quantity Pending:   ${order.quantityPending}\n` : ''}

CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:              ${email}
${order.customerName ? `Name:               ${order.customerName}\n` : ''}${order.customerPhone ? `Phone:              ${order.customerPhone}\n` : ''}

${credsHeader}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

  if (order.product.platform === 'TELEGRAM') {
    accounts.forEach((acc: any, index: number) => {
      content += `
Account #${index + 1}
─────────────────────────────────────────────────────────────────
Phone Number:       ${acc.phone || 'N/A'}
2FA Password:       ${acc.password || 'Not set'}
Premium Status:     ${acc.hasPremium ? 'Yes ✓' : 'No'}
Session Data:       ${acc.sessionData ? 'Available' : 'Not available'}

${acc.backupCodes && acc.backupCodes.length > 0 ? `Backup Codes:\n${acc.backupCodes.map((code: string, i: number) => `  ${i + 1}. ${code}`).join('\n')}\n` : ''}
`
    })
  } else {
    accounts.forEach((acc: any, index: number) => {
      const creds = acc.credentials || acc
      const username =
        acc.username ||
        creds.username ||
        creds.id ||
        acc.id ||
        acc.email ||
        creds.email ||
        'N/A'
      const password = acc.password || creds.password || 'N/A'
      const emailAddress = acc.email || creds.email || ''
      const phone = acc.phone || creds.phone || ''
      const recoveryEmail = acc.recoveryEmail || creds.recoveryEmail || ''
      const twoFactorSecret = acc.twoFactorSecret || creds.twoFactorSecret || ''
      const note = acc.note || creds.note || ''
      content += `
Account #${index + 1}
─────────────────────────────────────────────────────────────────
Username:           ${username}
Password:           ${password}
${emailAddress ? `Email:              ${emailAddress}\n` : ''}${phone ? `Phone:              ${phone}\n` : ''}${recoveryEmail ? `Recovery Email:     ${recoveryEmail}\n` : ''}${twoFactorSecret ? `2FA Secret:         ${twoFactorSecret}\n` : ''}${note ? `Note:               ${note}\n` : ''}
`
    })
  }

  if (credsFooter) {
    content += `\n${credsFooter}\n\n`
  }

  content += `
═══════════════════════════════════════════════════════════════════

IMPORTANT SECURITY NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Keep these credentials HIGHLY confidential
⚠️  Never share these accounts with unauthorized persons
⚠️  Consider changing passwords after first login (recommended)
⚠️  Store this file in a secure location
⚠️  Delete this file after saving credentials to your password manager

SUPPORT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:              support@flexora.com
Website:            https://flexora.com
Help Center:        https://flexora.com/help

Thank you for your purchase!

═══════════════════════════════════════════════════════════════════
Generated on: ${new Date().toISOString()}
This file was securely generated after email verification.
═══════════════════════════════════════════════════════════════════
`

  return content.trim()
}

/**
 * Generate Excel format content
 * Returns CSV file (which Excel can open)
 */
function generateExcelContent(order: any, accounts: any[], email: string): Buffer {
  if (order.product.type === 'FILE') {
    let csv = 'ORDER INFORMATION\n'
    csv += 'Field,Value\n'
    csv += `Order Number,"${order.orderNumber}"\n`
    csv += `Product,"${order.product.name}"\n`
    csv += `Quantity,"${order.quantity}"\n`
    csv += `Status,"${order.deliveryStatus}"\n\n`
    csv += 'DELIVERED FILES\n'
    csv += 'File #,File Name,Download URL\n'
    accounts.forEach((file: any, index: number) => {
      csv += `"${index + 1}","${file.fileName || `File ${index + 1}`}","${file.fileUrl || ''}"\n`
    })
    return Buffer.from(csv, 'utf-8')
  }

  // Generate CSV that Excel can open
  let csv = 'ORDER INFORMATION\n'
  csv += 'Field,Value\n'
  csv += `Order Number,"${order.orderNumber}"\n`
  csv += `Order Date,"${order.createdAt.toISOString().split('T')[0]}"\n`
  csv += `Product,"${order.product.name}"\n`
  csv += `Platform,"${order.product.platform}"\n`
  csv += `Total Amount,"$${parseFloat(order.total).toFixed(2)}"\n`
  csv += `Quantity,"${order.quantity}"\n`
  csv += `Quantity Delivered,"${order.quantityDelivered}"\n`
  if (order.quantityPending > 0) {
    csv += `Quantity Pending,"${order.quantityPending}"\n`
  }
  csv += `Status,"${order.deliveryStatus}"\n\n`

  csv += 'CUSTOMER INFORMATION\n'
  csv += `Email,"${email}"\n`
  if (order.customerName) csv += `Name,"${order.customerName}"\n`
  if (order.customerPhone) csv += `Phone,"${order.customerPhone}"\n`
  csv += '\n'

  csv += 'ACCOUNT CREDENTIALS\n'
  csv += 'Account #,Username/Phone,Password,Email,Extra\n'
  accounts.forEach((acc: any, index: number) => {
    const creds = acc.credentials || acc
    const username =
      acc.phone ||
      acc.username ||
      creds.username ||
      creds.id ||
      acc.id ||
      acc.email ||
      creds.email ||
      'N/A'
    const password = acc.password || creds.password || 'Not set'
    const email = acc.email || creds.email || ''
    const extra = acc.note || creds.note || acc.recoveryEmail || creds.recoveryEmail || 'Check TXT file for full details'
    csv += `"${index + 1}","${username}","${password}","${email}","${extra}"\n`
  })

  csv += '\n\n⚠️  IMPORTANT: Keep this file secure! Contains sensitive credentials.\n'
  csv += 'For full account details and security notes, download the TXT format.\n'

  return Buffer.from(csv, 'utf-8')
}

/**
 * Generate JSON format content
 */
function generateJsonContent(order: any, accounts: any[], email: string): string {
  if (order.product.type === 'FILE') {
    throw new Error('JSON download is not available for file products')
  }

  const jsonData = {
    orderInformation: {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString().split('T')[0],
      deliveryStatus: order.deliveryStatus,
      product: {
        name: order.product.name,
        platform: order.product.platform,
        type: order.product.type
      },
      quantity: {
        ordered: order.quantity,
        delivered: order.quantityDelivered,
        pending: order.quantityPending
      },
      totalAmount: parseFloat(order.total).toFixed(2)
    },
    customerInformation: {
      email: email,
      name: order.customerName || null,
      phone: order.customerPhone || null
    },
    accountCredentials: accounts.map((acc: any, index: number) => {
      if (order.product.platform === 'TELEGRAM') {
        return {
          accountNumber: index + 1,
          phoneNumber: acc.phone || null,
          twoFAPassword: acc.password || null,
          premiumStatus: acc.hasPremium ? 'Yes' : 'No',
          backupCodes: acc.backupCodes || []
        }
      } else {
        const creds = acc.credentials || acc
        return {
          accountNumber: index + 1,
          username:
            acc.username ||
            creds.username ||
            creds.id ||
            acc.id ||
            acc.email ||
            creds.email ||
            null,
          password: acc.password || creds.password || null,
          email: acc.email || creds.email || null,
          phone: acc.phone || creds.phone || null,
          recoveryEmail: acc.recoveryEmail || creds.recoveryEmail || null,
          twoFactorSecret: acc.twoFactorSecret || creds.twoFactorSecret || null,
          note: acc.note || creds.note || null
        }
      }
    }),
    securityNotes: [
      'Keep these credentials HIGHLY confidential',
      'Never share accounts with unauthorized persons',
      'Consider changing passwords after first login',
      'Store this file in a secure location',
      'Delete after saving to password manager'
    ],
    support: {
      email: 'support@flexora.com',
      website: 'https://flexora.com',
      helpCenter: 'https://flexora.com/help'
    },
    generatedAt: new Date().toISOString()
  }

  return JSON.stringify(jsonData, null, 2)
}
