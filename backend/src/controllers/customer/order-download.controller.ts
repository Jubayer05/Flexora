import type { Response } from 'express'
import { z } from 'zod'
import db from '../../configs/db'
import { sendEmail } from '../../libs/email'
import { cacheService } from '../../services/cache.service'
import type { AuthRequest } from '../../types/req-res'

// Validation schemas
const RequestOTPSchema = z.object({
  orderId: z.number().int().positive(),
  email: z.string().email()
})

const VerifyOTPSchema = z.object({
  orderId: z.number().int().positive(),
  email: z.string().email(),
  otp: z.string().length(6)
})

/**
 * Request OTP for order delivery download
 * Public endpoint - validates email matches order
 */
export const requestDownloadOTP = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = RequestOTPSchema.parse(req.body)
    const { orderId, email } = validatedData

    // Find order and verify email matches
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ user: { email } }, { guestEmail: email }]
      },
      select: {
        id: true,
        orderNumber: true,
        guestEmail: true,
        user: {
          select: {
            email: true,
            firstName: true
          }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or email does not match'
      })
    }

    // Check rate limit - max 3 OTP requests per hour per order
    const rateLimitKey = `download_otp_rate:${orderId}:${email}`
    const attempts = parseInt((await cacheService.get(rateLimitKey)) || '0')

    if (attempts >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 1 hour.'
      })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in cache with 10-minute expiration
    const otpKey = `download_otp:${orderId}:${email}`
    await cacheService.set(otpKey, otp, 600) // 10 minutes

    // Update rate limit counter
    await cacheService.set(rateLimitKey, (attempts + 1).toString(), 3600) // 1 hour

    // Send OTP via email
    const emailSubject = `Order Delivery Download OTP - ${order.orderNumber}`
    const emailText = `
Hello ${order.user?.firstName || 'Customer'},

You requested to download your order delivery details.

Your OTP Code: ${otp}

This code will expire in 10 minutes.

Order Number: ${order.orderNumber}

If you did not request this, please ignore this email.

Best regards,
UHQ Accounts Team

---
Support: support@flexora.com
    `.trim()

    await sendEmail(email, emailText, emailSubject)

    res.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox.',
      data: {
        expiresIn: 600 // seconds
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.issues
      })
    }

    console.error('Request download OTP error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send OTP'
    })
  }
}

/**
 * Verify OTP and generate download token
 */
export const verifyDownloadOTP = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = VerifyOTPSchema.parse(req.body)
    const { orderId, email, otp } = validatedData

    // Get stored OTP
    const otpKey = `download_otp:${orderId}:${email}`
    const storedOTP = await cacheService.get(otpKey)

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid'
      })
    }

    // Verify OTP
    if (storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      })
    }

    // Generate download token (valid for 5 minutes)
    const downloadToken = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const tokenKey = `download_token:${downloadToken}`
    await cacheService.set(tokenKey, JSON.stringify({ orderId, email }), 300) // 5 minutes

    // Clear the used OTP
    await cacheService.del(otpKey)

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        downloadToken,
        expiresIn: 300 // seconds
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.issues
      })
    }

    console.error('Verify download OTP error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify OTP'
    })
  }
}

/**
 * Download order delivery details as text file
 * Requires valid download token
 */
export const downloadOrderDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Download token is required'
      })
    }

    // Verify download token
    const tokenKey = `download_token:${token}`
    const tokenDataStr = await cacheService.get<string>(tokenKey)

    if (!tokenDataStr) {
      return res.status(401).json({
        success: false,
        message: 'Download token is invalid or has expired'
      })
    }

    const { orderId, email } = JSON.parse(tokenDataStr) as { orderId: number; email: string }

    // Fetch order with delivery details
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ user: { email } }, { guestEmail: email }]
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
        user: {
          select: {
            email: true,
            firstName: true
          }
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    if (!order.deliveries || order.deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No delivery information available for this order'
      })
    }

    const delivery = order.deliveries[0]
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery information not found'
      })
    }

    const accounts = delivery.accounts as any[]

    // Generate text file content
    let textContent = `
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
Total Amount:       $${order.total}
Quantity Ordered:   ${order.quantity}
Quantity Delivered: ${order.quantityDelivered}
${order.quantityPending > 0 ? `Quantity Pending:   ${order.quantityPending}\n` : ''}

CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:               ${order.user?.firstName || order.customerName || 'Guest'}
Email:              ${email}
${order.customerPhone ? `Phone:              ${order.customerPhone}\n` : ''}

ACCOUNT CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

    if (order.product.platform === 'TELEGRAM') {
      // Telegram account format
      accounts.forEach((acc: any, index: number) => {
        textContent += `
Account #${index + 1}
─────────────────────────────────────────────────────────────────
Phone Number:       ${acc.phone || 'N/A'}
2FA Password:       ${acc.password || 'Not set'}
Premium Status:     ${acc.hasPremium ? 'Yes ✓' : 'No'}
Session Data:       ${acc.sessionData ? 'Available' : 'Not available'}

Login Instructions:
${acc.loginInstructions?.steps?.map((step: string) => `  ${step}`).join('\n') || '  Check your dashboard for instructions'}

${acc.backupCodes && acc.backupCodes.length > 0 ? `Backup Codes:\n${acc.backupCodes.map((code: string, i: number) => `  ${i + 1}. ${code}`).join('\n')}\n` : ''}
`
      })
    } else {
      // Other platform format
      accounts.forEach((acc: any, index: number) => {
        const creds = acc.credentials || acc
        textContent += `
Account #${index + 1}
─────────────────────────────────────────────────────────────────
Username:           ${creds.username || creds.email || 'N/A'}
Password:           ${creds.password || 'N/A'}
${creds.email ? `Email:              ${creds.email}\n` : ''}${creds.phone ? `Phone:              ${creds.phone}\n` : ''}${creds.recoveryEmail ? `Recovery Email:     ${creds.recoveryEmail}\n` : ''}${creds.twoFactorSecret ? `2FA Secret:         ${creds.twoFactorSecret}\n` : ''}
`
      })
    }

    textContent += `
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
Dashboard:          https://flexora.com/dashboard
Help Center:        https://flexora.com/help

Thank you for your purchase!

═══════════════════════════════════════════════════════════════════
Generated on: ${new Date().toISOString()}
Download Token: ${token}
This file was securely generated after email verification.
═══════════════════════════════════════════════════════════════════
`

    // Set response headers for file download
    const fileName = `Order_${order.orderNumber}_Delivery.txt`
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.send(textContent)

    // Delete the token after response is sent (one-time use)
    // Use setImmediate to ensure response is fully sent before deletion
    setImmediate(async () => {
      try {
        await cacheService.del(tokenKey)
      } catch (err) {
        console.error('Error deleting download token:', err)
      }
    })
  } catch (error) {
    console.error('Download order delivery error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to download order delivery'
    })
  }
}
