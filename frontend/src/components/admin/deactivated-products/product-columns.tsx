'use client'

import CustomImage from '@/components/common/CustomImage'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
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

// Status Select Component with confirmation modal
const StatusSelect = ({ record, mutate }: { record: Product; mutate?: () => void }) => {
  const [currentAction, setCurrentAction] = useState<{
    type: 'activate' | 'deactivate'
  } | null>(null)

  const statusModal = useConfirmationModal({
    title: currentAction?.type === 'activate' ? 'Activate Product' : 'Deactivate Product',
    description:
      currentAction?.type === 'activate'
        ? 'Are you sure you want to activate this product? It will be visible to customers.'
        : 'Are you sure you want to deactivate this product? It will be hidden from customers.',
    confirmText: currentAction?.type === 'activate' ? 'Activate' : 'Deactivate',
    cancelText: 'Cancel',
    variant: 'default'
  })

  const handleStatusChange = async (newStatus: string) => {
    const isActivating = newStatus === 'Active'
    const currentlyActive = record?.isActive

    // If no change, do nothing
    if ((isActivating && currentlyActive) || (!isActivating && !currentlyActive)) {
      return
    }

    setCurrentAction({ type: isActivating ? 'activate' : 'deactivate' })

    statusModal.openModal(async () => {
      try {
        await requests.put(`/admin/products/${record?.id}`, {
          isActive: isActivating
        })
        toast.success(`Product ${isActivating ? 'activated' : 'deactivated'} successfully`)
        mutate?.()
      } catch (error) {
        showError(error)
        throw error // Re-throw to prevent modal from closing
      }
    })
  }

  return (
    <>
      <CustomSelect
        value={record?.isActive ? 'Active' : 'de-active'}
        staticOptions={[
          { label: 'De Active', title: 'De Active', value: 'de-active', disabled: true },
          { label: 'Active', title: 'Active', value: 'Active' }
        ]}
        className='max-w-44'
        onChange={handleStatusChange}
      />
      <statusModal.ModalComponent />
    </>
  )
}

// Product columns function that accepts mutate callback and selection handlers
export const deactivatedProductColumns = (
  mutate?: () => void,
  selectionHandlers?: {
    selectedIds: number[]
    onSelectAll: (checked: boolean) => void
    onSelectOne: (id: number, checked: boolean) => void
  }
): TableColumn<Product>[] => {
  return [
    // Selection column
    ...(selectionHandlers
      ? [
          {
            key: 'select',
            header: (
              <Checkbox
                checked={
                  selectionHandlers.selectedIds.length > 0 &&
                  selectionHandlers.selectedIds.length ===
                    (typeof window !== 'undefined' ? document.querySelectorAll('tbody tr').length : 0)
                }
                onCheckedChange={(checked) => selectionHandlers?.onSelectAll(checked as boolean)}
              />
            ),
            render: (_value: any, record: { id: number }) => (
              <Checkbox
                checked={selectionHandlers?.selectedIds.includes(record.id) || false}
                onCheckedChange={(checked) =>
                  selectionHandlers?.onSelectOne(record.id, checked as boolean)
                }
              />
            ),
            width: 'w-12'
          }
        ]
      : []),
    {
      key: 'thumbnail',
      header: 'Thumbnail',
      render: (_, record) => (
        <CustomImage
          src={record.thumbnail}
          alt={record.name}
          width={46}
          height={46}
          className='rounded-md size-11.5 object-cover'
        />
      ),
      width: 'w-46'
    },
    {
      key: 'name',
      header: 'Name',
      render: (_, record) => (
        <div className='flex flex-col'>
          <div className='font-medium'>{record.name}</div>
          <div className='flex gap-2 text-xs'>
            <span className='text-muted-foreground'>ID: {record.id}</span>
            <span className='text-white'>SKU: {record.sku}</span>
          </div>
        </div>
      ),
      width: 'w-40'
    },
    {
      key: 'type',
      header: 'Type',
      render: (value) => value ?? '-',
      width: 'w-56'
    },
    {
      key: 'stockCount',
      header: 'Stock',
      render: (value) => value ?? '-',
      width: 'w-56'
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => <span>${value}</span>,
      width: 'w-56'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => <StatusSelect record={record} mutate={mutate} />,
      width: 'w-28'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultProductColumns = deactivatedProductColumns()
