import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  generateRoutePermissions,
  getMiddlewarePermissions,
  hasPermission
} from '../lib/permissions-server'
import { decryptCallback, encryptCallback } from './callback'
import { routeConfigs } from './config'

// Import navItems from siteConfig
import { navItems } from '../data/siteConfig'


const secret = process.env.AUTH_SECRET! || '12345678901234567890123456789012' // Must be 32 characters

// Generate route permissions map from navItems (cached at module level)
const routePermissionsMap = generateRoutePermissions(navItems)

interface MiddlewareConfig {
  protectedRoutes: string[] // Auth-protected routes
  tokenKey: string // Cookie key for auth token (e.g., 'token', 'adminToken')
  loginPath: string // Path to login screen
  defaultPath: string // Path to redirect authenticated users to
}

// ✅ Utility: Normalize callback param
function normalizeCallback(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  if (raw === 'null' || raw === 'undefined' || raw.trim() === '') return undefined
  return raw
}

// ✅ Utility: Safe redirect builder
function redirectTo(path: string, origin: string) {
  return NextResponse.redirect(new URL(path, origin))
}

export async function genericMiddleware(
  request: NextRequest,
  _response: NextResponse,
  config: MiddlewareConfig
) {
  const token = request.cookies.get(config.tokenKey)?.value ?? ''
  const guestAccessToken = request.cookies.get('guestAccessToken')?.value ?? ''
  const guestAccessEmail = request.cookies.get('guestAccessEmail')?.value ?? ''
  const { pathname, searchParams, origin } = request.nextUrl
  const callbackParam = normalizeCallback(searchParams.get('callbackUrl'))
  // Build fullPath without the callbackUrl param to avoid duplication
  const cleanParams = new URLSearchParams(searchParams)
  const checkStale = false
  cleanParams.delete('callbackUrl')
  const fullPath = cleanParams.toString() ? `${pathname}?${cleanParams.toString()}` : pathname
  const isAuthRoute = routeConfigs.authRoutes.includes(pathname)
  const isProtectedRoute = config.protectedRoutes.some((route) => pathname.startsWith(route))
  const guestAllowedDashboardRoutes = [
    '/user',
    '/user/profile',
    '/user/purchased-items'
  ]
  const isGuestAllowedRoute = guestAllowedDashboardRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const hasGuestDashboardAccess =
    config.tokenKey === 'token' &&
    isGuestAllowedRoute &&
    !!guestAccessToken &&
    !!guestAccessEmail

  // Check if this is a guest checkout access (has orderId and token in URL params)
  const isGuestCheckoutAccess = 
    pathname === '/checkout' && 
    searchParams.has('orderId') && 
    searchParams.has('token') && 
    searchParams.has('email')

  // Case 1: Logged in but visiting an auth route → redirect away
  // if (isAuthRoute && token) {
  //   if (callbackParam) {
  //     const decrypted = await decryptCallback(callbackParam, secret)
  //     // Validate that decrypted callback is an internal path
  //     if (decrypted && decrypted.startsWith('/') && !decrypted.startsWith('//')) {
  //       // Avoid redirecting to base paths or wrong area routes
  //       // Only redirect to callback if it matches the current area (admin/user)
  //       const isAdminCallback = decrypted.startsWith('/admin')
  //       const isUserCallback = decrypted.startsWith('/user')
  //       const isAdminAuth = config.tokenKey === 'adminToken'

  //       // Only redirect if callback matches the token type
  //       if ((isAdminAuth && isAdminCallback) || (!isAdminAuth && isUserCallback)) {
  //         if (decrypted !== '/admin' && decrypted !== '/user') {
  //           return redirectTo(decrypted, origin)
  //         }
  //       }
  //     }
  //   }
  //   return redirectTo(config.defaultPath, origin)
  // }
  if (isAuthRoute && token && !checkStale) {
    if (callbackParam) {
      const decrypted = await decryptCallback(callbackParam, secret)
      const isAdminAuth = config.tokenKey === 'adminToken'

      // Only redirect to callback if it matches the token type and is a valid internal path
      if (
        decrypted &&
        decrypted.startsWith('/') &&
        !decrypted.startsWith('//') &&
        decrypted !== '/admin' &&
        decrypted !== '/user' &&
        ((isAdminAuth && decrypted.startsWith('/admin')) ||
          (!isAdminAuth && decrypted.startsWith('/user')))
      ) {
        return redirectTo(decrypted, origin)
      }
    }
    return redirectTo(config.defaultPath, origin)
  }

  // Case 2: Guest checkout access with valid token parameters → allow access
  if (isGuestCheckoutAccess && !checkStale) {
    // Guest checkout is allowed if orderId, token, and email are provided
    // The actual token validation happens in the checkout page component
    return NextResponse.next()
  }

  // Case 2.5: Protected route without token → go to login with callback
  if (isProtectedRoute && !token && !hasGuestDashboardAccess && !isAuthRoute && !checkStale) {
    const loginUrl = new URL(config.loginPath, origin)
    const encryptedCallback = await encryptCallback(fullPath, secret)
    if (encryptedCallback) {
      loginUrl.searchParams.set('callbackUrl', encryptedCallback)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (isProtectedRoute && hasGuestDashboardAccess && !checkStale) {
    return NextResponse.next()
  }

  // Case 3: Protected route with token → handle callback and check permissions
  if (isProtectedRoute && token && !checkStale) {
    // Check permissions only for admin routes (skip for user routes to improve performance)
    if (config.tokenKey === 'adminToken') {
      try {
        const permissions = getMiddlewarePermissions(request)

        // Check if route exists in our permissions map
        const routePermission = routePermissionsMap[pathname]
        if (routePermission) {
          const hasAccess = hasPermission(
            permissions,
            routePermission.resource,
            routePermission.action
          )
          if (!hasAccess) {
            // Redirect to access denied page or dashboard
            return redirectTo('/admin/access-denied', origin)
          }
        }
      } catch (error) {
        console.error('Permission check failed:', error)
        // Continue with normal flow if permission check fails
      }
    }

    // Skip expensive callback decryption for user routes on protected access
    // User routes have simple access control (logged in = allowed)
    if (config.tokenKey === 'userToken') {
      return NextResponse.next()
    }

    if (callbackParam) {
      const decrypted = await decryptCallback(callbackParam, secret)
      if (decrypted) return redirectTo(decrypted, origin)
    }
    return NextResponse.next()
  }

  // Default: pass through
  return NextResponse.next()
}
