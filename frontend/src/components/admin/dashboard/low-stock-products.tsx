'use client'

import { usePermissions } from '@/components/providers/PermissionProvider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { useMounted } from '@/hooks/useMounted'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import useAsync from '@/hooks/useAsync'
import { AlertTriangle, ChevronLeft, ChevronRight, Package } from 'lucide-react'
import React from 'react'
import { CustomTable, TableColumn } from '../common/data-table'
import { stockColumns } from '../products/product-stock-columns'

export const description = 'Low stock products with pagination'

export function LowStockProducts() {
  const mounted = useMounted()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const canViewProducts = hasPermission('products', 'index')

  const [page, setPage] = React.useState<number>(1)
  const [limit] = React.useState<number>(5)
  const [filter, setFilter] = React.useState<'lowStock' | 'outOfStock'>('lowStock')

  const { data, loading } = useAsync<{
    data: {
      products: Product[]
      pagination: {
        total: number
        page: number
        limit: number
        pages: number
        hasNext: boolean
        hasPrev: boolean
      }
    }
  }>(() => {
    if (!canViewProducts || permissionsLoading) return null
    const params = new URLSearchParams()
    if (filter === 'lowStock') {
      params.append('lowStock', '1')
    } else {
      params.append('inStock', 'false')
    }
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    return `/admin/products?${params.toString()}`
  })

  const products = data?.data?.products ?? []
  const pagination = data?.data?.pagination

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination && page < pagination.pages) {
      setPage(page + 1)
    }
  }

  const handleFilterChange = (value: string) => {
    if (value) {
      setFilter(value as 'lowStock' | 'outOfStock')
      setPage(1) // Reset to first page when filter changes
    }
  }

  // Defer permission check until mounted to avoid hydration mismatch (server vs client)
  if (!mounted || !canViewProducts) return null

  return (
    <Card className='@container/card bg-gradient-to-br from-background to-blue-500/5'>
      <CardHeader>
        <div className='flex @[540px]/card:flex-row flex-col justify-between @[540px]/card:items-center gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Package className='size-5' />
              Stock Management
            </CardTitle>
            <CardDescription className='mt-1'>
              Monitor and manage products with low or out of stock inventory
            </CardDescription>
          </div>
          <CardAction>
            <ToggleGroup
              type='single'
              value={filter}
              onValueChange={handleFilterChange}
              variant='outline'
              className='bg-background/50'
              size={'sm'}
            >
              <ToggleGroupItem
                value='lowStock'
                className='gap-2 data-[state=on]:bg-yellow-500/20 px-2 data-[state=on]:text-yellow-500'
              >
                <Package className='size-4' />
                Low Stock
              </ToggleGroupItem>
              <ToggleGroupItem
                value='outOfStock'
                className='gap-2 data-[state=on]:bg-destructive/20 px-4! data-[state=on]:text-destructive'
              >
                <AlertTriangle className='size-4' />
                Out of Stock
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-2 sm:px-6'>
        {/* Table */}
        <CustomTable
          columns={stockColumns as TableColumn[]}
          data={products}
          getRowId={(row: Product) => row.id}
          emptyMessage={
            loading
              ? 'Loading products...'
              : filter === 'lowStock'
              ? 'No low stock products found.'
              : 'No out of stock products found.'
          }
          className={loading ? 'opacity-50 pointer-events-none' : ''}
        />

        {/* Pagination Controls */}
        {pagination && pagination.pages > 1 && (
          <div className='flex justify-between items-center pt-4 border-white/10 border-t'>
            <div className='text-muted-foreground text-sm'>
              Showing <span className='font-medium text-white'>{products.length}</span> of{' '}
              <span className='font-medium text-white'>{pagination.total}</span> products
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev || loading}
                className='gap-2'
              >
                <ChevronLeft className='size-4' />
                Previous
              </Button>
              <div className='flex items-center gap-1 px-3 text-sm'>
                <span className='font-medium text-white'>{page}</span>
                <span className='text-muted-foreground'>/</span>
                <span className='text-muted-foreground'>{pagination.pages}</span>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleNextPage}
                disabled={!pagination.hasNext || loading}
                className='gap-2'
              >
                Next
                <ChevronRight className='size-4' />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
