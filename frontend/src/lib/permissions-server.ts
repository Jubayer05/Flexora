// Server-side permission utilities
// This file should only be imported in server components and middleware

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { simpleDecrypt } from './crypto-utils'
import { Permission } from './permissions-client'

// Server-side permission getter
export const getServerPermissions = async (): Promise<Permission> => {
  try {
    const cookieStore = await cookies()
    const permissionsCookie = cookieStore.get('permissions')?.value

    if (!permissionsCookie) return {}

    // Try to parse directly first (for unencrypted)
    try {
      return JSON.parse(permissionsCookie)
    } catch {
      // If parsing fails, try to decrypt
      try {
        const decrypted = await simpleDecrypt(permissionsCookie)
        if (!decrypted) return {}
        return JSON.parse(decrypted)
      } catch {
        return {}
      }
    }
  } catch {
    return {}
  }
}

// Middleware permission getter (works with NextRequest)
export const getMiddlewarePermissions = (request: NextRequest): Permission => {
  try {
    const permissionsCookie = request.cookies.get('permissions')?.value

    if (!permissionsCookie) return {}

    // For now, assume permissions are stored unencrypted in middleware
    // We'll need to handle decryption differently in middleware context
    try {
      return JSON.parse(permissionsCookie)
    } catch {
      return {}
    }
  } catch {
    return {}
  }
}

// Re-export client functions for convenience when used in server components
export {
  canAccessRoute,
  generateRoutePermissions,
  getRoutePermission,
  hasPermission
} from './permissions-client'
export type { NavItem, Permission } from './permissions-client'
