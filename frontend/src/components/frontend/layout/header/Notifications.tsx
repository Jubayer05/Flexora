'use client'

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
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications'
import { useMounted } from '@/hooks/useMounted'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'

export function Notifications({ variant }: { variant: 'mobile' | 'desktop' }) {
  const mounted = useMounted()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useCustomerNotifications()

  // Get notification type badge color
  const getNotificationTypeBadge = (type: string) => {
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

  // Format time ago
  const getTimeAgo = (date: string) => {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === 'mobile' ? 'ghost' : 'default'}
          size={'icon'}
          className='relative rounded-full bg-background/40 hover:bg-accent/70 border border-border/60 hover:border-primary/30 backdrop-blur-md shadow-sm'
        >
          <Bell />
          {mounted && unreadCount > 0 && (
            <Badge className='top-0 right-0 absolute bg-red-500 hover:bg-red-600 p-0 rounded-full min-w-4 h-4 text-white text-xs'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-80 [--radius:0.9rem] border-border/60 bg-card/85 backdrop-blur-xl shadow-xl shadow-primary/10' align='end'>
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
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className='overflow-y-auto max-h-[400px]'>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                onClick={() => markAsRead(notification.id)}
                key={notification.id}
                className='flex-col items-start p-3 cursor-pointer rounded-lg focus:bg-accent/70'
              >
                <div className='flex justify-between items-start w-full gap-2'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h4 className='font-medium text-sm'>{notification.title}</h4>
                      {!notification.isRead && (
                        <div className='bg-blue-500 rounded-full w-2 h-2'></div>
                      )}
                    </div>
                    <p className='text-muted-foreground text-xs line-clamp-2 mb-1'>
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
            ))
          ) : (
            <div className='p-4 text-muted-foreground text-sm text-center'>No notifications</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
