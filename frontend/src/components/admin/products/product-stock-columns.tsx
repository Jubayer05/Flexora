'use client'

import CustomImage from '@/components/common/CustomImage'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package } from 'lucide-react'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Enhanced columns with stock badges
export const stockColumns: TableColumn<Product>[] = [
  {
    key: 'thumbnail',
    header: 'Product',
    render: (_, record) => (
      <div className='flex items-center gap-3'>
        <CustomImage
          src={record.thumbnail}
          alt={record.name}
          width={48}
          height={48}
          className='size-12 rounded-lg border border-border/80 object-cover'
        />
        <div className='flex flex-col min-w-0'>
          <div className='max-w-sm font-medium text-foreground truncate'>{record.name}</div>
          <div className='flex gap-2 mt-0.5 text-muted-foreground text-xs'>
            <span>SKU: {record.sku || 'N/A'}</span>
          </div>
        </div>
      </div>
    ),
    width: 'min-w-[240px]'
  },
  {
    key: 'quantity',
    header: 'Stock',
    render: (_, record) => {
      const quantity = record.stockCount || 0
      const isOutOfStock = quantity === 0
      const isLowStock = quantity > 0 && quantity <= 10

      return (
        <div className='flex items-center gap-2'>
          <span className='font-medium text-foreground'>{quantity}</span>
          {isOutOfStock ? (
            <Badge variant='destructive' className='gap-1 font-normal'>
              <AlertTriangle className='size-3' />
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge
              variant='secondary'
              className='gap-1 bg-yellow-500/20 border-yellow-500/30 font-normal text-yellow-500'
            >
              <Package className='size-3' />
              Low Stock
            </Badge>
          ) : null}
        </div>
      )
    },
    width: 'w-[180px]'
  }
]
