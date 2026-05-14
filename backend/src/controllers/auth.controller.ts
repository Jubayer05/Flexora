import axios from 'axios'
import type { NextFunction, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import db from '../configs/db'
import { AppError } from '../middlewares/error-handler'
import { AdminService } from '../services/admin.services'
import { AuthService } from '../services/auth.services'
import { getClientIP, sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import {
  EmailVerificationCodeSchema,
  EmailVerificationSchema,
  GuestLoginSchema,
  LoginSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResendVerificationSchema,
  RevokeSessionSchema
} from '../validations/zod/user.schema'

// Initialize services
const authService = new AuthService()
const adminService = new AdminService()

// ================================
// AUTHENTICATION ENDPOINTS
// ================================

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = RegisterSchema.parse(req.body)
    const userAgent = req.get('User-Agent')
    const ipAddress = getClientIP(req) || undefined

    const result = await authService.register(validatedData, userAgent, ipAddress)

    return sendCreatedResponse(
      res,
      result,
      result.requiresVerification
        ? 'User registered successfully. Please enter the 6-digit verification code sent to your email.'
        : 'User registered successfully. You can now sign in.'
    )
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = LoginSchema.parse(req.body)
    const userAgent = req.get('User-Agent')
    const ipAddress = getClientIP(req) || undefined

    // Check if user is admin by looking up their role first
    const user = await db.user.findUnique({
      where: { email: validatedData.email },
      select: { role: true, isActive: true, isBanned: true }
    })

    // If user is admin or moderator, use admin login
    if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
      if (!user.isActive) {
        throw new AppError('Account is deactivated', 403)
      }
      if (user.isBanned) {
        throw new AppError('Account is banned', 403)
      }
      const result = await adminService.adminLogin(validatedData, userAgent, ipAddress)
      return sendSuccessResponse(res, result, 'Admin login successful')
    }

    // Otherwise use regular user login
    const result = await authService.login(validatedData, userAgent, ipAddress)
    return sendSuccessResponse(res, result, 'Login successful')
  } catch (error) {
    next(error)
  }
}

export const guestLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = GuestLoginSchema.parse(req.body)
    const userAgent = req.get('User-Agent')
    const ipAddress = getClientIP(req) || undefined

    const result = await authService.loginGuest(validatedData.email, userAgent, ipAddress)

    return sendSuccessResponse(res, result, 'Guest login successful')
  } catch (error) {
    next(error)
  }
}

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const sessionId = (req as any).user?.sessionId
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      })
    }

    await authService.logout(sessionId)

    return sendSuccessResponse(res, null, 'Logout successful')
  } catch (error) {
    next(error)
  }
}

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    await authService.logoutAll(userId)

    return sendSuccessResponse(res, null, 'All sessions logged out successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// TOKEN MANAGEMENT
// ================================

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body)

    const tokens = await authService.refreshToken(refreshToken)

    return sendSuccessResponse(res, tokens, 'Token refreshed successfully')
  } catch (error) {
    next(error)
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      })
    }

    const decoded = await authService.verifyToken(token)

    // Remove sensitive data
    const { user, ...tokenData } = decoded
    const { passwordHash, guestToken, ...userResponse } = user

    return sendSuccessResponse(
      res,
      {
        ...tokenData,
        user: userResponse
      },
      'Token is valid'
    )
  } catch (error) {
    next(error)
  }
}

function verifyTelegramWidgetHash(
  payload: Record<string, string | number>,
  botToken: string
): boolean {
  const crypto = require('crypto')
  const hash = payload.hash as string
  if (!hash) return false
  const checkPayload = { ...payload }
  delete checkPayload.hash
  const dataCheckString = Object.keys(checkPayload)
    .sort()
    .map((k) => `${k}=${checkPayload[k]}`)
    .join('\n')
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return computedHash === hash
}

