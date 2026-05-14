'use client'

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'
import CategoryForm from '../form/Category'
import { getCategoryActions } from './categoryActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number, dragProps?: { attributes: any; listeners: any }) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: Category; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'delete'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Category',
      description:
        'Are you sure you want to move this category to trash? Child categories, groups, and products inside it will also be moved to trash. No fallback category will be created.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Category) => {
        try {
          const response = await requests.delete(`/admin/categories/${data?.id}`)
          toast.success(response?.data?.message || 'Category deleted successfully')
          await globalMutate(
            (key) =>
              typeof key === 'string' &&
              (key.startsWith('/admin/categories') ||
                key.startsWith('/categories') ||
                key.startsWith('/admin/product-groups') ||
                key.startsWith('/product-groups') ||
                key.startsWith('/products')),
            undefined,
            { revalidate: true }
          )
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
  const handleAction = (actionType: 'edit' | 'delete', data: Category) => {
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
        return <CategoryForm allowParent={!!data?.parentId} initialValues={data} {...commonProps} />
      default:
        return <CategoryForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Category'
      default:
        return 'Category Action'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getCategoryActions(data, mutate, handleAction)} />
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

// Drag handle component - receives listeners from parent sortable row (touch-friendly for mobile)
const DragHandle = ({ listeners, attributes }: { listeners: any; attributes: any }) => {
  return (
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
}

// Category columns function that accepts mutate callback
export const categoryColumns = (
  mutate?: () => void,
  allowParent?: boolean,
  selectionHandlers?: {
    selectedIds: number[]
    onSelectAll: (checked: boolean) => void
    onSelectOne: (id: number, checked: boolean) => void
  },
  sortingHandlers?: {
    categories: Category[]
    onMove: (id: number, direction: 'up' | 'down') => void | Promise<void>
  },
  navigateToGroupsPath?: (categoryId: number) => void
): TableColumn<Category>[] => {
  return [
    // Checkbox column for bulk selection
    ...(selectionHandlers
      ? [
          {
            key: 'select',
            header: (
              <Checkbox
                checked={
                  selectionHandlers.selectedIds.length > 0 &&
                  selectionHandlers.selectedIds.length ===
                    (typeof window !== 'undefined'
                      ? document.querySelectorAll('[data-category-id]').length || 0
                      : 0)
                }
                onCheckedChange={(checked) =>
                  selectionHandlers.onSelectAll(checked as boolean)
                }
              />
            ),
            render: (_: any, record: Category) => (
              <Checkbox
                data-category-id={record.id}
                checked={selectionHandlers.selectedIds.includes(record.id) || false}
                onCheckedChange={(checked) =>
                  selectionHandlers.onSelectOne(record.id, checked as boolean)
                }
              />
            ),
            width: 'w-10'
          }
        ]
      : []),
    // Drag handle column
    {
      key: 'drag',
      header: '',
      render: (_: any, record: Category, index: number, dragProps?: { attributes: any; listeners: any }) => 
        dragProps ? <DragHandle listeners={dragProps.listeners} attributes={dragProps.attributes} /> : null,
      width: 'w-12'
    },
    ...(sortingHandlers
      ? [
          {
            key: 'sort',
            header: 'Sort',
            render: (_: any, record: Category) => {
              const currentIndex = sortingHandlers.categories.findIndex((category) => category.id === record.id)
              const isFirst = currentIndex <= 0
              const isLast = currentIndex === sortingHandlers.categories.length - 1

              return (
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    disabled={isFirst}
                    onClick={() => sortingHandlers.onMove(record.id, 'up')}
                  >
                    <ArrowUp className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    disabled={isLast}
                    onClick={() => sortingHandlers.onMove(record.id, 'down')}
                  >
                    <ArrowDown className='h-4 w-4' />
                  </Button>
                </div>
              )
            },
            width: 'w-24'
          }
        ]
      : []),
    {
      key: 'name',
      header: 'Icon',
      render: (_, record) =>
        navigateToGroupsPath ? (
          <div
            className='cursor-pointer'
            onClick={() => navigateToGroupsPath(record.id)}
          >
            <CustomImage
              src={record.icon}
              alt={record.name}
              width={46}
              height={46}
              className='rounded-md size-[46px] object-cover'
            />
          </div>
        ) : (
          <CustomImage
            src={record.icon}
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
      render: (_, record) =>
        navigateToGroupsPath ? (
          <span
            className='cursor-pointer hover:underline text-foreground font-medium'
            onClick={() => navigateToGroupsPath(record.id)}
          >
            {record.name}
          </span>
        ) : (
          <span className='font-medium'>{record.name}</span>
        ),
      width: 'w-40'
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (value) => value ?? '-',
      width: 'w-56'
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-'),
      width: 'w-64'
    },
    ...(allowParent
      ? [
          {
            key: 'parentId',
            header: 'Parent Category',
            render: (_: any, record: Category) => record?.parent?.name ?? '-',
            width: 'w-46'
          }
        ]
      : []),
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`
          px-2 py-1 text-xs font-normal border-0  text-white
          ${record.isActive ? 'bg-[#10B981] ' : 'bg-[#EF4444] '}
        `}
        >
          {record.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),

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
export const defaultCategoryColumns = categoryColumns()
