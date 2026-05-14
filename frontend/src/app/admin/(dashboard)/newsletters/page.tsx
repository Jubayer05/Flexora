'use client'

import { Suspense } from 'react'

import { Button } from '@/components/ui/button'

import { CustomTable } from '@/components/admin/common/data-table'
import { createSubscriberColumns } from '@/components/admin/subscribers/subscriber-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { Download, Search } from 'lucide-react'

function SubscribersList() {
  const { search, page, limit, filters, clearFilters } = useFilter(10)

  const { data, loading, mutate } = useAsync<{
    data: {
      subscribers: Array<{ id: number; email: string; createdAt: string }>
      pagination: any
    }
  }>(
    () =>
      '/admin/subscribers' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.spend ? `&sortBy=totalSpent&sortOrder=${filters.spend}` : '') +
      (filters.country ? `&country=${filters.country}` : '')
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden bg'>
      <PageHeader
        title='All Newsletter Subscribers'
        subTitle='Manage your Newsletter subscribers'
        extra={
          <div className='flex sm:flex-row flex-col sm:justify-between sm:items-end gap-4 mb-6'>
            <div className='flex sm:flex-row flex-col sm:items-end gap-4'>
              <div className='relative min-w-xs'>
                <Input placeholder='Search' />
                <Search className='top-2.5 right-3 absolute w-4 h-4 text-muted-foreground' />
              </div>
              <Button>
                <Download />
                Download
              </Button>
            </div>

            {/* Clear Filters */}
            {(search || filters.spend) && (
              <Button
                variant='outline'
                onClick={clearFilters}
                className='bg-background hover:bg-white/10 border-white/20 text-white'
              >
                Clear Filters
              </Button>
            )}
          </div>
        }
      />

      {/* Table */}
      <CustomTable
        columns={createSubscriberColumns(page, limit, () => mutate())}
        data={data?.data?.subscribers ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading...' : 'No subscribers found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function SubscribersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscribersList />
    </Suspense>
  )
}
