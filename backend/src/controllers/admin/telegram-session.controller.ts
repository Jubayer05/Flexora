import type { Response } from 'express'
import db from '../../configs/db'
import { NotificationService } from '../../services/notification.service'
import { SessionService } from '../../services/telegram/session'
import { OtpService } from '../../services/telegram/otp'
import { telegramProxyService } from '../../services/telegram/proxy.service'
import type { AuthRequest } from '../../types/req-res'
import type { TelegramAccountMeta } from '../../types/telegram.types'
import type { ProxyConfig } from '../../services/telegram/types'

const notificationService = new NotificationService()
const PROXY_LOGIN_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.TELEGRAM_PROXY_LOGIN_MAX_ATTEMPTS || 3)
)

const NON_RETRYABLE_SESSION_MESSAGES = [
  'invalid phone number',
  'phone number is banned',
  'too many attempts',
  'already registered',
  'two-factor authentication required',
  'invalid or expired otp',
  'invalid 2fa password',
  'no pending otp request'
]

const isSameProxy = (left?: ProxyConfig, right?: ProxyConfig) =>
  !!left &&
  !!right &&
  left.host === right.host &&
  left.port === right.port &&
  (left.username || '') === (right.username || '')

const isRetryableSessionFailure = (message?: string) => {
  const normalized = (message || '').toLowerCase()
  if (!normalized) return true
  return !NON_RETRYABLE_SESSION_MESSAGES.some((pattern) => normalized.includes(pattern))
}

/**
 * Helper function to get proxy configuration for a phone number
 */
async function getProxyForPhone(phoneNumber: string): Promise<ProxyConfig | undefined> {
  try {
    const account = await db.account.findFirst({
      where: {
        platform: 'TELEGRAM',
        meta: {
          path: ['phone'],
          equals: phoneNumber
        }
      }
    })

    if (account && account.meta) {
      const meta = account.meta as TelegramAccountMeta
      if (meta.proxy) {
        return {
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
  return undefined
}

async function getProxyForSession(
  phoneNumber: string,
  useProxy?: boolean
): Promise<ProxyConfig | undefined> {
  if (!useProxy) {
    return undefined
  }

  const accountProxy = await getProxyForPhone(phoneNumber)
  if (accountProxy) {
    return accountProxy
  }

  const pooledProxy = await telegramProxyService.getNextProxy()
  return pooledProxy || undefined
}

async function runWithProxyFallback<T extends { success: boolean; message?: string; proxy?: ProxyConfig }>(
  phoneNumber: string,
  useProxy: boolean,
  operation: (proxy?: ProxyConfig) => Promise<T>,
  preferredProxy?: ProxyConfig
): Promise<T> {
  if (!useProxy) {
    return operation(undefined)
  }

  const triedProxies: ProxyConfig[] = []
  let lastResult: T | null = null
  let firstProxy = preferredProxy || (await getProxyForPhone(phoneNumber))

  for (let attempt = 0; attempt < PROXY_LOGIN_MAX_ATTEMPTS; attempt++) {
    const proxy =
      firstProxy && !triedProxies.some((triedProxy) => isSameProxy(triedProxy, firstProxy))
        ? firstProxy
        : await telegramProxyService.getNextProxyExcluding(triedProxies)

    firstProxy = undefined

    if (!proxy) {
      if (lastResult) return lastResult
      return {
        success: false,
        message: 'No healthy proxy found. Please add, test, or enable Telegram-compatible proxies first.'
      } as T
    }

    triedProxies.push(proxy)

    try {
      const result = await operation(proxy)
      lastResult = result

      if (result.success) {
        telegramProxyService.reportSuccess(proxy)
        return result
      }

      telegramProxyService.reportFailure(proxy)

      if (!isRetryableSessionFailure(result.message) || attempt === PROXY_LOGIN_MAX_ATTEMPTS - 1) {
        return result
      }

      console.warn('[Telegram Proxy] Session attempt failed, trying next proxy:', {
        phoneNumber,
        proxy: `${proxy.host}:${proxy.port}`,
        message: result.message
      })
    } catch (error: any) {
      telegramProxyService.reportFailure(proxy)
      lastResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Telegram session proxy attempt failed',
        proxy
      } as T

      if (!isRetryableSessionFailure(lastResult.message) || attempt === PROXY_LOGIN_MAX_ATTEMPTS - 1) {
        return lastResult
      }

      console.warn('[Telegram Proxy] Session attempt threw, trying next proxy:', {
        phoneNumber,
        proxy: `${proxy.host}:${proxy.port}`,
        message: lastResult.message
      })
    }
  }

  return (
    lastResult ||
    ({
      success: false,
      message: 'Telegram session failed with all available proxy attempts.'
    } as T)
  )
}

/**
 * Admin: Create Telegram session for account setup
 * POST /api/v1/admin/telegram-sessions/create-session
 */
export const createTelegramSession = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, useProxy } = req.body
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    const result = await runWithProxyFallback(
      phoneNumber,
      Boolean(useProxy),
      (proxy) => SessionService.createSession(phoneNumber, adminId, proxy)
    )

    return res.json({
      success: (result as any).success,
      message: (result as any).message,
      phoneNumber: (result as any).phoneNumber,
      sessionExists: (result as any).sessionExists,
      isAuthorized: (result as any).isAuthorized,
      requires2FA: (result as any).requires2FA,
      userInfo: (result as any).userInfo,
      proxy: (result as any).proxy
    })
  } catch (error) {
    console.error('Error creating Telegram session:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error while creating session'
    })
  }
}

