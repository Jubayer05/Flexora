'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import GatewayForm from '@/components/admin/form/Gateway'
import { gatewayColumns } from '@/components/admin/gateways/gateway-columns'
import PayGateProvidersManager from '@/components/admin/gateways/PayGateProvidersManager'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { PaymentMethodType } from '@/lib/validations/schemas/gateway'

function GatewayList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      data: PaymentMethodType[]
      pagination: any
    }
  }>(
    () =>
      '/admin/payment-methods' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : '')
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
        title=''
        extra={<AddButton resource='settings' onClick={() => setIsDialogOpen(true)} />}
      />

      {/* Table */}
      <CustomTable
        columns={gatewayColumns(mutate)}
        data={data?.data?.data ?? []}
        getRowId={(row: PaymentMethodType) => row.id as any}
        emptyMessage={loading ? 'Loading payment gateways...' : 'No payment gateway found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      <div className='mt-6'>
        <PayGateProvidersManager />
      </div>

      {/* Add New gateway Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Payment Gateway</DialogTitle>
          </DialogHeader>
          <GatewayForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function GatewayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GatewayList />
    </Suspense>
  )
}
