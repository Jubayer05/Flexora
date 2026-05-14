'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import StatusBadge from '@/components/common/StatusBadge'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { toast } from 'sonner'
import { LanguageType } from '../form/settings/Language'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

//  action types
export type ActionType = 'edit' | 'delete'

const ActionsCell = ({ data, actions }: { data: any; actions?: any }) => {
  // Define action configurations for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Language',
      description: 'Are you sure you want to delete this language? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (selected: any) => {
        try {
          await actions?.deleteLanguage?.(selected)
          toast.success('Language deleted successfully')
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

  // Action configurations for dropdown
  const dropdownActions = [
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      onClick: () => {
        actions?.editLanguage?.(data)
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
      <ActionsDropdown data={data} actions={dropdownActions} />
      <actionModal.ModalComponent />
    </>
  )
}

// Language columns function that accepts mutate callback
export const languageColumns = (actions?: any): TableColumn<LanguageType>[] => {
  return [
    {
      key: 'name',
      header: 'Icon',
      render: (_, record) => (
        <CustomImage
          src={record.icon}
          alt={record.name}
          width={46}
          height={46}
          className='size-5 object-cover'
        />
      ),
      width: 'w-46'
    },
    {
      key: 'name',
      header: 'Name',
      width: 'w-64'
    },
    {
      key: 'shortName',
      header: 'Short Name',
      width: 'w-28'
    },
    {
      key: 'position',
      header: 'Position',
      width: 'w-28'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => <StatusBadge status={record?.isActive ? 'active' : 'inactive'} />,
      width: 'w-28'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} actions={actions} />,
      width: 'w-20'
    }
  ]
}
