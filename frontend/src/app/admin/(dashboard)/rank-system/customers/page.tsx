'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { tierCustomerColumns } from '@/components/admin/rank-systems/customer-columns'
import { Pagination } from '@/components/common/Pagination'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

const TierCustomersList = () => {
  const { search, page, limit, filters } = useFilter(10)

  const { data, loading } = useAsync<{
    data: {
      customers: User[]
      pagination: any
    }
  }>(
    () =>
      '/admin/customers' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.spend ? `&sortBy=totalSpent&sortOrder=${filters.spend}` : '') +
      (filters.country ? `&country=${filters.country}` : '')
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Table */}
      <CustomTable
        columns={tierCustomerColumns()}
        data={data?.data?.customers ?? []}
        getRowId={(row: User) => row.id ?? 0}
        emptyMessage={loading ? 'Loading...' : 'No tiers found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function TierCustomersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TierCustomersList />
    </Suspense>
  )
}
