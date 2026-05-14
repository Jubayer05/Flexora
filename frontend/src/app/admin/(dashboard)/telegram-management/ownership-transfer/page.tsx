'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { ownershipTransferColumns } from '@/components/admin/telegram-management/ownership-transfer-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function OwnershipTransferList() {
  const { search, page, limit } = useFilter(10)

  const { data, loading } = useAsync<TelegramOwnerShipDataResponse>(
    () =>
      '/admin/telegram-transfers' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '')
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Channels and Groups Sold'
        subTitle='Manage sold and transferred Telegram channels/groups with proof and status tracking'
      />

      {/* Table */}
      <CustomTable
        columns={ownershipTransferColumns()}
        data={data?.data ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading sold channels/groups...' : 'No sold channel or group found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function OwnerShipTransfer() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnershipTransferList />
    </Suspense>
  )
}
