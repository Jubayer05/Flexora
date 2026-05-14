'use client'

import StatusBadge from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'

interface OrderDescriptionProps {
  data: Order
  className?: string
  compact?: boolean
}

export default function OrderDescription({ data: orderData, className }: OrderDescriptionProps) {
  const { data, loading } = useAsync<{
    data: Order
  }>(() => `/admin/orders/${orderData.id}`)

  const totalItems = data?.data?.items?.length || 0
  const totalQuantity = data?.data?.items?.reduce((total, item) => total + item.quantity, 0) || 0

  if (loading) {
    return (
      <div className={cn('flex lg:flex-row flex-col gap-6', className)}>
        <div className='space-y-4 w-full lg:w-1/2'>
          {/* Order Number */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-24 h-4' />
            <Skeleton className='w-32 h-5' />
          </div>

          {/* Order ID */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-16 h-4' />
            <Skeleton className='w-20 h-5' />
          </div>

          {/* Customer */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-20 h-4' />
            <Skeleton className='w-48 h-5' />
            <Skeleton className='w-36 h-4' />
          </div>

          {/* Order Status */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-24 h-4' />
            <Skeleton className='rounded-full w-20 h-6' />
          </div>

          {/* Delivery Status */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-28 h-4' />
            <Skeleton className='rounded-full w-24 h-6' />
          </div>

          {/* Order Date */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-20 h-4' />
            <Skeleton className='w-28 h-5' />
          </div>

          {/* Total Items */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-20 h-4' />
            <Skeleton className='w-16 h-5' />
          </div>

          {/* Total Quantity */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-24 h-4' />
            <Skeleton className='w-12 h-5' />
          </div>
        </div>

        <div className='space-y-4 w-full lg:w-1/2'>
          {/* Subtotal */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-16 h-4' />
            <Skeleton className='w-20 h-5' />
          </div>

          {/* Discount */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-16 h-4' />
            <Skeleton className='w-16 h-5' />
          </div>

          {/* Total Amount */}
          <div className='flex flex-col gap-2'>
            <Skeleton className='w-24 h-4' />
            <Skeleton className='w-24 h-6' />
          </div>

          {/* Order Items Section */}
          <div className='space-y-3'>
            <Skeleton className='w-20 h-5' />

            {/* Skeleton for 2-3 order items */}
            {[...Array(3)].map((_, index) => (
              <div key={index} className='space-y-3 p-3 border rounded-lg'>
                <div className='flex justify-between items-start'>
                  <div className='flex-1 space-y-2 pr-4'>
                    {/* Product name */}
                    <Skeleton className='w-full max-w-48 h-5' />
                    {/* Platform badge */}
                    <Skeleton className='rounded w-20 h-6' />
                    {/* SKU */}
                    <Skeleton className='w-24 h-4' />
                    {/* Quantity */}
                    <Skeleton className='w-20 h-4' />
                    {/* Unit Price */}
                    <Skeleton className='w-28 h-4' />
                  </div>
                  {/* Total Price */}
                  <Skeleton className='w-16 h-5' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex lg:flex-row flex-col gap-6', className)}>
      <div className='space-y-4 w-full lg:w-1/2'>
        <div className='flex flex-col'>
          <span className='font-semibold'>Order Number</span>
          <span className='font-medium'>{data?.data?.orderNumber}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Order ID</span>
          <span className='font-medium'>#{data?.data?.id}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Customer</span>
          <span className='font-medium'>{data?.data?.user?.email}</span>
          <span className='text-muted-foreground text-sm'>
            {data?.data?.user?.firstName} {data?.data?.user?.lastName}
          </span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Order Status</span>
          <StatusBadge status={data?.data?.status ?? ''} className='w-fit' />
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Delivery Status</span>
          <StatusBadge status={data?.data.deliveryStatus ?? ''} className='w-fit' />
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Order Date</span>
          <span className='font-medium'>
            {data?.data?.createdAt ? new Date(data.data.createdAt).toLocaleDateString() : '-'}
          </span>
        </div>

        {data?.data?.deliveredAt && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Delivered Date</span>
            <span className='font-medium'>
              {new Date(data?.data?.deliveredAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className='flex flex-col'>
          <span className='font-semibold'>Total Items</span>
          <span className='font-medium'>{totalItems} item(s)</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Total Quantity</span>
          <span className='font-medium'>{totalQuantity}</span>
        </div>
      </div>

      <div className='space-y-4 w-full lg:w-1/2'>
        <div className='flex flex-col gap-0.5'>
          <span className='font-semibold'>Subtotal</span>
          <span className='font-medium'>${data?.data?.subtotal}</span>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='font-semibold'>Discount</span>
          <span className='font-medium'>${data?.data?.discount}</span>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='font-semibold'>Total Amount</span>
          <span className='font-medium text-lg'>${data?.data?.total}</span>
        </div>

        {/* Order Items */}
        <div className='space-y-3'>
          <h4 className='font-semibold'>Order Items</h4>
          {data?.data?.items?.map((item: OrderItem, index: number) => (
            <div key={index} className='p-3 border rounded-lg'>
              <div className='flex justify-between items-start'>
                <div className='space-y-1'>
                  <div className='font-medium'>
                    {item.product?.name || `Product ID: ${item.productId}`}
                  </div>
                  {item.product?.sku && <div className='text-sm'>SKU: {item.product.sku}</div>}
                  <div className='text-sm'>Quantity: {item.quantity}</div>
                  <div className='text-sm'>Unit Price: ${item.unitPrice}</div>
                </div>
                <div className='font-medium'>${item.totalPrice}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
