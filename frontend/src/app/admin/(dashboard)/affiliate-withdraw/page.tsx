'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { withdrawalColumns } from '@/components/admin/withdrawals/withdrawal-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

const AffiliateWithdrawList = () => {
  const { search, page, limit } = useFilter(10)

  const queryParams = new URLSearchParams()
  queryParams.set('source', 'referral')
  if (page) queryParams.set('page', String(page))
  if (limit) queryParams.set('limit', String(limit))
  if (search) queryParams.set('search', String(search))

  const { data, loading, mutate } = useAsync<{
    data: any[]
    pagination: any
  }>(() => `/admin/withdrawals?${queryParams.toString()}`)

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
      <PageHeader
        title='Affiliate Withdrawals'
        subTitle='Review affiliate withdrawal requests and mark them done after manual payout'
      />

      {/* Table */}
      <CustomTable
        columns={withdrawalColumns(() => {
          void mutate()
        })}
        data={data?.data ?? []}
        getRowId={(row: any) => row.id ?? 0}
        emptyMessage={loading ? 'Loading...' : 'No affiliate withdrawal requests found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function AffiliateWithdrawPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AffiliateWithdrawList />
    </Suspense>
  )
}
