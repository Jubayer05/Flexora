'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { AdminRole } from '@/lib/validations/schemas/admin'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import AdminForm from '../form/Admin'
import AssignRoleForm from '../form/AssignRole'
import RemoveRoleForm from '../form/RemoveRole'
import { AdminActionType, getAdminActions } from './adminActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const getRoleBadgeVariant = (role: AdminRole) => {
  switch (role) {
    case AdminRole.ADMIN:
      return 'default'
    case AdminRole.MODERATOR:
      return 'secondary'
    default:
      return 'outline'
  }
}

const ActionsCell = ({ data, mutate }: { data: TAdmin; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: AdminActionType | null
    isOpen: boolean
  }>({ type: null, isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Admin',
      description: 'Are you sure you want to delete this admin? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: TAdmin) => {
        try {
          await requests.delete(`/admin/admins/${data?.id}`)
          toast.success('Admin deleted successfully')
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
  const handleAction = (actionType: AdminActionType, data: TAdmin) => {
    if (actionType === 'edit' || actionType === 'assign-role' || actionType === 'remove-role') {
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
        return <AdminForm initialData={data as any} {...commonProps} />
      case 'assign-role':
        return <AssignRoleForm initialData={data as any} {...commonProps} />
      case 'remove-role':
        return <RemoveRoleForm initialData={data as any} {...commonProps} />
      default:
        return <AdminForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Admin'
      case 'assign-role':
        return 'Assign Role'
      case 'remove-role':
        return 'Remove Role'
      default:
        return 'Admin Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getAdminActions(data, mutate, handleAction)} />
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

// Admin columns function that accepts mutate callback
export const adminColumns = (mutate?: () => void): TableColumn<TAdmin>[] => {
  return [
    {
      key: 'name',
      header: 'Name',
      render: (_, admin) => (
        <div className='flex flex-col'>
          <span className='font-medium'>
            {admin.firstName} {admin.lastName}
          </span>
          <span className='text-muted-foreground text-sm'>{admin.email}</span>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (role: AdminRole, admin: TAdmin) => {
        const label =
          role === AdminRole.ADMIN
            ? 'Admin'
            : admin?.customRole?.name
              ? admin.customRole.name
              : 'Moderator'
        return <Badge variant={getRoleBadgeVariant(role)}>{label}</Badge>
      }
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

// Export the default columns for backward compatibility
export const defaultAdminColumns = adminColumns()
