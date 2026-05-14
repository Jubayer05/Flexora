'use client'

import { Suspense, useState, useEffect } from 'react'
import React from 'react'
import { useParams, useRouter } from 'next/navigation'

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
import { Skeleton } from '@/components/ui/skeleton'
import { CustomSelect } from '@/components/common/CustomSelect'
import CustomInput from '@/components/common/CustomInput'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Plus, Search, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'

function CategoryGroupsPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params?.categoryId as string

  const { page, limit } = useFilter(10)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSlug, setGroupSlug] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch category info for header
  const { data: categoryData } = useAsync<{ data: Category }>(
    () => `/admin/categories/${categoryId}`,
    false,
    false
  )

  // Fetch product groups for this category
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
      params.append('categoryId', categoryId)
      const queryString = params.toString()
      return '/admin/product-groups/all' + (queryString ? `?${queryString}` : '')
    },
    false,
    false
  )

  // Handle both response formats (array or object with productGroups)
  const productGroups = Array.isArray(data?.data)
    ? data.data
    : data?.data?.productGroups ?? []

  const pagination = Array.isArray(data?.data) ? undefined : data?.data?.pagination

  const category = categoryData?.data
  const rootCategory = category?.parentId ? category?.parent : category

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

    setIsCreating(true)
    try {
      await requests.post('/admin/product-groups', {
        name: groupName,
        slug: groupSlug,
        productIds: selectedProductIds.map((id) => parseInt(id)),
        categoryId: Number(categoryId)
      })
      toast.success('Product group created successfully')
      setAddDialogOpen(false)
      setGroupName('')
      setGroupSlug('')
      setSelectedProductIds([])
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
        title={category?.name || 'Groups'}
        subTitle={`Groups in ${category?.name || 'this category'}`}
        extra={
          <div className='flex gap-2'>
            <Button onClick={() => setAddDialogOpen(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              Add Group
            </Button>
          </div>
        }
      />

      {/* Breadcrumb and Back */}
      <div className='mb-4 flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => router.push('/admin/categories')}
          className='hover:bg-white/10'
        >
          <ArrowLeft className='h-5 w-5' />
        </Button>
        <div className='text-sm text-muted-foreground'>
          <span
            className='hover:text-foreground cursor-pointer'
            onClick={() => router.push('/admin/categories')}
          >
            Categories
          </span>
          <span className='mx-2'>&rsaquo;</span>
          <span className='text-foreground'>{category?.name || 'Loading...'}</span>
          <span className='mx-2'>&rsaquo;</span>
          <span>Groups</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search groups by name or slug...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
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
            emptyMessage='No product groups found in this category.'
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
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add Group</DialogTitle>
            <DialogDescription>
              Create a new group in {category?.name}. Products already assigned to other groups will be hidden.
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

export default function CategoryGroupsPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryGroupsPage />
    </Suspense>
  )
}