export async function verifyOauthToken(req: Request, res: Response) {
  const body = req.body as {
    token?: string
    provider?: 'google' | 'facebook' | 'twitter' | 'telegram'
    email?: string
    name?: string
    // Telegram widget payload
    id?: number
    first_name?: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date?: number
    hash?: string
  }

  const userAgent = req.get('User-Agent')
  const ipAddress = getClientIP(req) || undefined

  try {
    const selectedProvider = body.provider || 'google'

    // Telegram: verify widget payload (no token)
    if (selectedProvider === 'telegram') {
      const { id, first_name, last_name, username, auth_date, hash } = body
      if (!id || !hash || !auth_date) {
        throw new AppError('Telegram widget data is incomplete (id, auth_date, hash required)', 400)
      }

      const storeConfig = (await db.settings.findUnique({
        where: { key: 'system_telegram_login' }
      })) as any | null
      const fromDb = storeConfig?.value?.isActive && storeConfig?.value?.appSecret
      const botToken = fromDb ? storeConfig.value.appSecret : process.env.TELEGRAM_BOT_TOKEN
      if (!botToken) {
        throw new AppError(
          'Telegram login is not configured. Enable it in Admin → Settings → Social Login Management.',
          400
        )
      }

      // Build payload with only fields present (Telegram omits empty values from data-check-string)
      const payload: Record<string, string | number> = { id, auth_date }
      if (first_name != null && first_name !== '') payload.first_name = first_name
      if (last_name != null && last_name !== '') payload.last_name = last_name
      if (username != null && username !== '') payload.username = username
      if (body.photo_url) payload.photo_url = body.photo_url
      payload.hash = hash

      if (!verifyTelegramWidgetHash(payload, botToken)) {
        throw new AppError('Invalid Telegram login data', 400)
      }

      // Auth date should be within 24h
      const authDateSec = Number(auth_date)
      if (Date.now() / 1000 - authDateSec > 86400) {
        throw new AppError('Telegram login data expired', 400)
      }

      const name = [first_name, last_name].filter(Boolean).join(' ') || username || `User ${id}`
      const email = `telegram_${id}@telegram.user`

      const accessData = await authService.socialLogin({
        provider: 'telegram',
        providerUserId: String(id),
        email,
        emailVerified: true,
        name,
        providerUsername: username,
        userAgent,
        ipAddress
      })

      return sendSuccessResponse(res, accessData, 'Login successful')
    }

    // Google, Facebook, Twitter require token
    const token = body.token
    if (!token || typeof token !== 'string') {
      throw new AppError('Token is required', 400)
    }

    const parsedToken = String(token).trim()
    if (!parsedToken) {
      throw new AppError('Token is required and must be a valid string', 400)
    }

    // Only Google uses JWT id_token
    if (selectedProvider === 'google' && parsedToken.split('.').length !== 3) {
      throw new AppError('Invalid token format (expected JWT for Google)', 400)
    }

    if (selectedProvider === 'google') {
      // Prefer database (Social Login Management) over env
      const storeConfig = (await db.settings.findUnique({
        where: { key: 'system_google_login' }
      })) as any | null
      const fromDb =
        storeConfig?.value?.isActive && storeConfig?.value?.appId && storeConfig?.value?.appSecret
      const clientId = fromDb ? storeConfig.value.appId : process.env.GOOGLE_CLIENT_ID
      const clientSecret = fromDb ? storeConfig.value.appSecret : process.env.GOOGLE_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        throw new Error(
          'Google OAuth is not configured. Enable it in Admin → Settings → Social Login Management or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in env.'
        )
      }

      const client = new OAuth2Client({
        client_id: clientId,
        client_secret: clientSecret
      })

      const ticket = await client.verifyIdToken({
        idToken: parsedToken,
        audience: clientId
      })

      const payload = ticket.getPayload()
      if (payload && payload.email && typeof payload.email === 'string') {
        const { email, name, email_verified } = payload as any

        if (!email_verified) {
          throw new AppError('Google email is not verified', 400)
        }

        const accessData = await authService.socialLogin({
          provider: 'google',
          providerUserId: String(payload.sub),
          email,
          emailVerified: Boolean(email_verified),
          name,
          userAgent,
          ipAddress
        })

        return sendSuccessResponse(res, accessData, 'Login successful')
      }

      throw new Error('Invalid token payload')
    }

    if (selectedProvider === 'facebook') {
      // Prefer database (Social Login Management) over env
      const storeConfig = (await db.settings.findUnique({
        where: { key: 'system_facebook_login' }
      })) as any | null
      const fromDb =
        storeConfig?.value?.isActive && storeConfig?.value?.appId && storeConfig?.value?.appSecret
      const appId = fromDb ? storeConfig.value.appId : process.env.FACEBOOK_APP_ID
      const appSecret = fromDb ? storeConfig.value.appSecret : process.env.FACEBOOK_APP_SECRET
      if (!appId || !appSecret) {
        throw new Error(
          'Facebook OAuth is not configured. Enable it in Admin → Settings → Social Login Management or set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in env.'
        )
      }

      // Validate token and get user info
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
        parsedToken
      )}&access_token=${encodeURIComponent(appId)}|${encodeURIComponent(appSecret)}`

      const debugResponse = await axios.get(debugUrl)
      const debugData = debugResponse.data?.data

      if (!debugData?.is_valid || debugData.app_id !== appId) {
        throw new Error('Invalid Facebook access token')
      }

      const meUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(
        parsedToken
      )}`
      const meResponse = await axios.get(meUrl)
      const profile = meResponse.data as { id: string; name?: string; email?: string }

      if (!profile?.id || !profile.email) {
        throw new Error('Facebook profile does not contain an email address')
      }

      const accessData = await authService.socialLogin({
        provider: 'facebook',
        providerUserId: profile.id,
        email: profile.email,
        emailVerified: true,
        name: profile.name,
        userAgent,
        ipAddress
      })

      return sendSuccessResponse(res, accessData, 'Login successful')
    }

    if (selectedProvider === 'twitter') {
      const storeConfig = (await db.settings.findUnique({
        where: { key: 'system_twitter_login' }
      })) as any | null
      const fromDb =
        storeConfig?.value?.isActive && storeConfig?.value?.appId && storeConfig?.value?.appSecret
      const clientId = fromDb ? storeConfig.value.appId : process.env.TWITTER_CLIENT_ID
      const clientSecret = fromDb ? storeConfig.value.appSecret : process.env.TWITTER_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        throw new AppError(
          'Twitter OAuth is not configured. Enable it in Admin → Settings → Social Login Management.',
          400
        )
      }

      // Verify token with Twitter API v2 users/me
      const meResponse = await axios
        .get('https://api.twitter.com/2/users/me', {
          params: { 'user.fields': 'id,name,username' },
          headers: { Authorization: `Bearer ${parsedToken}` }
        })
        .catch((err: any) => {
          if (err.response?.status === 401) throw new AppError('Invalid Twitter token', 400)
          throw err
        })

      const profile = meResponse.data?.data as { id: string; name?: string; username?: string }
      if (!profile?.id) {
        throw new AppError('Twitter profile not found', 400)
      }

      const name = body.name || profile.name || profile.username || `Twitter ${profile.id}`
      const email = body.email?.trim() || `twitter_${profile.id}@twitter.user`

      const accessData = await authService.socialLogin({
        provider: 'twitter',
        providerUserId: profile.id,
        email,
        emailVerified: Boolean(body.email?.trim()),
        name,
        userAgent,
        ipAddress
      })

      return sendSuccessResponse(res, accessData, 'Login successful')
    }

    throw new AppError('Unsupported OAuth provider', 400)
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof Error) {
      if (error.message.includes('Wrong number of segments')) {
        throw new AppError('Invalid token format - token must be a valid JWT', 400)
      }
      throw new AppError(`Token verification failed: ${error.message}`, 400)
    }
    throw new AppError('Invalid token', 400)
  }
}

