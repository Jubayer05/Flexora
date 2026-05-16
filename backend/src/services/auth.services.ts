import type { LoginSession, User } from '@prisma/client'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import db from '../configs/db'

import {
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendVerificationEmail,
  sendWelcomeEmail
} from '../libs/email'
import { AppError } from '../middlewares/error-handler'
import { pickKeys } from '../utils/data-type'
import { getCountryFromIP } from '../utils/geo'
import type {
  EmailVerificationCodeData,
  LoginCredentials,
  PasswordResetData,
  RegisterData,
  ResendVerificationData
} from '../validations'
import { UserService } from './user.services'

// ================================
// CUSTOM INTERFACES
// ================================

export interface JWTPayload {
  userId: number
  email: string
  role: string
  sessionId: string
}

export interface AuthResult {
  user: Partial<User>
  token: string
  refreshToken: string
  session: LoginSession
}

export class AuthService {
  private userService: UserService
  private readonly JWT_SECRET: string
  private readonly JWT_REFRESH_SECRET: string
  private readonly TOKEN_EXPIRY = '1d' // 1 day
  private readonly REFRESH_TOKEN_EXPIRY = '7d' // 7 days
  private readonly SESSION_EXPIRY_DAYS = 7
  private readonly EMAIL_VERIFICATION_SETTING_KEY = 'system_registration_verification'
  private readonly EMAIL_VERIFICATION_OTP_TYPE = 'REGISTRATION_VERIFICATION'
  private readonly EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES = 10
  private readonly EMAIL_VERIFICATION_DAILY_LIMIT = 5
  private readonly EMAIL_VERIFICATION_REQUEST_COOLDOWN_MINUTES = 5

