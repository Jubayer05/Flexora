'use client'

import { Suspense, useState } from 'react'
import { CustomTable } from '@/components/admin/common/data-table'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/common/CustomSelect'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { History, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuditLog {
  id: number
  userId: number | null
  action: string
  entity: string
  entityId: string | null
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user?: {
    id: number
    email: string
    firstName: string | null
  } | null
}

interface AuditLogResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

function ActivityLogList() {
  const { search, page, limit, filters, setFilter } = useFilter(20)
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  const { data, loading, mutate } = useAsync<{ data: AuditLogResponse }>(
    () =>
      '/admin/audit-logs' +
      `?page=${page || 1}` +
      `&limit=${limit || 20}` +
      (selectedEntity && selectedEntity !== 'all' ? `&entity=${selectedEntity}` : '') +
      (selectedAction && selectedAction !== 'all' ? `&action=${selectedAction}` : '') +
      (search ? `&search=${search}` : '')
  )

  const getActionBadgeColor = (action: string) => {
    if (action.includes('ASSIGNED') || action.includes('DELIVERED')) {
      return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
    if (action.includes('STATUS_CHANGED') || action.includes('EXECUTED')) {
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
    if (action.includes('PURCHASED')) {
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }
    return 'bg-muted text-muted-foreground border-border'
  }

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (value: string) => (
        <div className='text-sm'>
          {new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (value: string) => (
        <Badge variant='outline' className={getActionBadgeColor(value)}>
          {formatAction(value)}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (value: string) => (
        <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20'>
          {value}
        </Badge>
      ),
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      render: (value: string | null) => (
        <div className='text-sm font-mono'>{value || 'N/A'}</div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (_: any, log: AuditLog) => {
        if (log.user) {
          return (
            <div className='text-sm'>
              <div className='font-medium'>{log.user.email}</div>
              {log.user.firstName && (
                <div className='text-xs text-muted-foreground'>
                  {log.user.firstName}
                </div>
              )}
            </div>
          )
        }
        return <span className='text-sm text-muted-foreground'>System</span>
      },
    },
    {
      key: 'details',
      header: 'Details',
      render: (_: any, log: AuditLog) => {
        if (log.newValues && Object.keys(log.newValues).length > 0) {
          const details = Object.entries(log.newValues)
            .slice(0, 2)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
          return (
            <div className='text-xs text-muted-foreground max-w-[200px] truncate' title={details}>
              {details}
            </div>
          )
        }
        return <span className='text-sm text-muted-foreground'>-</span>
      },
    },
  ]

  return (
    <div className='w-full max-w-full min-w-0 overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Activity Log'
        subTitle='View all transaction history and admin actions'
        extra={
          <div className='flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0'>
            <div className='flex flex-col min-[480px]:flex-row flex-wrap sm:items-end gap-3 sm:gap-4 min-w-0'>
              {/* Entity Filter */}
              <div className='space-y-2'>
                <CustomSelect
                  placeholder='Filter by Entity'
                  value={selectedEntity}
                  onChange={setSelectedEntity}
                  showSearch={false}
                  staticOptions={[
                    { title: 'All Entities', label: 'All Entities', value: 'all' },
                    { title: 'Account', label: 'Account', value: 'Account' },
                    { title: 'Order', label: 'Order', value: 'Order' },
                    { title: 'TelegramTransfer', label: 'Transfer', value: 'TelegramTransfer' },
                  ]}
                  className='bg-background border-border text-foreground w-full sm:w-40'
                />
              </div>

              {/* Action Filter */}
              <div className='space-y-2'>
                <CustomSelect
                  placeholder='Filter by Action'
                  value={selectedAction}
                  onChange={setSelectedAction}
                  showSearch={false}
                  staticOptions={[
                    { title: 'All Actions', label: 'All Actions', value: 'all' },
                    {
                      title: 'Account Status Changed',
                      label: 'Account Status Changed',
                      value: 'ACCOUNT_STATUS_CHANGED',
                    },
                    {
                      title: 'Account Assigned',
                      label: 'Account Assigned',
                      value: 'ACCOUNT_ASSIGNED_TO_ORDER',
                    },
                    { title: 'Order Delivered', label: 'Order Delivered', value: 'ORDER_DELIVERED' },
                    {
                      title: 'Transfer Executed',
                      label: 'Transfer Executed',
                      value: 'TRANSFER_EXECUTED',
                    },
                    {
                      title: 'Premium Purchased',
                      label: 'Premium Purchased',
                      value: 'PREMIUM_PURCHASED',
                    },
                  ]}
                  className='bg-background border-border text-foreground w-full sm:w-40'
                />
              </div>

              {/* Search */}
              <div className='space-y-2'>
                <Input
                  placeholder='Search by entity ID...'
                  value={search || ''}
                  onChange={(e) => setFilter('search', e.target.value)}
                  className='bg-background border-border text-foreground w-full sm:w-64'
                />
              </div>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => mutate()}
                disabled={loading}
                className='border-border hover:bg-accent'
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0'>
        <Card className='bg-card border-border min-w-0'>
          <CardHeader className='pb-2 p-3 sm:p-6'>
            <CardDescription className='text-xs sm:text-sm text-muted-foreground'>Total Logs</CardDescription>
            <CardTitle className='text-xl sm:text-2xl text-foreground'>{data?.data?.pagination?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-card border-border min-w-0'>
          <CardHeader className='pb-2 p-3 sm:p-6'>
            <CardDescription className='text-xs sm:text-sm text-muted-foreground'>Account Actions</CardDescription>
            <CardTitle className='text-xl sm:text-2xl text-foreground'>
              {data?.data?.logs?.filter((log) => log.entity === 'Account').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-card border-border min-w-0'>
          <CardHeader className='pb-2 p-3 sm:p-6'>
            <CardDescription className='text-xs sm:text-sm text-muted-foreground'>Order Actions</CardDescription>
            <CardTitle className='text-xl sm:text-2xl text-foreground'>
              {data?.data?.logs?.filter((log) => log.entity === 'Order').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-card border-border min-w-0'>
          <CardHeader className='pb-2 p-3 sm:p-6'>
            <CardDescription className='text-xs sm:text-sm text-muted-foreground'>Transfer Actions</CardDescription>
            <CardTitle className='text-xl sm:text-2xl text-foreground'>
              {data?.data?.logs?.filter((log) => log.entity === 'TelegramTransfer').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <CustomTable
        columns={columns}
        data={data?.data?.logs ?? []}
        getRowId={(row: AuditLog) => row.id}
        emptyMessage={
          loading
            ? 'Loading activity logs...'
            : 'No activity logs found. Activity will appear here as transactions occur.'
        }
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      {data?.data?.pagination && (
        <Pagination paginationData={data.data.pagination} pageSizeOptions={[10, 20, 30, 50]} />
      )}
    </div>
  )
}

export default function ActivityLogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivityLogList />
    </Suspense>
  )
}

