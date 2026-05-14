'use client'

import { Suspense, useMemo, useState } from 'react'

import { categoryColumns } from '@/components/admin/categories/category-columns'
import { SortableCategoryTable } from '@/components/admin/categories/SortableCategoryTable'
import CategoryForm from '@/components/admin/form/Category'
import { CustomTable } from '@/components/admin/common/data-table'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Trash2, Power, PowerOff } from 'lucide-react'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

function TrashedCatalog() {
  const { data, loading, mutate } = useAsync<{
    data: {
      categories: Array<{ id: number; name: string; slug: string; deletedAt: string }>
      groups: Array<{ id: number; name: string; slug: string | null; categoryId: number | null; deletedAt: string }>
      products: Array<{ id: number; sku: string; name: string; categoryId: number; productGroupId: number | null; deletedAt: string }>
    }
  }>(() => '/admin/categories/trash?page=1&limit=50')

  const categories = data?.data?.categories ?? []
  const groups = data?.data?.groups ?? []
  const products = data?.data?.products ?? []

  const categoryRestoreModal = useConfirmationModal({
    title: 'Restore Category',
    description: 'Restore this category from trash?',
    confirmText: 'Restore',
    variant: 'default',
    icon: Power
  })
  const categoryPermanentModal = useConfirmationModal({
    title: 'Delete Category Permanently',
    description:
      'This will permanently delete the category and also delete its related groups and products. This cannot be undone.',
    confirmText: 'Delete permanently',
    variant: 'destructive',
    icon: Trash2
  })

  const groupRestoreModal = useConfirmationModal({
    title: 'Restore Group',
    description: 'Restore this group from trash?',
    confirmText: 'Restore',
    variant: 'default',
    icon: Power
  })
  const groupPermanentModal = useConfirmationModal({
    title: 'Delete Group Permanently',
    description:
      'This will permanently delete the group and also delete its related products. This cannot be undone.',
    confirmText: 'Delete permanently',
    variant: 'destructive',
    icon: Trash2
  })

  const productRestoreModal = useConfirmationModal({
    title: 'Restore Product',
    description: 'Restore this product from trash?',
    confirmText: 'Restore',
    variant: 'default',
    icon: Power
  })
  const productPermanentModal = useConfirmationModal({
    title: 'Delete Product Permanently',
    description:
      'This will permanently delete the product. If it has orders, it will be removed from the catalog but order history will be preserved.',
    confirmText: 'Delete permanently',
    variant: 'destructive',
    icon: Trash2
  })

  const columnsCategories = [
    { key: 'name', header: 'Category' },
    { key: 'slug', header: 'Slug' },
    { key: 'deletedAt', header: 'Deleted at', render: (v: any) => (v ? new Date(v).toLocaleString() : '-') },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: any) => (
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() =>
              categoryRestoreModal.openModal(async () => {
                await requests.post(`/admin/categories/${row.id}/restore`, {})
                toast.success('Category restored')
                mutate()
              })
            }
          >
            Restore
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={() =>
              categoryPermanentModal.openModal(async () => {
                await requests.delete(`/admin/categories/${row.id}/permanent`)
                toast.success('Category deleted permanently')
                mutate()
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      )
    }
  ]

  const columnsGroups = [
    { key: 'name', header: 'Group' },
    { key: 'slug', header: 'Slug', render: (v: any) => v ?? '-' },
    { key: 'categoryId', header: 'Category ID', render: (v: any) => (v ? String(v) : '-') },
    { key: 'deletedAt', header: 'Deleted at', render: (v: any) => (v ? new Date(v).toLocaleString() : '-') },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: any) => (
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() =>
              groupRestoreModal.openModal(async () => {
                await requests.post(`/admin/product-groups/${row.id}/restore`, {})
                toast.success('Group restored')
                mutate()
              })
            }
          >
            Restore
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={() =>
              groupPermanentModal.openModal(async () => {
                await requests.delete(`/admin/product-groups/${row.id}/permanent`)
                toast.success('Group deleted permanently')
                mutate()
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      )
    }
  ]

  const columnsProducts = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Product' },
    { key: 'categoryId', header: 'Category ID' },
    { key: 'productGroupId', header: 'Group ID', render: (v: any) => (v ? String(v) : '-') },
    { key: 'deletedAt', header: 'Deleted at', render: (v: any) => (v ? new Date(v).toLocaleString() : '-') },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: any) => (
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() =>
              productRestoreModal.openModal(async () => {
                await requests.post(`/admin/products/${row.id}/restore`, {})
                toast.success('Product restored')
                mutate()
              })
            }
          >
            Restore
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={() =>
              productPermanentModal.openModal(async () => {
                await requests.delete(`/admin/products/${row.id}/permanent`)
                toast.success('Product deleted permanently')
                mutate()
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className='mt-8 space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Trash</h2>
          <p className='text-sm text-muted-foreground'>Soft-deleted categories, groups, and products.</p>
        </div>
      </div>

      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <h3 className='text-base font-medium'>Deleted categories</h3>
            <CustomTable columns={columnsCategories} data={categories as any} emptyMessage='No deleted categories.' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-base font-medium'>Deleted groups</h3>
            <CustomTable columns={columnsGroups} data={groups as any} emptyMessage='No deleted groups.' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-base font-medium'>Deleted products</h3>
            <CustomTable columns={columnsProducts} data={products as any} emptyMessage='No deleted products.' />
          </div>
        </div>
      </div>

      <categoryRestoreModal.ModalComponent />
      <categoryPermanentModal.ModalComponent />
      <groupRestoreModal.ModalComponent />
      <groupPermanentModal.ModalComponent />
      <productRestoreModal.ModalComponent />
      <productPermanentModal.ModalComponent />
    </div>
  )
}

function CategoryList() {
  const router = useRouter()
  const { page, limit } = useFilter(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isReordering, setIsReordering] = useState(false)

  const { data, loading, mutate } = useAsync<{
    data: {
      categories: Category[]
      pagination: any
    }
  }>(
    () =>
      '/admin/categories?isRoot=true' +
      (page ? `&page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      '&sortBy=sortOrder&sortOrder=asc'
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require a minimum drag distance so taps/clicks don't accidentally trigger drag
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Require a 250ms press before drag starts on touch (prevents interfering with scrolling)
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const categories = useMemo(() => data?.data?.categories ?? [], [data?.data?.categories])

  const moveCategory = async (categoryId: number, direction: 'up' | 'down') => {
    if (!categories.length) return

    const currentIndex = categories.findIndex((category) => category.id === categoryId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const prevItem = targetIndex > 0 ? categories[targetIndex - 1] : null
    const nextItem = categories[targetIndex]

    const prevSortOrder =
      prevItem && prevItem.sortOrder !== 0 && prevItem.sortOrder !== null
        ? prevItem.sortOrder
        : null
    const nextSortOrder =
      nextItem && nextItem.sortOrder !== 0 && nextItem.sortOrder !== null
        ? nextItem.sortOrder
        : null

    setIsReordering(true)
    try {
      await requests.patch(`/admin/categories/${categoryId}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Category order updated successfully')
      mutate()
    } catch (error) {
      showError(error)
    } finally {
      setIsReordering(false)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleDialogSuccess = () => {
    mutate()
    setIsDialogOpen(false)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(categories.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !categories.length) {
      return
    }

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update
    const newCategories = arrayMove(categories, oldIndex, newIndex)
    setIsReordering(true)

    // Get adjacent items for gap calculation
    const prevItem = newCategories[newIndex - 1]
    const nextItem = newCategories[newIndex + 1]

    const prevSortOrder = prevItem
      ? prevItem.sortOrder === 0 || prevItem.sortOrder === null
        ? null
        : prevItem.sortOrder
      : null
    const nextSortOrder = nextItem
      ? nextItem.sortOrder === 0 || nextItem.sortOrder === null
        ? null
        : nextItem.sortOrder
      : null

    try {
      await requests.patch(`/admin/categories/${active.id}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Category order updated successfully')
      mutate()
    } catch (error: any) {
      showError(error)
    } finally {
      setIsReordering(false)
    }
  }

  // Bulk delete modal
  const bulkDeleteModal = useConfirmationModal({
    title: 'Delete Categories',
    description: `Are you sure you want to delete ${selectedIds.length} selected categor${selectedIds.length !== 1 ? 'ies' : 'y'}? This action cannot be undone.`,
    confirmText: 'Delete',
    variant: 'destructive',
    icon: Trash2
  })

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one category')
      return
    }

    bulkDeleteModal.openModal(async () => {
      try {
        await requests.post('/admin/categories/bulk-delete', {
          ids: selectedIds
        })
        toast.success(`Successfully deleted ${selectedIds.length} categor${selectedIds.length !== 1 ? 'ies' : 'y'}`)
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  // Bulk activate modal
  const bulkActivateModal = useConfirmationModal({
    title: 'Activate Categories',
    description: `Are you sure you want to activate ${selectedIds.length} selected categor${selectedIds.length !== 1 ? 'ies' : 'y'}?`,
    confirmText: 'Activate',
    variant: 'default',
    icon: Power
  })

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one category')
      return
    }

    bulkActivateModal.openModal(async () => {
      try {
        await requests.post('/admin/categories/bulk-update', {
          ids: selectedIds,
          updates: { isActive: true }
        })
        toast.success(`Successfully activated ${selectedIds.length} categor${selectedIds.length !== 1 ? 'ies' : 'y'}`)
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  // Bulk deactivate modal
  const bulkDeactivateModal = useConfirmationModal({
    title: 'Deactivate Categories',
    description: `Are you sure you want to deactivate ${selectedIds.length} selected categor${selectedIds.length !== 1 ? 'ies' : 'y'}?`,
    confirmText: 'Deactivate',
    variant: 'default',
    icon: PowerOff
  })

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one category')
      return
    }

    bulkDeactivateModal.openModal(async () => {
      try {
        await requests.post('/admin/categories/bulk-update', {
          ids: selectedIds,
          updates: { isActive: false }
        })
        toast.success(`Successfully deactivated ${selectedIds.length} categor${selectedIds.length !== 1 ? 'ies' : 'y'}`)
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  const selectionHandlers = {
    selectedIds,
    onSelectAll: handleSelectAll,
    onSelectOne: handleSelectOne
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Categories'
        subTitle='Manage product categories and adjust their order'
        extra={
          <div className='flex gap-2'>
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleBulkActivate}
                  className='gap-2'
                >
                  <Power className='h-4 w-4' />
                  Activate ({selectedIds.length})
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleBulkDeactivate}
                  className='gap-2'
                >
                  <PowerOff className='h-4 w-4' />
                  Deactivate ({selectedIds.length})
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleBulkDelete}
                  className='gap-2'
                >
                  <Trash2 className='h-4 w-4' />
                  Delete ({selectedIds.length})
                </Button>
              </>
            )}
            <AddButton resource='categories' onClick={() => setIsDialogOpen(true)} />
          </div>
        }
      />

      {/* Table with Drag and Drop */}
      <div className={loading || isReordering ? 'opacity-50 pointer-events-none' : ''}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <SortableCategoryTable
              columns={categoryColumns(mutate, false, selectionHandlers, {
                categories,
                onMove: moveCategory
              }, (categoryId) => router.push(`/admin/categories/${categoryId}/groups`))}
              data={categories}
              getRowId={(row: Category) => row.id}
              emptyMessage={loading ? 'Loading categories...' : 'No category found.'}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Add New Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialValues={null}
            onClose={handleDialogClose}
            onSuccess={handleDialogSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modals */}
      <bulkDeleteModal.ModalComponent />
      <bulkActivateModal.ModalComponent />
      <bulkDeactivateModal.ModalComponent />

      <TrashedCatalog />
    </div>
  )
}

export default function CategoryListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryList />
    </Suspense>
  )
}
