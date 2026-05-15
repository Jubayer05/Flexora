'use client'

import { CustomTable } from '@/components/admin/common/data-table'
import { DashboardPagination } from '@/components/admin/dashboard/dashboard-pagination'
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel'
import {
  dashboardTicketColumns,
  DashboardTicketsEmpty
} from '@/components/admin/dashboard/dashboard-ticket-columns'
import CustomLink from '@/components/common/CustomLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { ChevronRight, MessageSquare } from 'lucide-react'
import React from 'react'

export function UnreadTicket() {
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(5)

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
  const pendingCount = pagination?.total ?? 0

  return (
    <DashboardPanel
      title='Unread tickets'
      description='Open conversations that still need your response.'
      icon={MessageSquare}
      iconTone='info'
      actions={
        pendingCount > 0 ? (
          <>
            <Badge variant='secondary' className='font-normal tabular-nums'>
              {pendingCount} pending
            </Badge>
            <CustomLink href='/admin/tickets?status=OPEN'>
              <Button size='sm' variant='outline' className='gap-1.5'>
                View all
                <ChevronRight className='size-4' />
              </Button>
            </CustomLink>
          </>
        ) : (
          <Badge variant='outline' className='font-normal text-muted-foreground'>
            All clear
          </Badge>
        )
      }
      footer={
        pagination ? (
          <DashboardPagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            shown={tickets.length}
            itemLabel='tickets'
            loading={loading}
            hasPrev={pagination.hasPrev}
            hasNext={pagination.hasNext}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        ) : undefined
      }
    >
      <div className='min-h-0 flex-1 overflow-x-auto'>
        <CustomTable
          variant='dashboard'
          columns={dashboardTicketColumns()}
          data={tickets}
          getRowId={(row: any) => row.id}
          emptyMessage={<DashboardTicketsEmpty loading={loading} />}
          className={loading ? 'pointer-events-none opacity-60' : ''}
        />
      </div>
    </DashboardPanel>
  )
}
