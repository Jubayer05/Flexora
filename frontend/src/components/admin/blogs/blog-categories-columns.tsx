'use client'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Pencil, Trash2 } from 'lucide-react'
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

// Blog action types
export type BlogActionType = 'edit' | 'delete'

const ActionsCell = ({ data, mutate }: { data: any; mutate?: () => void }) => {
  // Define action configurations for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Category',
      description: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: any) => {
        try {
          await requests.delete(`/admin/blogs/categories/${data?.id}`)
          toast.success('Category deleted successfully')
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

  // Action configurations for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      onClick: () => {
        if (mutate) {
          ; (mutate as any).editCategory?.(data)
        }
      }
    },
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: async () => {
        const config = actionConfigs.delete
        setCurrentAction({ type: 'delete' })
        actionModal.openModal(async () => {
          await config.onClick(data)
          setCurrentAction(null)
        })
      }
    }
  ]

  return (
    <>
      <ActionsDropdown data={data} actions={actions} />
      <actionModal.ModalComponent />
    </>
  )
}

// Blog columns function that accepts mutate callback
export const blogCategoryColumns = (mutate?: () => void): TableColumn<any>[] => {
  return [
    {
      key: 'name',
      header: 'Name',
      width: 'w-64'
    },
    {
      key: 'slug',
      header: 'Slug',
      width: 'w-28'
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value) => <div className='text-sm'>{new Date(value).toLocaleDateString()}</div>,
      width: 'w-28'
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
export const defaultBlogColumns = blogCategoryColumns()
