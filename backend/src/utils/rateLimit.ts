/**
 * Rate Limiting Utilities
 * Prevents abuse of API endpoints
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

/**
 * Rate limiter for Binance payment verification
 * 30 requests per minute per IP
 */
export const binanceVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many verification attempts. Please try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use proper ipKeyGenerator for IPv6 compatibility
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use proper IP key generator
    const userId = (req as any).user?.userId
    if (userId) {
      return `binance-verify:user:${userId}`
    }
    // Use ipKeyGenerator helper for proper IPv4/IPv6 handling
    return ipKeyGenerator(req)
  },
  // Skip rate limiting for admin users (optional)
  skip: (req) => {
    // You can add admin check here if needed
    return false
  }
})

/**
 * Rate limiter for general API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false
})