  constructor() {
    this.userService = new UserService()
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret'
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('JWT secrets not properly configured. Using fallback values.')
    }
  }

  // ================================
  // AUTHENTICATION
  // ================================

  async register(
    data: RegisterData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{
    user: Partial<User>
    requiresVerification: boolean
    verificationMethod: 'code' | 'none'
  }> {
    // Check if user already exists (allow guest users to upgrade)
    const existingUser = await this.userService.findByEmail(data.email, { bypassCache: true })
    if (existingUser && !existingUser.isGuest) {
      throw new Error('User with this email already exists')
    }

    if (data.username) {
      const existingUsername = await this.userService.findByUsername(data.username)
      if (existingUsername && existingUsername.id !== existingUser?.id) {
        throw new Error('Username is already taken')
      }
    }

    // Detect country from IP address if not provided
    let country = data.country
    if (!country && ipAddress) {
      const detectedCountry = await getCountryFromIP(ipAddress)
      if (detectedCountry) {
        country = detectedCountry
      }
    }

    // Resolve referral: ref can be referralCode or username
    let referredById: number | undefined
    const ref = (data as any).ref?.trim()
    if (ref) {
      const referrer = await this.userService.findByReferralCodeOrUsername(ref)
      if (referrer && referrer.email !== data.email) {
        referredById = referrer.id
      }
    }

    let user: any

    if (existingUser?.isGuest) {
      // Upgrade guest User row to registered customer
      const passwordHash = await this.userService.hashPassword(data.password)
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: data.firstName ?? existingUser.firstName,
          username: data.username ?? existingUser.username,
          phone: (data as any).phone ?? existingUser.phone,
          country: country ?? existingUser.country,
          passwordHash,
          isGuest: false,
          guestToken: null,
          role: 'CUSTOMER',
          isVerified: false,
          referredById: referredById ?? existingUser.referredById ?? undefined
        },
        omit: { passwordHash: true, guestToken: true }
      })
    } else {
      const { ref: _ref, ...rest } = data as any
      user = await this.userService.create({
        ...rest,
        country,
        isVerified: false,
        referredById
      })
    }

    // Link any guest orders placed with this email before registration
    await this.userService.linkGuestOrders(user.id, user.email)

    const requiresVerification = await this.isEmailVerificationRequired()

    if (requiresVerification) {
      await this.createAndSendEmailVerificationCode(user.id, user.email)
    } else {
      await this.userService.verifyEmail(user.id)
    }

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.firstName || undefined)
    } catch (error) {
      console.error('[Auth] Failed to send welcome email:', error)
      // Don't fail registration if welcome email fails
    }

    // Pick selected data to return (no tokens or session yet)
    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'isVerified'
    ])

    return {
      user: updatedUser,
      requiresVerification,
      verificationMethod: requiresVerification ? 'code' : 'none'
    }
  }

  async passwordLessLogin({
    email,
    name,
    userAgent,
    ipAddress
  }: {
    email: string
    name?: string
    userAgent?: string
    ipAddress?: string
  }): Promise<AuthResult> {
    // Find user by email

    let user: Partial<User> | null = await this.userService.findByEmail(email)

    if (!user) {
      user = await this.userService.create({
        email,
        firstName: name
      })
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new Error(`Account is banned: ${user.banReason || 'No reason provided'}`)
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    if (!user) {
      throw new Error('User creation failed')
    }

    // Create session and generate tokens
    const session = await this.createSession(user.id!, userAgent, ipAddress)
    const { token, refreshToken } = this.generateTokens(user as any, session.id)

    // Update last login
    await this.userService.updateLastLogin(user.id!)

    // Pick selected data to return
    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'isVerified'
    ])

    return {
      user: updatedUser,
      token,
      refreshToken,
      session
    }
  }
  async login(
    credentials: LoginCredentials,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    // Always load from DB for login — must not use stale cached passwordHash
    const user = await this.userService.findByEmail(credentials.email, { bypassCache: true })
    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new Error(`Account is banned: ${user.banReason || 'No reason provided'}`)
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Enforce email verification gate for customers
    if ((await this.isEmailVerificationRequired()) && !user.isVerified) {
      throw new AppError(
        'Email not verified. Enter the 6-digit verification code sent to your email.',
        403
      )
    }

    // Verify password
    if (!user.passwordHash) {
      throw new Error('Account does not have a password set')
    }

    if (user.role !== 'CUSTOMER') {
      if (user.role === 'GUEST') {
        throw new AppError('This email is a guest account. Use guest checkout sign-in, not password login.', 403)
      }
      throw new AppError(
        'This email belongs to a staff account. Sign in on the admin login page with the same password.',
        403
      )
    }

    const isPasswordValid = await this.userService.verifyPassword(
      credentials.password,
      user.passwordHash
    )

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Create session and generate tokens
    const session = await this.createSession(user.id, userAgent, ipAddress)
    const { token, refreshToken } = this.generateTokens(user, session.id)

    // Update last login
    await this.userService.updateLastLogin(user.id)

    // Pick selected data to return
    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'isVerified'
    ]) as any
    updatedUser.referral = {
      code: (user as any).referralCode || user.username || '',
      earnings: Number((user as any).referralEarnings || 0)
    }

    return {
      user: updatedUser,
      token,
      refreshToken,
      session
    }
  }

  async loginGuest(email: string, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    // Create or find guest user
    let user: any = await this.userService.findByEmail(email)

    if (!user) {
      // Detect country from IP address for new guest users
      let country: string | undefined
      if (ipAddress) {
        const detectedCountry = await getCountryFromIP(ipAddress)
        if (detectedCountry) {
          country = detectedCountry
        }
      }

      user = await this.userService.create({
        email,
        isGuest: true,
        country,
        role: 'GUEST'
      })
    } else if (!user.isGuest) {
      throw new Error('User with this email already exists. Please login with password.')
    } else if (user.role !== 'GUEST') {
      user = await db.user.update({
        where: { id: user.id },
        data: { role: 'GUEST' }
      })
    }

    // Create session and generate tokens
    const session = await this.createSession(user.id, userAgent, ipAddress)
    const { token, refreshToken } = this.generateTokens(user, session.id)

    // Update last login
    await this.userService.updateLastLogin(user.id)

    // Pick selected data to return
    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt'
    ])

    return {
      user: updatedUser,
      token,
      refreshToken,
      session
    }
  }

  async logout(sessionId: string): Promise<void> {
    await db.loginSession.update({
      where: { id: sessionId },
      data: { isActive: false }
    })
  }

  async logoutAll(userId: number): Promise<void> {
    await db.loginSession.updateMany({
      where: { userId },
      data: { isActive: false }
    })
  }

  // ================================
  // TOKEN MANAGEMENT
  // ================================

  generateTokens(user: Omit<User, 'passwordHash' | 'guestToken'>, sessionId: string) {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    }

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY
    })

    const refreshToken = jwt.sign({ userId: user.id, sessionId }, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    })

    return { token, refreshToken }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as {
        userId: number
        sessionId: string
      }

      // Check if session is still active
      const session = await db.loginSession.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true }
      })

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Invalid refresh token')
      }

      // Check if user is still active and not banned
      if (session.user.isBanned || !session.user.isActive) {
        throw new Error('User account is no longer active')
      }

      // Generate new tokens
      const tokens = this.generateTokens(session.user, session.id)

      // Update session expiry
      await db.loginSession.update({
        where: { id: session.id },
        data: {
          expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        }
      })

      return tokens
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  async verifyToken(token: string): Promise<JWTPayload & { user: User }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload

      // Check if session is still active
      const session = await db.loginSession.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true }
      })

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Session expired')
      }

      // Check if user is still active and not banned
      if (session.user.isBanned || !session.user.isActive) {
        throw new Error('User account is no longer active')
      }

      return {
        ...decoded,
        user: session.user
      }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  // ================================
  // SESSION MANAGEMENT
  // ================================

  async createSession(
    userId: number,
    userAgent?: string,
    ipAddress?: string
  ): Promise<LoginSession> {
    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    return await db.loginSession.create({
      data: {
        userId,
        token,
        userAgent,
        ipAddress,
        expiresAt
      }
    })
  }

  async getActiveSessions(userId: number): Promise<LoginSession[]> {
    return await db.loginSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async revokeSession(sessionId: string, userId: number): Promise<void> {
    await db.loginSession.updateMany({
      where: {
        id: sessionId,
        userId
      },
      data: { isActive: false }
    })
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.loginSession.updateMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }]
      },
      data: { isActive: false }
    })

    return result.count
  }

  // ================================
  // PASSWORD RESET
  // ================================

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private async ensureCanRequestNewToken(
    userId: number,
    type: 'emailVerification' | 'passwordReset'
  ): Promise<void> {
    const lastToken =
      type === 'emailVerification'
        ? await db.emailVerificationToken.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          })
        : await db.passwordResetToken.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          })

    if (lastToken) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
      if (lastToken.createdAt > oneMinuteAgo) {
        throw new AppError('Please wait before requesting another email.', 429)
      }
    }
  }

  private async getEmailVerificationSetting(): Promise<{
    isActive: boolean
  }> {
    const setting = await db.settings.findUnique({
      where: { key: this.EMAIL_VERIFICATION_SETTING_KEY }
    })

    const value =
      setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value)
        ? (setting.value as Record<string, unknown>)
        : null

    return {
      isActive: typeof value?.isActive === 'boolean' ? value.isActive : true
    }
  }

  async getPublicEmailVerificationConfig(): Promise<{
    required: boolean
    captchaEnabled: boolean
    captchaSiteKey: string | null
    codeLength: number
    codeExpiryMinutes: number
    resendCooldownMinutes: number
    dailyLimit: number
  }> {
    const verificationSetting = await this.getEmailVerificationSetting()
    const addonsSetting = await db.settings.findUnique({
      where: { key: 'addons_management' }
    })

    const addonsValue =
      addonsSetting?.value &&
      typeof addonsSetting.value === 'object' &&
      !Array.isArray(addonsSetting.value)
        ? (addonsSetting.value as Record<string, any>)
        : {}

    const turnstileValue =
      addonsValue.cloudflareTurnstile &&
      typeof addonsValue.cloudflareTurnstile === 'object' &&
      !Array.isArray(addonsValue.cloudflareTurnstile)
        ? addonsValue.cloudflareTurnstile
        : {}

    return {
      required: verificationSetting.isActive,
      captchaEnabled: Boolean(turnstileValue.isActive && turnstileValue.siteKey && turnstileValue.secretKey),
      captchaSiteKey: turnstileValue.siteKey || null,
      codeLength: 6,
      codeExpiryMinutes: this.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
      resendCooldownMinutes: this.EMAIL_VERIFICATION_REQUEST_COOLDOWN_MINUTES,
      dailyLimit: this.EMAIL_VERIFICATION_DAILY_LIMIT
    }
  }

  async validateCaptchaToken(token?: string | null): Promise<void> {
    await this.verifyTurnstileToken(token)
  }

  private async isEmailVerificationRequired(): Promise<boolean> {
    const config = await this.getEmailVerificationSetting()
    return config.isActive
  }

  private async logVerificationAttempt(action: string, meta: Record<string, unknown>) {
    try {
      await db.auditLog.create({
        data: {
          action,
          entity: 'REGISTRATION_VERIFICATION',
          entityId: typeof meta.email === 'string' ? meta.email : undefined,
          newValues: meta as any
        }
      })
    } catch (error) {
      console.error('[Auth] Failed to log verification attempt', error)
    }
  }

  private async ensureCanRequestRegistrationCode(email: string): Promise<void> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [dailyCount, lastRequest] = await Promise.all([
      db.oTP.count({
        where: {
          email,
          type: this.EMAIL_VERIFICATION_OTP_TYPE,
          createdAt: { gte: startOfDay }
        }
      }),
      db.oTP.findFirst({
        where: {
          email,
          type: this.EMAIL_VERIFICATION_OTP_TYPE
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (dailyCount >= this.EMAIL_VERIFICATION_DAILY_LIMIT) {
      throw new AppError(
        `Maximum ${this.EMAIL_VERIFICATION_DAILY_LIMIT} verification codes allowed per email per day.`,
        429
      )
    }

    if (lastRequest) {
      const cooldownStart = new Date(
        Date.now() - this.EMAIL_VERIFICATION_REQUEST_COOLDOWN_MINUTES * 60 * 1000
      )

      if (lastRequest.createdAt > cooldownStart) {
        throw new AppError(
          `Please wait ${this.EMAIL_VERIFICATION_REQUEST_COOLDOWN_MINUTES} minutes before requesting another verification code.`,
          429
        )
      }
    }
  }

  private generateNumericVerificationCode(length = 6): string {
    return Array.from({ length }, () => crypto.randomInt(0, 10).toString()).join('')
  }

  private async verifyTurnstileToken(token?: string | null): Promise<void> {
    const addonsSetting = await db.settings.findUnique({
      where: { key: 'addons_management' }
    })

    const addonsValue =
      addonsSetting?.value &&
      typeof addonsSetting.value === 'object' &&
      !Array.isArray(addonsSetting.value)
        ? (addonsSetting.value as Record<string, any>)
        : {}

    const turnstileValue =
      addonsValue.cloudflareTurnstile &&
      typeof addonsValue.cloudflareTurnstile === 'object' &&
      !Array.isArray(addonsValue.cloudflareTurnstile)
        ? addonsValue.cloudflareTurnstile
        : {}

    const isEnabled = Boolean(
      turnstileValue.isActive && turnstileValue.siteKey && turnstileValue.secretKey
    )

    if (!isEnabled) {
      return
    }

    if (!token) {
      throw new AppError('Please complete the verification challenge.', 400)
    }

    const formData = new URLSearchParams()
    formData.append('secret', String(turnstileValue.secretKey))
    formData.append('response', token)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    if (!response.ok) {
      throw new AppError('Unable to verify the challenge. Please try again.', 400)
    }

    const data = (await response.json()) as { success?: boolean }
    if (!data.success) {
      throw new AppError('Challenge verification failed. Please try again.', 400)
    }
  }

  private async createAndSendEmailVerificationCode(userId: number, email: string): Promise<void> {
    await this.ensureCanRequestRegistrationCode(email)

    const verificationCode = this.generateNumericVerificationCode(6)
    const expiresAt = new Date(
      Date.now() + this.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES * 60 * 1000
    )

    await db.oTP.deleteMany({
      where: {
        email,
        type: this.EMAIL_VERIFICATION_OTP_TYPE
      }
    })

    await db.oTP.create({
      data: {
        email,
        otp: verificationCode,
        type: this.EMAIL_VERIFICATION_OTP_TYPE,
        expiresAt
      }
    })

    const user = await db.user.findUnique({ where: { id: userId } })

    await this.logVerificationAttempt('REGISTRATION_VERIFICATION_CODE_REQUEST', {
      userId,
      email,
      expiresAt: expiresAt.toISOString()
    })

    await sendVerificationCodeEmail(email, verificationCode, user?.firstName || undefined)
  }

  private async createAndSendEmailVerificationToken(userId: number, email: string): Promise<void> {
    await this.ensureCanRequestNewToken(userId, 'emailVerification')

    // Invalidate any existing tokens
    await db.emailVerificationToken.updateMany({
      where: { userId, consumed: false },
      data: { consumed: true }
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    })

    const user = await db.user.findUnique({ where: { id: userId } })
    await sendVerificationEmail(email, rawToken, user?.firstName || undefined)
  }

  async verifyEmailToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    const record = await db.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        consumed: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (!record) {
      throw new AppError('Invalid or expired verification token', 400)
    }

    await this.userService.verifyEmail(record.userId)

    await db.emailVerificationToken.updateMany({
      where: { userId: record.userId },
      data: { consumed: true }
    })
  }

  async resendVerificationEmail(data: ResendVerificationData): Promise<void> {
    const user = await this.userService.findByEmail(data.email)

    if (!user || user.isGuest) {
      // Do not leak whether the email exists or is a guest
      return
    }

    if (user.isVerified) {
      // Already verified - no need to resend
      return
    }

    if (!(await this.isEmailVerificationRequired())) {
      return
    }

    await this.createAndSendEmailVerificationCode(user.id, user.email)
  }

  async verifyEmailCode(
    data: EmailVerificationCodeData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    await this.verifyTurnstileToken(data.captchaToken)

    const email = data.email.trim().toLowerCase()
    const code = data.code.trim()

    const user = await this.userService.findByEmail(email, { bypassCache: true })

    if (!user || user.isGuest) {
      await this.logVerificationAttempt('REGISTRATION_VERIFICATION_CODE_FAILED', {
        email,
        reason: 'user_not_found'
      })
      throw new AppError('Invalid verification request.', 400)
    }

    if (user.isVerified) {
      await db.oTP.deleteMany({
        where: {
          email,
          type: this.EMAIL_VERIFICATION_OTP_TYPE
        }
      })
      return this.createVerifiedAuthResult(user.id, userAgent, ipAddress)
    }

    const otpRecord = await db.oTP.findFirst({
      where: {
        email,
        otp: code,
        type: this.EMAIL_VERIFICATION_OTP_TYPE,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!otpRecord) {
      await this.logVerificationAttempt('REGISTRATION_VERIFICATION_CODE_FAILED', {
        email,
        reason: 'invalid_or_expired_code'
      })
      throw new AppError('Invalid or expired verification code.', 400)
    }

    await this.userService.verifyEmail(user.id)
    await db.oTP.deleteMany({
      where: {
        email,
        type: this.EMAIL_VERIFICATION_OTP_TYPE
      }
    })

    await this.logVerificationAttempt('REGISTRATION_VERIFICATION_CODE_VERIFIED', {
      userId: user.id,
      email
    })

    return this.createVerifiedAuthResult(user.id, userAgent, ipAddress)
  }

  async createVerifiedAuthResult(
    userId: number,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user || user.isGuest || user.role !== 'CUSTOMER') {
      throw new AppError('Invalid verification request.', 400)
    }

    if (user.isBanned) {
      throw new Error(`Account is banned: ${user.banReason || 'No reason provided'}`)
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    const session = await this.createSession(user.id, userAgent, ipAddress)
    const { token, refreshToken } = this.generateTokens(user, session.id)

    await this.userService.updateLastLogin(user.id)

    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'isVerified'
    ])

    return {
      user: updatedUser,
      token,
      refreshToken,
      session
    }
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email)
    if (!user) {
      // Do not reveal if email exists
      return
    }

    if (user.isGuest) {
      // Guest users cannot reset passwords
      return
    }

    await this.ensureCanRequestNewToken(user.id, 'passwordReset')

    // Invalidate any existing tokens
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, consumed: false },
      data: { consumed: true }
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    })

    await sendPasswordResetEmail(user.email, rawToken, user.firstName || undefined)
  }

  async resetPassword(data: PasswordResetData): Promise<void> {
    const tokenHash = this.hashToken(data.resetToken)

    const record = await db.passwordResetToken.findFirst({
      where: {
        tokenHash,
        consumed: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (!record) {
      throw new AppError('Invalid or expired reset token', 400)
    }

    // Update password (reset link proves email ownership — allow login without separate verify step)
    await this.userService.setPassword(record.userId, data.password, {
      markEmailVerified: true
    })

    // Mark all reset tokens as consumed
    await db.passwordResetToken.updateMany({
      where: { userId: record.userId },
      data: { consumed: true }
    })

    // Logout all sessions for security
    await this.logoutAll(record.userId)
  }

  // ================================
  // SOCIAL LOGIN
  // ================================

  async socialLogin(params: {
    provider: 'google' | 'facebook' | 'twitter'
    providerUserId: string
    email: string
    emailVerified: boolean
    name?: string
    providerUsername?: string
    userAgent?: string
    ipAddress?: string
  }): Promise<AuthResult> {
    const { provider, providerUserId, email, emailVerified, name, providerUsername, userAgent, ipAddress } = params
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedProviderUsername = providerUsername?.trim().replace(/^@/, '')
    const isSyntheticSocialEmail =
      (provider === 'twitter' && normalizedEmail.endsWith('@twitter.user'))

    // Twitter may use placeholder email when provider does not supply one
    if (!normalizedEmail && provider !== 'twitter') {
      throw new AppError('Email is required for social login', 400)
    }

    // Find existing provider link
    const existingLink = await db.userAuthProvider.findFirst({
      where: {
        provider,
        providerUserId
      },
      include: {
        user: true
      }
    })

    let user: User | null = existingLink?.user ?? null

    // If no linked user, try to find by email
    if (!user && normalizedEmail && !isSyntheticSocialEmail) {
      user = await this.userService.findByEmail(normalizedEmail)
    }

    if (!user) {
      // Check if a guest User row exists for this email — upgrade instead of duplicating
      const existingGuest = normalizedEmail && !isSyntheticSocialEmail
        ? await db.user.findFirst({ where: { email: normalizedEmail, isGuest: true } })
        : null

      if (existingGuest) {
        user = await db.user.update({
          where: { id: existingGuest.id },
          data: {
            firstName: name ?? existingGuest.firstName,
            isGuest: false,
            guestToken: null,
            role: 'CUSTOMER',
            isVerified: emailVerified
          }
        })
      } else {
        user = (await this.userService.create({
          email: normalizedEmail,
          firstName: name,
          isGuest: false,
          isVerified: emailVerified
        } as any)) as unknown as User
      }

      // Link any guest orders placed with this email before registration
      if (normalizedEmail && !isSyntheticSocialEmail) {
        await this.userService.linkGuestOrders(user.id, normalizedEmail)
      }
    } else {
      // Ensure customer role and not guest (social login is for customers only)
      if (user.isGuest) {
        // Upgrade guest to customer on social login
        user = await db.user.update({
          where: { id: user.id },
          data: {
            firstName: name ?? user.firstName,
            isGuest: false,
            guestToken: null,
            role: 'CUSTOMER',
            isVerified: emailVerified || user.isVerified
          }
        })
        await this.userService.linkGuestOrders(user.id, user.email)
      } else if (user.role !== 'CUSTOMER') {
        throw new AppError('Social login is only available for customer accounts', 403)
      }

      // If provider says email is verified and our user is not, mark verified
      if (emailVerified && !user.isVerified) {
        await this.userService.verifyEmail(user.id)
        user = (await this.userService.findByIdWithSensitiveData(user.id))!
      }
    }

    // Check account status
    if (user.isBanned) {
      throw new Error(`Account is banned: ${user.banReason || 'No reason provided'}`)
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Link provider if not already linked
    await db.userAuthProvider.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId
        }
      },
      create: {
        provider,
        providerUserId,
        email: normalizedEmail,
        userId: user.id,
        meta: {
          lastLoginAt: new Date().toISOString()
        }
      },
      update: {
        email: normalizedEmail,
        meta: {
          lastLoginAt: new Date().toISOString()
        }
      }
    })

    // Create session and generate tokens
    const session = await this.createSession(user.id, userAgent, ipAddress)
    const { token, refreshToken } = this.generateTokens(user, session.id)

    await this.userService.updateLastLogin(user.id)

    const updatedUser = pickKeys(user, [
      'id',
      'email',
      'username',
      'isActive',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'isVerified'
    ])

    return {
      user: updatedUser,
      token,
      refreshToken,
      session
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async getAuthStats() {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [activeSessions, loginsLast24h, loginsLast7d, registrationsLast24h, registrationsLast7d] =
      await Promise.all([
        db.loginSession.count({
          where: {
            isActive: true,
            expiresAt: { gt: now }
          }
        }),
        db.user.count({
          where: {
            lastLoginAt: { gte: last24Hours }
          }
        }),
        db.user.count({
          where: {
            lastLoginAt: { gte: last7Days }
          }
        }),
        db.user.count({
          where: {
            createdAt: { gte: last24Hours },
            isGuest: false
          }
        }),
        db.user.count({
          where: {
            createdAt: { gte: last7Days },
            isGuest: false
          }
        })
      ])

    return {
      activeSessions,
      loginsLast24h,
      loginsLast7d,
      registrationsLast24h,
      registrationsLast7d
    }
  }
}
