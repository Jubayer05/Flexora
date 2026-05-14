// Client-side permission utilities
// This file can be imported in client components

// Permission types
export interface Permission {
  [resource: string]: string[]
}

// Type guard to check if user has super admin privileges
export const isSuperAdmin = (permissions: any): boolean => {
  return permissions && typeof permissions === 'object' && permissions.__superAdmin === true
}

// NavItem types (compatible with siteConfig)
export type NavItemLink = {
  type?: 'link'
  title: string
  href: string
  children?: NavItem[]
  permission?: { resource: string; action?: string }
}

export type NavItemDivider = { type: 'divider'; title?: string }
export type NavItemLabel = { type: 'label'; title: string }

export type NavItem = NavItemLink | NavItemDivider | NavItemLabel

const isLinkItem = (item: NavItem): item is NavItemLink =>
  (item as any).type !== 'divider' && (item as any).type !== 'label' && 'href' in item

// Client-side permission checker
export const hasPermission = (
  permissions: Permission | Permission[],
  resource: string,
  action?: string
): boolean => {
  if (!permissions) return false

  // Handle both single Permission object and array of Permission objects
  let permissionData: Permission = {}

  if (Array.isArray(permissions)) {
    // If it's an array, find the permission object that contains the resource
    if (permissions.length === 0) return false
    const permission = permissions.find((p) => p[resource])
    if (!permission) return false
    permissionData = permission
  } else {
    // If it's a single object, use it directly
    permissionData = permissions
  }

  // Check if user is super admin (has full access)
  if (isSuperAdmin(permissions)) {
    return true
  }

  const resourceActions = permissionData[resource]
  if (!resourceActions || resourceActions.length === 0) return false

  // If no specific action is required, just check if resource exists
  if (!action) return true

  // Check if the specific action is allowed
  return resourceActions.includes(action)
}

// Client-side permission getter (for use in components)
export const getClientPermissions = (): Permission => {
  try {
    if (typeof window === 'undefined') return {}

    // Get from localStorage or a global state
    const permissionsStr = localStorage.getItem('permissions')
    if (!permissionsStr) return {}

    return JSON.parse(permissionsStr)
  } catch {
    return {}
  }
}

// Generate route permissions from navItems
export const generateRoutePermissions = (
  navItems: NavItem[]
): Record<string, { resource: string; action?: string }> => {
  const routeMap: Record<string, { resource: string; action?: string }> = {}

  const processItem = (item: NavItem) => {
    if (!isLinkItem(item)) return
    // Add route permission for the item itself
    if (item.href && item.permission) {
      routeMap[item.href] = item.permission
    }

    // Process children recursively
    if (item.children && item.children.length > 0) {
      item.children.forEach((child) => processItem(child))
    }
  }

  navItems.forEach((item) => processItem(item))
  return routeMap
}

// Get route permission for a specific route
export const getRoutePermission = (
  navItems: NavItem[],
  route: string
): { resource: string; action?: string } | null => {
  const routePermissions = generateRoutePermissions(navItems)
  return routePermissions[route] || null
}

// Check if user can access a specific route using navItems
export const canAccessRoute = (
  permissions: Permission | Permission[],
  route: string,
  navItems: NavItem[]
): boolean => {
  // Super admin has access to all routes
  if (isSuperAdmin(permissions)) {
    return true
  }

  const routePermission = getRoutePermission(navItems, route)
  if (!routePermission) return true // Allow access to unmapped routes

  return hasPermission(permissions, routePermission.resource, routePermission.action)
}

// Action permission mapping
export const actionPermissions: Record<string, { resource: string; action: string }> = {
  create: { resource: '', action: 'create' },
  edit: { resource: '', action: 'update' },
  delete: { resource: '', action: 'delete' },
  view: { resource: '', action: 'index' },
  export: { resource: '', action: 'export' }
}

// Check if user can perform a specific action on a resource
export const canPerformAction = (
  permissions: Permission | Permission[],
  resource: string,
  action: string
): boolean => {
  // Super admin can perform all actions
  if (isSuperAdmin(permissions)) {
    return true
  }

  return hasPermission(permissions, resource, action)
}
