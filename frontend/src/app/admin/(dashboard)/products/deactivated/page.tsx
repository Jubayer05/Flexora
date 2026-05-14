'use client'

import { Suspense, useEffect, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { deactivatedProductColumns } from '@/components/admin/deactivated-products/product-columns'
import { CustomSelect } from '@/components/common/CustomSelect'
import CustomInput from '@/components/common/CustomInput'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { Power } from 'lucide-react'

function ProductList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch } = useFilter(10)
  const [searchInput, setSearchInput] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, setSearch])

  const { data, loading, mutate } = useAsync<{
    data: {
      products: Product[]
      pagination: any
    }
  }>(
    () =>
      '/admin/products?isActive=false' +
      (page ? `&page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.sortBy ? `&sortBy=${filters.sortBy}` : '') +
      (filters.sortOrder ? `&sortOrder=${filters.sortOrder}` : '') +
      (filters.category ? `&categoryId=${filters.category}` : '') +
      (filters.group ? `&groupId=${filters.group}` : '') +
      (filters.minPrice ? `&minPrice=${filters.minPrice}` : '') +
      (filters.maxPrice ? `&maxPrice=${filters.maxPrice}` : '')
  )

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data?.data?.products.map((p) => p.id) ?? [])
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

  const handleBulkReactivate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    try {
      await requests.post('/admin/products/bulk-update', {
        ids: selectedIds,
        updates: { isActive: true }
      })
      toast.success(`Successfully reactivated ${selectedIds.length} product(s)`)
      setSelectedIds([])
      mutate()
    } catch (error) {
      showError(error)
    }
  }

  const hasActiveFilters =
    search ||
    filters.sortOrder ||
    filters.category ||
    filters.group ||
    filters.minPrice ||
    filters.maxPrice

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header: title and subtitle only */}
      <PageHeader
        title='Deactivated Products'
        subTitle='Manage product list and their details'
      >
        {/* Filters section — below header, clear visual hierarchy */}
        <div className='rounded-lg border border-border bg-card p-4 shadow-sm'>
          <div className='flex flex-col gap-4'>
            {/* Row 1: Search + filters grid */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-3'>
              <div className='xl:col-span-2'>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Search
                </label>
                <CustomInput
                  type='text'
                  placeholder='Search products...'
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
                  Group
                </label>
                <CustomSelect
                  placeholder='All groups'
                  url='/admin/product-groups/all'
                  showSearch={true}
                  value={filters.group != null ? String(filters.group) : undefined}
                  onChange={(value) => setFilter('group', value === 'all' ? undefined : value)}
                  options={(data: any) =>
                    [
                      { title: 'All groups', label: 'All groups', value: 'all' },
                      ...((data?.data?.productGroups ?? data?.data?.groups ?? []).map((g: any) => ({
                        title: g.name,
                        label: g.name,
                        value: g.id.toString()
                      })) ?? [])
                    ]
                  }
                  className='h-9 w-full border-border bg-card'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Sort by price
                </label>
                <CustomSelect
                  placeholder='None'
                  value={filters.sortOrder as string}
                  onChange={(value) => {
                    setFilter('sortBy', 'price')
                    setFilter('sortOrder', value)
                  }}
                  showSearch={false}
                  staticOptions={[
                    { title: 'High to Low', label: 'High to Low', value: 'desc' },
                    { title: 'Low to High', label: 'Low to High', value: 'asc' }
                  ]}
                  className='h-9 w-full border-border bg-card'
                />
              </div>
            </div>

            {/* Row 2: Price range + actions */}
            <div className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between'>
              <div className='flex flex-wrap items-end gap-3'>
                <div className='w-full min-w-0 sm:w-28'>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                    Min price
                  </label>
                  <CustomInput
                    type='number'
                    placeholder='Min'
                    value={filters.minPrice as string}
                    onChange={(e) => setFilter('minPrice', e.target.value)}
                    className='h-9 w-full border-border bg-card'
                  />
                </div>
                <span className='hidden shrink-0 self-center text-muted-foreground sm:inline'>–</span>
                <div className='w-full min-w-0 sm:w-28'>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground sm:invisible'>
                    Max price
                  </label>
                  <CustomInput
                    type='number'
                    placeholder='Max'
                    value={filters.maxPrice as string}
                    onChange={(e) => setFilter('maxPrice', e.target.value)}
                    className='h-9 w-full border-border bg-card'
                  />
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                {selectedIds.length > 0 && (
                  <Button onClick={handleBulkReactivate} size='sm' className='bg-green-600 hover:bg-green-700'>
                    <Power className='mr-2 h-4 w-4' />
                    Reactivate ({selectedIds.length})
                  </Button>
                )}
                {hasActiveFilters && (
                  <Button variant='outline' size='sm' onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Table */}
      <CustomTable
        columns={deactivatedProductColumns(mutate, {
          selectedIds,
          onSelectAll: handleSelectAll,
          onSelectOne: handleSelectOne
        })}
        data={data?.data?.products ?? []}
        getRowId={(row: Product) => row.id}
        emptyMessage={loading ? 'Loading products...' : 'No product found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function DeactivatedProductListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductList />
    </Suspense>
  )
}
