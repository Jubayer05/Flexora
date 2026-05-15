import { adminLogout } from '@/action/auth'
import { LogOut, Settings, Shield, User, type LucideIcon } from 'lucide-react'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Modal types
export type ModalType = 'profile' | 'settings' | 'security' | null

// Base menu item interface
export interface BaseMenuItem {
  key: string
  label: string
  icon?: LucideIcon
  onClick?: () => void | Promise<void>
  className?: string
  disabled?: boolean
  href?: string
  target?: '_blank' | '_self'
  modal?: ModalType
}

// Extended menu item with danger state and divider
export interface MenuItem extends BaseMenuItem {
  danger?: boolean
  divider?: boolean
  children?: MenuItem[]
}

// User profile menu configuration factory
export const createUserProfileMenuConfig = (
  clearAdminInfo: () => void,
  router: AppRouterInstance,
  openModal?: (modalType: ModalType) => void
): MenuItem[] => [
  {
    key: 'profile',
    label: 'Profile',
    icon: User,
    modal: 'profile',
    onClick: openModal ? () => openModal('profile') : undefined
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    modal: 'settings',
    onClick: openModal ? () => openModal('settings') : undefined
  },
  {
    key: 'security',
    label: 'Change Password',
    icon: Shield,
    modal: 'security',
    onClick: openModal ? () => openModal('security') : undefined
  },
  {
    key: 'logout',
    label: 'Log out',
    icon: LogOut,
    danger: true,
    divider: true,
    onClick: async () => {
      try {
        await adminLogout()
      } catch (error) {
        console.error('Logout failed:', error)
        clearAdminInfo()
        router.replace('/login')
      }
    }
  }
]

// Notification actions configuration
export const notificationActionsConfig = {
  markAllRead: {
    key: 'mark-all-read',
    label: 'Mark all read',
    action: 'markAllAsRead'
  },
  viewAll: {
    key: 'view-all',
    label: 'View all notifications',
    action: 'viewAllNotifications',
    href: '/admin/notifications'
  }
} as const

// Header configuration
export const headerConfig = {
  logo: {
    forLightMode: '/images/logo-dark.webp',
    forDarkMode: '/images/logo-white.webp',
    alt: 'UHQ Logo',
    width: 227,
    height: 36
  },
  notifications: {
    maxDisplayCount: 9,
    maxHeight: 300
  }
} as const

// Menu item types for better organization
export type MenuItemType = 'primary' | 'secondary' | 'danger'

// Enhanced menu item with type
export interface TypedMenuItem extends MenuItem {
  type?: MenuItemType
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

// Alternative structured menu configuration with types
// export const structuredUserMenu: TypedMenuItem[] = [
//   {
//     key: 'account-section',
//     label: 'Account',
//     type: 'primary',
//     children: [
//       {
//         key: 'profile',
//         label: 'Profile',
//         icon: User,
//         href: '/admin/profile'
//       },
//       {
//         key: 'settings',
//         label: 'Settings',
//         icon: Settings,
//         href: '/admin/settings'
//       }
//     ]
//   },
//   {
//     key: 'logout',
//     label: 'Log out',
//     icon: LogOut,
//     type: 'danger',
//     divider: true,
//     onClick: () => console.log('Logging out...')
//   }
// ]

// Admin sidebar navigation (reorganized menu structure)
export { adminNavItems } from './adminNavConfig'
export type { AdminNavItem, AdminNavItemLink, AdminNavItemLabel } from './adminNavConfig'
