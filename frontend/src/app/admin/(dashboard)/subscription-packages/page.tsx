'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import SubscriptionPackageForm from '@/components/admin/form/SubscriptionPackage'
import { subscriptionPackageColumns } from '@/components/admin/subscription-packages/subscription-packages-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function SubscriptionPackageList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      data: any[]
      pagination: any
    }
  }>(
    () =>
      'admin/subscription-packages' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '')
  )

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleDialogSuccess = () => {
    mutate()
    setIsDialogOpen(false)
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Subscription Packages'
        subTitle='Manage subscription plans and pricing'
        extra={<AddButton resource='subscription-packages' onClick={() => setIsDialogOpen(true)} />}
      />

      {/* Table */}
      <CustomTable
        columns={subscriptionPackageColumns(mutate)}
        data={data?.data?.data ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading packages...' : 'No subscription packages found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New Package Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar'>
          <DialogHeader>
            <DialogTitle>Add New Subscription Package</DialogTitle>
          </DialogHeader>
          <SubscriptionPackageForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SubscriptionPackagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscriptionPackageList />
    </Suspense>
  )
}
