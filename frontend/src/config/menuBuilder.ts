import { type MenuItem } from './menuConfig'

// Example of how to create dynamic menu configurations
export class MenuBuilder {
  private items: MenuItem[] = []

  // Add a menu item
  add(item: MenuItem): MenuBuilder {
    this.items.push(item)
    return this
  }

  // Add a separator
  addSeparator(): MenuBuilder {
    const lastItem = this.items[this.items.length - 1]
    if (lastItem) {
      lastItem.divider = true
    }
    return this
  }

  // Add conditional item
  addIf(condition: boolean, item: MenuItem): MenuBuilder {
    if (condition) {
      this.add(item)
    }
    return this
  }

  // Build the final menu
  build(): MenuItem[] {
    return this.items
  }
}

// Example usage of MenuBuilder
export function createUserMenu(userRole: 'admin' | 'user' | 'moderator'): MenuItem[] {
  const builder = new MenuBuilder()

  // Common items for all users
  builder
    .add({
      key: 'profile',
      label: 'Profile',
      href: '/profile'
    })
    .add({
      key: 'settings',
      label: 'Settings',
      href: '/settings'
    })

  // Admin-only items
  builder
    .addIf(userRole === 'admin', {
      key: 'admin-panel',
      label: 'Admin Panel',
      href: '/admin'
    })
    .addIf(userRole === 'admin', {
      key: 'user-management',
      label: 'User Management',
      href: '/admin/users'
    })

  // Moderator-only items
  builder.addIf(userRole === 'moderator', {
    key: 'moderation',
    label: 'Moderation',
    href: '/moderation'
  })

  // Logout (for all users)
  builder.addSeparator().add({
    key: 'logout',
    label: 'Log out',
    danger: true,
    onClick: () => console.log('Logging out...')
  })

  return builder.build()
}

// Permission-based menu configuration
export interface MenuPermission {
  key: string
  permissions: string[]
  roles?: string[]
}

export function filterMenuByPermissions(
  menu: MenuItem[],
  userPermissions: string[],
  userRole?: string
): MenuItem[] {
  return menu.filter((item) => {
    // If no permissions required, show the item
    if (!('permissions' in item) && !('roles' in item)) {
      return true
    }

    // Check permissions
    const hasPermission =
      (item as any).permissions?.some((permission: string) =>
        userPermissions.includes(permission)
      ) ?? true

    // Check roles
    const hasRole = (item as any).roles?.includes(userRole) ?? true

    return hasPermission && hasRole
  })
}

// Example of menu with permissions
export const adminMenuWithPermissions: (MenuItem & { permissions?: string[]; roles?: string[] })[] =
  [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/admin/dashboard'
    },
    {
      key: 'users',
      label: 'User Management',
      href: '/admin/users',
      permissions: ['users.read', 'users.write'],
      roles: ['admin', 'moderator']
    },
    {
      key: 'settings',
      label: 'System Settings',
      href: '/admin/settings',
      permissions: ['system.write'],
      roles: ['admin']
    }
  ]
