'use client'

import UserTicketChatPanel from '@/components/admin/tickets/UserTicketChatPanel'
import UserTicketList from '@/components/admin/tickets/UserTicketList'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function UserTicketsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketFromUrl = searchParams.get('ticket')

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(
    () => ticketFromUrl || null
  )
  const [liveTickets, setLiveTickets] = useState<any[]>([])
  const [unreadTicketNumbers, setUnreadTicketNumbers] = useState<Set<string>>(new Set())

  const { data, loading, mutate } = useAsync<{
    success?: boolean
    data: {
      tickets: Ticket[]
      pagination: { page: number; pages: number; total: number; hasPrev: boolean; hasNext: boolean }
    }
  }>(() => `/customer/tickets?page=${page}&limit=${limit}`, true, false, true, 1000 * 60)

  useEffect(() => {
    setLiveTickets(data?.data?.tickets ?? [])
  }, [data?.data?.tickets])

  useEffect(() => {
    if (ticketFromUrl && !selectedTicketNumber) {
      setSelectedTicketNumber(ticketFromUrl)
    }
  }, [ticketFromUrl, selectedTicketNumber])

  const handleSelectTicket = (ticketNumber: string) => {
    setSelectedTicketNumber(ticketNumber)
    setUnreadTicketNumbers((prev) => {
      if (!prev.has(ticketNumber)) return prev
      const next = new Set(prev)
      next.delete(ticketNumber)
      return next
    })
  }

  const pagination = data?.data?.pagination

  return (
    <div className='w-full max-w-full overflow-x-hidden rounded-xl bg-card/40 dark:bg-card/50 border border-border/60 min-h-[85vh] p-4 lg:p-6'>
      {/* Two-column: Left = Chat, Right = Ticket list (same as admin) */}
      <div className='flex flex-col gap-4 lg:flex-row lg:gap-6 lg:min-h-[calc(85vh-2rem)]'>
        {/* Left: Chat panel */}
        <div className='flex-1 min-w-0 order-2 lg:order-1'>
          <UserTicketChatPanel ticketNumber={selectedTicketNumber} mutate={mutate} />
        </div>

        {/* Right: Ticket list */}
        <div className='w-full lg:w-[250px] flex-shrink-0 order-1 lg:order-2'>
          <div className='bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[50vh] lg:max-h-[calc(85vh-2rem)]'>
            <div className='px-4 py-3 border-b border-border bg-muted/50 flex justify-between items-center'>
              <div>
                <h3 className='font-semibold text-foreground text-sm'>My Tickets</h3>
                <p className='text-muted-foreground text-xs mt-0.5'>
                  Click a ticket to open the conversation
                </p>
              </div>
              <Button
                size='sm'
                onClick={() => router.push('/user/tickets/create')}
                className='shrink-0'
              >
                <Plus className='w-4 h-4 mr-1' />
                New
              </Button>
            </div>
            <div className='overflow-y-auto flex-1 custom-scrollbar'>
              <UserTicketList
                tickets={liveTickets}
                loading={loading}
                selectedTicketNumber={selectedTicketNumber}
                onSelectTicket={handleSelectTicket}
                unreadTicketNumbers={unreadTicketNumbers}
              />
            </div>
            {pagination && (pagination.pages > 1 || pagination.total > limit) && (
              <div className='p-2 border-t border-border flex justify-between items-center text-muted-foreground text-sm'>
                <span>
                  Page {pagination.page} of{' '}
                  {pagination.pages ?? Math.ceil((pagination.total ?? 0) / limit)}
                </span>
                <div className='flex gap-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UserTicketsPage() {
  return (
    <Suspense fallback={<div className='p-8 text-center text-muted-foreground'>Loading...</div>}>
      <UserTicketsContent />
    </Suspense>
  )
}
