'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { couponColumns } from '@/components/admin/coupons/coupons-columns'
import CouponForm from '@/components/admin/form/Coupon'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

function CouponList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      data: Coupon[]
      pagination: any
    }
  }>(() => 'admin/coupons' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : ''))

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
        title='Coupons'
        subTitle='Manage coupons and discounts'
        extra={<AddButton resource='coupons' onClick={() => setIsDialogOpen(true)} />}
      />

      {/* Table */}
      <CustomTable
        columns={couponColumns(mutate)}
        data={data?.data?.data ?? []}
        getRowId={(row: Coupon) => row.id}
        emptyMessage={loading ? 'Loading coupons...' : 'No coupon found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New coupon Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar'>
          <DialogHeader>
            <DialogTitle>Add New</DialogTitle>
          </DialogHeader>
          <CouponForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CouponListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CouponList />
    </Suspense>
  )
}
