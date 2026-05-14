'use client'

import { userLogout } from '@/action/auth'
import CustomLink from '@/components/common/CustomLink'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/useMounted'
import Cookies from 'js-cookie'
import {
  ArrowLeft,
  BarChart3,
  Crown,
  DollarSign,
  List,
  Lock,
  LogOut,
  MessageSquare,
  Package,
  Star,
  Ticket,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  description?: string
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/user/profile',
    icon: BarChart3,
    description: 'Overview of your account'
  },
  // {
  //   label: 'My Profile',
  //   href: '/user/profile',
  //   icon: User,
  //   description: 'Manage your personal information'
  // },
  {
    label: 'Purchased Items',
    href: '/user/purchased-items',
    icon: Package,
    description: 'View your purchase history'
  },
  {
    label: 'Telegram Accounts',
    href: '/user/telegram-accounts',
    icon: MessageSquare,
    description: 'Manage your Telegram accounts'
  },
  // {
  //   label: 'Order Tracking',
  //   href: '/user/tracking',
  //   icon: Truck,
  //   description: 'Track your deliveries'
  // },
  {
    label: 'Subscription',
    href: '/user/subscription',
    icon: Crown,
    description: 'Manage your subscription'
  },
  {
    label: 'Withdrawals',
    href: '/user/withdrawals',
    icon: DollarSign,
    description: 'Request balance withdrawals'
  },
  {
    label: 'Affiliate Code',
    href: '/user/affiliate',
    icon: Users,
    description: 'Manage your referral codes'
  },
  {
    label: 'Tickets',
    href: '/user/tickets',
    icon: Ticket,
    description: 'Support tickets and help'
  },
  {
    label: 'Reviews',
    href: '/user/reviews',
    icon: Star,
    description: 'Leave and manage your product reviews'
  }
]

const actionItems: MenuItem[] = [
  {
    label: 'Update Profile',
    href: '/user/update-profile',
    icon: Users,
    description: 'Change your personal details'
  },
  {
    label: 'Reset Password',
    href: '/user/reset-password',
    icon: Lock,
    description: 'Change your password'
  }
]

const SIDEBAR_LAYOUT_CLASSES =
  'w-full md:w-[300px] min-h-[48px] md:min-h-[320px] border border-border bg-card md:rounded-[15px] overflow-hidden'

function SidebarSkeleton() {
  return (
    <div className={`${SIDEBAR_LAYOUT_CLASSES} animate-pulse`}>
      <div className='p-4 md:p-6 space-y-3'>
        <div className='h-4 w-32 rounded bg-muted' />
        <div className='hidden md:block space-y-2'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='h-12 rounded-lg bg-muted' />
          ))}
        </div>
      </div>
    </div>
  )
}

interface UserSidebarProps {
  userData?: any
  isGuest?: boolean
}

