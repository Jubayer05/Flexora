'use client'

import { CustomTable } from '@/components/admin/common/data-table'
import useAsync from '@/hooks/useAsync'
import { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface TelegramProductAssignmentTableProps {
  onProductClick: (product: ProductWithStock) => void
  onAddAccount?: (product: ProductWithStock) => void
  selectedProductId?: number | null
}

interface ProductWithStock extends Product {
  stockCount: number
}

export function TelegramProductAssignmentTable({
  onProductClick,
  onAddAccount,
  selectedProductId
}: TelegramProductAssignmentTableProps) {
  const { data, loading } = useAsync<{
    data: {
      products: ProductWithStock[]
      pagination: any
    }
  }>(() => '/admin/products?limit=100')

  const products = (data?.data?.products || []).filter(
    (product: Product) =>
      (product.type as string) === 'TELEGRAM_ACCOUNTS' ||
      (product.platform === 'TELEGRAM' && (product.type as string) === 'ACCOUNT')
  )

  const columns = [
    {
      key: 'name',
      header: 'Product Name',
      render: (value: string, product: ProductWithStock) => (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='ghost'
            className='h-auto p-0 text-left font-medium whitespace-normal hover:underline'
            onClick={() => onProductClick(product)}
          >
            {value}
          </Button>
          {selectedProductId === product.id && (
            <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20'>
              Selected
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'stockCount',
      header: 'Stock Count',
      render: (value: number) => (
        <div className='font-medium'>
          <Badge
            variant='outline'
            className={
              value > 0
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }
          >
            {value}
          </Badge>
        </div>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_value: number, product: ProductWithStock) => (
        <div className='flex flex-col items-stretch gap-2 sm:flex-row sm:items-center'>
          <Button size='sm' onClick={() => onAddAccount?.(product)} disabled={!onAddAccount}>
            <Plus className='mr-1 h-4 w-4' />
            Add Account
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className='bg-background border border-white/20 rounded-lg p-3 sm:p-4 mb-4 min-w-0'>
      <h3 className='text-lg font-semibold mb-4 text-white'>Telegram Products</h3>
      <CustomTable
        columns={columns}
        data={products}
        getRowId={(row: ProductWithStock) => row.id}
        emptyMessage={loading ? 'Loading products...' : 'No Telegram products found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
    </div>
  )
}

