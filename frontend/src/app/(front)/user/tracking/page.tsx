'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  PackageCheck,
  Search,
  Truck,
  XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OrderTrackingPage() {
  const { push } = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [shouldFetch, setShouldFetch] = useState(false)

  // Use useAsync hook with conditional fetching
  const { data, loading, error } = useAsync<{
    success: boolean
    data: Order & { items: OrderItem[] }
    message: string
  }>(
    shouldFetch && orderNumber.trim() ? () => `/customer/orders/number/${orderNumber.trim()}` : null
  )

  const handleTrackOrder = () => {
    if (!orderNumber.trim()) {
      return
    }
    setShouldFetch(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrackOrder()
    }
  }

  // Reset when order number changes
  const handleOrderNumberChange = (value: string) => {
    setOrderNumber(value)
    setShouldFetch(false)
  }

  const order = data?.success ? data.data : null
  const apiError = data?.success === false ? data.message : error?.message || error
  const showEmptyError = shouldFetch && !orderNumber.trim()
  const displayError = showEmptyError ? 'Please enter an order number' : apiError

  const getOrderIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className='w-5 h-5 text-yellow-500' />
      case 'CONFIRMED':
        return <CheckCircle className='w-5 h-5 text-blue-500' />
      case 'PARTIAL':
        return <Package className='w-5 h-5 text-orange-500' />
      case 'COMPLETED':
        return <PackageCheck className='w-5 h-5 text-green-500' />
      case 'CANCELLED':
        return <XCircle className='w-5 h-5 text-red-500' />
      case 'REFUNDED':
        return <Package className='w-5 h-5 text-purple-500' />
      default:
        return <Package className='w-5 h-5 text-gray-500' />
    }
  }

  const getDeliveryIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className='w-4 h-4 text-yellow-500' />
      case 'PROCESSING':
        return <Package className='w-4 h-4 text-blue-500' />
      case 'DELIVERED':
        return <Truck className='w-4 h-4 text-green-500' />
      case 'FAILED':
        return <XCircle className='w-4 h-4 text-red-500' />
      case 'PARTIAL':
        return <Package className='w-4 h-4 text-orange-500' />
      default:
        return <Clock className='w-4 h-4 text-gray-500' />
    }
  }

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 20
      case 'CONFIRMED':
        return 40
      case 'PARTIAL':
        return 60
      case 'COMPLETED':
        return 100
      case 'CANCELLED':
        return 0
      case 'REFUNDED':
        return 0
      default:
        return 0
    }
  }

  return (
    <div className='space-y-6 mx-auto max-w-4xl'>
      {/* Header */}
      <div className='space-y-2 text-center'>
        <Typography variant='h4' weight='semibold'>
          Track Your Order
        </Typography>
        <Typography variant='body1' className='text-muted-foreground'>
          Enter your order number to track its status and delivery progress
        </Typography>
      </div>

      {/* Search Form */}
      <Card className='bg-foreground/80 border-muted-foreground'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Search className='w-5 h-5' />
            Order Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-3'>
            <div className='flex-1'>
              <Input
                placeholder='Enter your order number (e.g., ORD123456)'
                value={orderNumber}
                onChange={(e) => handleOrderNumberChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className='h-12'
              />
            </div>
            <Button onClick={handleTrackOrder} disabled={loading} size='lg' className='px-6'>
              {loading ? (
                <MotionLoader size='sm' variant='dots' />
              ) : (
                <>
                  <Search className='mr-2 w-4 h-4' />
                  Track Order
                </>
              )}
            </Button>
          </div>
          {displayError && (
            <Typography variant='body2' className='mt-3 text-red-500'>
              {displayError}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Order Results */}
      {order && (
        <Card className='bg-foreground/80 border-muted-foreground'>
          <CardHeader className='pb-4'>
            <div className='flex justify-between items-start'>
              <div className='flex items-center gap-3'>
                {getOrderIcon(order.status)}
                <div>
                  <Typography variant='h6' weight='semibold'>
                    Order #{order.orderNumber}
                  </Typography>
                  <Typography variant='body2' className='text-muted-foreground'>
                    Placed on {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => push(`/user/orders/${order.orderNumber}`)}
                >
                  View Full Details
                  <ArrowRight className='ml-2 w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Status Progress Bar */}
            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-muted-foreground'>
                  Order Progress
                </Typography>
                <Typography variant='body2' weight='medium'>
                  {getStatusProgress(order.status)}%
                </Typography>
              </div>
              <div className='bg-muted rounded-full w-full h-2 overflow-hidden'>
                <div
                  className={cn(
                    'rounded-full h-full transition-all duration-300',
                    order.status === 'COMPLETED'
                      ? 'bg-green-500'
                      : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  )}
                  style={{ width: `${getStatusProgress(order.status)}%` }}
                />
              </div>
            </div>

            {/* Status Cards Row */}
            <div className='gap-4 grid grid-cols-1 md:grid-cols-3'>
              {/* Order Status */}
              <div className='bg-background/50 p-3 border border-muted-foreground/30 rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  {getOrderIcon(order.status)}
                  <Typography variant='body2' className='text-muted-foreground'>
                    Order Status
                  </Typography>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-1 border rounded-full font-medium text-xs',
                    getStatusColor(order.status)
                  )}
                >
                  {order.status}
                </span>
              </div>

              {/* Delivery Status */}
              <div className='bg-background/50 p-3 border border-muted-foreground/30 rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  {getDeliveryIcon(order.deliveryStatus)}
                  <Typography variant='body2' className='text-muted-foreground'>
                    Delivery Status
                  </Typography>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-1 border rounded-full font-medium text-xs',
                    getDeliveryStatusColor(order.deliveryStatus)
                  )}
                >
                  {order.deliveryStatus}
                </span>
              </div>

              {/* Order Total */}
              <div className='bg-background/50 p-3 border border-muted-foreground/30 rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <Package className='w-4 h-4 text-primary' />
                  <Typography variant='body2' className='text-muted-foreground'>
                    Total Amount
                  </Typography>
                </div>
                <Typography variant='h6' weight='semibold' className='text-primary'>
                  ${parseFloat(order.total.toString()).toFixed(2)}
                </Typography>
              </div>
            </div>

            {/* Items Summary */}
            {order.items && order.items.length > 0 && (
              <div className='bg-background/50 p-3 border border-muted-foreground/30 rounded-lg'>
                <Typography variant='body2' className='mb-2 text-muted-foreground'>
                  Items ({order.items.length})
                </Typography>
                <div className='space-y-2'>
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={item.id || index} className='flex justify-between items-center'>
                      <div className='flex items-center gap-2'>
                        <div className='bg-primary/10 p-1 rounded'>
                          <Package className='w-3 h-3 text-primary' />
                        </div>
                        <Typography variant='body2'>
                          {item.product?.name || `Item #${item.id}`} × {item.quantity}
                        </Typography>
                      </div>
                      <Typography variant='body2' weight='medium' className='text-primary'>
                        ${parseFloat(item.totalPrice.toString()).toFixed(2)}
                      </Typography>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <Typography variant='body2' className='text-muted-foreground'>
                      +{order.items.length - 3} more items
                    </Typography>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Date */}
            {order.deliveredAt && (
              <div className='flex items-center gap-2 text-green-600'>
                <CheckCircle className='w-4 h-4' />
                <Typography variant='body2'>
                  Delivered on {format(new Date(order.deliveredAt), 'MMM dd, yyyy')}
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className='bg-foreground/80 border-muted-foreground'>
        <CardContent className='py-6'>
          <div className='space-y-3 text-center'>
            <Typography variant='h6' weight='semibold'>
              Need Help?
            </Typography>
            <Typography variant='body2' className='text-muted-foreground'>
              Can&apos;t find your order? Make sure you entered the correct order number. Order
              numbers are usually found in your email confirmation.
            </Typography>
            <div className='flex justify-center gap-3'>
              <Button variant='outline' size='sm'>
                Contact Support
              </Button>
              <Button variant='outline' size='sm' onClick={() => push('/user/orders')}>
                View All Orders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
