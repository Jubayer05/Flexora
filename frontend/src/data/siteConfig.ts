 
import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  Gift,
  Globe,
  LayoutDashboard,
  Link2,
  Mail,
  MessageSquare,
  Package,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserRound,
  Users2,
  type LucideIcon
} from 'lucide-react'

// import { adminNavItems } from '@/config/menuConfig' // remove if unused

type NavItemLink = {
  type?: 'link'
  title: string
  href: string
  icon: LucideIcon
  children?: Omit<NavItemLink, 'icon' | 'children' | 'type'>[]
  permission?: { resource: string; action?: string }
}

type NavItemDivider = { type: 'divider'; title?: string }
type NavItemLabel = { type: 'label'; title: string }

export type NavItem = NavItemLink | NavItemDivider | NavItemLabel

export const siteConfig = {
  name: 'UHQ',
  description: 'Premium aged & verified accounts for growth',
  logo: {
    default: '/logo.svg',
    dark: '/logo.svg'
  },
  phone: '+8801234567890',
  email: 'info@uhq.com',
  address: '...',
  socialLinks: [
    {
      name: 'facebook',
      url: 'https://www.facebook.com/',
      icon: '/images/social-icon/facebook.svg'
    },
    { name: 'X', url: 'https://x.com/', icon: '/images/social-icon/x.svg' },
    { name: 'instagram', url: 'https://instagram.com/', icon: '/images/social-icon/instagram.svg' },
    { name: 'linkedin', url: 'https://linkedin.com/', icon: '/images/social-icon/linkedin.svg' },
    { name: 'google', url: 'https://google.com/', icon: '/images/social-icon/google.svg' },
    { name: 'youtube', url: 'https://youtube.com/', icon: '/images/social-icon/youtube.svg' },
    { name: 'apple', url: 'https://apple.com/', icon: '/images/social-icon/apple.svg' },
    { name: 'snapchat', url: 'https://snapchat.com/', icon: '/images/social-icon/snapchat.svg' }
  ],
  payments: [
    '/images/payment/01.png',
    '/images/payment/02.png',
    '/images/payment/03.png',
    '/images/payment/04.png',
    '/images/payment/05.png',
    '/images/payment/06.png',
    '/images/payment/07.png',
    '/images/payment/08.png',
    '/images/payment/09.png'
  ],
  mainNav: [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Auto Delivery', href: '/pages/auto-delivery' },
    { label: 'Why Choose Us', href: '/pages/why-choose-us' },
    { label: 'Feedback', href: '/pages/feedback' },
    { label: 'Contact/Support', href: '/pages/contact-support' }
  ],
  footerNav: [
    {
      label: 'Home',
      children: [
        { label: 'About Us', href: '/pages/about-us' },
        { label: 'FAQ', href: '/pages/faq' },
        { label: 'Testimonials', href: '/pages/testimonials' },
        { label: 'Terms of Service', href: '/pages/terms-of-service' },
        { label: 'Security Tips', href: '/pages/security-tips' }
      ]
    },
    {
      label: 'Quick Access',
      children: [
        { label: 'Browse Accounts', href: '/pages/browse-accounts' },
        { label: 'Contact Support', href: '/pages/contact-support' },
        { label: 'Refund Policy', href: '/pages/refund-policy' },
        { label: 'Payment Methods', href: '/pages/payment-methods' },
        { label: 'Privacy Policy', href: '/pages/privacy-policy' }
      ]
    }
  ],
  footer: {
    copyright: '© UHQ Accounts | All rights reserved.'
  }
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Customers',
    href: '/admin/customers/customers-list',
    icon: UserRound,
    permission: { resource: 'users', action: 'index' },
    children: [
      {
        title: 'Customers List',
        href: '/admin/customers/customers-list',
        permission: { resource: 'users', action: 'index' }
      },
      {
        title: 'Withdraws',
        href: '/admin/customers/withdraws',
        permission: { resource: 'users', action: 'index' }
      }
    ]
  },
  {
    title: 'Telegram Management',
    href: '',
    icon: MessageSquare,
    permission: { resource: 'telegram', action: 'index' },
    children: [
      {
        title: 'Manage Accounts',
        href: '/admin/telegram-management/manage-accounts',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Sold Accounts',
        href: '/admin/telegram-management/sold',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Management Channels/groups',
        href: '/admin/telegram-management/manage-transfer-products',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Channels and Groups Sold',
        href: '/admin/telegram-management/ownership-transfer',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Activity Log',
        href: '/admin/telegram-management/activity-log',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Proxy Management',
        href: '/admin/telegram-management/proxies',
        permission: { resource: 'telegram', action: 'index' }
      },
      {
        title: 'Settings',
        href: '/admin/telegram-management/settings',
        permission: { resource: 'telegram', action: 'index' }
      }
    ]
  },
  {
    title: 'Manage Categories',
    href: '',
    icon: Package,
    permission: { resource: 'categories', action: 'index' },
    children: [
      {
        title: 'Categories',
        href: '/admin/categories',
        permission: { resource: 'categories', action: 'index' }
      },
      {
        title: 'Groups',
        href: '/admin/categories/sub',
        permission: { resource: 'categories', action: 'index' }
      }
    ]
  },
  {
    title: 'Products',
    href: '',
    icon: ShoppingBag,
    permission: { resource: 'products', action: 'index' },
    children: [
      {
        title: 'Add new Product',
        href: '/admin/products/add-new-product',
        permission: { resource: 'products', action: 'create' }
      },
      {
        title: 'All Products',
        href: '/admin/products',
        permission: { resource: 'products', action: 'index' }
      },
      {
        title: 'Deactivated Product',
        href: '/admin/products/deactivated',
        permission: { resource: 'products', action: 'index' }
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
  {
    title: 'Coupons',
    href: '/admin/coupons',
    icon: Gift,
    permission: { resource: 'coupons', action: 'index' },
    children: []
  },
  {
    title: 'Blogs',
    href: '/admin/blogs',
    icon: FileText,
    permission: { resource: 'blogs', action: 'index' }
    // children: [
    //   {
    //     title: 'Categories',
    //     href: '/admin/blogs/categories',
    //     permission: { resource: 'blogs', action: 'index' }
    //   },
    //   { title: 'Posts', href: '/admin/blogs', permission: { resource: 'blogs', action: 'index' } }
    // ]
  },
  {
    title: 'Tickets',
    href: '/admin/tickets',
    icon: Mail,
    permission: { resource: 'tickets', action: 'index' },
    children: []
  },
  {
    title: 'Analytics',
    href: '',
    icon: BarChart3,
    permission: { resource: 'orders', action: 'index' },
    children: [
      {
        title: 'Traffic Analysis',
        href: '/admin/analytics/traffic',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Sales Analysis',
        href: '/admin/analytics/sales',
        permission: { resource: 'orders', action: 'index' }
      },
      {
        title: 'Product Performance',
        href: '/admin/analytics/products',
        permission: { resource: 'orders', action: 'index' }
      }
    ]
  },
  {
    title: 'Email Settings',
    href: '',
    icon: Settings,
    permission: { resource: 'notifications', action: 'index' }, // notifications
    children: [
      {
        title: 'Email Template',
        href: '/admin/email-settings/email-template',
        permission: { resource: 'notifications', action: 'index' }
      },
      {
        title: 'Email Configurations',
        href: '/admin/email-settings/email-configurations',
        permission: { resource: 'notifications', action: 'index' }
      },
      {
        title: 'Group Email',
        href: '/admin/email-settings/group-email',
        permission: { resource: 'notifications', action: 'index' }
      },
      {
        title: 'Email & Delivery',
        href: '/admin/settings/email',
        permission: { resource: 'notifications', action: 'index' }
      }
    ]
  },
  {
    title: 'Payment Settings',
    href: '',
    icon: CreditCard,
    permission: { resource: 'payments', action: 'index' },
    children: [
      {
        title: 'Payment Gateways',
        href: '/admin/payment-settings/payment-gateways',
        permission: { resource: 'payments', action: 'index' }
      },
      {
        title: 'Binance Settings',
        href: '/admin/settings/binance',
        permission: { resource: 'payments', action: 'index' }
      }
      // {
      //   title: 'Currencies',
      //   href: '/admin/payment-settings/currencies',
      //   permission: { resource: 'payments', action: 'index' }
      // }
    ]
  },
  {
    title: 'Social Settings',
    href: '',
    icon: Users2,
    permission: { resource: 'settings', action: 'update' },
    children: [
      // {
      //   title: 'Social Links',
      //   href: '/admin/social-settings/links',
      //   permission: { resource: 'settings', action: 'update' }
      // },
      {
        title: 'Promotional Icon',
        href: '/admin/social-settings/promotional-icon',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Social Login Management',
        href: '/admin/settings/social-login-management',
        permission: { resource: 'settings', action: 'update' }
      }
    ]
  },
  {
    title: 'Language Settings',
    href: '',
    icon: Globe,
    permission: { resource: 'settings', action: 'update' },
    children: [
      {
        title: 'Website Language',
        href: '/admin/language-settings/website-language',
        permission: { resource: 'settings', action: 'update' }
      }
      // {
      //   title: 'Admin Panel Language',
      //   href: '/admin/language-settings/admin-language',
      //   permission: { resource: 'settings', action: 'update' }
      // }
    ]
  },
  {
    title: 'SEO',
    href: '',
    icon: TrendingUp,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Landing Meta',
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
  {
    title: 'Newsletters',
    href: '/admin/newsletters',
    icon: UserCheck,
    permission: { resource: 'newsletters', action: 'index' },
    children: []
  },
  {
    title: 'Clear Cache',
    href: '/admin/clear-cache',
    icon: RotateCcw,
    permission: { resource: 'settings', action: 'update' },
    children: []
  },
  {
    title: 'Review Management',
    href: '/admin/feedbacks/feedbacks-management',
    icon: MessageSquare,
    permission: { resource: 'feedbacks', action: 'index' }
  },
  {
    title: 'Rank System',
    href: '/admin/rank-system',
    icon: BarChart3,
    permission: { resource: 'ranks', action: 'index' }
  },
  {
    title: 'Subscription Packages',
    href: '/admin/subscription-packages',
    icon: Package,
    permission: { resource: 'subscriptions', action: 'index' }
  },
  {
    title: 'Affiliate Withdraw',
    href: '/admin/affiliate-withdraw',
    icon: CreditCard,
    permission: { resource: 'affiliates', action: 'index' },
    children: []
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    permission: { resource: 'notifications', action: 'index' },
    children: []
  },
  {
    title: 'URL Tracking',
    href: '/admin/url-tracking',
    icon: Link2,
    permission: { resource: 'notifications', action: 'index' },
    children: []
  },
  { type: 'label', title: 'System Settings' },
  {
    title: 'General Settings',
    href: '',
    icon: Settings,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Site Settings',
        href: '/admin/settings',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Logo Management',
        href: '/admin/settings/logo-management',
        permission: { resource: 'settings', action: 'index' }
      },
      {
        title: 'Contact Information',
        href: '/admin/settings/contact-page',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Maintenance Mode',
        href: '/admin/settings/maintenance-mode',
        permission: { resource: 'settings', action: 'index' }
      }
    ]
  },
  {
    title: 'Pages & Navigation',
    href: '',
    icon: LayoutDashboard,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Main Navigation',
        href: '/admin/settings/pages/main-menus',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Footer Navigation',
        href: '/admin/settings/pages/footer-menus',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Footer Nav Configuration',
        href: '/admin/settings/pages/footer-nav-configuration',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Manage FAQ Page',
        href: '/admin/settings/pages/faq',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Contact Information',
        href: '/admin/settings/pages/contact',
        permission: { resource: 'settings', action: 'update' }
      }
    ]
  },
  {
    title: 'Homepage',
    href: '',
    icon: FileText,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Homepage Settings',
        href: '/admin/settings/homepage-settings',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Homepage FAQ',
        href: '/admin/settings/home-faq',
        permission: { resource: 'settings', action: 'update' }
      }
      // {
      //   title: 'Homepage Testimonial',
      //   href: '/admin/settings/home-testimonials',
      //   permission: { resource: 'settings', action: 'update' }
      // }
    ]
  },
  {
    title: 'Banners & Meta',
    href: '',
    icon: Gift,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Banner Management',
        href: '/admin/settings/banner-management',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Meta Management',
        href: '/admin/settings/meta-management',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Create Page',
        href: '/admin/settings/create-page',
        permission: { resource: 'settings', action: 'update' }
      }
    ]
  },
  {
    title: 'Addons & Integrations',
    href: '',
    icon: Package,
    permission: { resource: 'settings', action: 'index' },
    children: [
      {
        title: 'Social Media Management',
        href: '/admin/settings/social-links',
        permission: { resource: 'settings', action: 'update' }
      },
      {
        title: 'Addons Management',
        href: '/admin/settings/addons-management',
        permission: { resource: 'settings', action: 'update' }
      },

      {
        title: 'Telegram Config',
        href: '/admin/settings/telegram-config',
        permission: { resource: 'settings', action: 'update' }
      }
    ]
  },
  { type: 'label', title: 'Administration' },
  // { type: 'divider' },

  // {
  //   title: 'Administration',
  //   href: '',
  //   icon: ShieldAlert,
  //   permission: { resource: 'accounts', action: 'index' },
  //   children: []
  // },
  {
    title: 'Manage Admin',
    href: '/admin/administration',
    icon: UserRound,
    permission: { resource: 'accounts', action: 'index' },
    children: []
  },
  {
    title: 'Roles & Permissions',
    href: '/admin/roles',
    icon: ShieldAlert,
    permission: { resource: 'accounts', action: 'index' },
    children: []
  }
]
