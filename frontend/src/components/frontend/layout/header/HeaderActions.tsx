'use client'

import Cookies from 'js-cookie'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { adminLogout, userLogout } from '@/action/auth'
import { getDashboardPath, isAdminRole } from '@/lib/authRedirect'
import CustomLink from '@/components/common/CustomLink'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { ChevronDown, LayoutDashboard, LogOut, Plus, Settings, User as UserIcon, Wallet } from 'lucide-react'

import MobileNav from './MobileNav'
import { Notifications } from './Notifications'
import PromotionalIcons from './PromotionalIcons'

const ThemeSwitcher = dynamic(
  () => import('@/components/common/ThemeSwitcher').then((m) => m.default),
  { ssr: false }
)
const LanguageSwitcher = dynamic(
  () => import('@/components/common/LanguageSwitcher').then((m) => m.default),
  { ssr: false }
)
const CartButton = dynamic(() => import('./CartButton').then((m) => m.default), { ssr: false })

function HeaderBalance({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { data } = useAsync<{ data: { balance: number } }>(
    () => '/customer/balance',
    false,
    false,
    true,
    10000
  )
  const balance = Number(data?.data?.balance || 0)

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-outline-variant bg-surface-container/60 text-on-surface shadow-sm',
        compact ? 'h-9 max-w-[118px]' : 'h-10'
      )}
    >
      <button
        type='button'
        onClick={() => router.push('/user/profile')}
        className={cn(
          'inline-flex h-full min-w-0 items-center gap-1.5 rounded-l-full px-2.5 text-left transition-colors hover:bg-surface-variant',
          compact ? 'text-xs' : 'text-sm'
        )}
        aria-label={`Wallet balance $${balance.toFixed(2)}`}
        title={`Balance: $${balance.toFixed(2)}`}
      >
        <Wallet className={cn('shrink-0 text-primary', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        <span className={cn('font-semibold tabular-nums', compact && 'truncate')}>
          ${balance.toFixed(2)}
        </span>
      </button>
      <button
        type='button'
        onClick={() => router.push('/wallet/topup')}
        className={cn(
          'inline-flex h-full items-center justify-center border-l border-outline-variant text-primary transition-colors hover:bg-primary hover:text-on-primary rounded-r-full',
          compact ? 'w-8' : 'w-9'
        )}
        aria-label='Add balance'
        title='Add balance'
      >
        <Plus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  )
}

type HeaderActionsProps = {
  token: string | undefined
  adminToken?: string
  userRole?: string
  promotionalIcons: any
  activeMenuItems: PageItem[]
}

