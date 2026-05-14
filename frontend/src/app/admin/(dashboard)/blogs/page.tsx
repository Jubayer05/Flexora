'use client'

import { Suspense } from 'react'

import { blogColumns } from '@/components/admin/blogs/blogs-columns'
import { CustomTable } from '@/components/admin/common/data-table'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function BlogList() {
  const { page, limit } = useFilter(10)

  const { data, loading, mutate } = useAsync<{
    data: {
      blogs: Blog[]
      pagination: PaginationMeta
    }
  }>(() => 'admin/blogs' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : ''))

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Blog Posts'
        subTitle='Manage blog posts and articles'
        extra={<AddButton resource='blogs' href='/admin/blogs/create' />}
      />

      {/* Table */}
      <CustomTable
        columns={blogColumns(mutate)}
        data={data?.data?.blogs ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading blog posts...' : 'No blog posts found.'}
        className={`font-manrope ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function BlogListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogList />
    </Suspense>
  )
}
