'use client'

import * as React from 'react'

import { NavMain } from '@/components/admin/layout/nav-main'
import { NavUser } from '@/components/admin/layout/nav-user'
import { Sidebar, SidebarContent, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar'
import { navItems } from '@/data/siteConfig'

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  logo?: React.ReactNode
}

export function AppSidebar({ logo, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible='offcanvas' className='border-r border-outline-variant/40' {...props}>
      <div className='flex h-full flex-col bg-surface-container-low'>
        <div className='flex shrink-0 items-center border-b border-outline-variant/40 h-[71px]'>
          <div className='flex w-full justify-between items-center gap-3 px-5'>
            <div className='min-w-0 flex-1'>{logo}</div>
            <SidebarTrigger className='shrink-0 rounded-full border border-outline-variant bg-surface-container/40 text-on-surface-variant hover:bg-surface-variant hover:border-primary/30' />
          </div>
        </div>
        <SidebarContent className='min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-2 custom-scrollbar'>
          <NavMain items={navItems} />
        </SidebarContent>
        <SidebarFooter className='shrink-0 border-t border-outline-variant/40 p-3'>
          <NavUser />
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}
