'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  Hash,
  Info,
  MessageSquareText,
  User
} from 'lucide-react'
import Link from 'next/link'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Helper to get initials from name
const getInitials = (name?: string) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to get priority color and icon
const getPriorityConfig = (priority: string) => {
  const configs = {
    URGENT: {
      color: 'bg-red-500/20 text-red-500 border-red-500/30',
      icon: AlertCircle
    },
    HIGH: {
      color: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      icon: AlertTriangle
    },
    MEDIUM: {
      color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      icon: Info
    },
    LOW: {
      color: 'bg-green-500/20 text-green-500 border-green-500/30',
      icon: Info
    }
  }
  return configs[priority as keyof typeof configs] || configs.MEDIUM
}

// Ticket columns function that accepts mutate callback
export const ticketColumns = (): TableColumn<any>[] => {
  return [
    {
      key: 'ticketNumber',
      header: (
        <div className='flex items-center gap-1.5'>
          <Hash className='size-4' />
          Ticket ID
        </div>
      ),
      render: (_, data) => (
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className='font-mono text-foreground dark:text-muted-foreground text-xs'
          >
            #{data.ticketNumber}
          </Badge>
        </div>
      ),
      width: 'w-28'
    },
    {
      key: 'subject',
      header: (
        <div className='flex items-center gap-1.5'>
          <MessageSquareText className='size-4' />
          Subject
        </div>
      ),
      render: (_, data) => (
        <div className='flex flex-col gap-1.5 min-w-0'>
          <div
            className='max-w-[300px] font-medium text-white hover:text-blue-400 truncate transition-colors'
            title={data.subject}
          >
            {data.subject}
          </div>
          <div className='flex items-center gap-2 text-xs'>
            <span className='flex items-center gap-1 text-muted-foreground'>
              <Clock className='size-3' />
              {data.createdAt
                ? new Date(data.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : '-'}
            </span>
            {data.unreadRepliesCount > 0 && (
              <Badge
                variant='secondary'
                className='bg-blue-500/20 px-1.5 border-blue-500/30 h-5 text-[10px] text-blue-500 animate-pulse'
              >
                {data.unreadRepliesCount} new {data.unreadRepliesCount === 1 ? 'reply' : 'replies'}
              </Badge>
            )}
          </div>
        </div>
      ),
      width: 'min-w-[300px]'
    },
    {
      key: 'user',
      header: (
        <div className='flex items-center gap-1.5'>
          <User className='size-4' />
          Customer
        </div>
      ),
      render: (_, data) => (
        <div className='flex items-center gap-2.5'>
          <Avatar className='border border-white/10 ring-2 ring-blue-500/20 size-9'>
            <AvatarFallback className='bg-gradient-to-br from-blue-500 to-purple-500 font-semibold text-white text-xs'>
              {getInitials(data?.user?.name || data?.user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col min-w-0'>
            <div
              className='max-w-[140px] font-medium text-white text-sm truncate'
              title={data?.user?.name || 'Unknown'}
            >
              {data?.user?.name || 'Unknown User'}
            </div>
            <div
              className='max-w-[140px] text-muted-foreground text-xs truncate'
              title={data?.user?.email}
            >
              {data?.user?.email || '-'}
            </div>
          </div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value) => {
        const priority = value || 'MEDIUM'
        const config = getPriorityConfig(priority)
        const Icon = config.icon

        return (
          <Badge variant='secondary' className={`gap-1.5 font-normal ${config.color}`}>
            <Icon className='size-3' />
            {priority.charAt(0) + priority.slice(1).toLowerCase()}
          </Badge>
        )
      },
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => (
        <Link href={`/admin/tickets/${data.id}`}>
          <Button
            size='sm'
            variant='outline'
            className='gap-2 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-all'
          >
            Reply
            <ChevronRight className='size-4' />
          </Button>
        </Link>
      ),
      width: 'w-36'
    }
  ]
}
