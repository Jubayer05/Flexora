/**
 * Admin sidebar navigation - reorganized menu structure.
 * All items from siteConfig navItems are preserved; only order/structure changed.
 */
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CreditCard,
  FileText,
  Gift,
  Globe,
  LayoutDashboard,
  Link2,
  Mail,
  Package,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserRound,
  Users2
} from 'lucide-react'

export type AdminNavItemLink = {
  type?: 'link'
  title: string
  href: string
  icon: LucideIcon
  children?: Omit<AdminNavItemLink, 'icon' | 'children' | 'type'>[]
  permission?: { resource: string; action?: string }
}
export type AdminNavItemLabel = { type: 'label'; title: string }
export type AdminNavItem = AdminNavItemLink | AdminNavItemLabel

export const adminNavItems: AdminNavItem[] = [
  // Dashboard
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  // Products
  {
    title: 'Products',
    href: '',
    icon: Package,
    permission: { resource: 'products', action: 'index' },
    children: [
      {
        title: 'All Products',
        href: '/admin/products',
        permission: { resource: 'products', action: 'index' }
      },
      {
        title: 'Deactivated Products',
        href: '/admin/products/deactivated',
        permission: { resource: 'products', action: 'index' }
      },
      {
        title: 'Add New Product',
        href: '/admin/products/add-new-product',
        permission: { resource: 'products', action: 'create' }
      },
      {
        title: 'Product Sorting',
        href: '/admin/additional/product-sorting',
        permission: { resource: 'products', action: 'update' }
      },
      {
        title: 'Top 10 Products',
        href: '/admin/additional/top-10-products',
        permission: { resource: 'products', action: 'update' }
      }
    ]
  },
  // Categories
  {
    title: 'Manage Categories',
    href: '',
    icon: ShoppingBag,
    permission: { resource: 'categories', action: 'index' },
    children: [
      {
        title: 'Categories',
        href: '/admin/categories',
        permission: { resource: 'categories', action: 'index' }
      }
    ]
  },
  // Orders
  {
    title: 'Orders',
    href: '',
    icon: ShoppingCart,
    permission: { resource: 'orders', action: 'index' },
    children: [
      {
        title: 'All Orders',
        href: '/admin/orders',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Services Orders',
        href: '/admin/orders/services',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Pending Orders',
        href: '/admin/orders?page=1&status=PENDING',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Processing Orders',
        href: '/admin/orders?page=1&status=CONFIRMED',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Completed Orders',
        href: '/admin/orders?page=1&status=COMPLETED',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Declined Orders',
        href: '/admin/orders?page=1&status=CANCELLED',
        permission: { resource: 'orders', action: 'index' }
      }
    ]
  },
  // Payments (merged with Payment Settings)
  {
    title: 'Payments',
    href: '/admin/payment-settings/payment-gateways',
    icon: CreditCard,
    permission: { resource: 'payments', action: 'index' },
    children: [
      { title: 'Payment Gateways', href: '/admin/payment-settings/payment-gateways', permission: { resource: 'payments', action: 'index' } }
    ]
  },
  // Customers
  {
    title: 'Customers',
    href: '/admin/customers/customers-list',
    icon: UserRound,
    permission: { resource: 'users', action: 'index' },
    children: [
      {
        title: 'Customer List',
        href: '/admin/customers/customers-list',
        permission: { resource: 'users', action: 'index' }
      },
      {
        title: 'Withdraws',
        href: '/admin/customers/withdraws',
        permission: { resource: 'users', action: 'index' }
      },
      {
        title: 'Affiliate Withdrawals',
        href: '/admin/affiliate-withdraw',
        permission: { resource: 'affiliates', action: 'index' }
      }
    ]
  },
  // Coupons & Discounts
  {
    title: 'Coupons & Discounts',
    href: '/admin/coupons',
    icon: Gift,
    permission: { resource: 'coupons', action: 'index' },
    children: []
  },
  // Support
  {
    title: 'Support',
    href: '',
    icon: Mail,
    permission: { resource: 'tickets', action: 'index' },
    children: [
      {
        title: 'Tickets',
        href: '/admin/tickets',
        permission: { resource: 'tickets', action: 'index' }
      },
      {
        title: 'Notifications',
        href: '/admin/notifications',
        permission: { resource: 'notifications', action: 'index' }
      },
      {
        title: 'Bulk Notifications',
        href: '/admin/email-settings/group-email',
        permission: { resource: 'notifications', action: 'index' }
      }
    ]
  },
  // URL Tracking (after Support / Notifications)
  {
    title: 'URL Tracking',
    href: '/admin/url-tracking',
    icon: Link2,
    permission: { resource: 'notifications', action: 'index' },
    children: []
  },
  // Content
  {
    title: 'Content',
    href: '',
    icon: FileText,
    permission: { resource: 'blogs', action: 'index' },
    children: [
      {
        title: 'Blog Posts',
        href: '/admin/blogs',
        permission: { resource: 'blogs', action: 'index' }
      },
      {
        title: 'Custom Pages',
        href: '/admin/settings/create-page',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Reviews Management',
        href: '/admin/feedbacks/feedbacks-management',
        permission: { resource: 'feedbacks', action: 'index' }
      }
    ]
  },
  // Settings (label + flattened items - nav supports 2 levels only)
  { type: 'label', title: 'Settings' },
  {
    title: 'General Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: { resource: 'settings', action: 'index' },
    children: [
      { title: 'Site Settings', href: '/admin/settings', permission: { resource: 'settings', action: 'index' } },
      { title: 'Logo Management', href: '/admin/settings/logo-management', permission: { resource: 'settings', action: 'index' } },
      { title: 'Contact Information', href: '/admin/settings/contact-page', permission: { resource: 'settings', action: 'update' } },
      { title: 'Maintenance Mode', href: '/admin/settings/maintenance-mode', permission: { resource: 'settings', action: 'index' } }
    ]
  },
  {
    title: 'Email Settings',
    href: '/admin/email-settings/email-template',
    icon: Mail,
    permission: { resource: 'notifications', action: 'index' },
    children: [
      { title: 'Delivery & Email', href: '/admin/settings/email', permission: { resource: 'notifications', action: 'index' } },
      { title: 'Email Template', href: '/admin/email-settings/email-template', permission: { resource: 'notifications', action: 'index' } },
      { title: 'Email Configurations', href: '/admin/email-settings/email-configurations', permission: { resource: 'notifications', action: 'index' } },
      { title: 'Group Email', href: '/admin/email-settings/group-email', permission: { resource: 'notifications', action: 'index' } }
    ]
  },
  {
    title: 'Social Settings',
    href: '/admin/social-settings/promotional-icon',
    icon: Users2,
    permission: { resource: 'settings', action: 'update' },
    children: [
      { title: 'Promotional Icon', href: '/admin/social-settings/promotional-icon', permission: { resource: 'settings', action: 'update' } },
      { title: 'Social Login Management', href: '/admin/settings/social-login-management', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Language Settings',
    href: '/admin/language-settings/website-language',
    icon: Globe,
    permission: { resource: 'settings', action: 'update' },
    children: [
      { title: 'Website Language', href: '/admin/language-settings/website-language', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Pages & Navigation',
    href: '/admin/settings/pages/main-menus',
    icon: LayoutDashboard,
    permission: { resource: 'settings', action: 'index' },
    children: [
      { title: 'Main Navigation', href: '/admin/settings/pages/main-menus', permission: { resource: 'settings', action: 'update' } },
      { title: 'Footer Navigation', href: '/admin/settings/pages/footer-menus', permission: { resource: 'settings', action: 'update' } },
      { title: 'Footer Nav Configuration', href: '/admin/settings/pages/footer-nav-configuration', permission: { resource: 'settings', action: 'update' } },
      { title: 'Manage FAQ Page', href: '/admin/settings/pages/faq', permission: { resource: 'settings', action: 'update' } },
      { title: 'Contact Information', href: '/admin/settings/pages/contact', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Homepage',
    href: '/admin/settings/homepage-settings',
    icon: FileText,
    permission: { resource: 'settings', action: 'index' },
    children: [
      { title: 'Homepage Settings', href: '/admin/settings/homepage-settings', permission: { resource: 'settings', action: 'update' } },
      { title: 'Homepage FAQ', href: '/admin/settings/home-faq', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Banners & Meta',
    href: '/admin/settings/banner-management',
    icon: Gift,
    permission: { resource: 'settings', action: 'index' },
    children: [
      { title: 'Banner Management', href: '/admin/settings/banner-management', permission: { resource: 'settings', action: 'update' } },
      { title: 'Meta Management', href: '/admin/settings/meta-management', permission: { resource: 'settings', action: 'update' } },
      { title: 'Create Page', href: '/admin/settings/create-page', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Addons & Integrations',
    href: '/admin/settings/social-links',
    icon: Package,
    permission: { resource: 'settings', action: 'index' },
    children: [
      { title: 'Social Media Management', href: '/admin/settings/social-links', permission: { resource: 'settings', action: 'update' } },
      { title: 'Addons Management', href: '/admin/settings/addons-management', permission: { resource: 'settings', action: 'update' } }
    ]
  },
  {
    title: 'Clear Cache',
    href: '/admin/clear-cache',
    icon: RotateCcw,
    permission: { resource: 'settings', action: 'update' },
    children: []
  },
  // SEO & Marketing
  {
    title: 'SEO & Marketing',
    href: '',
    icon: TrendingUp,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Meta Tags',
        href: '/admin/seo/page-meta',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Shop Meta',
        href: '/admin/seo/shop-seo',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Shop Group Meta',
        href: '/admin/seo/shop-group',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Analytics Scripts',
        href: '/admin/seo/analytics-scripts',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Robots.txt',
        href: '/admin/seo/robots',
        permission: { resource: 'settings', action: 'update' }
      }
    ]
  },
  // Subscription Packages
  {
    title: 'Subscription Packages',
    href: '/admin/subscription-packages',
    icon: Package,
    permission: { resource: 'subscriptions', action: 'index' },
    children: []
  },
  // Rank System
  {
    title: 'Rank System',
    href: '/admin/rank-system',
    icon: BarChart3,
    permission: { resource: 'ranks', action: 'index' },
    children: []
  },
  // Administration & Roles
  {
    title: 'Administration & Roles',
    href: '',
    icon: ShieldAlert,
    permission: { resource: 'accounts', action: 'index' },
    children: [
      {
        title: 'Manage Admin',
        href: '/admin/administration',
        permission: { resource: 'accounts', action: 'index' }
      },
      {
        title: 'Roles & Permissions',
        href: '/admin/roles',
        permission: { resource: 'accounts', action: 'index' }
      }
    ]
  },
  // Newsletter
  {
    title: 'Newsletter',
    href: '/admin/newsletters',
    icon: UserCheck,
    permission: { resource: 'newsletters', action: 'index' },
    children: []
  }
]
