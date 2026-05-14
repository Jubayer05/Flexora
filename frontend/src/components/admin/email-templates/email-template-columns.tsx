'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { EmailTemplate } from '@/lib/validations/schemas/emailTemplate'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import EmailTemplateForm from '../form/EmailTemplate'
import { getTemplateActions } from './emailTemplateActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: EmailTemplate; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'delete'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Email Template',
      description:
        'Are you sure you want to delete this email template? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: EmailTemplate) => {
        try {
          await requests.delete(`/admin/email-templates/${data?.id}`)
          toast.success('Email template deleted successfully')
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
  const handleAction = (actionType: 'edit' | 'delete', data: EmailTemplate) => {
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
        return <EmailTemplateForm initialData={data} {...commonProps} />
      default:
        return <EmailTemplateForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Email Template'
      default:
        return 'Email Template Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getTemplateActions(data, mutate, handleAction)} />
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

// Email template columns function that accepts mutate callback
export const emailTemplateColumns = (mutate?: () => void): TableColumn<EmailTemplate>[] => {
  return [
    {
      key: 'type',
      header: 'Template Type',
      render: (_, template) => (
        <div className='flex flex-col'>
          <span className='font-medium'>{template.type}</span>
          <span className='text-muted-foreground text-sm'>{template.subject}</span>
        </div>
      )
    },
    {
      key: 'body',
      header: 'Content Preview',
      render: (_, template) => (
        <div className='max-w-xs'>
          <p className='text-sm truncate'>{template.body}</p>
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (isActive: boolean = true) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    // {
    //   key: 'createdAt',
    //   header: 'Created',
    //   render: (date: string) => (
    //     <span className='text-muted-foreground text-sm'>
    //       {date ? new Date(date).toLocaleDateString() : 'N/A'}
    //     </span>
    //   )
    // },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
