'use client'

import CustomLink from '@/components/common/CustomLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { Bell, ChevronLeft, ChevronRight, MessageSquare, TrendingUp } from 'lucide-react'
import React from 'react'
import { CustomTable } from '../common/data-table'
import { ticketColumns } from '../tickets/unreadTickets'

export const description = 'Unread tickets with pagination'

export function UnreadTicket() {
  const [page, setPage] = React.useState<number>(1)
  const [limit] = React.useState<number>(5)

  const { data, loading } = useAsync<{
    data: {
      tickets: any[]
      pagination: {
        total: number
        page: number
        limit: number
        pages: number
        hasNext: boolean
        hasPrev: boolean
      }
    }
  }>(() => {
    const params = new URLSearchParams()
    params.append('status', 'OPEN')
    params.append('hasUnreadReplies', 'true')
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    return `/admin/tickets?${params.toString()}`
  })

  const tickets = data?.data?.tickets ?? []
  const pagination = data?.data?.pagination
  const hasTickets = tickets.length > 0

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination && page < pagination.pages) {
      setPage(page + 1)
    }
  }

  return (
    <Card className='@container/card bg-gradient-to-br from-background to-blue-500/5'>
      <CardHeader className='border-white/5'>
        <div className='flex @[540px]/card:flex-row flex-col justify-between @[540px]/card:items-center gap-4'>
          <div className='space-y-2'>
            <CardTitle className='flex items-center gap-2.5'>
              <div className='relative'>
                <MessageSquare className='size-5 text-blue-500' />
                {hasTickets && (
                  <span className='-top-1 -right-1 absolute flex w-2 h-2'>
                    <span className='inline-flex absolute bg-blue-400 opacity-75 rounded-full w-full h-full animate-ping'></span>
                    <span className='inline-flex relative bg-blue-500 rounded-full w-2 h-2'></span>
                  </span>
                )}
              </div>
              <span className='bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 text-transparent'>
                Unread Tickets
              </span>
            </CardTitle>
            <CardDescription className='flex items-center gap-2 text-sm'>
              <Bell className='size-3.5' />
              Tickets with new customer replies requiring your attention
            </CardDescription>
          </div>
          <CardAction className='flex items-center gap-2'>
            {pagination && pagination.total > 0 ? (
              <>
                <Badge
                  variant='secondary'
                  className='gap-1.5 bg-blue-500/20 px-3 py-1 border-blue-500/30 text-blue-500 animate-pulse'
                >
                  <TrendingUp className='size-3.5' />
                  {pagination.total} Pending
                </Badge>
                <CustomLink href='/admin/tickets?status=OPEN'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='gap-2 hover:bg-blue-500/10 border-blue-500/30'
                  >
                    View All
                    <ChevronRight className='size-4' />
                  </Button>
                </CustomLink>
              </>
            ) : (
              <Badge variant='outline' className='gap-1.5 border-green-500/30 text-green-500'>
                ✓ All Clear
              </Badge>
            )}
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-2 sm:px-6'>
        {/* Table */}
        <div className='bg-background/50 backdrop-blur-sm border border-white/5 rounded-lg'>
          <CustomTable
            columns={ticketColumns()}
            data={tickets}
            getRowId={(row: any) => row.id}
            emptyMessage={
              loading ? (
                <div className='flex justify-center items-center gap-2 py-8'>
                  <div className='border-2 border-blue-500 border-t-transparent rounded-full w-4 h-4 animate-spin' />
                  <span>Loading tickets...</span>
                </div>
              ) : (
                <div className='flex flex-col justify-center items-center gap-2 py-12'>
                  <div className='bg-green-500/20 p-3 rounded-full'>
                    <MessageSquare className='size-6 text-green-500' />
                  </div>
                  <div className='text-center'>
                    <div className='font-medium text-white'>No unread tickets</div>
                    <div className='mt-1 text-muted-foreground text-sm'>
                      Great job staying on top of things! 🎉
                    </div>
                  </div>
                </div>
              )
            }
            className={loading ? 'opacity-50 pointer-events-none' : ''}
          />
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.pages > 1 && (
          <div className='flex justify-between items-center pt-4 border-white/5 border-t'>
            <div className='flex items-center gap-1.5 text-muted-foreground text-sm'>
              <span className='hidden sm:inline'>Showing</span>
              <Badge variant='secondary' className='px-2 font-mono text-xs'>
                {tickets.length}
              </Badge>
              <span className='hidden sm:inline'>of</span>
              <Badge variant='secondary' className='px-2 font-mono text-xs'>
                {pagination.total}
              </Badge>
              <span className='hidden sm:inline'>tickets</span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev || loading}
                className='gap-2 hover:bg-blue-500/10 disabled:opacity-50 hover:border-blue-500/30'
              >
                <ChevronLeft className='size-4' />
                <span className='hidden sm:inline'>Previous</span>
              </Button>
              <div className='flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 border border-blue-500/20 rounded-md text-sm'>
                <span className='font-medium text-blue-500'>{page}</span>
                <span className='text-muted-foreground'>/</span>
                <span className='text-muted-foreground'>{pagination.pages}</span>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleNextPage}
                disabled={!pagination.hasNext || loading}
                className='gap-2 hover:bg-blue-500/10 disabled:opacity-50 hover:border-blue-500/30'
              >
                <span className='hidden sm:inline'>Next</span>
                <ChevronRight className='size-4' />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
