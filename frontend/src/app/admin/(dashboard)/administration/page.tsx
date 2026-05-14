'use client'

import { Suspense, useState } from 'react'

import { adminColumns } from '@/components/admin/admins/admin-columns'
import { CustomTable } from '@/components/admin/common/data-table'
import AdminForm from '@/components/admin/form/Admin'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function AdminList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      admins: TAdmin[]
      pagination: any
    }
  }>(() => {
    const url = '/admin/admins' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : '')
    return url
  })

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleDialogSuccess = () => {
    mutate()
    setIsDialogOpen(false)
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px] text-foreground'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading admins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='All Admin'
        subTitle='Manage admin accounts and their permissions'
        extra={<AddButton resource='admin' onClick={() => setIsDialogOpen(true)} />}
      />

      {/* Table */}
      <CustomTable
        columns={adminColumns(mutate)}
        data={data?.data?.admins ?? []}
        getRowId={(row: TAdmin) => row.id}
        emptyMessage={loading ? 'Loading users...' : 'No user found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New</DialogTitle>
          </DialogHeader>
          <AdminForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminListPage() {
  return (
    <Suspense fallback={<div className='text-foreground'>Loading...</div>}>
      <AdminList />
    </Suspense>
  )
}