/**
 * Admin: Submit OTP to complete session creation
 * POST /api/v1/admin/telegram-sessions/submit-otp
 */
export const submitSessionOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, otpCode, password2FA, useProxy } = req.body
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP code are required'
      })
    }

    // Reuse pending proxy if available, otherwise use current choice.
    const pendingProxy = SessionService.getPendingProxy(phoneNumber)
    const result = await runWithProxyFallback(
      phoneNumber,
      Boolean(useProxy) || !!pendingProxy,
      (proxy) => SessionService.submitOtp(phoneNumber, otpCode, adminId, password2FA, proxy),
      pendingProxy
    )

    return res.json({
      success: (result as any).success,
      message: (result as any).message,
      phoneNumber: (result as any).phoneNumber,
      sessionExists: (result as any).sessionExists,
      isAuthorized: (result as any).isAuthorized,
      requires2FA: (result as any).requires2FA,
      userInfo: (result as any).userInfo,
      proxy: (result as any).proxy
    })
  } catch (error) {
    console.error('Error submitting OTP:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error while submitting OTP'
    })
  }
}

/**
 * Admin: Check session status
 * GET /api/v1/admin/telegram-sessions/session-status/:phoneNumber
 */
export const getSessionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber } = req.params
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    // Get proxy configuration
    const proxy = await getProxyForPhone(phoneNumber)

    // Use Node.js native session service
    const result = await SessionService.getSessionStatus(phoneNumber, proxy)

    return res.json({
      success: result.success,
      message: result.message,
      phoneNumber: result.phoneNumber,
      sessionExists: result.sessionExists,
      isAuthorized: result.isAuthorized,
      userInfo: result.userInfo
    })
  } catch (error) {
    console.error('Error getting session status:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking session status'
    })
  }
}

/**
 * Admin: Delete session (for re-creation)
 * DELETE /api/v1/admin/telegram-sessions/delete-session/:phoneNumber
 */
export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber } = req.params
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    // Use Node.js native session service
    const result = await SessionService.deleteSession(phoneNumber)

    return res.json({
      success: result.success,
      message: result.message,
      phoneNumber: result.phoneNumber
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting session'
    })
  }
}

/**
 * Admin: List all sessions
 * GET /api/v1/admin/telegram-sessions/sessions
 */
export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    // Use Node.js native session service
    const result = await SessionService.listSessions()

    return res.json({
      success: result.success,
      sessions: result.sessions,
      total: result.total
    })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error while listing sessions'
    })
  }
}

/**
 * Admin: Kick other sessions (keep current admin session active)
 * POST /api/v1/admin/telegram-sessions/kick-other-sessions
 */
export const kickOtherSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber } = req.body
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    // Get proxy configuration
    const proxy = await getProxyForPhone(phoneNumber)

    // Use TelegramClientSessionService to kick other sessions
    const { TelegramClientSessionService } = await import('../../services/telegram/client-session.service')
    const clientSessionService = new TelegramClientSessionService()

    const result = await clientSessionService.kickOtherSessions(phoneNumber, proxy)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to kick other sessions',
        kicked: result.kicked || 0,
        remaining: result.remaining || 0
      })
    }

    return res.json({
      success: true,
      message: `Successfully kicked ${result.kicked} other session(s). ${result.remaining} session(s) remaining.`,
      kicked: result.kicked,
      remaining: result.remaining
    })
  } catch (error: any) {
    console.error('Error kicking other sessions:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while kicking other sessions'
    })
  }
}

/**
 * Admin: Request OTP for Telegram account login
 * This retrieves OTP codes from recent Telegram messages for accounts with active sessions.
 * POST /api/v1/admin/telegram-sessions/request-otp
 */
export const requestAccountOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber } = req.body
    const adminId = req.user?.userId

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      })
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    // Get proxy configuration
    const proxy = await getProxyForPhone(phoneNumber)

    // Use Node.js native OTP service
    const result = await OtpService.checkRecentOtp(phoneNumber, adminId, 30, proxy)

    if (result.success && result.otp) {
      // Create notification for admin with OTP code
      await notificationService.create({
        userId: adminId,
        type: 'SYSTEM',
        role: 'ADMIN',
        title: `Telegram OTP for ${phoneNumber}`,
        message: `Your verification code is: ${result.otp}`,
        meta: {
          phoneNumber,
          otpCode: result.otp,
          expiresAt: result.expiresAt || new Date(Date.now() + 5 * 60 * 1000)
        }
      })

      console.log(`[Telegram OTP] Sent OTP notification to admin ${adminId} for ${phoneNumber}`)

      return res.json({
        success: true,
        message: 'OTP code found and sent to notifications',
        phoneNumber
      })
    } else {
      // No OTP found or error occurred
      return res.json({
        success: false,
        message:
          result.message ||
          'No recent OTP found. Ensure the account has an active session and Telegram has sent a code.',
        phoneNumber
      })
    }
  } catch (error) {
    console.error('Error requesting OTP:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error while requesting OTP'
    })
  }
}
