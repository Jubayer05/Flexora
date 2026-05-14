'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { serviceOrderColumns } from '@/components/admin/orders/service-order-columns'
import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

const serviceOrderStatus = [
  {
    title: 'All Status',
    label: 'All Status',
    value: 'ALL'
  },
  {
    title: 'Pending',
    label: 'Pending',
    value: 'PENDING'
  },
  {
    title: 'In Progress',
    label: 'IN_PROGRESS',
    value: 'IN_PROGRESS'
  },
  {
    title: 'Completed',
    label: 'Completed',
    value: 'COMPLETED'
  },
  {
    title: 'Cancelled',
    label: 'Cancelled',
    value: 'CANCELLED'
  }
]

const serviceOrderTypes = [
  {
    title: 'All Types',
    label: 'All Types',
    value: 'ALL'
  },
  {
    title: 'Manual Premium Orders',
    label: 'Manual Premium Orders',
    value: 'MANUAL_PREMIUM'
  },
  {
    title: 'Service Products',
    label: 'Service Products (Canva, Gmail, etc.)',
    value: 'SERVICE_PRODUCTS'
  },
  {
    title: 'Telegram Manual',
    label: 'Manual Telegram Premium',
    value: 'TELEGRAM_MANUAL'
  }
]

function ServiceOrdersList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch } = useFilter(10)

  const { data, loading, error, mutate } = useAsync<{
    success: boolean
    orders: Order[]
    pagination: any
    message: string
  }>(
    () =>
      '/admin/orders/services' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.status && filters.status !== 'ALL' ? `&status=${filters.status}` : '') +
      (filters.serviceType && filters.serviceType !== 'ALL' ? `&serviceType=${filters.serviceType}` : '')
  ) 
  
  console.log('API DATA:', data)
  console.log('API ERROR:', error)
  console.log('Loading:', loading)
  console.log('Orders:', data?.orders)
  console.log('Pagination:', data?.pagination)

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Service Orders'
        subTitle='Manage manual fulfillment orders (services, premium subscriptions, etc.)'
        extra={
          <div className='flex sm:flex-row flex-col sm:justify-between sm:items-end gap-4 mb-6'>
            {/* Search */}
            <CustomInput
              placeholder='Search by Order Number, Customer Name, or Email'
              value={(filters.search as string) ?? ''}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Filter By Status */}
            <CustomSelect
              placeholder='Filter by Status'
              value={(filters.status as string) ?? 'ALL'}
              onChange={(value) => setFilter('status', value)}
              showSearch={false}
              staticOptions={serviceOrderStatus}
              className='bg-background border-border w-full sm:w-40 text-foreground'
            />

            {/* Filter By Service Type */}
            <CustomSelect
              placeholder='Filter by Type'
              value={(filters.serviceType as string) ?? 'ALL'}
              onChange={(value) => setFilter('serviceType', value)}
              showSearch={false}
              staticOptions={serviceOrderTypes}
              className='bg-background border-border w-full sm:w-48 text-foreground'
            />

            {/* Clear Filters */}
            {(search || filters.status || filters.serviceType) && (
              <Button
                variant='outline'
                onClick={clearFilters}
                className='bg-background border-border text-foreground hover:bg-muted'
              >
                Clear Filters
              </Button>
            )}
          </div>
        }
      />

      {/* Table */}
      <CustomTable
        columns={serviceOrderColumns(mutate)}
        data={data?.orders ?? []}
        getRowId={(row: Order) => row.id}
        emptyMessage={loading ? 'Loading service orders...' : 'No service orders found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination
        paginationData={data?.pagination}
        pageSizeOptions={[5, 10, 20, 50]}
      />

    </div>
  )
}

export default function ServiceOrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServiceOrdersList />
    </Suspense>
  )
}

