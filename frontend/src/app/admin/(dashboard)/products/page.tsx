'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'

import { SortableCategoryTable } from '@/components/admin/categories/SortableCategoryTable'
import { productColumns } from '@/components/admin/products/product-columns'
import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import FileUploader from '@/components/common/FileUploader'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { AddButton } from '@/components/common/PermissionGate'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import { BulkUpdateProductSchema } from '@/lib/validations/schemas/product'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { Power, Trash2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

function ProductList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch } = useFilter(10)
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false)
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [priceUpdateType, setPriceUpdateType] = useState<'percentage' | 'fixed'>('percentage')
  const [priceUpdateValue, setPriceUpdateValue] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, setSearch])

  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data, loading, mutate } = useAsync<{
    data: {
      products: Product[]
      pagination: any
    }
  }>(
    () =>
      '/admin/products' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.sortBy ? `&sortBy=${filters.sortBy}` : '&sortBy=sortOrder') +
      (filters.sortOrder ? `&sortOrder=${filters.sortOrder}` : '&sortOrder=asc') +
      (filters.category ? `&categoryId=${filters.category}` : '') +
      (filters.isPrivate !== undefined ? `&isPrivate=${filters.isPrivate}` : '')
  )

  type BulkUpdateFormData = z.infer<typeof BulkUpdateProductSchema>

  const { control, handleSubmit, reset, getValues } = useForm<BulkUpdateFormData>({
    resolver: zodResolver(BulkUpdateProductSchema),
    mode: 'onChange',
    defaultValues: {
      updates: {
        thumbnail: '',
        description: '',
        policy: '',
        moreInformation: ''
      }
    }
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = data?.data?.products.map((p) => p.id) ?? []
      console.log('✅ Select All - IDs:', ids)
      setSelectedIds(ids)
    } else {
      console.log('❌ Deselect All')
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      const newIds = [...selectedIds, id]
      console.log('✅ Product Selected - ID:', id, 'All IDs:', newIds)
      setSelectedIds(newIds)
    } else {
      const newIds = selectedIds.filter((selectedId) => selectedId !== id)
      console.log('❌ Product Deselected - ID:', id, 'All IDs:', newIds)
      setSelectedIds(newIds)
    }
  }

  const products = useMemo(() => data?.data?.products ?? [], [data?.data?.products])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = products.findIndex((p) => p.id === active.id)
    const newIndex = products.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newProducts = arrayMove(products, oldIndex, newIndex)
    const prevItem = newProducts[newIndex - 1]
    const nextItem = newProducts[newIndex + 1]
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
      await requests.patch(`/admin/products/${active.id}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Product order updated')
      await mutate(undefined, { revalidate: true })
    } catch (e) {
      showError(e)
    } finally {
      setIsReordering(false)
    }
  }

  const onBulkUpdateSubmit = async (formData: BulkUpdateFormData) => {
    console.log('🔍 Form Submission Started')
    console.log('📦 Form Data Received:', JSON.stringify(formData, null, 2))

    // Also get values using getValues for more reliable access
    const currentValues = getValues()
    console.log('📦 Current Form Values (getValues):', JSON.stringify(currentValues, null, 2))

    console.log('📌 Selected IDs:', selectedIds)

    if (selectedIds.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    // Build updates object - use getValues which is more reliable at submission time
    const updates: Record<string, any> = {}

    // Get values from getValues() which is the most reliable for form submission
    const policy = (currentValues.updates?.policy || '').trim()
    const description = (currentValues.updates?.description || '').trim()
    const thumbnail = (currentValues.updates?.thumbnail || '').trim()
    const moreInformation = (currentValues.updates?.moreInformation || '').trim()

    console.log('🔍 Raw values extracted:')
    console.log(
      '  policy value:',
      JSON.stringify(policy),
      'length:',
      policy.length,
      'type:',
      typeof policy
    )
    console.log(
      '  description:',
      JSON.stringify(description.substring(0, 30)),
      'length:',
      description.length
    )
    console.log(
      '  thumbnail:',
      JSON.stringify(thumbnail.substring(0, 30)),
      'length:',
      thumbnail.length
    )
    console.log(
      '  moreInformation:',
      JSON.stringify(moreInformation.substring(0, 30)),
      'length:',
      moreInformation.length
    )

    if (policy) {
      updates.policy = policy
      console.log('✅ Policy added to updates:', JSON.stringify(policy))
    }
    if (description) {
      updates.description = description
      console.log('✅ Description added:', description.substring(0, 50) + '...')
    }
    if (thumbnail) {
      updates.thumbnail = thumbnail
      console.log('✅ Thumbnail added:', thumbnail)
    }
    if (moreInformation) {
      updates.moreInformation = moreInformation
      console.log('✅ More Information added:', moreInformation.substring(0, 50) + '...')
    }

    console.log('📊 Final Updates Object:', JSON.stringify(updates, null, 2))
    console.log('📊 Updates Keys:', Object.keys(updates))
    console.log('📊 Updates has policy?:', 'policy' in updates, 'Policy value:', updates.policy)

    if (Object.keys(updates).length === 0) {
      toast.error('⚠️ No fields to update! Please fill in at least one field.')
      return
    }

    try {
      const payload = {
        ids: selectedIds,
        updates
      }

      console.log('🚀 Final Payload to be sent:', JSON.stringify(payload, null, 2))

      const response = await requests.post('/admin/products/bulk-update', payload)
      console.log('✅ Success Response Received:', JSON.stringify(response, null, 2))

      toast.success(`✅ Successfully updated ${selectedIds.length} product(s)`)
      setBulkUpdateDialogOpen(false)
      setSelectedIds([])
      reset()
      mutate()
    } catch (error: any) {
      console.error('❌ Error occurred:', error)
      console.error('❌ Error response data:', error.response?.data)
      console.error('❌ Error message:', error.message)
      showError(error)
    }
  }

  // Bulk Delete Confirmation Modal
  const bulkDeleteModal = useConfirmationModal({
    title: 'Delete Products',
    description: `Are you sure you want to delete ${selectedIds.length} selected product(s)? This action cannot be undone.`,
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash2
  })

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    bulkDeleteModal.openModal(async () => {
      try {
        const response = await requests.post<{
          success: boolean
          message: string
          data?: {
            deletedCount: number
            skippedCount: number
            deletedIds: number[]
            skippedIds: number[]
            message: string
          }
        }>('/admin/products/bulk-delete', { ids: selectedIds })
        toast.success(response?.data?.message || response?.message || 'Bulk delete completed')
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  // Bulk Activate Confirmation Modal
  const bulkActivateModal = useConfirmationModal({
    title: 'Activate Products',
    description: `Are you sure you want to activate ${selectedIds.length} selected product(s)?`,
    confirmText: 'Yes, Activate',
    cancelText: 'Cancel',
    variant: 'default',
    icon: Power
  })

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    bulkActivateModal.openModal(async () => {
      try {
        await requests.post('/admin/products/bulk-update', {
          ids: selectedIds,
          updates: { isActive: true }
        })
        toast.success(`Successfully activated ${selectedIds.length} product(s)`)
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  // Bulk Deactivate Confirmation Modal
  const bulkDeactivateModal = useConfirmationModal({
    title: 'Deactivate Products',
    description: `Are you sure you want to deactivate ${selectedIds.length} selected product(s)?`,
    confirmText: 'Yes, Deactivate',
    cancelText: 'Cancel',
    variant: 'default',
    icon: Power
  })

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    bulkDeactivateModal.openModal(async () => {
      try {
        await requests.post('/admin/products/bulk-update', {
          ids: selectedIds,
          updates: { isActive: false }
        })
        toast.success(`Successfully deactivated ${selectedIds.length} product(s)`)
        setSelectedIds([])
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  const hasActiveFilters =
    !!search || !!filters.sortBy || !!filters.sortOrder || !!filters.category || filters.isPrivate !== undefined

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header: title and subtitle only */}
      <PageHeader
        title='Products'
        subTitle='Manage product list and their details'
      >
        {/* Filters section — below header */}
        <div className='rounded-lg border border-border bg-card p-4 shadow-sm'>
          <div className='flex flex-col gap-4'>
            {/* Row 1: Search + filters grid */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:gap-3'>
              <div className='sm:col-span-2'>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Search
                </label>
                <CustomInput
                  placeholder='Search by name, SKU, or ID...'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className='h-9 w-full border-border bg-card'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Category
                </label>
                <CustomSelect
                  placeholder='All categories'
                  url='/admin/categories'
                  showSearch={true}
                  value={filters.category != null ? String(filters.category) : undefined}
                  onChange={(value) => setFilter('category', value === 'all' ? undefined : value)}
                  options={(data: any) =>
                    [
                      { title: 'All categories', label: 'All categories', value: 'all' },
                      ...(data?.data?.categories?.map((category: any) => ({
                        title: category.name,
                        label: category.name,
                        value: category.id.toString()
                      })) ?? [])
                    ]
                  }
                  className='h-9 w-full border-border bg-card'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Sort by
                </label>
                <CustomSelect
                  placeholder='None'
                  value={filters.sortBy as string}
                  onChange={(value) => setFilter('sortBy', value)}
                  showSearch={false}
                  staticOptions={[
                    { title: 'Display Order', label: 'Display Order', value: 'sortOrder' },
                    { title: 'Stock Count', label: 'Stock Count', value: 'stockCount' },
                    { title: 'Sales Count', label: 'Sales Count', value: 'soldCount' },
                    { title: 'Created Date', label: 'Created Date', value: 'createdAt' },
                    { title: 'Price', label: 'Price', value: 'price' },
                    { title: 'Name', label: 'Name', value: 'name' }
                  ]}
                  className='h-9 w-full border-border bg-card'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Order
                </label>
                <CustomSelect
                  placeholder='Ascending'
                  value={filters.sortOrder as string}
                  onChange={(value) => setFilter('sortOrder', value)}
                  showSearch={false}
                  staticOptions={[
                    { title: 'Ascending', label: 'Low to High', value: 'asc' },
                    { title: 'Descending', label: 'High to Low', value: 'desc' }
                  ]}
                  className='h-9 w-full border-border bg-card'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Private Items
                </label>
                <CustomSelect
                  placeholder='All items'
                  value={filters.isPrivate !== undefined ? String(filters.isPrivate) : 'all'}
                  onChange={(value) =>
                    setFilter('isPrivate', value === 'all' ? undefined : value)
                  }
                  showSearch={false}
                  staticOptions={[
                    { title: 'All items', label: 'All items', value: 'all' },
                    { title: 'Private only', label: 'Private only', value: 'true' },
                    { title: 'Public only', label: 'Public only', value: 'false' }
                  ]}
                  className='h-9 w-full border-border bg-card'
                />
              </div>
            </div>

            {/* Row 2: Actions */}
            <div className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
              <div className='flex flex-wrap gap-2'>
                {selectedIds.length > 0 && (
                  <>
                    <Button size='sm' onClick={handleBulkActivate} className='bg-green-600 hover:bg-green-700'>
                      Activate ({selectedIds.length})
                    </Button>
                    <Button size='sm' variant='outline' onClick={handleBulkDeactivate} className='border-orange-500 text-orange-600 hover:bg-orange-50'>
                      Deactivate ({selectedIds.length})
                    </Button>
                    <Button size='sm' variant='destructive' onClick={handleBulkDelete}>
                      Delete ({selectedIds.length})
                    </Button>
                  </>
                )}
                <Button size='sm' variant='outline' onClick={() => { reset(); setBulkUpdateDialogOpen(true) }}>
                  Bulk Update
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setBulkPriceDialogOpen(true)}
                  disabled={selectedIds.length === 0}
                >
                  Bulk Price Update
                </Button>
              </div>
              <div className='flex flex-wrap gap-2'>
                <AddButton resource='products' title='Add New Product' href='/admin/products/add-new-product' />
                {hasActiveFilters && (
                  <Button size='sm' variant='outline' onClick={() => { clearFilters(); setSearchInput('') }}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Table */}
      <div className={loading || isReordering ? 'opacity-50 pointer-events-none' : ''}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <SortableCategoryTable
              columns={productColumns(mutate, {
                selectedIds,
                onSelectAll: handleSelectAll,
                onSelectOne: handleSelectOne
              })}
              data={products}
              getRowId={(row: Product) => row.id}
              emptyMessage={loading ? 'Loading products...' : 'No product found.'}
            />
          </SortableContext>
        </DndContext>
      </div>
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Bulk Update Products</DialogTitle>
            <DialogDescription>
              {selectedIds.length > 0
                ? `Update ${selectedIds.length} selected product(s)`
                : '⚠️ Select products from the table to bulk update'}
            </DialogDescription>
          </DialogHeader>
          {selectedIds.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>
              <p className='mb-2'>No products selected</p>
              <p className='text-sm'>
                Please close this dialog and select at least one product from the table to proceed
                with bulk updates.
              </p>
            </div>
          ) : (
            <>
              {console.log('📋 Form opened with selectedIds:', selectedIds)}
              <form onSubmit={handleSubmit(onBulkUpdateSubmit)}>
                <div className='space-y-6 py-4'>
                  {/* Selected Products Info */}
                  {selectedIds.length > 0 && (
                    <div className='bg-muted/50 p-3 rounded-md'>
                      <p className='text-sm text-muted-foreground'>
                        <span className='font-semibold'>{selectedIds.length}</span> product(s)
                        selected for update
                      </p>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div className='space-y-2'>
                    <label
                      htmlFor='thumbnail'
                      className='flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
                    >
                      Product Thumbnail (Optional)
                    </label>
                    <Controller
                      control={control}
                      name='updates.thumbnail'
                      render={({ field }) => (
                        <FileUploader
                          value={field.value || ''}
                          onChangeAction={field.onChange}
                          maxAllow={1}
                          size='extra-large'
                        />
                      )}
                    />
                    <p className='text-xs text-muted-foreground'>
                      Leave empty to keep existing thumbnails
                    </p>
                  </div>

                  {/* Description */}
                  <div className='space-y-2'>
                    <Label htmlFor='description'>Description (Optional)</Label>
                    <Controller
                      control={control}
                      name='updates.description'
                      render={({ field }) => (
                        <Textarea
                          placeholder='Enter product description...'
                          rows={6}
                          className='resize-none'
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <p className='text-xs text-muted-foreground'>
                      Leave empty to keep existing descriptions
                    </p>
                  </div>

                  {/* Policy */}
                  <div className='space-y-2'>
                    <Label htmlFor='policy'>Policy (Optional)</Label>
                    <Controller
                      control={control}
                      name='updates.policy'
                      render={({ field }) => (
                        <Textarea
                          placeholder='Enter product policy...'
                          rows={6}
                          className='resize-none'
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <p className='text-xs text-muted-foreground'>
                      Leave empty to keep existing policies
                    </p>
                  </div>

                  {/* More Information */}
                  <div className='space-y-2'>
                    <Label htmlFor='moreInformation'>More Information (Optional)</Label>
                    <Controller
                      control={control}
                      name='updates.moreInformation'
                      render={({ field }) => (
                        <Textarea
                          placeholder='Enter more information...'
                          rows={6}
                          className='resize-none'
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <p className='text-xs text-muted-foreground'>
                      Leave empty to keep existing more information
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setBulkUpdateDialogOpen(false)
                      reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={selectedIds.length === 0}
                    title={
                      selectedIds.length === 0
                        ? 'Please select at least one product from the table'
                        : ''
                    }
                  >
                    Update{' '}
                    {selectedIds.length > 0 ? `${selectedIds.length} Product(s)` : 'Products'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Price Update Dialog */}
      <Dialog open={bulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
            <DialogDescription>
              {selectedIds.length > 0
                ? `Update price for ${selectedIds.length} selected product(s)`
                : 'Select products from the table to update prices'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            {selectedIds.length > 0 && (
              <div className='bg-muted/50 p-3 rounded-md'>
                <p className='text-sm text-muted-foreground'>
                  <span className='font-semibold'>{selectedIds.length}</span> product(s) selected
                </p>
              </div>
            )}

            <div className='space-y-2'>
              <Label>Update Type</Label>
              <div className='flex gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='priceUpdateType'
                    value='percentage'
                    checked={priceUpdateType === 'percentage'}
                    onChange={(e) => setPriceUpdateType(e.target.value as 'percentage' | 'fixed')}
                    className='w-4 h-4'
                  />
                  <span>Percentage</span>
                </label>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='priceUpdateType'
                    value='fixed'
                    checked={priceUpdateType === 'fixed'}
                    onChange={(e) => setPriceUpdateType(e.target.value as 'percentage' | 'fixed')}
                    className='w-4 h-4'
                  />
                  <span>Fixed Amount</span>
                </label>
              </div>
            </div>

            <div className='space-y-2'>
              <Label>
                {priceUpdateType === 'percentage' ? 'Percentage Change' : 'Amount Change'}
              </Label>
              <div className='flex gap-2 items-center'>
                {priceUpdateType === 'percentage' && (
                  <CustomInput
                    type='select'
                    value={priceUpdateValue.startsWith('-') ? 'decrease' : 'increase'}
                    onValueChange={(value) => {
                      const numValue = parseFloat(priceUpdateValue.replace(/[+-]/g, '')) || 0
                      setPriceUpdateValue(value === 'decrease' ? `-${numValue}` : `${numValue}`)
                    }}
                    options={[
                      { value: 'increase', label: 'Increase' },
                      { value: 'decrease', label: 'Decrease' }
                    ]}
                    className='w-32'
                  />
                )}
                <CustomInput
                  type='number'
                  placeholder={priceUpdateType === 'percentage' ? '10' : '5.00'}
                  value={priceUpdateValue.replace(/[+-]/g, '')}
                  onChange={(e) => {
                    const numValue = e.target.value
                    const sign = priceUpdateValue.startsWith('-') ? '-' : ''
                    setPriceUpdateValue(`${sign}${numValue}`)
                  }}
                  min={0}
                  step={priceUpdateType === 'percentage' ? 1 : 0.01}
                  className='flex-1'
                />
                {priceUpdateType === 'percentage' && (
                  <span className='text-muted-foreground'>%</span>
                )}
                {priceUpdateType === 'fixed' && <span className='text-muted-foreground'>$</span>}
              </div>
              <p className='text-xs text-muted-foreground'>
                {priceUpdateType === 'percentage'
                  ? 'Enter percentage to increase or decrease prices (e.g., 10 for +10%, -5 for -5%)'
                  : 'Enter fixed amount to add or subtract from prices (e.g., 5.00 to add $5, -2.00 to subtract $2)'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setBulkPriceDialogOpen(false)
                setPriceUpdateValue('')
                setPriceUpdateType('percentage')
              }}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={async () => {
                if (selectedIds.length === 0) {
                  toast.error('Please select at least one product')
                  return
                }

                if (!priceUpdateValue || parseFloat(priceUpdateValue.replace(/[+-]/g, '')) === 0) {
                  toast.error('Please enter a valid price update value')
                  return
                }

                try {
                  // Fetch current prices for selected products
                  const productsResponse = await requests.get(
                    `/admin/products?ids=${selectedIds.join(',')}`
                  )
                  const products = productsResponse?.data?.products || []

                  // Calculate new prices
                  const updates = products.map((product: Product) => {
                    const currentPrice = parseFloat(product.price as any)
                    let newPrice = currentPrice

                    if (priceUpdateType === 'percentage') {
                      const percentage = parseFloat(priceUpdateValue.replace(/[+-]/g, ''))
                      const multiplier = priceUpdateValue.startsWith('-')
                        ? 1 - percentage / 100
                        : 1 + percentage / 100
                      newPrice = currentPrice * multiplier
                    } else {
                      const amount = parseFloat(priceUpdateValue)
                      newPrice = currentPrice + amount
                    }

                    return {
                      id: product.id,
                      price: Math.max(0, newPrice) // Ensure price doesn't go negative
                    }
                  })

                  // Update each product
                  for (const update of updates) {
                    await requests.put(`/admin/products/${update.id}`, {
                      price: update.price
                    })
                  }

                  toast.success(`Successfully updated prices for ${selectedIds.length} product(s)`)
                  setBulkPriceDialogOpen(false)
                  setPriceUpdateValue('')
                  setPriceUpdateType('percentage')
                  mutate()
                } catch (error) {
                  showError(error)
                }
              }}
              disabled={selectedIds.length === 0 || !priceUpdateValue}
            >
              Update Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modals */}
      <bulkDeleteModal.ModalComponent />
      <bulkActivateModal.ModalComponent />
      <bulkDeactivateModal.ModalComponent />
    </div>
  )
}

export default function ProductListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductList />
    </Suspense>
  )
}
