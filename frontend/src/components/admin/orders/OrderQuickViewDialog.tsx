'use client'

import CustomImage from '@/components/common/CustomImage'
import StatusBadge from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Tag,
  Truck,
  User,
  ExternalLink
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface OrderQuickViewDialogProps {
  order: Order
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export default function OrderQuickViewDialog({
  order,
  open: externalOpen,
  onOpenChange
}: OrderQuickViewDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  // Fetch order details by ID
  const { data, loading } = useAsync<OrderDetailResponse>(
    isOpen ? () => `/admin/orders/${order.id}` : null
  )

  const orderDetails = data?.data

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className='sm:min-w-[32rem] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 flex-wrap'>
            <Package className='w-5 h-5' />
            <span>Order Details</span>
            {loading ? (
              <Skeleton className='h-6 w-20 rounded-full' />
            ) : (
              <>
                <StatusBadge type='order' status={orderDetails?.status || order.status} />
                <StatusBadge status={orderDetails?.deliveryStatus || order.deliveryStatus} />
              </>
            )}
          </DialogTitle>
          <DialogDescription className='flex items-center justify-between'>
            {loading ? (
              <Skeleton className='h-4 w-48' />
            ) : (
              <>
                <span>
                  Order details and information for {orderDetails?.orderNumber || order.orderNumber}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setOpen(false)
                    router.push(`/admin/orders/${order.id}`)
                  }}
                  className='ml-4'
                >
                  <ExternalLink className='mr-2 w-4 h-4' />
                  View Full Details
                </Button>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingSkeleton />
        ) : orderDetails ? (
          <div className='space-y-6'>
            {/* Order Summary Section */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Order Information */}
              <div className='space-y-4'>
                <h3 className='font-semibold text-lg flex items-center gap-2'>
                  <ShoppingCart className='w-4 h-4' />
                  Order Information
                </h3>
                <div className='space-y-3 p-4 rounded-lg border'>
                  <div className='flex items-start justify-between'>
                    <span className='text-sm text-muted-foreground'>Order Number</span>
                    <span className='font-mono font-medium'>{orderDetails.orderNumber}</span>
                  </div>
                  <div className='flex items-start justify-between'>
                    <span className='text-sm text-muted-foreground'>Order ID</span>
                    <span className='font-medium'>#{orderDetails.id}</span>
                  </div>
                  <div className='flex items-start justify-between'>
                    <span className='text-sm text-muted-foreground flex items-center gap-1'>
                      <CalendarDays className='w-3 h-3' />
                      Created At
                    </span>
                    <span className='text-sm'>
                      {new Date(orderDetails.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {orderDetails.deliveredAt && (
                    <div className='flex items-start justify-between'>
                      <span className='text-sm text-muted-foreground flex items-center gap-1'>
                        <Truck className='w-3 h-3' />
                        Delivered At
                      </span>
                      <span className='text-sm'>
                        {new Date(orderDetails.deliveredAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              {orderDetails.user && (
                <div className='space-y-4'>
                  <h3 className='font-semibold text-lg flex items-center gap-2'>
                    <User className='w-4 h-4' />
                    Customer Information
                  </h3>
                  <div className='space-y-3 p-4 rounded-lg border'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold'>
                        {(orderDetails.user.firstName?.[0] || orderDetails.user.email?.[0] || 'C').toUpperCase()}
                      </div>
                      <div className='flex-1'>
                        <div className='font-medium'>
                          {orderDetails.user.firstName} {(orderDetails.user as any)?.lastName}
                        </div>
                        <div className='text-sm text-muted-foreground'>{orderDetails.user.email}</div>
                        {(orderDetails.user as any)?.username && (
                          <div className='text-sm text-muted-foreground'>
                            @{(orderDetails.user as any)?.username}
                          </div>
                        )}
                        {(orderDetails.user as any)?.telegramUsername && (
                          <div className='text-sm text-muted-foreground'>
                            Telegram: @{orderDetails.user.telegramUsername}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='flex items-start justify-between'>
                      <span className='text-sm text-muted-foreground'>Customer ID</span>
                      <span className='font-medium'>#{orderDetails.user.id}</span>
                    </div>
                    {orderDetails.user.totalOrders !== null && (
                      <div className='flex items-start justify-between'>
                        <span className='text-sm text-muted-foreground'>Total Orders</span>
                        <Badge variant='secondary'>{orderDetails.user.totalOrders}</Badge>
                      </div>
                    )}
                    {orderDetails.user.totalSpent !== null && (
                      <div className='flex items-start justify-between'>
                        <span className='text-sm text-muted-foreground'>Total Spent</span>
                        <span className='font-semibold text-green-600'>
                          ${Number(orderDetails.user.totalSpent).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Product Information */}
            <div className='space-y-4'>
              <h3 className='font-semibold text-lg flex items-center gap-2'>
                <Package className='w-4 h-4' />
                Product Details
              </h3>
              <div className='p-4 rounded-lg border'>
                <div className='flex items-start gap-4'>
                  {orderDetails.product.thumbnail && (
                    <CustomImage
                      src={orderDetails.product.thumbnail}
                      alt={orderDetails.product.name}
                      width={80}
                      height={80}
                      className='rounded-md object-cover'
                    />
                  )}
                  <div className='flex-1 space-y-2'>
                    <div className='flex items-start justify-between gap-4'>
                      <h4 className='font-medium text-base'>{orderDetails.product.name}</h4>
                      <Badge className='whitespace-nowrap'>
                        <Tag className='w-3 h-3 mr-1' />
                        {orderDetails.product.platform}
                      </Badge>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      SKU: <span className='font-mono'>{orderDetails.product.sku}</span>
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      Product ID: #{orderDetails.product.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {((orderDetails as any)?.items && (orderDetails as any).items.length > 1) && (
              <>
                <div className='space-y-4'>
                  <h3 className='font-semibold text-lg flex items-center gap-2'>
                    <Package className='w-4 h-4' />
                    Order Items
                  </h3>
                  <div className='space-y-3'>
                    {(orderDetails as any).items.map((item: any) => (
                      <div key={item.id} className='p-4 rounded-lg border space-y-2'>
                        <div className='flex items-start justify-between gap-4'>
                          <div>
                            <div className='font-medium'>{item.product?.name || `Product #${item.productId}`}</div>
                            <div className='text-sm text-muted-foreground'>
                              Quantity: {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                            </div>
                            {item.childOrderNumber && (
                              <div className='text-xs text-muted-foreground mt-1'>{item.childOrderNumber}</div>
                            )}
                          </div>
                          <div className='font-semibold text-primary'>
                            ${Number(item.totalPrice).toFixed(2)}
                          </div>
                        </div>
                        {(item.status || item.deliveryStatus) && (
                          <div className='flex flex-wrap items-center gap-2'>
                            {item.status && <StatusBadge type='order' status={item.status} />}
                            {item.deliveryStatus && <StatusBadge status={item.deliveryStatus} />}
                            {typeof item.quantityDelivered === 'number' && (
                              <span className='text-xs text-muted-foreground'>
                                Delivered: {item.quantityDelivered}/{item.quantity}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Payment Information */}
            {orderDetails.payment && (
              <div className='space-y-4'>
                <h3 className='font-semibold text-lg flex items-center gap-2'>
                  <CreditCard className='w-4 h-4' />
                  Payment Details
                </h3>
                <div className='p-4 rounded-lg border space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Payment Method</span>
                    <Badge variant='secondary'>{orderDetails.payment.method}</Badge>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Payment Status</span>
                    <StatusBadge type='payment' status={orderDetails.payment.status} />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Payment ID</span>
                    <span className='font-medium'>#{orderDetails.payment.id}</span>
                  </div>
                  <Separator />
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Payment Amount</span>
                    <span className='font-semibold text-lg'>
                      ${Number(orderDetails.payment.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Order Totals */}
            <div className='space-y-4'>
              <h3 className='font-semibold text-lg flex items-center gap-2'>
                <DollarSign className='w-4 h-4' />
                Order Totals
              </h3>
              <div className='p-4 rounded-lg border space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>Subtotal</span>
                  <span className='font-medium'>${Number(orderDetails.subtotal).toFixed(2)}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>Discount</span>
                  <span className='font-medium text-red-600'>
                    -${Number(orderDetails.discount).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className='flex items-center justify-between'>
                  <span className='font-semibold'>Total Amount</span>
                  <span className='font-bold text-xl text-primary'>
                    ${Number(orderDetails.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <p>No order details available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-4'>
          <Skeleton className='h-6 w-40' />
          <div className='space-y-3 p-4 rounded-lg border'>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-32' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-16' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-4 w-36' />
            </div>
          </div>
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-6 w-40' />
          <div className='space-y-3 p-4 rounded-lg border'>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-32' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-40' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-20' />
            </div>
          </div>
        </div>
      </div>
      <Separator />
      <div className='space-y-4'>
        <Skeleton className='h-6 w-32' />
        <div className='p-4 rounded-lg border'>
          <div className='flex gap-4'>
            <Skeleton className='w-20 h-20 rounded-md' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-5 w-full' />
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-4 w-24' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
