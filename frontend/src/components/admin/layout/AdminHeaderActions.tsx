'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { usePermissions } from '@/components/providers/PermissionProvider'
import ThemeSwitcher from '@/components/common/ThemeSwitcher'
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
import { headerConfig, notificationActionsConfig } from '@/config/menuConfig'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { useMounted } from '@/hooks/useMounted'

function getTimeAgo(date: string) {
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
}

function getNotificationTypeBadge(type: string) {
  const colors: Record<string, string> = {
    ORDER: 'bg-blue-500',
    PAYMENT: 'bg-green-500',
    RESTOCK: 'bg-purple-500',
    SYSTEM: 'bg-gray-500',
    PROMOTION: 'bg-yellow-500',
    OTHERS: 'bg-slate-500'
  }
  return colors[type] || colors.OTHERS
}

export function AdminHeaderActions() {
  const mounted = useMounted()
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications()
  const canViewNotifications = hasPermission('notifications', 'index')

  const handleNotificationClick = useCallback(
    (notificationId: number) => {
      markAsRead(notificationId)
    },
    [markAsRead]
  )

  const handleViewAllNotifications = useCallback(() => {
    router.push('/admin/notifications')
  }, [router])

  return (
    <div className='flex items-center gap-2 shrink-0'>
      <ThemeSwitcher className='h-9 w-9 shrink-0 border-border' />

      {mounted && canViewNotifications && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='relative h-9 w-9 shrink-0 text-card-foreground'
              aria-label='Notifications'
            >
              <Bell className='h-5 w-5' />
              {unreadCount > 0 && (
                <Badge className='absolute -top-0.5 -right-0.5 bg-red-500 hover:bg-red-600 p-0 rounded-full min-w-[16px] h-4 text-white text-xs flex items-center justify-center'>
                  {unreadCount > headerConfig.notifications.maxDisplayCount
                    ? `${headerConfig.notifications.maxDisplayCount}+`
                    : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-80 bg-background'>
            <DropdownMenuLabel className='flex justify-between items-center'>
              <span>Notifications</span>
              <div className='flex items-center gap-2'>
                {unreadCount > 0 && (
                  <Badge variant='secondary' className='text-xs'>
                    {unreadCount} new
                  </Badge>
                )}
                {unreadCount > 0 && (
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
                  <DropdownMenuItem
                    key={notification.id}
                    className='flex flex-col items-start p-3 cursor-pointer'
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className='flex justify-between items-start gap-2 w-full'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h4 className='font-medium text-sm truncate'>{notification.title}</h4>
                        </div>
                        <p className='text-muted-foreground text-xs line-clamp-2'>
                          {notification.message}
                        </p>
                        <div className='flex items-center gap-2 mt-1.5'>
                          <span className='text-muted-foreground text-xs'>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded text-white ${getNotificationTypeBadge(notification.type)}`}
                          >
                            {notification.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
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
      )}
    </div>
  )
}
