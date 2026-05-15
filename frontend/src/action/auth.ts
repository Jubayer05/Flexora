'use server'

import { getPostLoginRedirectPath } from '@/lib/authRedirect'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Use the public API URL for both server and client
const baseURL = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5015/api/v1'

// Decide if cookies should be marked secure based on the public app URL.
// On HTTPS domains (e.g. Vercel / production), cookies are secure.
// On plain HTTP (e.g. IP-based testing), cookies must NOT be secure or they won't be sent.
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://flexora.com' : 'http://localhost:3015')
const isHttps = appUrl.startsWith('https://')

const userCookieOptions = {
  secure: isHttps,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/'
}

const setUserSessionCookies = async (sessionData: {
  token?: string
  refreshToken?: string
  user?: unknown
}) => {
  const cookieStore = await cookies()

  if (sessionData.user) {
    cookieStore.set('user', JSON.stringify(sessionData.user), userCookieOptions)
  }

  if (sessionData.token) {
    cookieStore.set('token', sessionData.token, userCookieOptions)
  }

  if (sessionData.refreshToken) {
    cookieStore.set('refreshToken', sessionData.refreshToken, userCookieOptions)
  }
}

const clearUserSessionCookies = async () => {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  cookieStore.delete('refreshToken')
  cookieStore.delete('user')
}

const adminCookieOptions = {
  secure: isHttps,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/'
}

const setAdminSessionCookies = async (sessionData: {
  token?: string
  refreshToken?: string
  userRole?: string
  permissions?: Record<string, any>
}) => {
  const cookieStore = await cookies()

  if (sessionData.token) {
    cookieStore.set('adminToken', sessionData.token, adminCookieOptions)
  }

  if (sessionData.refreshToken) {
    cookieStore.set('adminRefreshToken', sessionData.refreshToken, adminCookieOptions)
  }

  if (sessionData.userRole) {
    cookieStore.set('userRole', sessionData.userRole, adminCookieOptions)
  }

  if (sessionData.permissions) {
    cookieStore.set('permissions', JSON.stringify(sessionData.permissions), adminCookieOptions)
  }
}

const clearAdminSessionCookies = async () => {
  const cookieStore = await cookies()
  cookieStore.delete('adminToken')
  cookieStore.delete('adminRefreshToken')
  cookieStore.delete('permissions')
  cookieStore.delete('userRole')
}

// =============================
// *** Admin Authentications ***
// =============================
export const authenticateAdmin = async (email: string, password: string, userAgent?: string) => {
  console.log('authenticateAdmin called with baseURL:', baseURL)

  try {
    console.log('Making request to:', baseURL + '/admin/auth/login')
    const response = await fetch(baseURL + '/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent && { 'User-Agent': userAgent })
      },
      body: JSON.stringify({ email, password })
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      // Never throw from a server action for auth failures; return a structured error
      // so the client can display it without triggering a Server Components render error.
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        // ignore json parse errors
      }

      const message =
        response.status >= 500
          ? 'Authentication service is temporarily unavailable. Please try again.'
          : errorBody?.message ||
            (response.status === 401
          ? 'Invalid credentials'
          : response.status === 403
            ? 'Access denied'
            : 'Authentication failed')

      console.error('Response error:', { status: response.status, body: errorBody })
      return { error: message, status: response.status }
    }

    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2)) // Add this line

    // Check if we got a successful response
    if (!data.success || !data.data?.token) {
      console.error('Invalid response structure:', {
        hasSuccess: !!data.success,
        hasData: !!data.data,
        hasToken: !!data.data?.token,
        fullData: data
      })
      return { error: data.message || 'Authentication failed', status: 500 }
    }

    const userRole = data?.data?.admin?.role

    const rawPermissions = data?.data?.admin?.customRole?.permissions || []
    const transformedPermissions = rawPermissions.reduce((acc: any, permission: any) => {
      acc[permission.resource] = permission.actions
      return acc
    }, {})

    const finalPermissions = userRole === 'ADMIN' ? { __superAdmin: true } : transformedPermissions
    await setAdminSessionCookies({
      token: data?.data?.token,
      refreshToken: data?.data?.refreshToken,
      userRole,
      permissions: finalPermissions
    })

    // Return the data for the client component
    return {
      admin: data?.data?.admin,
      token: data?.data?.token,
      refreshToken: data?.data?.refreshToken,
      session: data?.data?.session
    }
  } catch (error: any) {
    console.error('authenticateAdmin error:', error)
    return { error: error?.message || 'Authentication failed', status: 500 }
  }
}

export const adminLogout = async () => {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('adminToken')?.value

  try {
    // Clear cookies immediately so the redirect is not blocked by a slow API response.
    await clearAdminSessionCookies()

    if (adminToken) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 800)

      try {
        await fetch(baseURL + '/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          signal: controller.signal,
          cache: 'no-store'
        })
      } finally {
        clearTimeout(timeout)
      }
    }
  } catch (error) {
    console.error('Logout API call failed:', error)
  } finally {
    redirect('/login')
  }
}

