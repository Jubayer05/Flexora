'use client'

import AccessDenied from '@/components/common/AccessDenied'
import InlineAccessDenied from '@/components/common/InlineAccessDenied'
import PermissionLoading from '@/components/common/PermissionLoading'
import { hasPermission, Permission } from '@/lib/permissions-client'
import { ReactNode } from 'react'

interface PermissionGuardProps {
  children: ReactNode
  permissions: Permission | Permission[] | null
  resource: string
  action?: string
  fallback?: ReactNode
  showAccessDenied?: boolean
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  redirectPath?: string
  className?: string
  loading?: boolean
  loadingMessage?: string
}

/**
 * Component-level permission guard
 * Renders children only if user has required permissions
 */
export function PermissionGuard({
  children,
  permissions,
  resource,
  action,
  fallback = null,
  showAccessDenied = false,
  fullScreen = false,
  size = 'md',
  redirectPath = '/admin/dashboard',
  className,
  loading = false,
  loadingMessage = 'Checking permissions...'
}: PermissionGuardProps) {
  // Show loading state
  if (loading || permissions === null) {
    return <PermissionLoading size={size} className={className} message={loadingMessage} />
  }

  const hasAccess = hasPermission(permissions, resource, action)

  if (!hasAccess) {
    if (showAccessDenied) {
      const message = `You don&apos;t have permission to ${action || 'access'} ${resource}.`

      if (fullScreen) {
        return <AccessDenied title='Access Denied' message={message} redirectPath={redirectPath} />
      } else {
        return (
          <InlineAccessDenied
            title='Access Denied'
            message={message}
            redirectPath={redirectPath}
            size={size}
            className={className}
          />
        )
      }
    }

    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * HOC version of permission guard
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  resource: string,
  action?: string,
  fallback?: ReactNode,
  options?: {
    fullScreen?: boolean
    size?: 'sm' | 'md' | 'lg'
  }
) {
  return function PermissionWrappedComponent(
    props: P & { permissions: Permission | Permission[] | null }
  ) {
    const { permissions, ...restProps } = props

    return (
      <PermissionGuard
        permissions={permissions}
        resource={resource}
        action={action}
        fallback={fallback}
        showAccessDenied={true}
        fullScreen={options?.fullScreen}
        size={options?.size}
      >
        <Component {...(restProps as P)} />
      </PermissionGuard>
    )
  }
}
