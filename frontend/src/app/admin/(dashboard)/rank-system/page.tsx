'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import RankSystemForm from '@/components/admin/form/RankSystem'
import { ranksColumns } from '@/components/admin/rank-systems/rank-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { RankSystemType } from '@/lib/validations/schemas/rankSystem'

const RanksList = () => {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      ranks: RankSystemType[]
      pagination: any
    }
  }>(() => {
    const url = '/admin/ranks' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : '')
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
          <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Rank System Management'
        extra={
          <AddButton title='Create System' resource='tiers' onClick={() => setIsDialogOpen(true)} />
        }
      />

      {/* Table */}
      <CustomTable
        columns={ranksColumns(mutate)}
        data={data?.data?.ranks ?? []}
        getRowId={(row: RankSystemType) => row.id ?? 0}
        emptyMessage={loading ? 'Loading...' : 'No ranks found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Rank System</DialogTitle>
          </DialogHeader>
          <RankSystemForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RankListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RanksList />
    </Suspense>
  )
}
