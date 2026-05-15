const ADMIN_ROLES = ['ADMIN', 'MODERATOR'] as const

type LoginSession = {
  admin?: { role?: string } | null
  user?: { role?: string } | null
}

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

export function isAdminSession(session: LoginSession): boolean {
  if (session.admin) return true
  return isAdminRole(session.user?.role)
}

export function getDashboardPath(role?: string | null, hasAdminToken?: boolean): string {
  if (hasAdminToken || isAdminRole(role)) {
    return '/admin/dashboard'
  }
  return '/user/profile'
}

export function getPostLoginRedirectPath(
  session: LoginSession,
  callbackUrl?: string | null
): string {
  if (isAdminSession(session)) {
    if (callbackUrl?.startsWith('/admin')) {
      return callbackUrl
    }
    return '/admin/dashboard'
  }

  if (callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')) {
    return callbackUrl
  }

  return '/shop'
}
