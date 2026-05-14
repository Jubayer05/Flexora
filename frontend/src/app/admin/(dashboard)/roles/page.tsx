'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import RoleForm from '@/components/admin/form/Role'
import { roleColumns } from '@/components/admin/roles/role-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function RoleList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      roles: Role[]
      pagination: any
    }
  }>(() => {
    const url = '/admin/roles' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : '')
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
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='All Roles'
        subTitle='Manage roles and their permissions'
        extra={<AddButton resource='roles' onClick={() => setIsDialogOpen(true)} />}
      />

      {/* Table */}
      <CustomTable
        columns={roleColumns(mutate)}
        data={data?.data?.roles ?? []}
        getRowId={(row: Role) => row.id}
        emptyMessage={loading ? 'Loading roles...' : 'No roles found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
          </DialogHeader>
          <RoleForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RoleListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoleList />
    </Suspense>
  )
}
