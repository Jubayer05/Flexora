'use client'

import type { TableColumn } from '@/components/admin/common/data-table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, ChevronRight, Info, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const getInitials = (name?: string) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const priorityStyles: Record<string, { className: string; icon: typeof Info }> = {
  URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
  HIGH: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400', icon: AlertTriangle },
  MEDIUM: { className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400', icon: Info },
  LOW: { className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400', icon: Info }
}

export function dashboardTicketColumns(): TableColumn<any>[] {
  return [
    {
      key: 'subject',
      header: 'Ticket',
      render: (_, data) => (
        <div className='min-w-0 max-w-[220px] space-y-1'>
          <p className='truncate font-medium text-foreground' title={data.subject}>
            {data.subject}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='font-mono text-[10px] font-normal'>
              #{data.ticketNumber}
            </Badge>
            {data.unreadRepliesCount > 0 ? (
              <Badge variant='secondary' className='text-[10px] font-normal'>
                {data.unreadRepliesCount} new
              </Badge>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_, data) => (
        <div className='flex min-w-0 max-w-[160px] items-center gap-2.5'>
          <Avatar className='size-8 border border-border/80'>
            <AvatarFallback className='bg-muted text-xs font-medium text-foreground'>
              {getInitials(data?.user?.name || data?.user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium text-foreground' title={data?.user?.name}>
              {data?.user?.name || 'Unknown'}
            </p>
            <p className='truncate text-xs text-muted-foreground' title={data?.user?.email}>
              {data?.user?.email || '—'}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value) => {
        const priority = (value as string) || 'MEDIUM'
        const config = priorityStyles[priority] ?? priorityStyles.MEDIUM
        const Icon = config.icon
        return (
          <Badge variant='outline' className={`gap-1 font-normal ${config.className}`}>
            <Icon className='size-3' />
            {priority.charAt(0) + priority.slice(1).toLowerCase()}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      render: (_, data) => (
        <Link href={`/admin/tickets/${data.id}`}>
          <Button size='sm' variant='ghost' className='h-8 gap-1 px-2 text-primary hover:text-primary'>
            Open
            <ChevronRight className='size-3.5' />
          </Button>
        </Link>
      )
    }
  ]
}

export function DashboardTicketsEmpty({ loading }: { loading?: boolean }) {
  if (loading) {
    return (
      <div className='flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground'>
        <div className='size-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        Loading tickets...
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
      <div className='rounded-full border border-border/80 bg-muted/50 p-3'>
        <MessageSquare className='size-6 text-muted-foreground' />
      </div>
      <p className='font-medium text-foreground'>No unread tickets</p>
      <p className='text-sm text-muted-foreground'>You are caught up on support.</p>
    </div>
  )
}
