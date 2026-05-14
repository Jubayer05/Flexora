'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface TicketTableProps {
  tickets: any[]
  loading?: boolean
  mutate: () => void
  selectedTicketId: number | null
  onSelectTicket: (ticketId: number) => void
  unreadTicketIds?: Set<number>
}

export default function TicketTable({
  tickets,
  loading,
  mutate,
  selectedTicketId,
  onSelectTicket,
  unreadTicketIds
}: TicketTableProps) {
  const { openModal, ModalComponent } = useConfirmationModal({
    title: 'Close Ticket',
    description:
      'Are you sure you want to close this ticket? This action will mark the ticket as closed.',
    confirmText: 'Close Ticket',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: AlertTriangle
  })

  const handlePriorityChange = async (ticketId: number, newPriority: string) => {
    const readyData = { id: ticketId, isStaff: true, priority: newPriority }
    try {
      await requests.put(`/admin/tickets/${ticketId}`, readyData)
      toast.success('Ticket priority updated successfully!')
    } catch (error) {
      showError(error)
    } finally {
      mutate?.()
    }
  }

  const updateTicketStatus = async (ticketId: number, status: 'OPEN' | 'CLOSED') => {
    try {
      await requests.put(`/admin/tickets/${ticketId}`, {
        id: ticketId,
        isStaff: true,
        status
      })
      toast.success(
        status === 'OPEN' ? 'Ticket reopened successfully!' : 'Ticket closed successfully!'
      )
    } catch (error) {
      showError(error)
    } finally {
      mutate?.()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-0'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-0'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-0'
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-0'
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-0'
    }
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

  const handleCloseTicketClick = (ticketId: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(async () => {
      await updateTicketStatus(ticketId, 'CLOSED')
    })
  }

  if (loading) {
    return <div className='p-6 text-center text-sm text-muted-foreground'>Loading tickets...</div>
  }

  if (!tickets || tickets.length === 0) {
    return <div className='p-6 text-center text-sm text-muted-foreground'>No tickets found.</div>
  }

  return (
    <div className='divide-y divide-border'>
      <ModalComponent />
      {tickets.map((ticket) => {
        const isSelected = selectedTicketId === ticket.id
        const isUnread = !!unreadTicketIds?.has(ticket.id) && !isSelected
        const customerLabel =
          ticket?.user?.email || ticket?.guestEmail || ticket?.user?.firstName || '-'

        return (
          <div
            key={ticket.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelectTicket(ticket.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectTicket(ticket.id)
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:bg-muted/50',
              isSelected && 'border-l-2 border-l-primary bg-primary/10 dark:bg-primary/15',
              isUnread && 'border-l-2 border-l-amber-500 bg-amber-500/10 dark:bg-amber-400/10'
            )}
          >
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
                      isSelected && 'text-primary'
                    )}
                  />
                  <span className='line-clamp-2 text-sm font-medium text-foreground'>
                    {ticket.subject}
                  </span>
                  {isUnread ? (
                    <span className='inline-flex items-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300'>
                      New
                    </span>
                  ) : null}
                </div>
                <p className='ml-6 mt-0.5 truncate text-xs text-muted-foreground'>
                  {`#${ticket.ticketNumber} · ${customerLabel}`}
                </p>
              </div>
            </div>
            <div
              className='ml-6 flex flex-wrap items-center gap-2'
              onClick={(e) => e.stopPropagation()}
            >
              <Select
                value={ticket.priority}
                onValueChange={(value) => handlePriorityChange(ticket.id, value)}
              >
                <SelectTrigger
                  size='sm'
                  className={cn(
                    'h-7 w-fit border-0 text-xs font-medium',
                    getPriorityColor(ticket.priority)
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='LOW'>Low</SelectItem>
                  <SelectItem value='MEDIUM'>Medium</SelectItem>
                  <SelectItem value='HIGH'>High</SelectItem>
                  <SelectItem value='URGENT'>Urgent</SelectItem>
                </SelectContent>
              </Select>
              <span className={cn(getStatusBadgeClass(ticket.status), 'whitespace-nowrap')}>
                {ticket.status?.toLowerCase().replace('_', ' ') || 'open'}
              </span>
              {ticket.status === 'CLOSED' ? (
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={(e) => {
                    e.stopPropagation()
                    updateTicketStatus(ticket.id, 'OPEN')
                  }}
                >
                  Reopen
                </Button>
              ) : (
                <Button
                  variant='destructive'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={handleCloseTicketClick(ticket.id)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
