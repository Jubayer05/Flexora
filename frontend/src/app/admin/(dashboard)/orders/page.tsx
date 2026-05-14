'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { orderColumns } from '@/components/admin/orders/order-columns'
import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

const orderStatus = [
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
    title: 'Confirmed',
    label: 'Confirmed',
    value: 'CONFIRMED'
  },
  {
    title: 'Partial',
    label: 'Partial',
    value: 'PARTIAL'
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
  },
  {
    title: 'Refunded',
    label: 'Refunded',
    value: 'REFUNDED'
  }
]

const userBanStatus = [
  {
    title: 'All Users',
    label: 'All Users',
    value: 'ALL'
  },
  {
    title: 'Banned Users',
    label: 'Banned Users',
    value: 'BANNED'
  },
  {
    title: 'Unbanned Users',
    label: 'Unbanned Users',
    value: 'UNBANNED'
  }
]

function OrderList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch } = useFilter(10)

  const { data, loading, mutate } = useAsync<{
    orders: Order[]
    pagination: any
  }>(
    () =>
      '/admin/orders' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${encodeURIComponent(search.trim())}` : '') +
      (filters.status && filters.status !== 'ALL' ? `&status=${filters.status}` : '') +
      (filters.userBanStatus && filters.userBanStatus !== 'ALL'
        ? `&userBanStatus=${filters.userBanStatus}`
        : '')
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Manage Orders'
        subTitle='View and manage all customer orders'
        extra={
          <div className='flex sm:flex-row flex-col sm:justify-between sm:items-end gap-4 mb-6'>
            {/* Filter By Order Number, Name, or Email */}
            <CustomInput
              placeholder='Search order, name, or email'
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Filter By Status */}
            <CustomSelect
              placeholder='Sort By Status'
              value={(filters.status as string) ?? 'ALL'}
              onChange={(value) => setFilter('status', value)}
              showSearch={false}
              staticOptions={orderStatus}
              className='bg-background border-border w-full sm:w-40 text-foreground'
            />

            {/* Filter By User Ban Status */}
            <CustomSelect
              placeholder='User Status'
              value={(filters.userBanStatus as string) ?? 'ALL'}
              onChange={(value) => setFilter('userBanStatus', value)}
              showSearch={false}
              staticOptions={userBanStatus}
              className='bg-background border-border w-full sm:w-44 text-foreground'
            />

            {/* Clear Filters */}
            {(search || filters.status || filters.userBanStatus) && (
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
        columns={orderColumns(mutate)}
        data={data?.orders ?? []}
        getRowId={(row: Order) => row.id}
        emptyMessage={loading ? 'Loading orders...' : 'No order found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function OrderListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderList />
    </Suspense>
  )
}
