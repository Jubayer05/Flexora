'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { RankSystemType } from '@/lib/validations/schemas/rankSystem'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import RankSystemForm from '../form/RankSystem'
import { getRankActions, RankActionType } from './rankActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: RankSystemType; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: RankActionType | null
    isOpen: boolean
  }>({ type: null, isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete',
      description: 'Are you sure you want to delete this rank? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: RankSystemType) => {
        try {
          await requests.delete(`/admin/ranks/${data?.id}`)
          toast.success('Rank deleted successfully')
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
  const handleAction = (actionType: RankActionType, data: RankSystemType) => {
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
    mutate?.() // Refresh the data after successful form submission
    setCurrentDialog({ type: null, isOpen: false })
  }

  const handleDialogClose = () => {
    setCurrentDialog({ type: null, isOpen: false })
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
        return <RankSystemForm initialData={data as any} {...commonProps} />
      default:
        return <RankSystemForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Rank'
      default:
        return 'Rank Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getRankActions(handleAction)} />
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

// Purchase columns function that accepts mutate callback and pagination
export const ranksColumns = (mutate?: () => void): TableColumn<RankSystemType>[] => {
  return [
    {
      key: 'icon',
      header: 'Icon',
      render: (_, record) => {
        const iconUrl = record.icon
        return (
          <div className='w-10 h-10 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center'>
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconUrl} alt={record.name || 'rank'} className='w-8 h-8 object-contain' />
            ) : (
              <span className='text-xs text-muted-foreground'>{record.name?.charAt(0) || '?'}</span>
            )}
          </div>
        )
      },
      width: 'w-16'
    },
    {
      key: 'name',
      header: 'Rank Name',
      render: (value) => <div className='text-center'>{value || '-'}</div>,
      width: 'w-20'
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (value) => <div className='text-center'>{value || '-'}</div>,
      width: 'w-20'
    },
    {
      key: 'minSpending',
      header: 'Min Spending',
      render: (value) => <div>${value?.toLocaleString() || '0'}</div>,
      width: 'w-32'
    },
    {
      key: 'maxSpending',
      header: 'Max Spending',
      render: (value) => <div>${value?.toLocaleString() || '0'}</div>,
      width: 'w-32'
    },
    {
      key: 'discount',
      header: 'Discount %',
      render: (value) => <div>{value ? `${value}%` : '-'}</div>,
      width: 'w-24'
    },
    {
      key: 'bonusDevices',
      header: 'Bonus Devices',
      render: (value) => <div className='text-center'>{value || 0}</div>,
      width: 'w-28'
    },
    {
      key: 'meta',
      header: 'Features',
      render: (_, record) => {
        const features = record.meta?.features || []
        if (!Array.isArray(features) || features.length === 0) {
          return <span className='text-muted-foreground text-sm'>-</span>
        }
        return (
          <div className='flex flex-wrap gap-1'>
            {features.slice(0, 2).map((feature: string) => (
              <span
                key={feature}
                className='inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-2 py-1 border border-blue-200 dark:border-blue-800 rounded-full text-blue-800 dark:text-blue-200 text-[11px]'
              >
                {feature}
              </span>
            ))}
            {features.length > 2 && (
              <span className='inline-flex items-center bg-muted px-2 py-1 rounded-full text-muted-foreground text-[11px]'>
                +{features.length - 2} more
              </span>
            )}
          </div>
        )
      },
      width: 'w-48'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
