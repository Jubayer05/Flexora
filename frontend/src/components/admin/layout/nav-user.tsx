'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { createUserProfileMenuConfig, type MenuItem, type ModalType } from '@/config/menuConfig'
import { useAdminStore } from '@/stores/admin-info'
import { ChevronsUpDown, type LucideIcon } from 'lucide-react'

const ProfileModal = dynamic(() => import('@/components/admin/modals/ProfileModal'), {
  loading: () => null
})
const SettingsModal = dynamic(() => import('@/components/admin/modals/SettingsModal'), {
  loading: () => null
})
const SecurityModal = dynamic(() => import('@/components/admin/modals/SecurityModal'), {
  loading: () => null
})

export function NavUser() {
  const router = useRouter()
  const { adminInfo, clearAdminInfo } = useAdminStore()
  const { setOpenMobile } = useSidebar()
  const [openModal, setOpenModal] = useState<ModalType>(null)

  useEffect(() => {
    useAdminStore.persist.rehydrate()
  }, [])

  const handleOpenModal = useCallback(
    (modalType: ModalType) => {
      setOpenModal(modalType)
      setOpenMobile(false)
    },
    [setOpenMobile]
  )

  const userMenuItems = createUserProfileMenuConfig(clearAdminInfo, router, handleOpenModal)

  const handleMenuAction = useCallback(
    (item: MenuItem) => {
      setOpenMobile(false)
      if (item.onClick) {
        void item.onClick()
      }
    },
    [setOpenMobile]
  )

  if (!adminInfo) {
    return (
      <SidebarMenu className='font-manrope'>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' className='cursor-default' disabled>
            <Avatar className='size-8 rounded-lg'>
              <AvatarFallback className='rounded-lg bg-sidebar-accent text-sidebar-accent-foreground'>
                —
              </AvatarFallback>
            </Avatar>
            <span className='truncate'>Loading…</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const initials =
    [adminInfo.firstName?.charAt(0) ?? '', adminInfo.lastName?.charAt(0) ?? '']
      .filter(Boolean)
      .join('')
      .toUpperCase() || 'AD'

  return (
    <>
      <ProfileModal isOpen={openModal === 'profile'} onClose={() => setOpenModal(null)} />
      <SettingsModal isOpen={openModal === 'settings'} onClose={() => setOpenModal(null)} />
      <SecurityModal isOpen={openModal === 'security'} onClose={() => setOpenModal(null)} />

      <SidebarMenu className='font-manrope'>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                tooltip={adminInfo.firstName ?? adminInfo.email ?? 'Account'}
              >
                <Avatar className='size-8 rounded-lg'>
                  <AvatarImage src='/' alt={adminInfo.firstName ?? undefined} />
                  <AvatarFallback className='rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{adminInfo.firstName ?? 'Admin'}</span>
                  <span className='truncate text-xs text-muted-foreground'>{adminInfo.email}</span>
                </div>
                <ChevronsUpDown className='ml-auto size-4 shrink-0' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side='right'
              align='end'
              className='font-manrope w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-sidebar text-sidebar-foreground border-sidebar-border bottom-full'
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-2 py-1.5 text-left text-sm'>
                  <Avatar className='size-8 rounded-lg'>
                    <AvatarImage src='/' alt={adminInfo.firstName ?? undefined} />
                    <AvatarFallback className='rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold'>{adminInfo.firstName ?? 'Admin'}</span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {adminInfo.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userMenuItems.map((item, index) => {
                const Icon = item.icon as LucideIcon
                const showSeparator = item.divider || (item.danger && index > 0)
                return (
                  <div key={item.key}>
                    {showSeparator && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className={`cursor-pointer gap-2 ${item.danger ? 'text-destructive focus:text-destructive' : ''} ${item.className ?? ''}`}
                      onClick={() => handleMenuAction(item)}
                      disabled={item.disabled}
                    >
                      {Icon && <Icon className='size-4' />}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  </div>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}
