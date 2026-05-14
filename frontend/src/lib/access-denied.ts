import { redirect } from 'next/navigation'

/**
 * Redirect to access denied page with optional query parameters
 */
export const redirectToAccessDenied = (reason?: string, redirectPath?: string): never => {
  const params = new URLSearchParams()

  if (reason) {
    params.set('reason', reason)
  }

  if (redirectPath) {
    params.set('redirect', redirectPath)
  }

  const url = `/access-denied${params.toString() ? `?${params.toString()}` : ''}`
  redirect(url)
}

/**
 * Check permission and redirect if access denied
 */
export const requirePermission = (
  hasAccess: boolean,
  reason?: string,
  redirectPath?: string
): void => {
  if (!hasAccess) {
    redirectToAccessDenied(reason, redirectPath)
  }
}
