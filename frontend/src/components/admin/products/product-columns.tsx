'use client'

import { GripVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import ProductForm from '../form/Product'
import ProductQuickViewDialog from './ProductQuickViewDialog'
import { getProductActions, QuickViewState } from './productActions'

// Custom table column type (dragProps passed when used in SortableCategoryTable)
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number, dragProps?: { attributes: any; listeners: any }) => React.ReactNode
  width?: string
  className?: string
}

const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

const DragHandle = ({ listeners, attributes }: { listeners: any; attributes: any }) => (
  <div
    {...attributes}
    {...listeners}
    className='cursor-grab active:cursor-grabbing touch-manipulation flex items-center justify-center min-h-[44px] min-w-[44px] -m-2 p-2'
    style={{ touchAction: 'none' }}
    role='button'
    aria-label='Drag to reorder'
  >
    <GripVertical className='h-5 w-5 text-muted-foreground' />
  </div>
)

const ActionsCell = ({ data, mutate }: { data: Product; mutate?: () => void }) => {
  const { setPage } = useFilter(10)

  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  const [quickViewState, setQuickViewState] = useState<QuickViewState>({
    open: false,
    product: null
  })

  const actionModal = useConfirmationModal({
    title: 'Delete Product',
    description:
      'Deleting removes the product from active use. Past orders and customer downloads stay available.',
    confirmText: 'Delete',
    variant: 'destructive',
    icon: Trash2
  })

  // Unified action handler
  const handleAction = async (action: string, product: any) => {
    switch (action) {
      case 'edit':
        setCurrentDialog({ type: 'edit', isOpen: true })
        break
      case 'delete':
        actionModal.openModal(async () => {
          try {
            const response = await requests.delete(`/admin/products/${product?.id}`)
            toast.success(
              response?.data?.message || response?.message || 'Product removed successfully'
            )
            mutate?.()
            setPage(1)
          } catch (error) {
            showError(error)
            throw error
          }
        })
        break
      case 'quick-view':
        setQuickViewState({
          open: true,
          product: product
        })
        break
      case 'clone-product':
        try {
          await requests.post(`/admin/products/${product?.id}/clone`, {})
          toast.success('Product cloned successfully')
          mutate?.()
          setPage(1)
        } catch (error) {
          showError(error)
        }
        break
      case 'copy-private-link':
        if (product?.isPrivate && product?.privateUrl) {
          const privateLink =
            typeof window !== 'undefined'
              ? `${window.location.origin}/shop/${product.privateUrl}`
              : `/shop/${product.privateUrl}`
          navigator.clipboard.writeText(privateLink)
          toast.success('Private link copied to clipboard')
        } else {
          toast.error('No private link available')
        }
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
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
      data,
      onClose: handleDialogClose,
      onSuccess: handleDialogSuccess
    }

    switch (type) {
      case 'edit':
        return <ProductForm categories={[]} {...commonProps} />
      default:
        return <ProductForm categories={[]} {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Product'
      default:
        return 'Product Action'
    }
  }

  return (
    <>
      <ActionsDropdown
        data={data}
        actions={getProductActions(
          data,
          mutate,
          (action, product) => handleAction(action, product),
          setQuickViewState
        )}
      />
      <actionModal.ModalComponent />

      {/* Quick View Dialog */}
      <ProductQuickViewDialog
        product={quickViewState.product || data}
        open={quickViewState.open}
        onOpenChange={(open) => setQuickViewState({ ...quickViewState, open })}
      />

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

// Product columns function that accepts mutate callback and selection handlers
export const productColumns = (
  mutate?: () => void,
  selectionHandlers?: {
    selectedIds: number[]
    onSelectAll: (checked: boolean) => void
    onSelectOne: (id: number, checked: boolean) => void
  }
): TableColumn<Product>[] => {
  return [
    {
      key: 'drag',
      header: '',
      render: (_: any, __: Product, index: number, dragProps?: { attributes: any; listeners: any }) =>
        dragProps ? <DragHandle listeners={dragProps.listeners} attributes={dragProps.attributes} /> : null,
      width: 'w-12'
    },
    {
      key: 'select',
      header: (
        <Checkbox
          checked={
            selectionHandlers
              ? selectionHandlers.selectedIds.length > 0 &&
                selectionHandlers.selectedIds.length ===
                  (document.querySelectorAll('[data-product-id]').length || 0)
              : false
          }
          onCheckedChange={(checked) => selectionHandlers?.onSelectAll(checked as boolean)}
        />
      ),
      render: (_, record) => (
        <Checkbox
          data-product-id={record.id}
          checked={selectionHandlers?.selectedIds.includes(record.id) || false}
          onCheckedChange={(checked) =>
            selectionHandlers?.onSelectOne(record.id, checked as boolean)
          }
        />
      ),
      width: 'w-10'
    },
    {
      key: 'thumbnail',
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
      key: 'stockCount',
      header: 'Stock',
      render: (value, record) =>
        PREMIUM_PRODUCT_TYPES.has(String(record.type)) ? '-' : value ?? '-',
      width: 'w-56'
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => <span>${value}</span>,
      width: 'w-56'
    },
    {
      key: 'salesCount',
      header: 'Sale Orders',
      width: 'w-32'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`
          px-2 py-1 text-xs font-normal border-0 text-white
          ${record.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}
        `}
        >
          {record.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),

      width: 'w-28'
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (_, record) => (
        <span>${((Number(record?.price) || 0) * (Number(record?.soldCount) || 0)).toFixed(2)}</span>
      ),
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
