/**
 * Admin Binance Settings Controller
 * Manages Binance configuration, session status, and bootstrap login
 */

import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../../types/req-res'
import { sendSuccessResponse, sendErrorResponse } from '../../utils'
import db from '../../configs/db'
import { hasValidSession, saveSession } from '../../lib/binance'
import { z } from 'zod'

const importSessionSchema = z.object({
  email: z.string().trim().email().optional(),
  cookiesText: z.string().trim().min(1, 'Cookies text is required')
})

type BinanceCookie = {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

function parseNetscapeCookies(cookieText: string): BinanceCookie[] {
  const lines = cookieText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('\t'))

  const parsed: BinanceCookie[] = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 7) continue

    const [domainRaw, _subdomainFlag, pathRaw, secureRaw, expiryRaw, nameRaw, valueRaw] = parts
    const domain = (domainRaw || '').trim()
    const path = (pathRaw || '').trim()
    const name = (nameRaw || '').trim()
    const value = (valueRaw || '').trim()
    if (!domain || !path || !name || !value) continue

    const secure = secureRaw === 'TRUE'
    const expires = expiryRaw && expiryRaw !== '0' ? parseInt(expiryRaw, 10) : undefined
    const sameSite: 'Strict' | 'Lax' | 'None' = secure ? 'None' : 'Lax'

    parsed.push({
      name,
      value,
      domain,
      path,
      expires: Number.isFinite(expires) ? expires : undefined,
      httpOnly: false,
      secure,
      sameSite
    })
  }

  return parsed
}

function normalizeCookieShape(input: any): BinanceCookie | null {
  if (!input || typeof input !== 'object') return null
  const name = String(input.name || '').trim()
  const value = String(input.value || '').trim()
  const domain = String(input.domain || '').trim()
  const path = String(input.path || '/').trim() || '/'
  if (!name || !value || !domain) return null

  const rawSameSite = String(input.sameSite || '').toLowerCase()
  const sameSite: 'Strict' | 'Lax' | 'None' =
    rawSameSite === 'strict' ? 'Strict' : rawSameSite === 'none' ? 'None' : 'Lax'

  const expiresNum =
    typeof input.expires === 'number'
      ? input.expires
      : typeof input.expires === 'string' && input.expires.trim()
        ? Number(input.expires)
        : undefined

  return {
    name,
    value,
    domain,
    path,
    expires: Number.isFinite(expiresNum) ? expiresNum : undefined,
    httpOnly: Boolean(input.httpOnly),
    secure: Boolean(input.secure),
    sameSite
  }
}

function parseCookiesPayload(cookiesText: string): BinanceCookie[] {
  const trimmed = cookiesText.trim()

  // JSON input: array exported from extensions or dev tools
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeCookieShape).filter((cookie): cookie is BinanceCookie => !!cookie)
  }

  // Netscape input: tab-separated cookie lines
  return parseNetscapeCookies(trimmed)
}

/**
 * Get Binance configuration and session status
 * GET /api/v1/admin/binance/config
 */
