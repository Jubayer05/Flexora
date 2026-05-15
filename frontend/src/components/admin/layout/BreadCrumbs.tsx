'use client'

import { AdminHeaderActions } from '@/components/admin/layout/AdminHeaderActions'
import { Typography } from '@/components/common/typography'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BreadCrumbs() {
  const pathname = usePathname()
  const { isMobile, state } = useSidebar()

  const pathSegments = pathname.split('/').filter(Boolean)

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = segment
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return { href, label }
  })

  return (
    <div className='mx-auto flex h-[70px] w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {isMobile || state === 'collapsed' ? (
          <SidebarTrigger className='shrink-0 rounded-full border border-outline-variant bg-surface-container/40 text-on-surface-variant hover:bg-surface-variant hover:border-primary/30' />
        ) : (
          <div className='size-9 shrink-0 md:hidden' />
        )}

        <div className='flex flex-col py-1.5 lg:gap-1 min-w-0'>
          <Typography variant='h6' weight='medium' className='text-on-surface'>
            {breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Dashboard'}
          </Typography>
          <nav className='flex items-center space-x-1 text-xs md:text-sm text-on-surface-variant'>
            {breadcrumbItems.map((item, index) => (
              <div key={index} className='flex items-center space-x-1'>
                {index === 0 ? (
                  <Link
                    href={item.href}
                    className='transition-colors hover:text-on-surface'
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && (
                  <ChevronRight className='size-4 md:size-5' />
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className='shrink-0'>
        <AdminHeaderActions />
      </div>
    </div>
  )
}