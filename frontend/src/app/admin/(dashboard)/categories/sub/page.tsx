'use client'

import { Suspense, useState, useEffect } from 'react'
import React from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomSelect } from '@/components/common/CustomSelect'
import CustomInput from '@/components/common/CustomInput'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'

function ProductGroupList() {
  const { page, limit } = useFilter(10)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSlug, setGroupSlug] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [createCategory, setCreateCategory] = useState<string>()
  const [createCategoryLabel, setCreateCategoryLabel] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data, loading, mutate } = useAsync<{
    data: {
      productGroups?: ProductGroup[]
      pagination?: any
    } | ProductGroup[]
  }>(
    () => {
      const params = new URLSearchParams()
      if (page) params.append('page', page.toString())
      if (limit) params.append('limit', limit.toString())
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery)
      if (selectedCategoryFilter !== 'all') params.append('categoryId', selectedCategoryFilter)
      const queryString = params.toString()
      // Use /all endpoint which now supports search and pagination
      return '/admin/product-groups/all' + (queryString ? `?${queryString}` : '')
    },
    false,
    false
  )

  const { data: categoriesData } = useAsync<{
    data: {
      categories: Category[]
    }
  }>(() => '/admin/categories?isRoot=true&limit=100&sortBy=sortOrder&sortOrder=asc', false, false)

  // Handle both response formats (array or object with productGroups)
  const productGroups = Array.isArray(data?.data) 
    ? data.data 
    : data?.data?.productGroups ?? []
  
  const pagination = Array.isArray(data?.data) 
    ? undefined 
    : data?.data?.pagination

  const rootCategories = categoriesData?.data?.categories ?? []

  const moveGroup = async (groupId: number, direction: 'up' | 'down') => {
    if (!productGroups.length) return

    const currentIndex = productGroups.findIndex((group) => group.id === groupId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= productGroups.length) return

    const prevItem = targetIndex > 0 ? productGroups[targetIndex - 1] : null
    const nextItem = productGroups[targetIndex]

    const prevSortOrder =
      prevItem && prevItem.sortOrder !== 0 && prevItem.sortOrder !== null
        ? prevItem.sortOrder
        : null
    const nextSortOrder =
      nextItem && nextItem.sortOrder !== 0 && nextItem.sortOrder !== null
        ? nextItem.sortOrder
        : null

    try {
      await requests.patch(`/admin/product-groups/${groupId}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Group order updated successfully')
      mutate()
    } catch (error) {
      showError(error)
    }
  }

  // Note: CustomSelect component handles pagination and filtering internally
  // We don't need to fetch all products separately

  // Memoize columns to prevent re-renders
  const columns = React.useMemo(
    () =>
      productGroupColumns(mutate, {
        groups: productGroups,
        onMove: moveGroup
      }),
    [mutate, productGroups]
  )

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!groupSlug.trim()) {
      toast.error('Slug is required')
      return
    }

    if (!createCategory) {
      toast.error('Category is required')
      return
    }

    setIsCreating(true)
    try {
      await requests.post('/admin/product-groups', {
        name: groupName,
        slug: groupSlug,
        productIds: selectedProductIds.map((id) => parseInt(id)),
        categoryId: Number(createCategory)
      })
      toast.success('Product group created successfully')
      setAddDialogOpen(false)
      setGroupName('')
      setGroupSlug('')
      setSelectedProductIds([])
      setCreateCategory(undefined)
      setCreateCategoryLabel(undefined)
      await globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/admin/product-groups') ||
            key.startsWith('/product-groups') ||
            key.startsWith('/categories')),
        undefined,
        { revalidate: true }
      )
      mutate()
    } catch (error) {
      showError(error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Groups'
        subTitle='Manage groups inside categories and adjust their order'
        extra={
          <div className='flex gap-2'>
            <Button onClick={() => setAddDialogOpen(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              Add Group
            </Button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className='mb-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search groups by name or slug...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder='Filter by category' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              {rootCategories.map((rootCategory) => (
                <SelectItem key={rootCategory.id} value={String(rootCategory.id)}>
                  {rootCategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table with Skeleton Loading */}
      {loading && <TableSkeleton />}
      {!loading && (
        <>
          <CustomTable
            columns={columns}
            data={productGroups}
            getRowId={(row: any) => row.id}
            emptyMessage='No product groups found.'
          />
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
            setCreateCategory(undefined)
            setCreateCategoryLabel(undefined)
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Group</DialogTitle>
            <DialogDescription>
              Create a new group and assign products inside a category. Products already assigned to other groups will be hidden.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
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
                      (slug: string) => setGroupSlug(slug),
                      { skipIfEditing: false, style: 'compact' }
                    )
                    nameChangeHandler(e.target.value)
                  }}
                  placeholder='Enter group name'
                  disabled={isCreating}
                />
              </div>

              {/* Slug Field */}
              <div className='space-y-2'>
                <Label htmlFor='groupSlug'>Slug</Label>
                  <CustomInput
                    value={groupSlug}
                    onChange={(e) => {
                      const slugChangeHandler = createSlugChangeHandler((value) => setGroupSlug(value))
                      slugChangeHandler(e.target.value, { style: 'compact' })
                    }}
                    placeholder='GroupSlug'
                    helperText='Auto-generated from the name and can be changed manually.'
                    disabled={isCreating}
                  />
                </div>

              {/* Category Selection */}
              <CustomSelect
                className='mb-6'
                label='Select Category'
                url='/admin/categories?isRoot=true&limit=20'
                options={(data) =>
                  data?.data?.categories.map((category: Category) => ({
                    value: category.id.toString(),
                    title: category.name,
                    label: category.name
                  }))
                }
                value={createCategory}
                defaultLabel={createCategoryLabel}
                onChange={(selectedOption: any) => {
                  setCreateCategory(selectedOption.value)
                  setCreateCategoryLabel(selectedOption.label)
                }}
                placeholder='Select category'
                returnFullData={true}
              />

              {/* Product Selection */}
              <div className='space-y-3'>
                <Label>Select Products</Label>
                <CustomSelect
                  label=''
                  placeholder='Select products for this group'
                  url='/admin/products?limit=100'
                  multiple={true}
                  value={selectedProductIds}
                  onChange={setSelectedProductIds}
                  options={(data) => {
                    const products = data?.data?.products || []
                    // Filter out products already assigned to other groups
                    return products
                      .filter(
                        (product: any) =>
                          !product.productGroupId || selectedProductIds.includes(product.id.toString())
                      )
                      .map((product: any) => ({
                        value: product.id.toString(),
                        label: `${product.name} (${product.sku})`
                      }))
                  }}
                  searchMode='server'
                  showSearch={true}
                  disabled={isCreating}
                />
                <p className='text-xs text-muted-foreground'>
                  {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected.
                  Products already assigned to other groups are hidden. Use search to find more products.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !groupName.trim() || !groupSlug.trim()}>
              {isCreating ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Skeleton loader for table
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

export default function ProductGroupsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductGroupList />
    </Suspense>
  )
}
