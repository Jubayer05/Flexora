'use client'

import { CustomTable } from '@/components/admin/common/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import useAsync from '@/hooks/useAsync'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'

interface ProductGroupResponseData {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  products: Array<{
    id: number
    sku: string
    name: string
    price: string
    stockCount: number
    isActive: boolean
    platform: string
    thumbnail: string | null
  }>
  _count: {
    products: number
  }
}

// Custom table column type
interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

export default function ViewProductGroup() {
  const params = useParams()
  const router = useRouter()
  const { data, loading } = useAsync<{ data: ProductGroupResponseData }>(
    () => `/admin/product-groups/${params?.id}?includeProducts=true`
  )

  const group = data?.data

  // Product columns
  const productColumns: TableColumn<ProductGroupResponseData['products'][0]>[] = [
    {
      key: 'select',
      header: <Checkbox className='' />,
      render: () => <Checkbox className='' />,
      width: 'w-10'
    },
    {
      key: 'id',
      header: 'ID',
      render: (_, record) => <span className='font-medium'>#{record.id}</span>,
      width: 'w-20'
    },
    {
      key: 'thumbnail',
      header: 'Image',
      render: (_, record) => (
        <div className='w-12 h-12 relative rounded overflow-hidden border border-white/20'>
          {record.thumbnail ? (
            <Image
              src={record.thumbnail}
              alt={record.name}
              fill
              className='object-cover'
              sizes='48px'
            />
          ) : (
            <div className='w-full h-full bg-gray-800/50 flex items-center justify-center'>
              <span className='text-xs text-muted-foreground'>No img</span>
            </div>
          )}
        </div>
      ),
      width: 'w-20'
    },
    {
      key: 'name',
      header: 'Product Name',
      render: (_, record) => (
        <div className='flex flex-col'>
          <div className='font-medium'>{record.name}</div>
          <div className='text-muted text-xs'>SKU: {record.sku}</div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (_, record) => <Badge className='capitalize'>{record.platform.toLowerCase()}</Badge>,
      width: 'w-28'
    },
    {
      key: 'price',
      header: 'Price',
      render: (_, record) => <span className='font-medium'>${record.price}</span>,
      width: 'w-24'
    },
    {
      key: 'stockCount',
      header: 'Stock',
      render: (_, record) => (
        <span className={record.stockCount > 0 ? 'text-green-500' : 'text-red-500'}>
          {record.stockCount}
        </span>
      ),
      width: 'w-20'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`px-2 py-1 text-xs font-normal border-0 text-white ${
            record.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'
          }`}
        >
          {record.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      width: 'w-24'
    }
  ]

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-muted-foreground'>Product group not found</div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => router.back()}
          className='hover:bg-white/10'
        >
          <ArrowLeft className='h-5 w-5' />
        </Button>
        <div>
          <h1 className='text-2xl font-semibold'>{group.name}</h1>
          <p className='text-muted-foreground text-sm'>Product Group Details</p>
        </div>
      </div>

      {/* Group Information */}
      <div className='bg-background border border-white/20 rounded-lg p-6'>
        <h2 className='text-lg font-semibold mb-4'>Group Information</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <div>
            <p className='text-sm text-muted-foreground mb-1'>Group ID</p>
            <p className='font-medium'>#{group.id}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground mb-1'>Group Name</p>
            <p className='font-medium'>{group.name}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground mb-1'>Products Count</p>
            <p className='font-medium'>{group._count?.products || 0} products</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground mb-1'>Created At</p>
            <p className='font-medium'>
              {new Date(group.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className='bg-background border border-white/20 rounded-lg p-6'>
        <h2 className='text-lg font-semibold mb-4'>Products in this Group</h2>
        {group.products && group.products.length > 0 ? (
          <CustomTable
            columns={productColumns}
            data={group.products}
            getRowId={(row: any) => row.id}
            emptyMessage='No products in this group'
          />
        ) : (
          <div className='text-center py-12 text-muted-foreground'>
            No products found in this group
          </div>
        )}
      </div>
    </div>
  )
}
