import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import type { AuthRequest } from '../types/req-res'

const GUEST_DASHBOARD_TOKEN_TYPE = 'guest_orders'

type GuestDashboardTokenPayload = {
  email: string
  type: typeof GUEST_DASHBOARD_TOKEN_TYPE
  iat?: number
  exp?: number
}

export const normalizeGuestEmail = (email: string) => email.trim().toLowerCase()

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return process.env.JWT_SECRET as Secret
}

export const issueGuestDashboardToken = (email: string, expiresIn: string = '7d') => {
  const normalizedEmail = normalizeGuestEmail(email)

  return jwt.sign(
    {
      email: normalizedEmail,
      type: GUEST_DASHBOARD_TOKEN_TYPE
    },
    getJwtSecret(),
    { expiresIn: expiresIn as SignOptions['expiresIn'] }
  )
}

export const verifyGuestDashboardToken = (token: string): GuestDashboardTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret())

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid guest access token')
  }

  const email = typeof decoded.email === 'string' ? normalizeGuestEmail(decoded.email) : ''
  const type = decoded.type

  if (!email || type !== GUEST_DASHBOARD_TOKEN_TYPE) {
    throw new Error('Invalid guest access token')
  }

  return {
    email,
    type: GUEST_DASHBOARD_TOKEN_TYPE,
    iat: typeof decoded.iat === 'number' ? decoded.iat : undefined,
    exp: typeof decoded.exp === 'number' ? decoded.exp : undefined
  }
}

export const attachGuestAccessToRequest = (req: AuthRequest) => {
  const rawHeader = req.headers['x-guest-access-token']
  const token = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader

  if (!token || typeof token !== 'string') {
    return
  }

  try {
    const payload = verifyGuestDashboardToken(token)
    req.guestAccess = {
      email: payload.email
    }
  } catch {
    req.guestAccess = undefined
  }
}

export const validateGuestSessionAccess = (req: AuthRequest, guestEmail?: string) => {
  const normalizedEmail = guestEmail ? normalizeGuestEmail(guestEmail) : ''

  if (!normalizedEmail) {
    return {
      ok: false as const,
      status: 401,
      message: 'Authentication required or guest email must be provided'
    }
  }

  if (!req.guestAccess?.email) {
    return {
      ok: false as const,
      status: 403,
      message: 'Guest session required. Please verify your email code again.'
    }
  }

  if (req.guestAccess.email !== normalizedEmail) {
    return {
      ok: false as const,
      status: 403,
      message: 'Guest session does not match this email address'
    }
  }

  return {
    ok: true as const,
    email: normalizedEmail
  }
}
