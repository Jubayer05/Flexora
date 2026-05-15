import Cookies from 'js-cookie'

/**
 * Get the appropriate auth token based on the current route context
 * @returns adminToken for admin routes, token for user routes
 */
export const getToken = (): string | null => {
  const isAdminRoute = window.location.pathname.includes('/admin')
  const tokenKey = isAdminRoute ? 'adminToken' : 'token'
  const token = Cookies.get(tokenKey)
  return token || null
}

/**
 * Get user data based on route context
 * @returns null for admin routes (data is in Zustand), parsed user data for user routes
 */
export const getUserData = (): any | null => {
  const isAdminRoute = window.location.pathname.includes('/admin')

  if (isAdminRoute) {
    // For admin routes, we don't store admin user data in cookies directly
    // Admin info is typically stored in Zustand store
    return null
  } else {
    // For user routes, get user data from 'user' cookie
    const userData = Cookies.get('user')
    return userData ? JSON.parse(userData) : null
  }
}

/**
 * Get the appropriate login URL based on the current route context
 * @returns '/admin/login' for admin routes, '/login' for user routes
 */
export const getLoginUrl = (): string => {
  const isAdminRoute = window.location.pathname.includes('/admin')
  return isAdminRoute ? '/login' : '/login'
}

/**
 * Clear session cookies and redirect to appropriate login page based on route context
 * Clears only the relevant cookies for the current context (admin or user)
 */
export const clearSession = () => {
  const isAdminRoute = window.location.pathname.includes('/admin')

  if (isAdminRoute) {
    // Reset Admin Cookies only
    Cookies.remove('adminToken')
    Cookies.remove('adminRefreshToken')
    Cookies.remove('permissions')
    Cookies.remove('userRole')
  } else {
    // Reset User Cookies only
    Cookies.remove('token')
    Cookies.remove('refreshToken')
    Cookies.remove('user')
  }

  // Redirect to appropriate login page based on current route
  window.location.href = getLoginUrl()
}
