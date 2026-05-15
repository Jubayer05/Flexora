'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'

import TicketForm from '@/components/admin/form/Ticket'
import TicketChatPanel from '@/components/admin/tickets/TicketChatPanel'
import TicketTable from '@/components/admin/tickets/TicketTable'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { type NewReplyPayload, useTicketSocket } from '@/hooks/useTicketSocket'
import { CheckCircle2, MailOpen, MessageSquare, Plus, Search, X } from 'lucide-react'

const DEBOUNCE_MS = 350

const statusCards = [
  {
    key: 'all',
    title: 'Total',
    subtitle: 'All tickets'
  },
  {
    key: 'OPEN',
    title: 'Open',
    subtitle: 'Awaiting response'
  },
  {
    key: 'IN_PROGRESS',
    title: 'Replied',
    subtitle: 'Conversation active'
  },
  {
    key: 'CLOSED',
    title: 'Closed',
    subtitle: 'Completed or archived'
  }
] as const

function TicketList() {
  const { page, limit, filters, search, setSearch, setFilter } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [liveTickets, setLiveTickets] = useState<any[]>([])
  const [unreadTicketIds, setUnreadTicketIds] = useState<Set<number>>(new Set())
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== search) {
        setSearch(trimmed)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput, search, setSearch])

  const {
    data,
    loading,
    mutate: mutateTickets
  } = useAsync<{
    data: {
      tickets: Ticket[]
      pagination: any
    }
  }>(
    () =>
      'admin/tickets' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${encodeURIComponent(search)}` : '') +
      (filters.status ? `&status=${filters.status}` : ''),
    true,
    false,
    true,
    1000 * 60
  )

  const { data: statsData, mutate: mutateStats } = useAsync<{
    data: {
      total: number
      open: number
      replied: number
      inProgress: number
      resolved: number
      closed: number
    }
  }>('/admin/tickets/stats', true, false, true, 1000 * 60)

  const mutate = useCallback(() => {
    mutateTickets()
    mutateStats()
  }, [mutateStats, mutateTickets])

  useEffect(() => {
    setLiveTickets(data?.data?.tickets ?? [])
  }, [data?.data?.tickets])

  const handleInboxReply = useCallback(
    (payload: NewReplyPayload) => {
      const ticketId = Number(payload.ticketId)
      if (!ticketId) return

      let shouldRefetch = false
      setLiveTickets((prev) => {
        if (!prev?.length) return prev
        const idx = prev.findIndex((ticket) => Number(ticket.id) === ticketId)

        // If the ticket is not in current page/filter, refetch in background.
        if (idx < 0) {
          shouldRefetch = true
          return prev
        }

        const next = [...prev]
        const current = next[idx]
        const updated = {
          ...current,
          updatedAt: payload.createdAt || new Date().toISOString()
        }
        next.splice(idx, 1)
        next.unshift(updated)
        return next
      })

      if (shouldRefetch) {
        mutate()
      }

      mutateStats()

      if (selectedTicketId !== ticketId && !payload.isStaff) {
        setUnreadTicketIds((prev) => {
          const next = new Set(prev)
          next.add(ticketId)
          return next
        })
      }
    },
    [mutate, mutateStats, selectedTicketId]
  )

  useTicketSocket(null, {
    isAdmin: true,
    subscribeAllTickets: true,
    onNewReply: handleInboxReply
  })

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleDialogSuccess = () => {
    mutate()
    setIsDialogOpen(false)
  }

  const handleSelectTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId)
    setUnreadTicketIds((prev) => {
      if (!prev.has(ticketId)) return prev
      const next = new Set(prev)
      next.delete(ticketId)
      return next
    })
  }

  const stats = statsData?.data
  const selectedStatus = (filters.status as string | undefined) || 'all'

  const activeCardCounts = {
    all: stats?.total || 0,
    OPEN: stats?.open || 0,
    IN_PROGRESS: stats?.replied || stats?.inProgress || 0,
    CLOSED: stats?.closed || 0
  }

  const clearSearchInput = () => {
    setSearchInput('')
    setSearch('')
  }

  return (
    <div className='w-full max-w-full min-w-0 overflow-x-hidden rounded-xl bg-card/40 dark:bg-card/50 border border-border/60 min-h-[70vh] sm:min-h-[85vh] p-3 sm:p-4 lg:p-6'>
      <PageHeader
        title='Support Tickets'
        subTitle='Track replies, customer context, and ticket activity'
      >
        <div className='flex flex-col gap-4'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {statusCards.map((card) => {
              const isActive = selectedStatus === card.key
              const count = activeCardCounts[card.key]
              return (
                <button
                  key={card.key}
                  type='button'
                  onClick={() => setFilter('status', card.key === 'all' ? undefined : card.key)}
                  className={`rounded-xl border px-4 py-4 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className='mb-3 flex items-center justify-between'>
                    <span className='text-sm font-medium text-muted-foreground'>{card.title}</span>
                    {card.key === 'all' && <MessageSquare className='h-4 w-4 text-primary' />}
                    {card.key === 'OPEN' && <MailOpen className='h-4 w-4 text-blue-500' />}
                    {card.key === 'IN_PROGRESS' && (
                      <MessageSquare className='h-4 w-4 text-amber-500' />
                    )}
                    {card.key === 'CLOSED' && <CheckCircle2 className='h-4 w-4 text-emerald-500' />}
                  </div>
                  <div className='text-3xl font-semibold text-foreground'>{count}</div>
                  <div className='mt-1 text-xs text-muted-foreground'>{card.subtitle}</div>
                </button>
              )
            })}
          </div>

          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div className='relative w-full lg:max-w-md'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Search by email, order ID, ticket #...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className='h-10 bg-background pl-9 pr-9'
              />
              {searchInput ? (
                <button
                  type='button'
                  onClick={clearSearchInput}
                  className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                  aria-label='Clear search'
                >
                  <X className='h-4 w-4' />
                </button>
              ) : null}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setFilter('status', undefined)}
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'OPEN' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setFilter('status', 'OPEN')}
              >
                Open
              </Button>
              <Button
                variant={selectedStatus === 'IN_PROGRESS' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setFilter('status', 'IN_PROGRESS')}
              >
                Replied
              </Button>
              <Button
                variant={selectedStatus === 'CLOSED' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setFilter('status', 'CLOSED')}
              >
                Closed
              </Button>
              <Button size='sm' onClick={() => setIsDialogOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                New Ticket
              </Button>
            </div>
          </div>
        </div>
      </PageHeader>

      <div className='flex flex-col gap-3 sm:gap-4 lg:flex-row lg:gap-6 lg:min-h-[calc(85vh-2rem)] min-w-0'>
        <div className='flex-1 min-w-0 order-2 lg:order-1 flex flex-col'>
          <TicketChatPanel ticketId={selectedTicketId} mutate={mutate} />
        </div>

        <div className='w-full lg:w-[340px] xl:w-[400px] flex-shrink-0 order-1 lg:order-2 min-w-0'>
          <div className='bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[45vh] sm:max-h-[50vh] lg:max-h-[calc(85vh-2rem)] min-w-0'>
            <div className='px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border bg-muted/50'>
              <h3 className='font-semibold text-foreground text-sm'>Tickets</h3>
              <p className='text-muted-foreground text-xs mt-0.5'>
                {search
                  ? `Showing results for "${search}"`
                  : 'Click a ticket to open the conversation'}
              </p>
            </div>
            <div className='overflow-y-auto flex-1 custom-scrollbar'>
              <TicketTable
                tickets={liveTickets}
                loading={loading}
                mutate={mutate}
                selectedTicketId={selectedTicketId}
                onSelectTicket={handleSelectTicket}
                unreadTicketIds={unreadTicketIds}
              />
            </div>
            <div className='p-2 border-t border-border'>
              <Pagination
                paginationData={data?.data?.pagination}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add New ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border'>
          <DialogHeader>
            <DialogTitle>Add New</DialogTitle>
          </DialogHeader>
          <TicketForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TicketListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketList />
    </Suspense>
  )
}
