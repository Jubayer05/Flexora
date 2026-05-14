'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import React from 'react'

import { SortableCategoryTable } from '@/components/admin/categories/SortableCategoryTable'
import { productGroupColumns } from '@/components/admin/products/product-group-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { CustomSelect } from '@/components/common/CustomSelect'
import CustomInput from '@/components/common/CustomInput'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'
import requests from '@/services/network/http'
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
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'

function ProductGroupList() {
  const { page, limit } = useFilter(10)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSlug, setGroupSlug] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [category, setCategory] = useState<string>()
  const [categoryLabel, setCategoryLabel] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data, loading, mutate } = useAsync<{
    data: { productGroups?: ProductGroup[]; pagination?: any } | ProductGroup[]
  }>(
    () => {
      const params = new URLSearchParams()
      if (page) params.append('page', page.toString())
      if (limit) params.append('limit', limit.toString())
      if (debouncedSearch) params.append('search', debouncedSearch)
      params.set('sortBy', 'sortOrder')
      params.set('sortOrder', 'asc')
      const qs = params.toString()
      return '/admin/product-groups/all' + (qs ? `?${qs}` : '')
    },
    false,
    false
  )

  // Handle both response shapes: array (legacy) or { productGroups, pagination }
  const productGroups: ProductGroup[] = Array.isArray(data?.data)
    ? data.data
    : (data?.data as any)?.productGroups ?? []

  const pagination = Array.isArray(data?.data)
    ? undefined
    : (data?.data as any)?.pagination

  const columns = useMemo(() => productGroupColumns(mutate), [mutate])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = productGroups.findIndex((g) => g.id === active.id)
    const newIndex = productGroups.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newGroups = arrayMove(productGroups, oldIndex, newIndex)
    const prevItem = newGroups[newIndex - 1]
    const nextItem = newGroups[newIndex + 1]
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
    setIsReordering(true)
    try {
      await requests.patch(`/admin/product-groups/${active.id}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Product group order updated')
      mutate()
    } catch (e) {
      showError(e)
    } finally {
      setIsReordering(false)
    }
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!category) {
      toast.error('Category is required')
      return
    }

    setIsCreating(true)
    try {
      await requests.post('/admin/product-groups', {
        name: groupName,
        ...(groupSlug.trim() ? { slug: groupSlug.trim() } : {}),
        productIds: selectedProductIds.map((id) => parseInt(id)),
        categoryId: Number(category)
      })
      toast.success('Product group created successfully')
      setAddDialogOpen(false)
      setGroupName('')
      setGroupSlug('')
      setSelectedProductIds([])
      setCategory(undefined)
      setCategoryLabel(undefined)
      mutate()
      await globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/admin/product-groups') ||
            key.startsWith('/product-groups') ||
            key.startsWith('/categories')),
        undefined,
        { revalidate: true }
      )
    } catch (error) {
      showError(error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader
        title='Product Groups'
        subTitle='Manage product groups and categories'
        extra={
          <Button onClick={() => setAddDialogOpen(true)} className='gap-2'>
            <Plus className='h-4 w-4' />
            Add Group
          </Button>
        }
      />

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search product groups by name or slug...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          <div className={isReordering ? 'opacity-50 pointer-events-none' : ''}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={productGroups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <SortableCategoryTable
                  columns={columns}
                  data={productGroups}
                  getRowId={(row: ProductGroup) => row.id}
                  emptyMessage='No product groups found.'
                />
              </SortableContext>
            </DndContext>
          </div>
          {pagination && (
            <Pagination paginationData={pagination} pageSizeOptions={[5, 10, 20, 50]} />
          )}
        </>
      )}

      {/* Add Group Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) {
            setGroupName('')
            setGroupSlug('')
            setSelectedProductIds([])
            setCategory(undefined)
            setCategoryLabel(undefined)
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Product Group</DialogTitle>
            <DialogDescription>
              Create a new product group and assign products to it.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-6'>
            {/* Group Name */}
            <div className='space-y-2'>
              <Label htmlFor='groupName'>Group Name</Label>
              <Input
                id='groupName'
                value={groupName}
                onChange={(e) => {
                  const handler = createNameChangeHandler(
                    (v) => setGroupName(v),
                    (slug) => setGroupSlug(slug),
                    { skipIfEditing: false, style: 'compact' }
                  )
                  handler(e.target.value)
                }}
                placeholder='Enter group name'
                disabled={isCreating}
              />
            </div>

            {/* Slug */}
            <div className='space-y-2'>
              <Label htmlFor='groupSlug'>Slug (optional — auto-generated if empty)</Label>
              <CustomInput
                value={groupSlug}
                onChange={(e) => {
                  const handler = createSlugChangeHandler((v) => setGroupSlug(v))
                  handler(e.target.value, { style: 'compact' })
                }}
                placeholder='GroupSlug'
                helperText='Auto-generated from the name and can be changed manually.'
                disabled={isCreating}
              />
            </div>

            {/* Category */}
            <CustomSelect
              label='Select Category'
              url='/admin/categories?isRoot=true&limit=20'
              options={(d: any) =>
                d?.data?.categories?.map((cat: Category) => ({
                  value: cat.id.toString(),
                  title: cat.name,
                  label: cat.name
                }))
              }
              value={category}
              defaultLabel={categoryLabel}
              onChange={(opt: any) => {
                setCategory(opt.value)
                setCategoryLabel(opt.label)
              }}
              placeholder='Select category'
              returnFullData={true}
            />

            {/* Products */}
            <div className='space-y-2'>
              <Label>Select Products</Label>
              <CustomSelect
                label=''
                placeholder='Select products for this group'
                url='/admin/products?limit=100'
                multiple={true}
                value={selectedProductIds}
                onChange={setSelectedProductIds}
                options={(d: any) => {
                  const products = d?.data?.products || []
                  return products
                    .filter(
                      (p: any) =>
                        !p.productGroupId || selectedProductIds.includes(p.id.toString())
                    )
                    .map((p: any) => ({
                      value: p.id.toString(),
                      label: `${p.name} (${p.sku})`
                    }))
                }}
                searchMode='server'
                showSearch={true}
                disabled={isCreating}
              />
              <p className='text-xs text-muted-foreground'>
                {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''}{' '}
                selected. Products already in other groups are hidden.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setAddDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !groupName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className='bg-background rounded-lg overflow-hidden'>
      <div className='space-y-2 p-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    </div>
  )
}

export default function ProductGroups() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductGroupList />
    </Suspense>
  )
}
