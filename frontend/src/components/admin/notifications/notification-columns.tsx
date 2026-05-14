'use client'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { AdminNotification } from '@/types/notification'
import { format } from 'date-fns'
import { CheckCircle, Eye, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({
  notification,
  mutate
}: {
  notification: AdminNotification
  mutate?: () => void
}) => {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Define action configurations
  const actionConfigs = {
    delete: {
      title: 'Delete Notification',
      description: `Are you sure you want to delete this notification? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (notification: AdminNotification) => {
        try {
          await requests.delete(`/admin/notifications/${notification.id}`)
          toast.success('Notification deleted successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    }
  }

  const [currentAction, setCurrentAction] = useState<{
    type: keyof typeof actionConfigs
  } | null>(null)

  const actionModal = useConfirmationModal({
    title: currentAction ? actionConfigs[currentAction.type].title : '',
    description: currentAction ? actionConfigs[currentAction.type].description : '',
    confirmText: currentAction ? actionConfigs[currentAction.type].confirmText : 'Confirm',
    cancelText: 'Cancel',
    variant: currentAction ? actionConfigs[currentAction.type].variant : 'default',
    icon: currentAction ? actionConfigs[currentAction.type].icon : Trash2,
    showInput: currentAction ? actionConfigs[currentAction.type].showInput : false,
    inputConfig: currentAction ? actionConfigs[currentAction.type].inputConfig : undefined
  })

  // Unified action handler
  const handleAction = async (action: string, notification: AdminNotification) => {
    switch (action) {
      case 'view':
        setViewDialogOpen(true)
        break
      case 'markRead':
        await handleMarkRead()
        break
      case 'delete':
        if (actionConfigs.delete) {
          setCurrentAction({ type: 'delete' })
          actionModal.openModal(async () => {
            await actionConfigs.delete.onClick(notification)
          })
        }
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
    }
  }

  const handleMarkRead = async () => {
    try {
      await requests.post(`/admin/notifications/read`, {
        notificationId: notification.id
      })
      toast.success('Notification marked as read')
      mutate?.()
    } catch (error) {
      showError(error)
    }
  }

  // Define actions for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'View Details',
      icon: Eye,
      onClick: () => handleAction('view', notification)
    },
    // Only show Mark as Read if notification is unread AND has a userId (not broadcast)
    ...(!notification.isRead && notification.userId
      ? [
          {
            type: 'action' as const,
            label: 'Mark as Read',
            icon: CheckCircle,
            onClick: () => handleAction('markRead', notification)
          }
        ]
      : []),
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      onClick: () => handleAction('delete', notification),
      className: 'text-red-600 focus:text-red-600'
    }
  ]

  return (
    <>
      <ActionsDropdown data={notification} actions={actions} />

      {actionModal.ModalComponent && <actionModal.ModalComponent />}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>View notification information</DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Title</p>
              <p className='text-sm font-semibold'>{notification.title}</p>
            </div>

            <div>
              <p className='text-sm font-medium text-muted-foreground'>Message</p>
              <p className='text-sm whitespace-pre-wrap'>{notification.message}</p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Type</p>
                <Badge>{notification.type}</Badge>
              </div>

              <div>
                <p className='text-sm font-medium text-muted-foreground'>Role</p>
                <Badge variant='secondary'>{notification.role}</Badge>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm font-medium text-muted-foreground'>Status</p>
                <Badge variant={notification.isRead ? 'default' : 'destructive'}>
                  {notification.isRead ? 'Read' : 'Unread'}
                </Badge>
              </div>

              <div>
                <p className='text-sm font-medium text-muted-foreground'>Created</p>
                <p className='text-sm'>{format(new Date(notification.createdAt), 'PPpp')}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const notificationColumns = (mutate?: () => void): TableColumn<AdminNotification>[] => [
  {
    key: 'title',
    header: 'Title',
    render: (_, notification) => (
      <div className='max-w-md'>
        <p className={cn('font-medium', !notification.isRead && 'font-bold')}>
          {notification.title}
        </p>
        <p className='text-xs text-muted-foreground truncate'>{notification.message}</p>
      </div>
    ),
    width: '400px'
  },
  {
    key: 'type',
    header: 'Type',
    render: (_, notification) => {
      const typeColors: Record<string, string> = {
        ORDER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        PAYMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        RESTOCK: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        SYSTEM: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        PROMOTION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        OTHERS: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
      }
      return (
        <Badge variant='outline' className={typeColors[notification.type] || typeColors.OTHERS}>
          {notification.type}
        </Badge>
      )
    },
    width: '120px'
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (_, notification) => (
      <div className='text-sm'>
        <p>{format(new Date(notification.createdAt), 'MMM dd, yyyy')}</p>
        <p className='text-xs text-muted-foreground'>
          {format(new Date(notification.createdAt), 'HH:mm')}
        </p>
      </div>
    ),
    width: '150px'
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_, notification) => <ActionsCell notification={notification} mutate={mutate} />,
    width: '80px'
  }
]
