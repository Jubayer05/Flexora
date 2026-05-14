'use client'

import * as React from 'react'

import { NavMain } from '@/components/admin/layout/nav-main'
import { NavUser } from '@/components/admin/layout/nav-user'
import { Sidebar, SidebarContent, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar'
import { navItems } from '@/data/siteConfig'

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Dynamic logo (e.g. <SiteLogo /> from server). When provided, uses site config logo. */
  logo?: React.ReactNode
}

export function AppSidebar({ logo, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible='offcanvas' className='border-border border-r' {...props}>
      <div className='flex h-full flex-col bg-background'>
        <div className='flex shrink-0 items-center border-b border-border h-[80px]'>
          <div className='flex w-full justify-between items-center gap-2.5 p-2.5'>
            <div className='min-w-0 flex-1'>{logo}</div>
            <SidebarTrigger className='hover:bg-sidebar-accent text-card-foreground shrink-0' />
          </div>
        </div>
        <SidebarContent className='min-h-0 flex-1 overflow-y-auto p-3 pb-2 custom-scrollbar'>
          <NavMain items={navItems} />
        </SidebarContent>
        <SidebarFooter className='shrink-0 border-t border-border p-2'>
          <NavUser />
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}
