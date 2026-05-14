/**
 * Risk Management Utility for Payment Processing
 * Implements IP blocking, email blocking, and duplicate payment prevention
 */

import db from '../configs/db'

/**
 * Risky IP addresses (can be extended with database lookup)
 * In production, this should be stored in a database table
 * Using object property to avoid module initialization issues with dynamic imports
 */
const riskManagementData = {
  _riskyIPs: null as Set<string> | null,
  _flaggedEmailDomains: null as Set<string> | null,
  
  get riskyIPs(): Set<string> {
    if (!this._riskyIPs) {
      this._riskyIPs = new Set<string>([
        // Add known risky IPs here
        // Example: '192.168.1.100'
      ])
    }
    return this._riskyIPs
  },
  
  get flaggedEmailDomains(): Set<string> {
    if (!this._flaggedEmailDomains) {
      this._flaggedEmailDomains = new Set<string>([
        // Add known risky email domains here
        // Example: 'tempmail.com'
      ])
    }
    return this._flaggedEmailDomains
  }
}

/**
 * Check if IP address is risky
 * @param ipAddress - IP address to check
 * @returns true if IP is flagged as risky
 */
export async function isRiskyIP(ipAddress?: string): Promise<boolean> {
  if (!ipAddress) return false

  // Check static list
  if (riskManagementData.riskyIPs.has(ipAddress)) {
    return true
  }

  // TODO: Add database lookup for risky IPs
  // const riskyIP = await db.riskyIP.findFirst({ where: { ipAddress } })
  // if (riskyIP) return true

  return false
}

/**
 * Check if email is flagged
 * @param email - Email address to check
 * @returns true if email domain is flagged
 */
export async function isFlaggedEmail(email?: string): Promise<boolean> {
  if (!email) return false

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  // Check static list
  if (riskManagementData.flaggedEmailDomains.has(domain)) {
    return true
  }

  // TODO: Add database lookup for flagged emails
  // const flaggedEmail = await db.flaggedEmail.findFirst({ where: { domain } })
  // if (flaggedEmail) return true

  return false
}

/**
 * Check for duplicate payment intent
 * Prevents duplicate payments using the same intent_id
 * @param paymentIntentId - Stripe Payment Intent ID
 * @param orderId - Order ID
 * @returns true if duplicate payment detected
 */
export async function isDuplicatePayment(
  paymentIntentId: string,
  orderId: number
): Promise<boolean> {
  try {
    // Check if payment with this intent ID already exists
    const existingPayment = await db.payment.findFirst({
      where: {
        gatewayTxnId: paymentIntentId,
        orderId: {
          not: orderId // Allow same intent for same order (retry scenario)
        },
        status: {
          in: ['COMPLETED', 'PENDING'] // Only check completed/pending payments
        }
      }
    })

    if (existingPayment) {
      console.warn('[Risk Management] Duplicate payment detected', {
        paymentIntentId,
        existingOrderId: existingPayment.orderId,
        newOrderId: orderId
      })
      return true
    }

    // Also check metadata for intent ID (for cloaked payments)
    const existingPaymentByMeta = await db.payment.findFirst({
      where: {
        orderId: {
          not: orderId
        },
        status: {
          in: ['COMPLETED', 'PENDING']
        },
        meta: {
          path: ['paymentIntentId'],
          equals: paymentIntentId
        }
      }
    })

    if (existingPaymentByMeta) {
      console.warn('[Risk Management] Duplicate payment detected via metadata', {
        paymentIntentId,
        existingOrderId: existingPaymentByMeta.orderId,
        newOrderId: orderId
      })
      return true
    }

    return false
  } catch (error: any) {
    console.error('[Risk Management] Error checking duplicate payment', {
      error: error.message,
      paymentIntentId,
      orderId
    })
    // Fail open - don't block payment if check fails
    return false
  }
}

/**
 * Validate payment request for risk factors
 * @param params - Payment validation parameters
 * @returns Validation result with risk flags
 */
export async function validatePaymentRequest(params: {
  ipAddress?: string
  email?: string
  paymentIntentId?: string
  orderId?: number
}): Promise<{
  allowed: boolean
  reasons: string[]
}> {
  const reasons: string[] = []

  // Check risky IP
  if (await isRiskyIP(params.ipAddress)) {
    reasons.push('IP address is flagged as risky')
  }

  // Check flagged email
  if (await isFlaggedEmail(params.email)) {
    reasons.push('Email domain is flagged')
  }

  // Check duplicate payment
  if (params.paymentIntentId && params.orderId) {
    if (await isDuplicatePayment(params.paymentIntentId, params.orderId)) {
      reasons.push('Duplicate payment detected')
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons
  }
}