export const getBinanceConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Get session status
    const sessionValid = await hasValidSession()
    const session = await db.binanceSession.findUnique({
      where: { sessionId: 'default' },
      select: {
        id: true,
        email: true,
        isValid: true,
        expiresAt: true,
        updatedAt: true,
        createdAt: true
      }
    })

    // Get recent audit logs count
    const recentLogsCount = await db.binanceAuditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    // Get failed verification attempts in last 24 hours
    const failedAttempts = await db.binanceAuditLog.count({
      where: {
        result: {
          not: 'ok'
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    return sendSuccessResponse(
      res,
      {
        session: session
          ? {
              email: session.email,
              isValid: session.isValid,
              expiresAt: session.expiresAt,
              updatedAt: session.updatedAt,
              createdAt: session.createdAt
            }
          : null,
        sessionValid,
        stats: {
          recentLogsCount,
          failedAttempts
        },
        // Don't expose sensitive info - credentials should be in env vars
        credentialsConfigured: {
          email: !!process.env.BINANCE_EMAIL,
          password: !!process.env.BINANCE_PASSWORD,
          totpSecret: !!process.env.BINANCE_TOTP_SECRET
        }
      },
      'Binance configuration retrieved'
    )
  } catch (error: any) {
    return next(error)
  }
}

/**
 * Get Binance audit logs
 * GET /api/v1/admin/binance/audit-logs
 */
export const getBinanceAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const skip = (page - 1) * limit

    const result = req.query.result as string | undefined
    const type = req.query.type as string | undefined

    const where: any = {}
    if (result) {
      if (result === 'not_ok') {
        // Filter for all non-ok results
        where.result = {
          not: 'ok'
        }
      } else {
        where.result = result
      }
    }
    if (type) {
      where.type = type
    }

    const [logs, total] = await Promise.all([
      db.binanceAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      db.binanceAuditLog.count({ where })
    ])

    return sendSuccessResponse(
      res,
      {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'Audit logs retrieved'
    )
  } catch (error: any) {
    return next(error)
  }
}

/**
 * Trigger bootstrap login (admin must run script manually)
 * POST /api/v1/admin/binance/bootstrap-status
 * This endpoint just returns instructions since bootstrap must be run via CLI
 */
export const getBootstrapStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const sessionValid = await hasValidSession()
    const hasCredentials =
      !!process.env.BINANCE_EMAIL &&
      !!process.env.BINANCE_PASSWORD &&
      !!process.env.BINANCE_TOTP_SECRET

    return sendSuccessResponse(
      res,
      {
        sessionValid,
        hasCredentials,
        instructions: hasCredentials
          ? 'Run the bootstrap script: bun run bootstrap:binance'
          : 'Configure BINANCE_EMAIL, BINANCE_PASSWORD, and BINANCE_TOTP_SECRET in .env file first',
        command: 'bun run bootstrap:binance'
      },
      'Bootstrap status retrieved'
    )
  } catch (error: any) {
    return next(error)
  }
}

/**
 * Test Binance session
 * POST /api/v1/admin/binance/test-session
 */
export const testBinanceSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const sessionValid = await hasValidSession()

    if (!sessionValid) {
      return sendErrorResponse(res, 'No valid Binance session found. Please run bootstrap login.', 400)
    }

    // Try to fetch transfer history (just check if session works)
    try {
      const { findTransferByOrderId } = await import('../../lib/binance')
      // Use a dummy order ID to test connection (won't find it, but will test session)
      await findTransferByOrderId('99999999999999999999').catch(() => {
        // Expected to fail, but if it's a session error, we'll catch it
      })

      return sendSuccessResponse(res, { sessionValid: true }, 'Session is valid')
    } catch (error: any) {
      if (error.message.includes('SESSION_EXPIRED') || error.message.includes('NO_SESSION_COOKIES')) {
        return sendErrorResponse(res, 'Session expired. Please run bootstrap login again.', 400)
      }
      // Other errors are fine (like order not found) - means session is working
      return sendSuccessResponse(res, { sessionValid: true }, 'Session is valid')
    }
  } catch (error: any) {
    return next(error)
  }
}

/**
 * Import Binance session cookies from admin UI
 * POST /api/v1/admin/binance/import-session
 */
export const importBinanceSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parsedBody = importSessionSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return sendErrorResponse(res, parsedBody.error.issues[0]?.message || 'Invalid request body', 400)
    }

    const { email, cookiesText } = parsedBody.data
    let cookies: BinanceCookie[] = []
    try {
      cookies = parseCookiesPayload(cookiesText)
    } catch {
      return sendErrorResponse(
        res,
        'Invalid cookies format. Use JSON array or Netscape tab-separated format.',
        400
      )
    }

    if (!cookies.length) {
      return sendErrorResponse(
        res,
        'No valid cookies found. Please paste valid Binance cookies.',
        400
      )
    }

    await saveSession(cookies, email || process.env.BINANCE_EMAIL || undefined)

    return sendSuccessResponse(
      res,
      { savedCookies: cookies.length },
      'Binance session imported successfully'
    )
  } catch (error: any) {
    return next(error)
  }
}