export default function HeaderActions({
  token,
  adminToken,
  userRole,
  promotionalIcons,
  activeMenuItems
}: HeaderActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any | null>(null)
  const [guestUser, setGuestUser] = useState<any | null>(null)

  const { data: profileResponse } = useAsync<any>(() => (token ? '/customer/profile' : null))
  const profileUser = profileResponse?.data

  useEffect(() => {
    const cookie = (typeof document !== 'undefined' ? Cookies.get('user') : null) ?? null
    if (!cookie) return
    try {
      setUser(JSON.parse(cookie))
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncGuestUser = () => {
      const guestAccessToken =
        window.sessionStorage.getItem('guestAccessToken') || Cookies.get('guestAccessToken')
      const guestEmail =
        window.sessionStorage.getItem('guestVerifiedEmail') ||
        window.sessionStorage.getItem('guestOrderEmail') ||
        Cookies.get('guestAccessEmail')

      if (!guestAccessToken || !guestEmail) {
        setGuestUser(null)
        return
      }

      setGuestUser({
        email: guestEmail,
        firstName: 'Guest',
        isGuest: true
      })
    }

    syncGuestUser()
    window.addEventListener('focus', syncGuestUser)
    window.addEventListener('storage', syncGuestUser)

    return () => {
      window.removeEventListener('focus', syncGuestUser)
      window.removeEventListener('storage', syncGuestUser)
    }
  }, [pathname, token])

  const effectiveUser = profileUser || user || (!token ? guestUser : null)
  const isSignedIn = !!token || !!adminToken || !!guestUser
  const isAdmin = isAdminRole(userRole) || isAdminRole(effectiveUser?.role)
  const dashboardHref = getDashboardPath(userRole ?? effectiveUser?.role, !!adminToken)

  const initials = (
    effectiveUser?.firstName?.charAt(0) ||
    effectiveUser?.email?.charAt(0) ||
    (isAdmin ? 'A' : 'U')
  ).toUpperCase()

  const handleLogout = async () => {
    if (guestUser && !token && !adminToken) {
      sessionStorage.removeItem('guestVerifiedEmail')
      sessionStorage.removeItem('guestOrderEmail')
      sessionStorage.removeItem('guestAccessToken')
      document.cookie = 'guestAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'guestAccessEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push('/login')
      return
    }

    if (adminToken) {
      await adminLogout()
      return
    }

    await userLogout()
  }

  return (
    <>
      {/* Desktop: auth row */}
      <div className='hidden xl:flex justify-center items-center gap-3'>
        <PromotionalIcons data={promotionalIcons} />
        <CartButton />
        {token && <HeaderBalance />}
        <ThemeSwitcher />
        <LanguageSwitcher />

        {isSignedIn ? (
          <div className='flex items-center gap-3'>
            <CustomLink
              href={dashboardHref}
              className={cn(
                'font-outfit font-medium text-on-surface border border-outline-variant bg-surface-container/40 hover:bg-surface-variant hover:border-primary/30 text-sm px-4 py-2 rounded-full transition-colors backdrop-blur-md inline-flex items-center gap-2'
              )}
            >
              <LayoutDashboard className='h-4 w-4 text-primary' />
              Dashboard
            </CustomLink>
            {token && <Notifications variant='desktop' />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'relative inline-flex items-center justify-center p-0 rounded-full border border-outline-variant bg-surface-container/40 hover:bg-surface-variant hover:border-primary/30 cursor-pointer transition-colors backdrop-blur-md shadow-sm',
                    'min-w-[36px]'
                  )}
                >
                  <div className='relative'>
                    <Avatar className='h-[36px] w-[36px]'>
                      <AvatarImage
                        src={effectiveUser?.photoUrl || ''}
                        alt={effectiveUser?.firstName || ''}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className='absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-surface border border-outline-variant flex items-center justify-center shadow-sm'>
                      <ChevronDown className='h-3 w-3 text-on-surface-variant' />
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-56 font-outfit border-outline-variant/60 bg-surface-container/85 backdrop-blur-xl shadow-xl'
              >
                <DropdownMenuLabel>
                  <div className='flex items-center gap-2'>
                    <Avatar className='h-8 w-8'>
                      <AvatarImage
                        src={effectiveUser?.photoUrl || ''}
                        alt={effectiveUser?.firstName || ''}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col'>
                      <span className='text-sm font-medium text-on-surface'>
                        {effectiveUser?.firstName ||
                          effectiveUser?.email ||
                          (isAdmin ? 'Admin' : 'User')}
                      </span>
                      {effectiveUser?.email && (
                        <span className='text-xs text-on-surface-variant'>{effectiveUser.email}</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(dashboardHref)}
                  className='cursor-pointer gap-2 rounded-full focus:bg-surface-variant'
                >
                  <LayoutDashboard className='h-4 w-4 text-primary' />
                  <span className='text-on-surface'>Dashboard</span>
                </DropdownMenuItem>
                {isAdmin && token ? (
                  <DropdownMenuItem
                    onClick={() => router.push('/user/profile')}
                    className='cursor-pointer gap-2 rounded-full focus:bg-surface-variant'
                  >
                    <UserIcon className='h-4 w-4 text-primary' />
                    <span className='text-on-surface'>User Area</span>
                  </DropdownMenuItem>
                ) : null}
                {!isAdmin ? (
                  <>
                    {effectiveUser?.isGuest ? (
                      <DropdownMenuItem
                        onClick={() => router.push('/user/purchased-items')}
                        className='cursor-pointer gap-2 rounded-full focus:bg-surface-variant'
                      >
                        <Settings className='h-4 w-4 text-primary' />
                        <span className='text-on-surface'>Purchased Items</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => router.push('/user/update-profile')}
                          className='cursor-pointer gap-2 rounded-full focus:bg-surface-variant'
                        >
                          <Settings className='h-4 w-4 text-primary' />
                          <span className='text-on-surface'>Quick Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push('/user/update-profile')}
                          className='cursor-pointer gap-2 rounded-full focus:bg-surface-variant'
                        >
                          <UserIcon className='h-4 w-4 text-primary' />
                          <span className='text-on-surface'>Edit Profile</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className='cursor-pointer gap-2 rounded-full text-error focus:text-error focus:bg-error/10'
                >
                  <LogOut className='h-4 w-4' />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <>
            <CustomLink
              href='/login'
              className={cn(
                'font-outfit font-medium text-on-surface border border-outline-variant bg-surface-container/40 hover:bg-surface-variant hover:border-primary/30 text-sm px-4 py-2 rounded-full transition-colors backdrop-blur-md'
              )}
            >
              Log In
            </CustomLink>
            <CustomLink
              href='/sign-up'
              className={cn(
                'fire-gradient font-outfit font-semibold text-white text-sm px-4 py-2 rounded-full transition-opacity shadow-sm shadow-primary/20 hover:scale-105'
              )}
            >
              Sign Up
            </CustomLink>
          </>
        )}
      </div>

      {/* Mobile row */}
      <div className='xl:hidden flex items-center gap-1.5 sm:gap-2'>
        <CartButton />
        {token && <HeaderBalance compact />}
        {token && <Notifications variant='mobile' />}
        <ThemeSwitcher className='shrink-0' />
        <div className='shrink-0'>
          <LanguageSwitcher compact />
        </div>
        <MobileNav
          items={activeMenuItems}
          icons={promotionalIcons}
          token={token}
          adminToken={adminToken}
          userRole={userRole}
          dashboardHref={dashboardHref}
        />
      </div>
    </>
  )
}