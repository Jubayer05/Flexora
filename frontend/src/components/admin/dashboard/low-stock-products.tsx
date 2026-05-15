'use client'

import { CustomTable, TableColumn } from '@/components/admin/common/data-table'
import { DashboardPanel } from '@/components/admin/dashboard/dashboard-panel'
import { DashboardPagination } from '@/components/admin/dashboard/dashboard-pagination'
import { stockColumns } from '@/components/admin/products/product-stock-columns'
import { usePermissions } from '@/components/providers/PermissionProvider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMounted } from '@/hooks/useMounted'
import useAsync from '@/hooks/useAsync'
import { AlertTriangle, Package } from 'lucide-react'
import React from 'react'

export function LowStockProducts() {
  const mounted = useMounted()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const canViewProducts = hasPermission('products', 'index')

  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(5)
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

  if (!mounted || !canViewProducts) return null

  return (
    <DashboardPanel
      title='Stock management'
      description='Monitor inventory levels and restock before items run out.'
      icon={Package}
      iconTone='warning'
      actions={
        <ToggleGroup
          type='single'
          value={filter}
          onValueChange={(value) => {
            if (value) {
              setFilter(value as 'lowStock' | 'outOfStock')
              setPage(1)
            }
          }}
          variant='outline'
          size='sm'
          className='bg-background'
        >
          <ToggleGroupItem value='lowStock' className='gap-1.5 px-3 text-xs sm:text-sm'>
            <Package className='size-3.5' />
            Low stock
          </ToggleGroupItem>
          <ToggleGroupItem value='outOfStock' className='gap-1.5 px-3 text-xs sm:text-sm'>
            <AlertTriangle className='size-3.5' />
            Out of stock
          </ToggleGroupItem>
        </ToggleGroup>
      }
      footer={
        pagination ? (
          <DashboardPagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            shown={products.length}
            itemLabel='products'
            loading={loading}
            hasPrev={pagination.hasPrev}
            hasNext={pagination.hasNext}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        ) : undefined
      }
    >
      <div className='min-h-0 flex-1 overflow-x-auto'>
        <CustomTable
          variant='dashboard'
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
          className={loading ? 'pointer-events-none opacity-60' : ''}
        />
      </div>
    </DashboardPanel>
  )
}
