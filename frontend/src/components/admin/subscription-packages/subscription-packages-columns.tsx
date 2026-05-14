'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import StatusBadge from '@/components/common/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import SubscriptionPackageForm from '../form/SubscriptionPackage'
import { getSubscriptionPackageActions } from './subscription-packages-actions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

interface SubscriptionPackage {
  id: number
  name: string
  description?: any
  price: number
  discount: number
  duration: number
  isActive: boolean
  meta?: any
  createdAt: string
  updatedAt: string
}

const ActionsCell = ({ data, mutate }: { data: SubscriptionPackage; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'delete'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Subscription Package',
      description:
        'Are you sure you want to delete this subscription package? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: SubscriptionPackage) => {
        try {
          await requests.delete(`/admin/subscription-packages/${data?.id}`)
          toast.success('Subscription package deleted successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error // Re-throw to prevent modal from closing
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
  const handleAction = (actionType: 'edit' | 'delete', data: SubscriptionPackage) => {
    if (actionType === 'edit') {
      // Open dialog for form-based actions
      setCurrentDialog({ type: actionType, isOpen: true })
    } else if (actionType === 'delete') {
      // Open confirmation modal for destructive actions
      const config = actionConfigs[actionType as keyof typeof actionConfigs]
      setCurrentAction({ type: actionType as keyof typeof actionConfigs })
      actionModal.openModal(async () => {
        await config.onClick(data)
        setCurrentAction(null)
      })
    }
  }

  const handleDialogSuccess = () => {
    mutate?.() // Refresh the data
    setCurrentDialog({ type: 'edit', isOpen: false })
  }

  const handleDialogClose = () => {
    setCurrentDialog({ type: 'edit', isOpen: false })
  }

  // Render the appropriate form component based on dialog type
  const renderDialogContent = () => {
    const { type } = currentDialog
    const commonProps = {
      onClose: handleDialogClose,
      onSuccess: handleDialogSuccess
    }

    switch (type) {
      case 'edit':
        return <SubscriptionPackageForm initialValues={data} {...commonProps} />
      default:
        return <SubscriptionPackageForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Subscription Package'
      default:
        return 'Subscription Package Action'
    }
  }

  return (
    <>
      <ActionsDropdown
        data={data}
        actions={getSubscriptionPackageActions(data, mutate, handleAction)}
      />
      <actionModal.ModalComponent />

      {/* Unified Dialog for all form-based actions */}
      <Dialog open={currentDialog.isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Subscription Package columns function that accepts mutate callback
export const subscriptionPackageColumns = (
  mutate?: () => void
): TableColumn<SubscriptionPackage>[] => {
  return [
    {
      key: 'icon',
      header: 'Icon',
      render: (_, record) => {
        const meta = (record.meta as any) || {}
        const iconUrl: string | undefined = meta.icon

        return (
          <div className='w-10 h-10 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center'>
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconUrl} alt={record.name} className='w-8 h-8 object-contain' />
            ) : (
              <span className='text-xs text-muted-foreground'>{record.name?.charAt(0)}</span>
            )}
          </div>
        )
      },
      width: 'w-16'
    },
    {
      key: 'name',
      header: 'Name',
      width: 'w-48'
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => `$${Number(value).toFixed(2)}`,
      width: 'w-32'
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (value) => `${value}%`,
      width: 'w-32'
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (value) => `${value} days`,
      width: 'w-32'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value) => <StatusBadge status={value ? 'ACTIVE' : 'INACTIVE'} />,
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultSubscriptionPackageColumns = subscriptionPackageColumns()
