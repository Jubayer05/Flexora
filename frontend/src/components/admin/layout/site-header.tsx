'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
const ProfileModal = dynamic(() => import('@/components/admin/modals/ProfileModal'), { loading: () => null })
const SecurityModal = dynamic(() => import('@/components/admin/modals/SecurityModal'), { loading: () => null })
const SettingsModal = dynamic(() => import('@/components/admin/modals/SettingsModal'), { loading: () => null })
import CustomLink from '@/components/common/CustomLink'
import { usePermissions } from '@/components/providers/PermissionProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  createUserProfileMenuConfig,
  headerConfig,
  notificationActionsConfig,
  type MenuItem,
  type ModalType
} from '@/config/menuConfig'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { useMounted } from '@/hooks/useMounted'
import { useAdminStore } from '@/stores/admin-info'
import { format } from 'date-fns'
import { Bell, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

// Memoized logo component for LCP optimization
const HeaderLogo = memo(() => (
  <div className='relative w-56.75 h-9'>
    <Image
      src={headerConfig.logo.src}
      alt={headerConfig.logo.alt}
      width={headerConfig.logo.width}
      height={headerConfig.logo.height}
      className='object-cover'
      priority={true}
      fetchPriority='high'
      decoding='sync'
      quality={85}
    />
  </div>
))
HeaderLogo.displayName = 'HeaderLogo'

// Memoized notification badge
const NotificationBadge = memo(({ unreadCount, mounted }: { unreadCount: number; mounted: boolean }) => {
  if (!mounted || unreadCount <= 0) return null
  
  return (
    <Badge className='top-0 right-0 absolute bg-red-500 hover:bg-red-600 p-0 rounded-full min-w-4 h-4 text-white text-xs'>
      {unreadCount > headerConfig.notifications.maxDisplayCount
        ? `${headerConfig.notifications.maxDisplayCount}+`
        : unreadCount}
    </Badge>
  )
})
NotificationBadge.displayName = 'NotificationBadge'

// Memoized user avatar
const UserAvatar = memo(({ adminInfo }: { adminInfo: any }) => (
  <Avatar className='w-9 h-9'>
    <AvatarImage src={'/'} alt={adminInfo?.firstName} />
    <AvatarFallback className='bg-linear-to-br from-gray-300 to-gray-500 text-white'>
      {adminInfo
        ? `${adminInfo.firstName?.charAt(0) ?? ''}${adminInfo.lastName?.charAt(0) ?? ''}`
        : 'AD'}
    </AvatarFallback>
  </Avatar>
))
UserAvatar.displayName = 'UserAvatar'

// Memoized notification item
const NotificationItem = memo(({ notification, mounted, onNotificationClick }: any) => {
  const getTimeAgo = useCallback((date: string) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / 60000)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return format(notificationDate, 'MMM dd, yyyy')
  }, [])

  const getNotificationTypeBadge = useCallback((type: string) => {
    const colors: Record<string, string> = {
      ORDER: 'bg-blue-500',
      PAYMENT: 'bg-green-500',
      RESTOCK: 'bg-purple-500',
      SYSTEM: 'bg-gray-500',
      PROMOTION: 'bg-yellow-500',
      OTHERS: 'bg-slate-500'
    }
    return colors[type] || colors.OTHERS
  }, [])

  return (
    <DropdownMenuItem
      key={notification.id}
      className='flex-col items-start p-3 cursor-pointer'
      onClick={onNotificationClick}
    >
      <div className='flex justify-between items-start gap-2 w-full'>
        <div className='flex-1'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='font-medium text-sm'>{notification.title}</h4>
            <div className='bg-blue-500 rounded-full w-2 h-2'></div>
          </div>
          <p className='mb-1 text-muted-foreground text-xs line-clamp-2'>
            {notification.message}
          </p>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-xs'>
              {mounted
                ? getTimeAgo(notification.createdAt)
                : format(new Date(notification.createdAt), 'MMM dd, yyyy')}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded text-white ${getNotificationTypeBadge(
                notification.type
              )}`}
            >
              {notification.type}
            </span>
          </div>
        </div>
      </div>
    </DropdownMenuItem>
  )
})
NotificationItem.displayName = 'NotificationItem'

export function SiteHeader() {
  const mounted = useMounted()
  const { adminInfo, clearAdminInfo } = useAdminStore()
  const { hasPermission } = usePermissions()
  const { notifications, unreadCount, markAllAsRead } = useAdminNotifications()
  const router = useRouter()
  const canViewNotifications = hasPermission('notifications', 'index')
  const [openModal, setOpenModal] = useState<ModalType>(null)

  useEffect(() => {
    useAdminStore.persist.rehydrate()
  }, [])

  const handleOpenModal = useCallback((modalType: ModalType) => {
    setOpenModal(modalType)
  }, [])

  const userMenuItems = createUserProfileMenuConfig(clearAdminInfo, router, handleOpenModal)

  const handleNotificationClick = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const handleViewAllNotifications = useCallback(() => {
    router.push('/admin/notifications')
  }, [router])

  const renderMenuItem = useCallback((item: MenuItem, showSeparator?: boolean) => {
    const IconComponent = item.icon as LucideIcon

    const menuContent = (
      <>
        {IconComponent && <IconComponent className='mr-2 w-4 h-4' />}
        <span>{item.label}</span>
      </>
    )

    return (
      <div key={item.key}>
        {(showSeparator || item.divider) && <DropdownMenuSeparator />}

        {item.onClick ? (
          <DropdownMenuItem
            className={`cursor-pointer text-base  ${item.className || ''}`}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            {menuContent}
          </DropdownMenuItem>
        ) : item.href ? (
          <CustomLink href={item.href} className='block'>
            <DropdownMenuItem
              className={`cursor-pointer text-base w-full text-muted  ${item.className || ''}`}
              disabled={item.disabled}
              onSelect={(e) => e.preventDefault()}
            >
              {menuContent}
            </DropdownMenuItem>
          </CustomLink>
        ) : (
          <DropdownMenuItem
            className={`cursor-pointer text-base ${item.className || ''}`}
            disabled={item.disabled}
          >
            {menuContent}
          </DropdownMenuItem>
        )}
      </div>
    )
  }, [])

  return (
    <header className='top-0 z-50 sticky flex items-center bg-background px-4 lg:px-6 border-primary/60 border-b h-16' style={{ willChange: 'transform' }}>
      <ProfileModal isOpen={openModal === 'profile'} onClose={() => setOpenModal(null)} />
      <SettingsModal isOpen={openModal === 'settings'} onClose={() => setOpenModal(null)} />
      <SecurityModal isOpen={openModal === 'security'} onClose={() => setOpenModal(null)} />

      <div className='flex justify-between items-center w-full'>
        {/* Logo Section - Optimized for LCP */}
        <HeaderLogo />

        {/* Right Section */}
        <div className='flex items-center gap-2 lg:gap-4'>
          {/* Notification Dropdown - only shown when user has NOTIFICATIONS permission */}
          {mounted && canViewNotifications ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='relative'>
                  <Bell />
                  {unreadCount > 0 && (
                    <Badge className='top-0 right-0 absolute bg-red-500 hover:bg-red-600 p-0 rounded-full min-w-[16px] h-4 text-white text-xs'>
                      {unreadCount > headerConfig.notifications.maxDisplayCount
                        ? `${headerConfig.notifications.maxDisplayCount}+`
                        : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='bg-foreground w-80'>
              <DropdownMenuLabel className='flex justify-between items-center'>
                <span>Notifications</span>
                <div className='flex items-center gap-2'>
                  {mounted && unreadCount > 0 && (
                    <Badge variant='secondary' className='text-xs'>
                      {unreadCount} new
                    </Badge>
                  )}
                  {mounted && unreadCount > 0 && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='p-1 h-auto text-xs'
                      onClick={markAllAsRead}
                    >
                      {notificationActionsConfig.markAllRead.label}
                    </Button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div
                className='overflow-y-auto'
                style={{ maxHeight: `${headerConfig.notifications.maxHeight}px` }}
              >
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      mounted={mounted}
                      onNotificationClick={handleNotificationClick}
                    />
                  ))
                ) : (
                  <div className='p-4 text-muted-foreground text-sm text-center'>
                    No notifications
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className='justify-center cursor-pointer'
                    onClick={handleViewAllNotifications}
                  >
                    <span className='text-sm'>{notificationActionsConfig.viewAll.label}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* User Profile Dropdown */}
          {mounted && adminInfo ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='flex items-center gap-1.25 p-2 h-auto'>
                  <UserAvatar adminInfo={adminInfo} />
                  <span className='hidden sm:block font-medium text-white text-base leading-[1.1]'>
                    {adminInfo?.firstName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='bg-foreground w-56'>
                <DropdownMenuLabel>
                  <div className='flex flex-col space-y-1'>
                    <p className='font-medium text-base leading-none'>{adminInfo?.firstName}</p>
                    <p className='text-muted-foreground text-xs leading-none'>{adminInfo?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {userMenuItems.map((item, index) =>
                  renderMenuItem(item, index === userMenuItems.length - 1 && item.danger)
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Avatar className='w-9 h-9'>
              <AvatarFallback className='bg-gradient-to-br from-gray-300 to-gray-500 text-white'>
                {adminInfo
                  ? `${adminInfo.firstName?.charAt(0) ?? ''}${adminInfo.lastName?.charAt(0) ?? ''}`
                  : 'AD'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </header>
  )
}