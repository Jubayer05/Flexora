'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import RoleForm from '../form/Role'
import { getRoleActions } from './roleActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: Role; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'delete'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Role',
      description: 'Are you sure you want to delete this role? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Role) => {
        try {
          await requests.delete(`/admin/roles/${data?.id}`)
          toast.success('Role deleted successfully')
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
  const handleAction = (actionType: 'edit' | 'assign' | 'status' | 'delete', data: Role) => {
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
        return <RoleForm initialData={data} {...commonProps} />
      default:
        return <RoleForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Role'
      default:
        return 'Role Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getRoleActions(data, mutate, handleAction)} />
      <actionModal.ModalComponent />

      {/* Unified Dialog for all form-based actions */}
      <Dialog open={currentDialog.isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Role columns function that accepts mutate callback
export const roleColumns = (mutate?: () => void): TableColumn<Role>[] => {
  return [
    {
      key: 'name',
      header: 'Role Name',
      render: (_, role) => (
        <div className='flex flex-col'>
          <span className='font-medium'>{role.name}</span>
          <span className='text-muted-foreground text-sm'>{role.description}</span>
        </div>
      )
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (_, role) => (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-xs'>
            {role.permissions?.length || 0} permission
            {(role.permissions?.length || 0) !== 1 ? 's' : ''}
          </span>
          <div className='flex flex-wrap gap-1'>
            {role.permissions?.slice(0, 2).map((permission, index) => (
              <Badge key={index} variant='outline' className='text-muted text-xs'>
                {permission.resource}
              </Badge>
            ))}
            {(role.permissions?.length || 0) > 2 && (
              <Badge variant='secondary' className='text-xs'>
                +{(role.permissions?.length || 0) - 2} more
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (date: string) => (
        <span className='text-muted-foreground text-sm'>{new Date(date).toLocaleDateString()}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
