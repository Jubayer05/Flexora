'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface UserTicketListProps {
  tickets: any[]
  loading?: boolean
  selectedTicketNumber: string | null
  onSelectTicket: (ticketNumber: string) => void
  unreadTicketNumbers?: Set<string>
}

const getStatusBadgeClass = (status: string) =>
  cn(
    'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-xs',
    status === 'OPEN' && 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
    status === 'IN_PROGRESS' &&
      'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    status === 'RESOLVED' &&
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    status === 'CLOSED' && 'bg-muted text-muted-foreground dark:bg-muted/80'
  )

export default function UserTicketList({
  tickets,
  loading,
  selectedTicketNumber,
  onSelectTicket,
  unreadTicketNumbers
}: UserTicketListProps) {
  if (loading) {
    return (
      <div className='p-6 text-muted-foreground text-center text-sm'>Loading tickets...</div>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className='p-6 text-muted-foreground text-center text-sm'>No tickets found.</div>
    )
  }

  return (
    <div className='divide-y divide-border'>
      {tickets.map((ticket) => {
        const num = ticket.ticketNumber ?? ticket.id?.toString?.()
        const isSelected = selectedTicketNumber === num
        const isUnread = !!unreadTicketNumbers?.has(num) && !isSelected
        const orderNumber = ticket.meta?.orderContext?.orderNumber
        return (
          <div
            key={ticket.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelectTicket(num)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectTicket(num)
              }
            }}
            className={cn(
              'flex flex-col gap-2 p-3 cursor-pointer transition-colors hover:bg-muted/50',
              isSelected && 'bg-primary/10 dark:bg-primary/15 border-l-2 border-l-primary',
              isUnread && 'bg-amber-500/10 dark:bg-amber-400/10 border-l-2 border-l-amber-500'
            )}
          >
            <div className='flex justify-between items-start gap-2'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform',
                      isSelected && 'text-primary'
                    )}
                  />
                  <span className='font-medium text-foreground text-sm line-clamp-2'>
                    {ticket.subject}
                  </span>
                  {isUnread && (
                    <span className='inline-flex items-center rounded-full bg-amber-500/20 dark:bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300'>
                      New
                    </span>
                  )}
                </div>
                <p className='text-muted-foreground text-xs truncate mt-0.5 ml-6'>
                  #{ticket.ticketNumber}
                </p>
                {orderNumber ? (
                  <p className='text-muted-foreground text-[11px] truncate mt-0.5 ml-6'>
                    Order ID: {orderNumber}
                  </p>
                ) : null}
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2 ml-6'>
              <span className={cn(getStatusBadgeClass(ticket.status), 'whitespace-nowrap')}>
                {ticket.status?.toLowerCase().replace('_', ' ') || 'open'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