// =============================
// *** User Authentications ***
// =============================
export const registerUser = async (
  data: any,
  userAgent?: string
): Promise<{ data: any | null; errors: any }> => {
  try {
    const res = await fetch(baseURL + '/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent && { 'User-Agent': userAgent })
      }
    })

    // if (!res.ok) {
    //   return { data: null, errors: ['Something went wrong!!!'] }
    // }

    const userData = await res.json()

    // Do not auto-login on registration; wait for email verification
    if (userData?.errors) {
      return { data: null, errors: userData?.errors }
    }

    const registrationData = userData?.data

    if (res.ok && registrationData && !registrationData.requiresVerification) {
      const loginRes = await fetch(baseURL + '/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(userAgent && { 'User-Agent': userAgent })
        }
      })
      const loginData = await loginRes.json()

      if (loginRes.ok && loginData?.data?.token) {
        await setUserSessionCookies({
          user: loginData.data.user,
          token: loginData.data.token,
          refreshToken: loginData.data.refreshToken
        })

        return {
          data: {
            ...registrationData,
            auth: loginData.data
          },
          errors: userData?.message
        }
      }
    }

    return { data: registrationData, errors: userData?.message }
  } catch {
    return { data: null, errors: ['Something went wrong!'] }
  }
}

export const verifyEmailCodeAndLogin = async (
  data: { email: string; code: string; captchaToken?: string },
  userAgent?: string
): Promise<{ data: any | null; errors?: any; message?: string }> => {
  try {
    const res = await fetch(baseURL + '/auth/verify-email/code', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent && { 'User-Agent': userAgent })
      }
    })

    const responseData = await res.json()

    if (!res.ok) {
      return {
        data: null,
        errors: responseData?.message || 'Failed to verify your code.',
        message: responseData?.message
      }
    }

    if (responseData?.data?.token) {
      await setUserSessionCookies({
        user: responseData.data.user,
        token: responseData.data.token,
        refreshToken: responseData.data.refreshToken
      })
    }

    return {
      data: responseData?.data || null,
      errors: null,
      message: responseData?.message
    }
  } catch {
    return { data: null, errors: 'Something went wrong!', message: 'Something went wrong!' }
  }
}

export const authenticate = async (
  data: any,
  userAgent?: string
): Promise<{
  data: { token: string; user: User; admin?: any } | null
  redirectTo?: string
  errors?: any
  message?: string
}> => {
  try {
    const res = await fetch(baseURL + '/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent && { 'User-Agent': userAgent })
      }
    })

    const userData = await res.json()

    if (!res.ok) {
      const message = userData?.message || (res.status === 403 ? 'Access denied' : 'Login failed')
      return { data: null, errors: message, message }
    }

    if (userData?.data?.errors) {
      return { data: null, errors: userData?.data?.errors }
    }

    if (!userData?.data?.token) {
      return { data: null, errors: userData?.message || 'Login failed', message: userData?.message }
    }

    const sessionData = userData.data

    // Check if this is an admin login (response has admin property)
    if (sessionData?.admin) {
      const userRole = sessionData.admin?.role
      const rawPermissions = sessionData.admin?.customRole?.permissions || []
      const transformedPermissions = rawPermissions.reduce((acc: any, permission: any) => {
        acc[permission.resource] = permission.actions
        return acc
      }, {})

      await clearUserSessionCookies()
      await setAdminSessionCookies({
        token: sessionData.token,
        refreshToken: sessionData.refreshToken,
        userRole,
        permissions: userRole === 'ADMIN' ? { __superAdmin: true } : transformedPermissions
      })
    } else {
      await clearAdminSessionCookies()
      await setUserSessionCookies({
        user: sessionData?.user,
        token: sessionData?.token,
        refreshToken: sessionData?.refreshToken
      })
    }

    return {
      data: sessionData,
      redirectTo: getPostLoginRedirectPath(sessionData),
      errors: userData?.message
    }
  } catch {
    return { data: null, errors: 'Something went wrong!', message: 'Something went wrong!' }
  }
}

export const resendVerificationEmail = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await fetch(baseURL + '/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, message: data?.message || 'Failed to resend verification email' }
    }
    return { success: true, message: data?.message }
  } catch {
    return { success: false, message: 'Something went wrong' }
  }
}

export type SocialProvider = 'google' | 'facebook' | 'twitter' | 'telegram'

export type TelegramWidgetPayload = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export const socialAuthenticate = async (
  provider: SocialProvider,
  token?: string,
  telegramPayload?: TelegramWidgetPayload,
  options?: {
    email?: string
    name?: string
  }
) => {
  try {
    const body =
      provider === 'telegram' && telegramPayload
        ? { provider: 'telegram', ...telegramPayload, ...options }
        : { provider, token, ...options }
    const res = await fetch(baseURL + '/auth/verify-token/oauth', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })

    const userData = await res.json()
    if (userData?.data?.token) {
      await setUserSessionCookies({
        user: userData.data.user,
        token: userData.data.token,
        refreshToken: userData.data.refreshToken
      })
    }

    if (userData?.data?.errors) {
      return { data: null, errors: userData?.data?.errors }
    }
    return { data: userData?.data, errors: userData?.message }
  } catch {
    return { data: null, errors: ['Something went wrong!'] }
  }
}

export const userLogout = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  try {
    await fetch(baseURL + '/customer/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
  } catch (error) {
    console.error('Logout API call failed:', error)
    // Continue with local cleanup even if API call fails
  } finally {
    await clearUserSessionCookies()
    redirect('/')
  }
}
