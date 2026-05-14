'use client'

import { Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import StatusBadge from '@/components/common/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { PaymentMethodType } from '@/lib/validations/schemas/gateway'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import GatewayForm from '../form/Gateway'
import { getGatewayActions } from './gatewayActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: PaymentMethodType; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'delete'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })
  const [forceDeleteInfo, setForceDeleteInfo] = useState<{
    paymentCount: number
    isOpen: boolean
  }>({ paymentCount: 0, isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Gateway',
      description:
        'Are you sure you want to delete this payment gateway? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: PaymentMethodType, force: boolean = false) => {
        try {
          const url = force 
            ? `/admin/payment-methods/${data?.id}?force=true`
            : `/admin/payment-methods/${data?.id}`
          await requests.delete(url)
          toast.success('Payment method deleted successfully')
          mutate?.()
          setForceDeleteInfo({ paymentCount: 0, isOpen: false })
        } catch (error: any) {
          // Check if error is about payment method being used in payments
          const errorMessage = error?.response?.data?.message || error?.message || ''
          if (errorMessage.includes('use force=true') && !force) {
            // Extract payment count from error message
            const paymentCountMatch = errorMessage.match(/(\d+)\s+payment\(s\)/)
            const paymentCount = paymentCountMatch ? parseInt(paymentCountMatch[1]) : 0
            
            // Close the first modal and show force delete confirmation
            setCurrentAction(null)
            setForceDeleteInfo({ paymentCount, isOpen: true })
            return // Don't throw error, we'll handle it with force delete modal
          }
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

  // Force delete confirmation modal
  const forceDeleteModal = useConfirmationModal({
    title: 'Force Delete Gateway',
    description: forceDeleteInfo.paymentCount > 0
      ? `This payment method is used in ${forceDeleteInfo.paymentCount} payment(s). Deleting it will remove the payment method, but the payment records will remain. This action cannot be undone. Are you sure you want to proceed?`
      : 'This payment method cannot be deleted normally. Force delete will remove it regardless of associated payments. This action cannot be undone. Are you sure you want to proceed?',
    confirmText: 'Force Delete',
    cancelText: 'Cancel',
    variant: 'destructive' as const,
    icon: Trash2,
    showInput: false,
    inputConfig: undefined
  })

  // Unified action handler
  const handleAction = (actionType: 'edit' | 'delete', data: PaymentMethodType) => {
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

  // Handle force delete confirmation - open modal when forceDeleteInfo.isOpen becomes true
  useEffect(() => {
    if (forceDeleteInfo.isOpen) {
      // Use setTimeout to ensure the first modal is closed before opening the second one
      const timer = setTimeout(() => {
        forceDeleteModal.openModal(async () => {
          const config = actionConfigs.delete
          await config.onClick(data, true)
          setForceDeleteInfo({ paymentCount: 0, isOpen: false })
        })
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDeleteInfo.isOpen])

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
        return <GatewayForm initialValues={data} {...commonProps} />
      default:
        return <GatewayForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Gateway'
      default:
        return 'Gateway Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getGatewayActions(data, mutate, handleAction)} />
      <actionModal.ModalComponent />
      <forceDeleteModal.ModalComponent />

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

// Gateway columns function that accepts mutate callback
export const gatewayColumns = (mutate?: () => void): TableColumn<PaymentMethodType>[] => {
  return [
    {
      key: 'name',
      header: 'Thumbnail',
      render: (_, record) => (
        <CustomImage
          src={record.thumbnail}
          alt={record.name}
          width={46}
          height={46}
          className='rounded-md size-[46px] object-cover'
        />
      ),
      width: 'w-46'
    },

    {
      key: 'name',
      header: 'Name',
      render: (value) => value ?? '-',
      width: 'w-40'
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (value) => (
        <span className='bg-blue-100 px-2 py-1 rounded-md font-medium text-blue-800 text-xs'>
          {value?.toUpperCase() ?? '-'}
        </span>
      ),
      width: 'w-32'
    },
    {
      key: 'minAmount',
      header: 'Min Amount',
      render: (value) => (value ? `$${value}` : '-'),
      width: 'w-28'
    },
    {
      key: 'bonus',
      header: 'Bonus %',
      render: (value) => (value ? `${value}%` : '-'),
      width: 'w-28'
    },
    {
      key: 'bonusThreshold',
      header: 'Bonus Threshold',
      render: (value) => (value ? `$${value}` : '-'),
      width: 'w-36'
    },
    {
      key: 'feeType',
      header: 'Fee Type',
      render: (value) =>
        value ? (
          <span className='bg-gray-100 px-2 py-1 rounded-md text-gray-800 text-xs'>{value}</span>
        ) : (
          '-'
        ),
      width: 'w-28'
    },
    {
      key: 'feeValue',
      header: 'Fee Value',
      render: (value, data) => {
        if (!value) return '-'
        return data.feeType === 'PERCENTAGE' ? `${value}%` : `$${value}`
      },
      width: 'w-28'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} />,
      width: 'w-24'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