export default function UserSidebar({ userData: initialUserData, isGuest = false }: UserSidebarProps) {
  const mounted = useMounted()
  const pathname = usePathname()
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const userCookie = mounted ? Cookies.get('user') : null
  const userData = initialUserData || (() => {
    if (!userCookie) return null
    try {
      return JSON.parse(userCookie)
    } catch {
      return null
    }
  })()

  // Combine all menu items (keeping original structure)
  const availableMenuItems = isGuest
    ? [
        {
          label: 'Dashboard',
          href: '/user/profile',
          icon: BarChart3,
          description: 'Overview of your guest access'
        },
        {
          label: 'Purchased Items',
          href: '/user/purchased-items',
          icon: Package,
          description: 'View your purchases and downloads'
        }
      ]
    : [...menuItems, ...actionItems]

  const isActive = (href: string) => {
    if (href === '/user') {
      return pathname === '/user'
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    if (isGuest) {
      sessionStorage.removeItem('guestVerifiedEmail')
      sessionStorage.removeItem('guestOrderEmail')
      sessionStorage.removeItem('guestAccessToken')
      document.cookie = 'guestAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'guestAccessEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      toast.success('Logged out successfully!')
      router.push('/login')
      return
    }

    await userLogout()
    toast.success('Logged out successfully!')
  }

  // Reset sidebar to collapsed state when pathname changes
  useEffect(() => {
    setIsExpanded(false)
    // Snap to top on route change (helps mobile)
    if (typeof window !== 'undefined') {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [pathname])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Function to handle navigation, scroll to top, and collapse sidebar
  const handleNavigation = () => {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Collapse sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      // md breakpoint
      setIsExpanded(false)
    }
  }

  // Before mount: show skeleton to avoid hydration mismatch (Cookies not available on server)
  if (!mounted) {
    return <SidebarSkeleton />
  }

  // After mount: don't render if user is not available
  if (!userData) {
    return null
  }

  return (
    <div
      className={`w-full md:w-75 min-h-12 transition-all duration-300 ease-in-out border border-border bg-card md:rounded-[15px] flex flex-col overflow-hidden z-50 md:z-auto ${
        isExpanded ? 'h-screen' : 'h-12 md:h-screen'
      }`}
    >
      {/* Back to Home Link */}
      <div
        className={`p-6 border-b border-border transition-all duration-300 ${
          isExpanded ? 'block' : 'hidden md:block'
        }`}
      >
        <Link
          href='/'
          onClick={handleNavigation}
          className='flex items-center gap-2 text-card-foreground hover:text-muted-foreground transition-colors'
        >
          <ArrowLeft size={20} />
          <span className='font-medium'>Back to Home</span>
        </Link>
      </div>

      {/* User Info - Only show when expanded */}
      {isExpanded && (
        <div className='p-4 border-b border-border'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-primary rounded-full flex items-center justify-center'>
              <span className='text-primary-foreground text-sm font-bold'>
                {userData?.name?.charAt(0)?.toUpperCase() ||
                  userData?.email?.charAt(0)?.toUpperCase() ||
                  'U'}
              </span>
            </div>
            <div>
              <p className='text-card-foreground text-sm font-medium'>
                {userData?.name || userData?.email || 'User'}
              </p>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                <span className='text-green-600 dark:text-green-400 text-sm font-medium'>
                  {isGuest ? 'Guest' : 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu - Now scrollable */}
      <nav
        className={`flex-1 transition-all duration-300 overflow-y-auto ${
          isExpanded ? 'block' : 'hidden md:block'
        }`}
        style={{
          scrollbarWidth: 'none' /* Firefox */,
          msOverflowStyle: 'none' /* IE and Edge */
        }}
      >
        <style jsx>{`
          nav::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
          }
        `}</style>
        <ul className='space-y-2 p-4'>
          {/* Main Menu Items */}
          {(isGuest ? availableMenuItems : menuItems).map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <li
                key={item.href}
                className={`relative flex items-center justify-between gap-3 transition-all duration-200 ${
                  active
                    ? 'text-primary-foreground bg-primary shadow-lg rounded-lg md:mx-2'
                    : 'text-card-foreground hover:bg-accent rounded-lg md:mx-2'
                }`}
              >
                <CustomLink
                  href={item.href}
                  scroll={true}
                  onClick={handleNavigation}
                  className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-200 w-full rounded-lg ${
                    active ? 'text-primary-foreground hover:text-primary-foreground' : 'text-card-foreground hover:text-primary'
                  }`}
                >
                  {active && (
                    <div className='h-6 w-1.25 rounded-r-[3px] bg-primary-foreground/20 absolute left-0' />
                  )}
                  <Icon size={20} />
                  <span className='font-semibold text-sm font-manrope'>{item.label}</span>
                </CustomLink>
                {/* List icon only on mobile devices */}
                {active && (
                  <button
                    onClick={toggleExpanded}
                    className='mr-4 p-1 hover:bg-accent rounded transition-colors md:hidden'
                  >
                    <List
                      className={`transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                )}
              </li>
            )
          })}

          {/* Action Items */}
          {(!isGuest ? actionItems : []).map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <li
                key={item.href}
                className={`relative flex items-center justify-between gap-3 transition-all duration-200 ${
                  active
                    ? 'text-primary-foreground bg-primary shadow-lg rounded-lg md:mx-2'
                    : 'text-card-foreground hover:bg-accent rounded-lg md:mx-2'
                }`}
              >
                <CustomLink
                  href={item.href}
                  scroll={true}
                  onClick={handleNavigation}
                  className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-200 w-full rounded-lg ${
                    active ? 'text-primary-foreground hover:text-primary-foreground' : 'text-card-foreground hover:text-primary'
                  }`}
                >
                  {active && (
                    <div className='h-6 w-1.25 rounded-r-[3px] bg-primary-foreground/20 absolute left-0' />
                  )}
                  <Icon size={20} />
                  <span className='font-semibold text-sm font-manrope'>
                    {!userData?.isVerified && item.label === 'Reset Password'
                      ? item.label
                      : item.label?.replace('Reset', 'Set')}
                  </span>
                </CustomLink>
                {/* List icon only on mobile devices */}
                {active && (
                  <button
                    onClick={toggleExpanded}
                    className='mr-4 p-1 hover:bg-accent rounded transition-colors md:hidden'
                  >
                    <List
                      className={`transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                )}
              </li>
            )
          })}

          {/* Logout Button */}
          <li className='relative flex items-center justify-between gap-3 transition-all duration-200 rounded-lg md:mx-2'>
            <Button
              onClick={handleLogout}
              variant='ghost'
              className='relative flex items-center gap-3 px-4 py-5.5 transition-all duration-200 w-full 
              rounded-lg text-primary-foreground bg-destructive hover:bg-destructive/90'
            >
              <LogOut size={20} />
              <span className='font-semibold text-sm font-manrope'>Logout</span>
            </Button>
          </li>
        </ul>
      </nav>

      {/* Mobile: Show only active item when collapsed */}
      {!isExpanded && (
        <div className='md:hidden'>
          {(() => {
            const activeItem =
              availableMenuItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/')) ||
              availableMenuItems[0]

            if (!activeItem) return null
            const Icon = activeItem.icon

            return (
              <div className='relative flex items-center justify-between gap-3 text-black bg-primary shadow-lg h-12 rounded-lg md:mx-2'>
                <CustomLink
                  href={activeItem.href}
                  scroll={true}
                  onClick={handleNavigation}
                  className='relative flex items-center gap-3 px-4 py-3 transition-all duration-200 w-full rounded-lg text-primary-foreground hover:text-primary-foreground'
                >
                  <div className='h-6 w-1.25 rounded-r-[3px] bg-primary-foreground/20 absolute left-0' />
                  <Icon size={20} />
                  <span className='font-semibold text-sm font-manrope'>
                    {activeItem.label || 'Menu'}
                  </span>
                </CustomLink>
                <button
                  onClick={toggleExpanded}
                  className='mr-4 p-1 hover:bg-accent rounded transition-colors'
                >
                  <List className='transition-transform duration-300' />
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
