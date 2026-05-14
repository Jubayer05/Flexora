'use client'

import { Suspense, useState, lazy } from 'react'
import React from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { emailTemplateColumns } from '@/components/admin/email-templates/email-template-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { EmailTemplate } from '@/lib/validations/schemas/emailTemplate'

// Lazy load the email template form to reduce initial bundle
const EmailTemplateForm = lazy(() =>
  import('@/components/admin/form/EmailTemplate').then((m) => ({
    default: m.default
  }))
)

function EmailTemplateList() {
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      data: EmailTemplate[]
      pagination: any
    }
  }>(() => {
    const url =
      '/admin/email-templates' + (page ? `?page=${page}` : '') + (limit ? `&limit=${limit}` : '')
    return url
  }, false, false) // Disable aggressive revalidation

  // Memoize columns to prevent re-renders
  const columns = React.useMemo(() => emailTemplateColumns(mutate), [mutate])

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleDialogSuccess = () => {
    mutate()
    setIsDialogOpen(false)
  }

  // Skeleton loader component
  const TableSkeleton = () => (
    <div className='bg-background rounded-lg overflow-hidden'>
      <div className='space-y-2 p-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    </div>
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Email Templates'
        subTitle='Manage email templates for notifications and communications'
        extra={
          <AddButton
            resource='settings'
            onClick={() => {
              setIsDialogOpen(true)
            }}
          />
        }
      />

      {/* Table with Skeleton Loading */}
      {loading && <TableSkeleton />}
      {!loading && (
        <>
          <CustomTable
            columns={columns}
            data={data?.data?.data ?? []}
            getRowId={(row: EmailTemplate) => row.id}
            emptyMessage='No email templates found.'
          />
          {/* Pagination */}
          <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
        </>
      )}

      {/* Add New Email Template Dialog - Lazy loaded */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New Email Template</DialogTitle>
          </DialogHeader>
          <Suspense
            fallback={
              <div className='space-y-4'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-24 w-full' />
              </div>
            }
          >
            <EmailTemplateForm onClose={handleDialogClose} onSuccess={handleDialogSuccess} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EmailTemplatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailTemplateList />
    </Suspense>
  )
}
