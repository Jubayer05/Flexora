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

  // Split pathname and filter out empty strings
  const pathSegments = pathname.split('/').filter(Boolean)

  // Create breadcrumb items with proper titles and hrefs
  const breadcrumbItems = pathSegments.map((segment, index) => {
    // Build href from segments up to current index
    const href = '/' + pathSegments.slice(0, index + 1).join('/')

    // Remove dashes and convert to title case
    const label = segment
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return { href, label }
  })

  return (
    <div className='sticky top-0 z-10 flex h-[70px] items-center justify-between gap-3 border-b border-border bg-background px-2 lg:px-5'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {isMobile || state === 'collapsed' ? (
          <SidebarTrigger className='shrink-0 text-card-foreground hover:bg-sidebar-accent' />
        ) : (
          <div className='size-9 shrink-0 md:hidden' />
        )}

        <div className='flex flex-col py-1.5 lg:gap-1 min-w-0'>
          <Typography variant='h6' weight='medium' className='text-card-foreground'>
            {breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Dashboard'}
          </Typography>
          <nav className='flex items-center space-x-1 text-xs md:text-sm'>
            {breadcrumbItems.map((item, index) => (
              <div key={index} className='flex items-center space-x-1'>
                {index === 0 ? (
                  <Link
                    href={item.href}
                    className='text-muted-foreground transition-colors hover:text-card-foreground'
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className='text-muted-foreground'>{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && (
                  <ChevronRight className='size-4 text-muted-foreground md:size-5' />
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
