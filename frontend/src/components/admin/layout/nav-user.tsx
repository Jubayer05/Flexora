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
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' className='cursor-default py-2.5' disabled>
            <Avatar className='size-9 rounded-full'>
              <AvatarFallback className='rounded-full bg-surface-container-highest text-on-surface-variant'>
                —
              </AvatarFallback>
            </Avatar>
            <span className='truncate text-on-surface-variant'>Loading…</span>
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

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='rounded-full data-[state=open]:bg-surface-container data-[state=open]:text-on-surface py-2.5 px-2.5'
                tooltip={adminInfo.firstName ?? adminInfo.email ?? 'Account'}
              >
                <Avatar className='size-9 rounded-full'>
                  <AvatarImage src='/' alt={adminInfo.firstName ?? undefined} />
                  <AvatarFallback className='rounded-full bg-primary text-on-primary text-sm font-medium'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold text-on-surface'>{adminInfo.firstName ?? 'Admin'}</span>
                  <span className='truncate text-xs text-on-surface-variant'>{adminInfo.email}</span>
                </div>
                <ChevronsUpDown className='ml-auto size-4 shrink-0 text-on-surface-variant' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side='right'
              align='end'
              className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-full bg-surface-container-low border border-outline-variant shadow-lg'
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-3 px-3 py-2.5 text-left text-sm'>
                  <Avatar className='size-9 rounded-full'>
                    <AvatarImage src='/' alt={adminInfo.firstName ?? undefined} />
                    <AvatarFallback className='rounded-full bg-primary text-on-primary text-sm font-medium'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold text-on-surface'>{adminInfo.firstName ?? 'Admin'}</span>
                    <span className='truncate text-xs text-on-surface-variant'>
                      {adminInfo.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className='bg-outline-variant' />
              {userMenuItems.map((item, index) => {
                const Icon = item.icon as LucideIcon
                const showSeparator = item.divider || (item.danger && index > 0)
                return (
                  <div key={item.key}>
                    {showSeparator && <DropdownMenuSeparator className='bg-outline-variant' />}
                    <DropdownMenuItem
                      className={`cursor-pointer gap-2.5 py-2.5 px-3 ${item.danger ? 'text-error focus:text-error' : ''} ${item.className ?? ''} text-on-surface hover:bg-surface-container hover:text-on-surface rounded-full mx-1.5 my-0.5`}
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