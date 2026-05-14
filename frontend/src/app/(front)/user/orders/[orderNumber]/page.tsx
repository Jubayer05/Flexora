'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  User
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderNumber = params?.orderNumber

  const { data, loading } = useAsync<{
    success: boolean
    data: Order & { items: OrderItem[] }
  }>(() => `/customer/orders/${orderNumber}`)

  if (loading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className='py-12 text-center'>
        <Typography variant='h5' className='text-muted-foreground'>
          Order not found
        </Typography>
      </div>
    )
  }

  const order = data.data

  const getStatusSteps = () => {
    const steps = [
      { status: 'PENDING', label: 'Order Placed', icon: Clock },
      { status: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle },
      { status: 'PARTIAL', label: 'Processing', icon: Package },
      { status: 'COMPLETED', label: 'Completed', icon: PackageCheck }
    ]

    const currentStepIndex = steps.findIndex((step) => step.status === order.status)

    return steps.map((step, index) => ({
      ...step,
      isActive: index <= currentStepIndex,
      isCurrent: step.status === order.status
    }))
  }

  const getDeliverySteps = () => {
    const steps = [
      { status: 'PENDING', label: 'Preparing', icon: Clock },
      { status: 'PROCESSING', label: 'In Transit', icon: Truck },
      { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle }
    ]

    const currentStepIndex = steps.findIndex((step) => step.status === order.deliveryStatus)

    return steps.map((step, index) => ({
      ...step,
      isActive: index <= currentStepIndex,
      isCurrent: step.status === order.deliveryStatus
    }))
  }

  return (
    <div className='space-y-6 mx-auto max-w-5xl'>
      {/* Header with Back Button */}
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => router.back()}>
            <ArrowLeft className='w-5 h-5' />
          </Button>
          <div>
            <Typography variant='h4' weight='semibold'>
              Order #{order.orderNumber}
            </Typography>
            <Typography variant='body2' className='mt-1 text-muted-foreground'>
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy')}
            </Typography>
          </div>
        </div>
        <Button variant='outline' onClick={() => window.location.reload()}>
          <RefreshCw className='mr-2 w-4 h-4' />
          Refresh
        </Button>
      </div>

      {/* Status Cards Row */}
      <div className='gap-4 grid grid-cols-1 md:grid-cols-4'>
        {/* Order Status */}
        <div className='bg-foreground/80 p-4 border border-muted-foreground rounded-lg'>
          <div className='flex items-center gap-3'>
            <div className='bg-primary/10 p-2 rounded-lg'>
              <Package className='w-5 h-5 text-primary' />
            </div>
            <div className='flex-1'>
              <Typography variant='body2' className='text-muted-foreground'>
                Order Status
              </Typography>
              <span
                className={cn(
                  'inline-flex items-center mt-1 px-2.5 py-1 border rounded-full font-medium text-xs',
                  getStatusColor(order.status)
                )}
              >
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Status */}
        <div className='bg-foreground/80 p-4 border border-muted-foreground rounded-lg'>
          <div className='flex items-center gap-3'>
            <div className='bg-primary/10 p-2 rounded-lg'>
              <Truck className='w-5 h-5 text-primary' />
            </div>
            <div className='flex-1'>
              <Typography variant='body2' className='text-muted-foreground'>
                Delivery Status
              </Typography>
              <span
                className={cn(
                  'inline-flex items-center mt-1 px-2.5 py-1 border rounded-full font-medium text-xs',
                  getDeliveryStatusColor(order.deliveryStatus)
                )}
              >
                {order.deliveryStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Items Count */}
        <div className='bg-foreground/80 p-4 border border-muted-foreground rounded-lg'>
          <div className='flex items-center gap-3'>
            <div className='bg-primary/10 p-2 rounded-lg'>
              <Package className='w-5 h-5 text-primary' />
            </div>
            <div className='flex-1'>
              <Typography variant='body2' className='text-muted-foreground'>
                Items
              </Typography>
              <Typography variant='h6' weight='semibold' className='mt-1'>
                {order.items?.length || 0}
              </Typography>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className='bg-foreground/80 p-4 border border-muted-foreground rounded-lg'>
          <div className='flex items-center gap-3'>
            <div className='bg-primary/10 p-2 rounded-lg'>
              <User className='w-5 h-5 text-primary' />
            </div>
            <div className='flex-1'>
              <Typography variant='body2' className='text-muted-foreground'>
                Total Amount
              </Typography>
              <Typography variant='h6' weight='semibold' className='mt-1 text-primary'>
                ${parseFloat(order.total.toString()).toFixed(2)}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='gap-6 grid grid-cols-1 lg:grid-cols-3'>
        {/* Order Progress - Takes 2 columns */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Order Status Timeline */}
          <Card className='bg-foreground/80 border-muted-foreground'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                Order Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {getStatusSteps().map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.status} className='flex items-center gap-4'>
                      <div
                        className={cn(
                          'flex justify-center items-center border-2 rounded-full w-10 h-10',
                          step.isActive
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-muted-foreground text-muted-foreground'
                        )}
                      >
                        <Icon className='w-5 h-5' />
                      </div>
                      <div className='flex-1'>
                        <Typography
                          variant='body1'
                          weight={step.isCurrent ? 'semibold' : 'normal'}
                          className={
                            step.isActive ? 'text-card-foreground' : 'text-muted-foreground'
                          }
                        >
                          {step.label}
                        </Typography>
                        {step.isCurrent && (
                          <Typography variant='body2' className='text-primary'>
                            Current Status
                          </Typography>
                        )}
                      </div>
                      {index < getStatusSteps().length - 1 && (
                        <div
                          className={cn(
                            'left-5 absolute mt-10 w-0.5 h-6',
                            step.isActive ? 'bg-primary' : 'bg-muted-foreground'
                          )}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Timeline */}
          <Card className='bg-foreground/80 border-muted-foreground'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Truck className='w-5 h-5' />
                Delivery Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {getDeliverySteps().map((step) => {
                  const Icon = step.icon
                  return (
                    <div key={step.status} className='flex items-center gap-4'>
                      <div
                        className={cn(
                          'flex justify-center items-center border-2 rounded-full w-10 h-10',
                          step.isActive
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-background border-muted-foreground text-muted-foreground'
                        )}
                      >
                        <Icon className='w-5 h-5' />
                      </div>
                      <div className='flex-1'>
                        <Typography
                          variant='body1'
                          weight={step.isCurrent ? 'semibold' : 'normal'}
                          className={
                            step.isActive ? 'text-card-foreground' : 'text-muted-foreground'
                          }
                        >
                          {step.label}
                        </Typography>
                        {step.isCurrent && (
                          <Typography variant='body2' className='text-green-600'>
                            Current Status
                          </Typography>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className='bg-foreground/80 border-muted-foreground'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                Order Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className='flex justify-between items-center bg-background/50 p-3 border border-muted-foreground/30 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='bg-primary/10 p-2 rounded-lg'>
                        <Package className='w-4 h-4 text-primary' />
                      </div>
                      <div>
                        <Typography variant='body1' weight='medium'>
                          {item.product?.name || `Item #${item.id}`}
                        </Typography>
                        <Typography variant='body2' className='text-muted-foreground'>
                          Quantity: {item.quantity} × $
                          {parseFloat(item.unitPrice.toString()).toFixed(2)}
                        </Typography>
                        {((item as any).status || (item as any).deliveryStatus) && (
                          <div className='flex flex-wrap items-center gap-2 mt-2'>
                            {(item as any).status && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                                  getStatusColor((item as any).status)
                                )}
                              >
                                {(item as any).status}
                              </span>
                            )}
                            {(item as any).deliveryStatus && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                                  getDeliveryStatusColor((item as any).deliveryStatus)
                                )}
                              >
                                {(item as any).deliveryStatus}
                              </span>
                            )}
                            {typeof (item as any).quantityDelivered === 'number' && (
                              <Typography variant='caption' className='text-muted-foreground'>
                                Delivered: {(item as any).quantityDelivered}/{item.quantity}
                              </Typography>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Typography variant='body1' weight='semibold' className='text-primary'>
                      ${parseFloat(item.totalPrice.toString()).toFixed(2)}
                    </Typography>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar - Takes 1 column */}
        <div className='space-y-4'>
          <Card className='bg-foreground/80 border-muted-foreground'>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <Typography variant='body2' className='text-muted-foreground'>
                    Order Number
                  </Typography>
                  <Typography variant='body1' weight='medium'>
                    #{order.orderNumber}
                  </Typography>
                </div>

                <div className='flex justify-between items-center'>
                  <Typography variant='body2' className='text-muted-foreground'>
                    Order Date
                  </Typography>
                  <Typography variant='body1' weight='medium'>
                    {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </div>

                <div className='flex justify-between items-center'>
                  <Typography variant='body2' className='text-muted-foreground'>
                    Subtotal
                  </Typography>
                  <Typography variant='body1' weight='medium'>
                    ${parseFloat(order.subtotal.toString()).toFixed(2)}
                  </Typography>
                </div>

                {parseFloat(order.discount.toString()) > 0 && (
                  <div className='flex justify-between items-center'>
                    <Typography variant='body2' className='text-muted-foreground'>
                      Discount
                    </Typography>
                    <Typography variant='body1' weight='medium' className='text-green-600'>
                      -${parseFloat(order.discount.toString()).toFixed(2)}
                    </Typography>
                  </div>
                )}

                <div className='pt-3 border-muted-foreground/30 border-t'>
                  <div className='flex justify-between items-center'>
                    <Typography variant='body1' weight='semibold'>
                      Total
                    </Typography>
                    <Typography variant='h6' weight='semibold' className='text-primary'>
                      ${parseFloat(order.total.toString()).toFixed(2)}
                    </Typography>
                  </div>
                </div>

                {order.deliveredAt && (
                  <div className='pt-3 border-muted-foreground/30 border-t'>
                    <div className='flex items-center gap-2 text-green-600'>
                      <CheckCircle className='w-4 h-4' />
                      <Typography variant='body2'>
                        Delivered on {format(new Date(order.deliveredAt), 'MMM dd, yyyy')}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          {order.user && (
            <Card className='bg-foreground/80 border-muted-foreground'>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <User className='w-4 h-4 text-muted-foreground' />
                    <Typography variant='body2'>
                      {order.user.firstName} {order.user.lastName}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