// ================================
// EMAIL VERIFICATION
// ================================

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const token =
      req.method === 'GET'
        ? String(req.query.token || '')
        : EmailVerificationSchema.parse(req.body).token

    if (!token) {
      throw new AppError('Verification token is required', 400)
    }

    await authService.verifyEmailToken(token)

    return sendSuccessResponse(res, null, 'Email verified successfully')
  } catch (error) {
    next(error)
  }
}

export const verifyEmailCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const data = EmailVerificationCodeSchema.parse(req.body)
    const userAgent = req.get('User-Agent')
    const ipAddress = getClientIP(req) || undefined

    const result = await authService.verifyEmailCode(data, userAgent, ipAddress)

    return sendSuccessResponse(res, result, 'Email verified successfully')
  } catch (error) {
    next(error)
  }
}

export const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const data = ResendVerificationSchema.parse(req.body)

    await authService.resendVerificationEmail(data)

    return sendSuccessResponse(
      res,
      null,
      'If this email exists and is not verified, a verification code has been sent'
    )
  } catch (error) {
    next(error)
  }
}

export const getEmailVerificationConfig = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const config = await authService.getPublicEmailVerificationConfig()
    return sendSuccessResponse(res, config, 'Email verification config retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// SESSION MANAGEMENT
// ================================

export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const sessions = await authService.getActiveSessions(userId)

    // Remove sensitive tokens from response
    const sanitizedSessions = sessions.map(({ token, ...session }) => session)

    return sendSuccessResponse(res, sanitizedSessions, 'Active sessions retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const revokeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const { sessionId } = RevokeSessionSchema.parse(req.body)
    await authService.revokeSession(sessionId, userId)

    return sendSuccessResponse(res, null, 'Session revoked successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// PASSWORD RESET
// ================================

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = PasswordResetRequestSchema.parse(req.body)
    await authService.initiatePasswordReset(validatedData.email)

    const response = {
      message: 'If this email exists, a password reset link has been sent'
    }

    return sendSuccessResponse(res, response, 'Password reset initiated')
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = PasswordResetSchema.parse(req.body)
    await authService.resetPassword(validatedData)

    return sendSuccessResponse(res, null, 'Password reset successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// ADMIN ANALYTICS
// ================================

export const getAuthStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const stats = await authService.getAuthStats()
    return sendSuccessResponse(res, stats, 'Authentication statistics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// SESSION CLEANUP (ADMIN)
// ================================

export const cleanupExpiredSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const count = await authService.cleanupExpiredSessions()
    return sendSuccessResponse(
      res,
      { cleanedUpSessions: count },
      `${count} expired sessions cleaned up successfully`
    )
  } catch (error) {
    next(error)
  }
}
