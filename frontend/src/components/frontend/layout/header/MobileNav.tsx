'use client'

import { adminLogout, userLogout } from '@/action/auth'
import { isAdminRole } from '@/lib/authRedirect'
import CustomLink from '@/components/common/CustomLink'
import { useSiteConfig } from '@/components/providers/store-provider'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { PromotionalIconType } from '@/lib/validations/schemas/promotionalIcon'
import Cookies from 'js-cookie'
import { LayoutDashboard, LogOut, Mail, Menu, PhoneCall } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import MobileDropdownNavItem from './MobileDropdownNavItem'

const PromotionalIcons = dynamic(() => import('./PromotionalIcons'), {
  ssr: false
})

export default function MobileNav({
  items,
  icons,
  token: serverToken,
  adminToken: serverAdminToken,
  dashboardHref = '/user/profile'
}: {
  items: PageItem[]
  icons?: PromotionalIconType[]
  token?: string
  adminToken?: string
  userRole?: string
  dashboardHref?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { siteConfig } = useSiteConfig()
  const token = serverToken || Cookies.get('token')
  const adminToken = serverAdminToken || Cookies.get('adminToken')
  const guestAccessToken =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('guestAccessToken') || Cookies.get('guestAccessToken')
      : null
  const isSignedIn = !!token || !!adminToken || !!guestAccessToken
  const isAdmin = isAdminRole(Cookies.get('userRole')) || !!adminToken

  const handleLogout = async () => {
    setIsOpen(false)

    if (guestAccessToken && !token) {
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
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className='xl:hidden flex justify-center items-center rounded-full border border-outline-variant bg-surface-container/40 hover:bg-surface-variant hover:border-primary/30 transition-colors cursor-pointer text-on-surface hover:text-primary p-2 shrink-0 min-w-[44px] min-h-[44px] backdrop-blur-md shadow-sm' aria-label='Open menu'>
          <Menu className='w-5 h-5 sm:w-6 sm:h-6' />
        </button>
      </SheetTrigger>
      <SheetContent
        side='right'
        className='bg-surface-container/95 backdrop-blur-xl border-l border-outline-variant p-0 w-[min(340px,88vw)] sm:w-96 max-w-[100vw] text-on-surface [&>button.absolute]:bg-surface-container-high [&>button.absolute]:hover:bg-surface-container-high [&>button.absolute]:rounded-md'
      >
        <SheetHeader className='flex justify-between items-center p-4 border-b border-outline-variant'>
          <SheetTitle className='text-on-surface text-lg font-semibold'>Navigation Menu</SheetTitle>
        </SheetHeader>

        <div className='flex flex-col space-y-6 p-6 overflow-y-auto'>
          {/* Navigation Links - Dropdown Menu Style */}
          {items?.length > 0 && (
            <nav className='space-y-1'>
              {items.map((item, index) => (
                <MobileDropdownNavItem
                  key={item.id || index}
                  item={item}
                  onItemClick={() => setIsOpen(false)}
                />
              ))}
            </nav>
          )}

          {/* Auth Buttons */}
          {isSignedIn ? (
            <div className='flex flex-col gap-2'>
              <CustomLink
                href={dashboardHref}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'font-semibold text-on-surface hover:text-on-surface border border-outline-variant hover:border-primary/30 bg-surface-container-lowest hover:bg-surface-container text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md inline-flex items-center justify-center gap-2',
                  buttonVariants({
                    variant: 'outline',
                    size: 'default'
                  })
                )}
              >
                <LayoutDashboard className='h-4 w-4 text-primary' />
                Dashboard
              </CustomLink>
              {!isAdmin && (
              <CustomLink
                href='/user/profile'
                onClick={() => setIsOpen(false)}
                className={cn(
                  'font-semibold text-on-surface hover:text-on-surface border border-outline-variant hover:border-primary/30 bg-surface-container-lowest hover:bg-surface-container text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
                  buttonVariants({
                    variant: 'outline',
                    size: 'default'
                  })
                )}
              >
                View Profile
              </CustomLink>
              )}
              {guestAccessToken && !token && (
                <CustomLink
                  href='/user/purchased-items'
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'font-semibold text-on-surface hover:text-on-surface border border-outline-variant hover:border-primary/30 bg-surface-container-lowest hover:bg-surface-container text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
                    buttonVariants({
                      variant: 'outline',
                      size: 'default'
                    })
                  )}
                >
                  Purchased Items
                </CustomLink>
              )}
              <button
                type='button'
                onClick={handleLogout}
                className='font-medium text-error hover:text-error/90 hover:bg-error/10 border border-error/30 hover:border-error/50 bg-transparent text-sm px-4 py-2 rounded-lg transition-colors text-center flex items-center justify-center gap-2 w-full'
              >
                <LogOut className='h-4 w-4 shrink-0' />
                Logout
              </button>
            </div>
          ) : (
            <div className='gap-3 grid grid-cols-2 pt-2'>
              <CustomLink
                href='/login'
                onClick={() => setIsOpen(false)}
                className={cn(
                  'font-medium text-on-surface hover:text-on-surface border border-outline-variant hover:border-primary/30 bg-surface-container-lowest hover:bg-surface-container text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
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
                onClick={() => setIsOpen(false)}
                className={cn(
                  'font-semibold text-on-primary bg-primary hover:bg-primary/90 text-sm px-4 py-2 rounded-lg transition-opacity text-center shadow-sm',
                  buttonVariants({
                    variant: 'default',
                    size: 'default'
                  })
                )}
              >
                Sign Up
              </CustomLink>
            </div>
          )}

          <PromotionalIcons data={icons} />

          {/* Contact Info */}
          <div className='pt-4 border-t border-outline-variant'>
            <div className='space-y-3 text-on-surface-variant text-sm'>
              {siteConfig?.phone && (
                <p className='flex items-center gap-2'>
                  <PhoneCall className='size-4 text-on-surface-variant' /> {siteConfig.phone}
                </p>
              )}
              {siteConfig?.email && (
                <p className='flex items-center gap-2'>
                  <Mail className='size-4 text-on-surface-variant' /> {siteConfig.email}
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
