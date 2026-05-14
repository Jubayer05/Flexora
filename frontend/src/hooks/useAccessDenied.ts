'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

interface UseAccessDeniedOptions {
  defaultRedirectPath?: string
  isAdmin?: boolean
}

export function useAccessDenied({
  defaultRedirectPath = '/admin/dashboard',
  isAdmin = false
}: UseAccessDeniedOptions = {}) {
  const router = useRouter()

  const redirectToAccessDenied = useCallback(
    (reason?: string, redirectPath?: string) => {
      const params = new URLSearchParams()

      if (reason) {
        params.set('reason', reason)
      }

      if (redirectPath || defaultRedirectPath) {
        params.set('redirect', redirectPath || defaultRedirectPath)
      }

      const basePath = isAdmin ? '/admin/access-denied' : '/access-denied'
      const url = `${basePath}${params.toString() ? `?${params.toString()}` : ''}`

      router.push(url)
    },
    [router, defaultRedirectPath, isAdmin]
  )

  const requirePermission = useCallback(
    (hasAccess: boolean, reason?: string, redirectPath?: string) => {
      if (!hasAccess) {
        redirectToAccessDenied(reason, redirectPath)
      }
    },
    [redirectToAccessDenied]
  )

  return {
    redirectToAccessDenied,
    requirePermission
  }
}
