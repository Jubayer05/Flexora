'use client'

import { Permission, hasPermission } from '@/lib/permissions-client'
import requests from '@/services/network/http'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface PermissionContextType {
  permissions: Permission
  hasPermission: (resource: string, action?: string) => boolean
  canPerformAction: (resource: string, action: string) => boolean
  loading: boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: React.ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getPermissions = async () => {
      try {
        // Fetch from backend API (uses admin token) - returns permissions for current admin's role
        const res = await requests.get<{ success?: boolean; data?: { permissions?: Permission } }>(
          '/admin/auth/permissions'
        )
        const perms = (res as any)?.data?.permissions ?? (res as any)?.permissions ?? {}
        setPermissions(perms)
      } catch {
        // Fallback: try cookie-based permissions (set at login)
        try {
          const response = await fetch('/api/permissions')
          if (response.ok) {
            const data = await response.json()
            setPermissions(data.permissions || {})
          }
        } catch (err) {
          console.error('Failed to load permissions:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    getPermissions()
  }, [])

  const checkPermission = (resource: string, action?: string): boolean => {
    return hasPermission(permissions, resource, action)
  }

  const canPerformAction = (resource: string, action: string): boolean => {
    return hasPermission(permissions, resource, action)
  }

  const value: PermissionContextType = {
    permissions,
    hasPermission: checkPermission,
    canPerformAction,
    loading
  }

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// HOC for protecting components
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  resource: string,
  action?: string
) => {
  const PermissionProtectedComponent: React.FC<P> = (props) => {
    const { hasPermission: checkPermission, loading } = usePermissions()

    if (loading) {
      return <div>Loading...</div>
    }

    if (!checkPermission(resource, action)) {
      return <div className='text-red-500'>Access denied</div>
    }

    return <Component {...props} />
  }

  PermissionProtectedComponent.displayName = `withPermissions(${
    Component.displayName || Component.name
  })`

  return PermissionProtectedComponent
}
