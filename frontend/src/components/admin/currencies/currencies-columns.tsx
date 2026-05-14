'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { CurrencyType } from '@/lib/validations/schemas/currency'
import { toast } from 'sonner'

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
      title: 'Delete Currency',
      description: 'Are you sure you want to delete this currency? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (selected: any) => {
        try {
          await actions?.deleteCurrency?.(selected)
          toast.success('Currency deleted successfully')
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
        actions?.editCurrency?.(data)
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

// Currency columns function that accepts mutate callback
export const currencyColumns = (actions?: any): TableColumn<CurrencyType>[] => {
  return [
    {
      key: 'name',
      header: 'Name',
      width: 'w-64'
    },
    {
      key: 'code',
      header: 'Code',
      width: 'w-28'
    },
    {
      key: 'symbol',
      header: 'Symbol',
      width: 'w-28'
    },
    {
      key: 'exchangeRate',
      header: 'Exchange Rate',
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