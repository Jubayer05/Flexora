'use client'

import { CustomTable } from '@/components/admin/common/data-table'
import { notificationColumns } from '@/components/admin/notifications/notification-columns'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { usePermissions } from '@/components/providers/PermissionProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { Plus } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'

const NotificationForm = lazy(() =>
  import('@/components/admin/form/settings/Notification').then(m => ({
    default: m.default
  }))
)

function NotificationManagement() {
  const { search, page, limit } = useFilter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, mutate, loading } = useAsync(
    `/admin/notifications?role=ADMIN&page=${page}&limit=${limit}${
      search ? `&search=${search}` : ''
    }`,
    false,
    false
  )

  const notifications = data?.data?.notifications || []
  const pagination = data?.data?.pagination

  const columns = useMemo(() => notificationColumns(mutate), [mutate])

  const TableSkeleton = () => (
    <div className='space-y-2'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex gap-4 p-4 border rounded'>
          <Skeleton className='h-10 w-12 rounded' />
          <Skeleton className='h-10 w-48 rounded' />
          <Skeleton className='h-10 flex-1 rounded' />
          <Skeleton className='h-10 w-20 rounded' />
          <Skeleton className='h-10 w-10 rounded' />
        </div>
      ))}
    </div>
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader
        title='Notification Management'
        subTitle='Manage system notifications'
        extra={
          <div>
            <Button className='w-fit' onClick={() => setCreateDialogOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Create Notification
            </Button>
          </div>
        }
      />

      <div className='space-y-4'>
        {loading ? (
          <TableSkeleton />
        ) : (
          <>
            <CustomTable
              data={notifications}
              columns={columns}
              emptyMessage='No notifications found'
            />
            <Pagination paginationData={pagination} />
          </>
        )}
      </div>

      {/* Create Notification Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className='max-w-6xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
            <DialogDescription>Send a new notification to users</DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className='py-8 text-center'>Loading form...</div>}>
            <NotificationForm mutate={mutate} setCreateDialogOpen={setCreateDialogOpen} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NotificationManagementPage() {
  const { permissions, loading } = usePermissions()

  return (
    <PermissionGuard
      permissions={permissions}
      resource='notifications'
      action='index'
      loading={loading}
      showAccessDenied
      fullScreen
      redirectPath='/admin/dashboard'
    >
      <Suspense fallback={<div>Loading...</div>}>
        <NotificationManagement />
      </Suspense>
    </PermissionGuard>
  )
}
