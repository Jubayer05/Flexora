'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { transferProductColumns } from '@/components/admin/telegram-management/transfer-product-columns'
import CustomLink from '@/components/common/CustomLink'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { buttonVariants } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

function TransferProductList() {
  const { search, page, limit } = useFilter(10)

  const { data, loading, mutate } = useAsync<TransferProductResponse>(
    () =>
      '/admin/transfer-products' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '')
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Management Channels/groups'
        subTitle='Manage Telegram channels and groups for transfer products'
        extra={
          <div className='flex sm:flex-row flex-col sm:justify-between sm:items-end gap-4 mb-6'>
            <CustomLink
              href='/admin/telegram-management/manage-transfer-products/add-new'
              className={cn('font-semibold hover:text-background', buttonVariants())}
            >
              <Plus />
              Add Channel/Group
            </CustomLink>
          </div>
        }
      />

      {/* Table */}
      <CustomTable
        columns={transferProductColumns(mutate)}
        data={data?.data ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading channels/groups...' : 'No channel or group found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function ManageTransferProducts() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransferProductList />
    </Suspense>
  )
}
