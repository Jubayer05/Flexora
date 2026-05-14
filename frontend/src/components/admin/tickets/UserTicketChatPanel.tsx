'use client'

import useAsync from '@/hooks/useAsync'
import { MessageSquare } from 'lucide-react'
import TicketChatView from './TicketChatView'

interface UserTicketChatPanelProps {
  ticketNumber: string | null
  mutate: () => void
}

export default function UserTicketChatPanel({ ticketNumber, mutate }: UserTicketChatPanelProps) {
  const { data, loading, mutate: refetchTicket } = useAsync<{ data: any }>(
    () => (ticketNumber ? `/customer/tickets/${ticketNumber}` : null),
    !!ticketNumber,
    false,
    true,
    1000 * 60
  )

  if (!ticketNumber) {
    return (
      <div className='flex flex-col justify-center items-center h-full min-h-[400px] rounded-xl bg-muted/20 dark:bg-muted/10 border border-border border-dashed'>
        <div className='flex justify-center items-center rounded-full bg-muted w-16 h-16 mb-4'>
          <MessageSquare className='w-8 h-8 text-muted-foreground' />
        </div>
        <p className='text-foreground font-medium'>Select a ticket</p>
        <p className='text-muted-foreground text-sm text-center max-w-xs mt-1'>
          Choose a ticket from the list on the right to view the conversation and reply.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='flex flex-col justify-center items-center h-full min-h-[400px] rounded-xl bg-card border border-border'>
        <div className='mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full w-10 h-10 animate-spin' />
        <p className='text-muted-foreground'>Loading conversation...</p>
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className='flex flex-col justify-center items-center h-full min-h-[400px] rounded-xl bg-card border border-border'>
        <p className='font-semibold text-foreground'>Ticket not found</p>
        <p className='text-muted-foreground text-sm mt-1'>Unable to load this ticket.</p>
      </div>
    )
  }

  const handleRefetch = () => {
    refetchTicket()
    mutate()
  }

  return (
    <div className='h-full min-h-[400px] rounded-xl overflow-hidden border border-border'>
      <TicketChatView ticket={data.data} refetch={handleRefetch} showHeader={true} variant='customer' />
    </div>
  )
}
