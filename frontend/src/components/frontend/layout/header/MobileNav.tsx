'use client'

import { userLogout } from '@/action/auth'
import CustomLink from '@/components/common/CustomLink'
import { useSiteConfig } from '@/components/providers/store-provider'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { PromotionalIconType } from '@/lib/validations/schemas/promotionalIcon'
import Cookies from 'js-cookie'
import { LogOut, Mail, Menu, PhoneCall } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import MobileDropdownNavItem from './MobileDropdownNavItem'

const PromotionalIcons = dynamic(() => import('./PromotionalIcons'), {
  ssr: false
})

export default function MobileNav({
  items,
  icons
}: {
  items: PageItem[]
  icons?: PromotionalIconType[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { siteConfig } = useSiteConfig()
  const token = Cookies.get('token')
  const guestAccessToken =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('guestAccessToken') || Cookies.get('guestAccessToken')
      : null
  const isSignedIn = !!token || !!guestAccessToken

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

    await userLogout()
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className='xl:hidden flex justify-center items-center rounded-md transition-colors cursor-pointer text-card-foreground hover:text-foreground p-2 hover:bg-accent shrink-0 min-w-[44px] min-h-[44px]' aria-label='Open menu'>
          <Menu className='w-5 h-5 sm:w-6 sm:h-6' />
        </button>
      </SheetTrigger>
      <SheetContent
        side='right'
        className='bg-card/85 backdrop-blur-xl border-l border-border/60 p-0 w-[min(340px,88vw)] sm:w-96 max-w-[100vw] text-card-foreground [&>button.absolute]:bg-primary/10 [&>button.absolute]:hover:bg-primary/20 [&>button.absolute]:rounded-md'
      >
        <SheetHeader className='flex justify-between items-center p-4 border-b border-border'>
          <SheetTitle className='text-card-foreground text-lg font-semibold'>Navigation Menu</SheetTitle>
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
                href='/user/profile'
                onClick={() => setIsOpen(false)}
                className={cn(
                  'font-semibold text-card-foreground hover:text-foreground border border-border/60 hover:border-primary/30 bg-background/40 hover:bg-accent/70 text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
                  buttonVariants({
                    variant: 'outline',
                    size: 'default'
                  })
                )}
              >
                View Profile
              </CustomLink>
              {guestAccessToken && !token && (
                <CustomLink
                  href='/user/purchased-items'
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'font-semibold text-card-foreground hover:text-foreground border border-border/60 hover:border-primary/30 bg-background/40 hover:bg-accent/70 text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
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
                className='font-medium text-destructive hover:text-destructive/90 hover:bg-destructive/10 border border-destructive/30 hover:border-destructive/50 bg-transparent text-sm px-4 py-2 rounded-lg transition-colors text-center flex items-center justify-center gap-2 w-full'
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
                  'font-medium text-foreground hover:text-foreground border border-border/60 hover:border-primary/30 bg-background/40 hover:bg-accent/70 text-sm px-4 py-2 rounded-lg transition-colors text-center backdrop-blur-md',
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
                  'font-semibold text-primary-foreground bg-linear-to-r from-primary to-violet-500 hover:opacity-90 text-sm px-4 py-2 rounded-lg transition-opacity text-center shadow-sm shadow-primary/20',
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
          <div className='pt-4 border-t border-border'>
            <div className='space-y-3 text-muted-foreground text-sm'>
              {siteConfig?.phone && (
                <p className='flex items-center gap-2'>
                  <PhoneCall className='size-4 text-muted-foreground' /> {siteConfig.phone}
                </p>
              )}
              {siteConfig?.email && (
                <p className='flex items-center gap-2'>
                  <Mail className='size-4 text-muted-foreground' /> {siteConfig.email}
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
