'use client'

import Cookies from 'js-cookie'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { userLogout } from '@/action/auth'
import CustomLink from '@/components/common/CustomLink'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
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

// Load only on client to avoid "reading 'call'" / next-themes SSR issues
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
        'inline-flex items-center rounded-lg border border-border bg-background/60 text-card-foreground shadow-sm',
        compact ? 'h-9 max-w-[118px]' : 'h-10'
      )}
    >
      <button
        type='button'
        onClick={() => router.push('/user/profile')}
        className={cn(
          'inline-flex h-full min-w-0 items-center gap-1.5 rounded-l-lg px-2.5 text-left transition-colors hover:bg-accent',
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
          'inline-flex h-full items-center justify-center border-l border-border text-primary transition-colors hover:bg-primary hover:text-primary-foreground',
          compact ? 'w-8 rounded-r-lg' : 'w-9 rounded-r-lg'
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
  promotionalIcons: any
  activeMenuItems: PageItem[]
}

export default function HeaderActions({
  token,
  promotionalIcons,
  activeMenuItems
}: HeaderActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any | null>(null)
  const [guestUser, setGuestUser] = useState<any | null>(null)

  // Fetch fresh profile when logged in so photoUrl and role are always current
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
  const isSignedIn = !!token || !!guestUser

  const isAdmin = effectiveUser?.role === 'ADMIN' || effectiveUser?.role === 'MODERATOR'

  const initials =
    (effectiveUser?.firstName?.charAt(0) || effectiveUser?.email?.charAt(0) || 'U').toUpperCase() ||
    'U'

  const handleLogout = async () => {
    if (guestUser && !token) {
      sessionStorage.removeItem('guestVerifiedEmail')
      sessionStorage.removeItem('guestOrderEmail')
      sessionStorage.removeItem('guestAccessToken')
      document.cookie = 'guestAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'guestAccessEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push('/login')
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
            {token && <Notifications variant='desktop' />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'relative inline-flex items-center justify-center p-0 rounded-full border border-border/60 bg-background/40 hover:bg-accent/70 hover:border-primary/30 cursor-pointer transition-colors backdrop-blur-md shadow-sm',
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
                    <span className='absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center shadow-sm'>
                      <ChevronDown className='h-3 w-3 text-muted-foreground' />
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-56 font-manrope border-border/60 bg-card/85 backdrop-blur-xl shadow-xl shadow-primary/10'
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
                      <span className='text-sm font-medium'>
                        {effectiveUser?.firstName || effectiveUser?.email || 'User'}
                      </span>
                      {effectiveUser?.email && (
                        <span className='text-xs text-muted-foreground'>{effectiveUser.email}</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/admin/dashboard')}
                      className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                    >
                      <LayoutDashboard className='h-4 w-4' />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/user/profile')}
                      className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                    >
                      <UserIcon className='h-4 w-4' />
                      <span>User Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/user/profile')}
                      className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                    >
                      <LayoutDashboard className='h-4 w-4' />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    {effectiveUser?.isGuest ? (
                      <DropdownMenuItem
                        onClick={() => router.push('/user/purchased-items')}
                        className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                      >
                        <Settings className='h-4 w-4' />
                        <span>Purchased Items</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => router.push('/user/update-profile')}
                          className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                        >
                          <Settings className='h-4 w-4' />
                          <span>Quick Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push('/user/update-profile')}
                          className='cursor-pointer gap-2 rounded-lg focus:bg-accent/70'
                        >
                          <UserIcon className='h-4 w-4' />
                          <span>Edit Profile</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className='cursor-pointer gap-2 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10'
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
                'font-medium text-card-foreground/80 hover:text-card-foreground border border-border/60 bg-background/40 hover:bg-accent/70 hover:border-primary/30 text-sm px-4 py-2 rounded-lg transition-colors backdrop-blur-md',
                buttonVariants({
                  variant: 'outline',
                  size: 'default'
                })
              )}
            >
              Log In
            </CustomLink>
            <CustomLink
              href='/sign-up'
              className={cn(
                'font-semibold text-primary-foreground bg-linear-to-r from-primary to-violet-500 hover:opacity-90 text-sm px-4 py-2 rounded-lg transition-opacity shadow-sm shadow-primary/20',
                buttonVariants({
                  variant: 'default',
                  size: 'default'
                })
              )}
            >
              Sign Up
            </CustomLink>
          </>
        )}
      </div>

      {/* Mobile row - compact layout with proper touch targets */}
      <div className='xl:hidden flex items-center gap-1.5 sm:gap-2'>
        <CartButton />
        {token && <HeaderBalance compact />}
        {token && <Notifications variant='mobile' />}
        <ThemeSwitcher className='shrink-0 [&_button]:size-8! [&_button]:sm:size-9!' />
        <div className='shrink-0'>
          <LanguageSwitcher compact />
        </div>
        <MobileNav items={activeMenuItems} icons={promotionalIcons} />
      </div>
    </>
  )
}
