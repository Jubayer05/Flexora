'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowDown, ArrowUp, Eye, GripVertical, Pencil, Search, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CustomInput from '@/components/common/CustomInput'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'
import requests from '@/services/network/http'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'

// Custom table column type (dragProps passed when used in SortableCategoryTable)
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number, dragProps?: { attributes: any; listeners: any }) => React.ReactNode
  width?: string
  className?: string
}

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

const ActionsCell = ({ data, mutate }: { data: ProductGroup; mutate?: () => void }) => {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState(data.name)
  const [groupSlug, setGroupSlug] = useState(data.slug || '')
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch products with pagination (max 100 per request)
  const { data: productsData, loading: loadingProducts } = useAsync<{
    data: { products: Array<{ id: number; name: string; sku: string; productGroupId?: number }> }
  }>(() => (editDialogOpen ? '/admin/products?limit=100' : null))

  // Fetch current group products when dialog opens
  const { data: groupData, loading: loadingGroup } = useAsync<{
    data: { products: Array<{ id: number }> }
  }>(() => (editDialogOpen ? `/admin/product-groups/${data.id}?includeProducts=true` : null))

  // Set selected products when group data is loaded
  useEffect(() => {
    if (groupData?.data?.products) {
      const productIds = groupData.data.products.map((p) => p.id)
      setSelectedProductIds(productIds)
    }
  }, [groupData])

  // Filter products to exclude those already in other groups
  const availableProducts = useMemo(() => {
    if (!productsData?.data?.products) return []
    return productsData.data.products.filter(
      (product) =>
        !product.productGroupId ||
        product.productGroupId === data.id ||
        selectedProductIds.includes(product.id)
    )
  }, [productsData?.data?.products, selectedProductIds, data.id])

  // Reset state when dialog opens
  useEffect(() => {
    if (editDialogOpen) {
      setGroupName(data.name)
      setGroupSlug(data.slug || '')
    }
  }, [editDialogOpen, data.name, data.slug])

  // Define action configurations
  const actionConfigs = {
    delete: {
      title: 'Delete Product Group',
      description: `Are you sure you want to delete "${data.name}"? Products inside this group will stay available and will simply be removed from the group.`,
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (group: ProductGroup) => {
        try {
          const response = await requests.delete(`/admin/product-groups/${group.id}`)
          toast.success(response?.data?.message || 'Product group deleted successfully')
          await globalMutate(
            (key) =>
              typeof key === 'string' &&
              (key.startsWith('/admin/product-groups') ||
                key.startsWith('/product-groups') ||
                key.startsWith('/categories')),
            undefined,
            { revalidate: true }
          )
          mutate?.()
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

  // Unified action handler
  const handleAction = async (action: string, group: ProductGroup) => {
    switch (action) {
      case 'edit':
        setGroupName(group.name)
        setEditDialogOpen(true)
        break
      case 'view':
        router.push(`/admin/products/product-groups/${group.id}`)
        break
      case 'seo':
        // Navigate to SEO page with group ID in query params
        router.push(`/admin/products/product-groups/group/seo?groupId=${group.id}`)
        break
      case 'delete':
        if (actionConfigs.delete) {
          setCurrentAction({ type: 'delete' })
          actionModal.openModal(async () => {
            await actionConfigs.delete.onClick(group)
          })
        }
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
    }
  }

  const handleUpdate = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!groupSlug.trim()) {
      toast.error('Slug is required')
      return
    }

    setIsUpdating(true)
    try {
      await requests.put(`/admin/product-groups/${data.id}`, {
        name: groupName,
        slug: groupSlug,
        productIds: selectedProductIds
      })
      toast.success('Product group updated successfully')
      await globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/admin/product-groups') ||
            key.startsWith('/product-groups') ||
            key.startsWith('/categories')),
        undefined,
        { revalidate: true }
      )
      setEditDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    )
  }

  // Define actions for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'View',
      icon: Eye,
      onClick: () => handleAction('view', data)
    },
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      onClick: () => handleAction('edit', data)
    },
    {
      type: 'action' as const,
      label: 'SEO Settings',
      icon: Search,
      onClick: () => handleAction('seo', data)
    },
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      onClick: () => handleAction('delete', data),
      className: 'text-red-600 focus:text-red-600'
    }
  ]

  return (
    <>
      <ActionsDropdown data={data} actions={actions} />
      <actionModal.ModalComponent />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[90vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>Edit Product Group</DialogTitle>
            <DialogDescription>
              Update the product group name and select products.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 flex-1 overflow-y-auto custom-scrollbar'>
            <div className='space-y-6'>
              {/* Group Name */}
              <div className='space-y-2'>
                <Label htmlFor='groupName'>Group Name</Label>
                <Input
                  id='groupName'
                  value={groupName}
                  onChange={(e) => {
                    const nameChangeHandler = createNameChangeHandler(
                      (value) => setGroupName(value),
                      (slug) => {
                        if (!groupSlug.trim() || groupSlug === data.slug) {
                          setGroupSlug(slug)
                        }
                      },
                      { skipIfEditing: false, style: 'compact' }
                    )
                    nameChangeHandler(e.target.value)
                  }}
                  placeholder='Enter group name'
                  disabled={isUpdating}
                />
              </div>

              {/* Slug Field */}
              <div className='space-y-2'>
                <Label htmlFor='groupSlug'>Slug</Label>
                <CustomInput
                  name='groupSlug'
                  value={groupSlug}
                  onChange={(e) => {
                    const slugChangeHandler = createSlugChangeHandler((value) => setGroupSlug(value))
                    slugChangeHandler(e.target.value, { style: 'compact' })
                  }}
                  placeholder='GroupSlug'
                  helperText='Auto-generated from the name and can be changed manually.'
                  disabled={isUpdating}
                />
              </div>

              {/* Product Selection */}
              <div className='space-y-3'>
                <Label>Select Products</Label>
                {loadingProducts || loadingGroup ? (
                  <div className='text-sm text-muted-foreground py-8 text-center'>
                    Loading products...
                  </div>
                ) : availableProducts && availableProducts.length > 0 ? (
                  <div className='border border-white/20 rounded-md max-h-[300px] overflow-y-auto custom-scrollbar'>
                    <div className='divide-y divide-white/10'>
                      {availableProducts.map((product) => (
                        <div
                          key={product.id}
                          className='flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors'
                          onClick={() => toggleProductSelection(product.id)}
                        >
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className='flex-1'>
                            <div className='font-medium text-sm'>{product.name}</div>
                            <div className='text-xs text-muted-foreground'>SKU: {product.sku}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='text-sm text-muted-foreground py-8 text-center border border-white/20 rounded-md'>
                    No products available. All products are already assigned to other groups.
                  </div>
                )}
                <p className='text-xs text-muted-foreground'>
                  {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''}{' '}
                  selected. Products already assigned to other groups are hidden.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!groupName.trim() || !groupSlug.trim() || isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Product group columns function
export const productGroupColumns = (
  mutate?: () => void,
  sortingHandlers?: {
    groups: ProductGroup[]
    onMove: (id: number, direction: 'up' | 'down') => void | Promise<void>
  }
): TableColumn<ProductGroup>[] => {
  return [
    {
      key: 'drag',
      header: '',
      render: (_: any, __: ProductGroup, index: number, dragProps?: { attributes: any; listeners: any }) =>
        dragProps ? <DragHandle listeners={dragProps.listeners} attributes={dragProps.attributes} /> : null,
      width: 'w-12'
    },
    ...(sortingHandlers
      ? [
          {
            key: 'sort',
            header: 'Sort',
            render: (_: any, record: ProductGroup) => {
              const currentIndex = sortingHandlers.groups.findIndex((group) => group.id === record.id)
              const isFirst = currentIndex <= 0
              const isLast = currentIndex === sortingHandlers.groups.length - 1

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
      key: 'select',
      header: <Checkbox className='' />,
      render: () => <Checkbox className='' />,
      width: 'w-10'
    },
    {
      key: 'id',
      header: 'ID',
      render: (_, record) => <span className='font-medium'>#{record.id}</span>,
      width: 'w-20'
    },
    {
      key: 'name',
      header: 'Group',
      render: (_, record) => <div className='font-medium'>{record.name}</div>,
      width: 'w-64'
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (value) => value ?? '-',
      width: 'w-56'
    },
    {
      key: 'products',
      header: 'Products Count',
      render: (_, record) => (
        <Badge className='font-normal'>{record._count?.products || 0} products</Badge>
      ),
      width: 'w-32'
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (value) => {
        const date = new Date(value)
        return (
          <span className='text-sm'>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        )
      },
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

// Export the default columns for backward compatibility
export const defaultProductGroupColumns = productGroupColumns()
