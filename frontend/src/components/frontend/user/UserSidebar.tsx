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

function SidebarSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='space-y-base'>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className='h-12 rounded-lg bg-surface-container-highest' />
        ))}
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

  useEffect(() => {
    setIsExpanded(false)
    if (typeof window !== 'undefined') {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [pathname])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleNavigation = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (window.innerWidth < 768) {
      setIsExpanded(false)
    }
  }

  if (!mounted) {
    return <SidebarSkeleton />
  }

  if (!userData) {
    return null
  }

  return (
    <nav className='space-y-base'>
      <ul className='space-y-base'>
        {(isGuest ? availableMenuItems : menuItems).map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <li key={item.href}>
              <CustomLink
                href={item.href}
                scroll={true}
                onClick={handleNavigation}
                className={`flex items-center gap-sm px-sm py-xs rounded-lg transition-colors font-medium ${
                  active
                    ? 'bg-surface-container-high text-primary font-bold border-l-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon size={20} />
                <span className='text-sm'>{item.label}</span>
              </CustomLink>
            </li>
          )
        })}

        {(!isGuest ? actionItems : []).map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <li key={item.href}>
              <CustomLink
                href={item.href}
                scroll={true}
                onClick={handleNavigation}
                className={`flex items-center gap-sm px-sm py-xs rounded-lg transition-colors font-medium mt-lg ${
                  active
                    ? 'bg-surface-container-high text-primary font-bold border-l-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon size={20} />
                <span className='text-sm'>
                  {!userData?.isVerified && item.label === 'Reset Password'
                    ? item.label
                    : item.label?.replace('Reset', 'Set')}
                </span>
              </CustomLink>
            </li>
          )
        })}

        <li className='mt-lg'>
          <Button
            onClick={handleLogout}
            variant='ghost'
            className='flex items-center gap-sm px-sm py-xs rounded-lg w-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors'
          >
            <LogOut size={20} />
            <span className='text-sm font-medium'>Logout</span>
          </Button>
        </li>
      </ul>
    </nav>
  )
}