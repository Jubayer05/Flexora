'use client'

import MotionLoader from '@/components/common/MotionLoader'
import OrderDeliveryDialog from '@/components/order/OrderDeliveryDialog'
import OrderDeliveredContent from '@/components/order/OrderDeliveredContent'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  Download,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)

  const { data, loading } = useAsync<{ success: boolean; data: Order }>(
    () => `/customer/orders/${orderId}`
  )
  const { data: reviewSummary } = useAsync<{
    success: boolean
    data: { pendingReviews: Array<{ productId: number }> }
  }>('/customer/feedbacks/summary', false, false)

  const handleDownloadInvoice = async () => {
    if (!orderId || !order) return

    setDownloadingInvoice(true)
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1]

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_ROOT_API}/customer/orders/${orderId}/invoice`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to download invoice')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${order.orderNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice downloaded successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className='text-center py-12 font-manrope'>
        <p className='text-card-foreground/60 text-lg font-medium'>Order not found</p>
      </div>
    )
  }

  const order = data.data
  const groupedOrders = (((order as any).groupedOrders as any[]) || []).filter(Boolean)
  const hasGroupedPurchase = groupedOrders.length > 1
  const canReviewCurrentProduct =
    Array.isArray(reviewSummary?.data?.pendingReviews) &&
    reviewSummary.data.pendingReviews.some((item) => item.productId === order.productId)

  return (
    <div className='space-y-4 max-w-5xl mx-auto font-manrope'>
      {/* Header with Back Button */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.back()}
            className='text-card-foreground hover:bg-muted'
          >
            <ArrowLeft className='h-5 w-5' />
          </Button>
          <div>
            <h1 className='text-card-foreground text-2xl font-semibold'>Order #{order.orderNumber}</h1>
            <p className='text-card-foreground/60 text-sm mt-1'>
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className='border-border text-card-foreground hover:bg-muted'
          >
            <Download className='mr-2 h-4 w-4' />
            {downloadingInvoice ? 'Downloading...' : 'Download Invoice'}
          </Button>
          {order.status === 'PENDING' && (
            <Button variant='destructive' size='sm' className='bg-red-500 hover:bg-red-600'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards Row */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {/* Order Status Card */}
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-primary/10 rounded-lg border border-primary/20'>
                <Package className='h-5 w-5 text-primary' />
              </div>
              <div className='flex-1'>
                <p className='text-card-foreground/60 text-sm mb-1'>Order Status</p>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
                    getStatusColor(order.status)
                  )}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status Card */}
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-primary/10 rounded-lg border border-primary/20'>
                <Truck className='h-5 w-5 text-primary' />
              </div>
              <div className='flex-1'>
                <p className='text-card-foreground/60 text-sm mb-1'>Delivery Status</p>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
                    getDeliveryStatusColor(order.deliveryStatus)
                  )}
                >
                  {order.deliveryStatus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Amount Card */}
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-primary/10 rounded-lg border border-primary/20'>
                <CreditCard className='h-5 w-5 text-primary' />
              </div>
              <div className='flex-1'>
                <p className='text-card-foreground/60 text-sm mb-1'>Total Amount</p>
                <p className='text-primary text-xl font-bold'>
                  ${parseFloat(order.total.toString()).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Order Items - Takes 2 columns */}
        <div className='lg:col-span-2 space-y-4'>
          <Card className='bg-card backdrop-blur-sm border border-border'>
            <CardContent className='p-6'>
              <h2 className='text-card-foreground text-lg font-semibold mb-4'>Order Items</h2>
              <div className='space-y-3'>
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border'
                  >
                    <div className='p-3 bg-primary/10 rounded-lg border border-primary/20'>
                      <Package className='h-6 w-6 text-primary' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-card-foreground text-base font-medium'>
                        {item.product?.name || `Product #${item.productId}`}
                      </p>
                      <p className='text-card-foreground/60 text-sm'>
                        Quantity: {item.quantity} × $
                        {parseFloat(item.unitPrice.toString()).toFixed(2)}
                      </p>
                      {((item as any).status || (item as any).deliveryStatus) && (
                        <div className='mt-2 flex flex-wrap items-center gap-2'>
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
                            <span className='text-card-foreground/60 text-xs'>
                              Delivered: {(item as any).quantityDelivered}/{item.quantity}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className='text-primary text-base font-semibold'>
                      ${parseFloat(item.totalPrice.toString()).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card className='bg-card backdrop-blur-sm border border-border'>
            <CardContent className='p-6'>
              <h2 className='text-card-foreground text-lg font-semibold mb-6'>Order Timeline</h2>
              <div className='relative'>
                {/* Timeline Items */}
                <div className='space-y-8'>
                  {/* Order Placed */}
                  <div className='flex gap-4 relative'>
                    <div className='relative z-10 flex-shrink-0'>
                      <div className='w-11 h-11 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center'>
                        <ShoppingCart className='h-5 w-5 text-primary' />
                      </div>
                      {/* Dashed line below first circle */}
                      {(order.status === 'CONFIRMED' ||
                        order.status === 'COMPLETED' ||
                        order.deliveryStatus === 'PROCESSING' ||
                        order.deliveryStatus === 'DELIVERED' ||
                        order.status === 'PENDING') && (
                        <div className='absolute left-[21px] top-[52px] w-[2px] h-8 border-l-2 border-dashed border-primary/40' />
                      )}
                    </div>
                    <div className='flex-1 pt-1'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <p className='text-card-foreground text-base font-semibold'>Order Placed</p>
                          <p className='text-card-foreground/60 text-sm mt-0.5'>
                            Your order has been successfully placed
                          </p>
                        </div>
                        <div className='text-right flex-shrink-0'>
                          <p className='text-card-foreground/60 text-sm'>
                            {format(new Date(order.createdAt), 'MMM dd')}
                          </p>
                          <p className='text-card-foreground/60 text-xs'>
                            {format(new Date(order.createdAt), 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Confirmed - Only show if confirmed */}
                  {(order.status === 'CONFIRMED' ||
                    order.status === 'COMPLETED' ||
                    order.deliveryStatus === 'PROCESSING' ||
                    order.deliveryStatus === 'DELIVERED') && (
                    <div className='flex gap-4 relative'>
                      <div className='relative z-10 flex-shrink-0'>
                        <div className='w-11 h-11 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center'>
                          <Check className='h-5 w-5 text-blue-500' />
                        </div>
                        {/* Dashed line below second circle */}
                        {order.deliveredAt && (
                          <div className='absolute left-[21px] top-[52px] w-[2px] h-8 border-l-2 border-dashed border-primary/40' />
                        )}
                      </div>
                      <div className='flex-1 pt-1'>
                        <div className='flex items-start justify-between gap-4'>
                          <div>
                            <p className='text-card-foreground text-base font-semibold'>Order Confirmed</p>
                            <p className='text-card-foreground/60 text-sm mt-0.5'>
                              Your order has been confirmed and is being processed
                            </p>
                          </div>
                          <div className='text-right flex-shrink-0'>
                            <p className='text-card-foreground/60 text-sm'>
                              {format(new Date(order.createdAt), 'MMM dd')}
                            </p>
                            <p className='text-card-foreground/60 text-xs'>
                              {format(new Date(order.createdAt), 'hh:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Delivered */}
                  {order.deliveredAt && (
                    <div className='flex gap-4 relative'>
                      <div className='relative z-10 flex-shrink-0'>
                        <div className='w-11 h-11 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center'>
                          <Truck className='h-5 w-5 text-green-500' />
                        </div>
                      </div>
                      <div className='flex-1 pt-1'>
                        <div className='flex items-start justify-between gap-4'>
                          <div>
                            <p className='text-card-foreground text-base font-semibold'>Order Delivered</p>
                            <p className='text-card-foreground/60 text-sm mt-0.5'>
                              Your order has been successfully delivered
                            </p>
                          </div>
                          <div className='text-right flex-shrink-0'>
                            <p className='text-card-foreground/60 text-sm'>
                              {format(new Date(order.deliveredAt), 'MMM dd')}
                            </p>
                            <p className='text-card-foreground/60 text-xs'>
                              {format(new Date(order.deliveredAt), 'hh:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending State */}
                  {!order.deliveredAt && order.status === 'PENDING' && (
                    <div className='flex gap-4 relative'>
                      <div className='relative z-10 flex-shrink-0'>
                        <div className='w-11 h-11 rounded-full bg-muted-foreground/10 border-2 border-muted-foreground/30 flex items-center justify-center'>
                          <Calendar className='h-5 w-5 text-muted-foreground/50' />
                        </div>
                      </div>
                      <div className='flex-1 pt-1'>
                        <p className='text-card-foreground/60 text-base font-medium'>
                          Awaiting confirmation...
                        </p>
                        <p className='text-card-foreground/40 text-sm mt-0.5'>Your order is being reviewed</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary - Takes 1 column */}
        <div className='space-y-4'>
          {hasGroupedPurchase && (
            <Card className='bg-card backdrop-blur-sm border border-border'>
              <CardContent className='p-6 space-y-4'>
                <div>
                  <h2 className='text-card-foreground text-lg font-semibold'>Purchase Group</h2>
                  <p className='text-card-foreground/60 text-sm mt-1'>
                    This checkout created multiple related orders. You can open each one from here.
                  </p>
                </div>

                <div className='space-y-3'>
                  {groupedOrders.map((groupedOrder) => (
                    <div
                      key={groupedOrder.id}
                      className='rounded-lg border border-border bg-muted/40 p-4 space-y-2'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-card-foreground font-medium'>
                            {groupedOrder.product?.name || groupedOrder.orderNumber}
                          </p>
                          <p className='text-card-foreground/60 text-sm'>
                            {groupedOrder.orderNumber}
                            {groupedOrder.isCurrentOrder ? ' • Current order' : ''}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                            getDeliveryStatusColor(groupedOrder.deliveryStatus)
                          )}
                        >
                          {groupedOrder.deliveryStatus}
                        </span>
                      </div>

                      <div className='flex items-center justify-between gap-3 text-sm'>
                        <span className='text-card-foreground/60'>
                          ${parseFloat(groupedOrder.total.toString()).toFixed(2)}
                        </span>
                        {!groupedOrder.isCurrentOrder && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push(`/user/purchased-items/${groupedOrder.id}`)}
                          >
                            View Order
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(order.deliveryStatus === 'DELIVERED' ||
            (order.deliveryStatus === 'PARTIAL' &&
              Number((order as any).quantityDelivered || 0) > 0)) && (
            <Card className='bg-card backdrop-blur-sm border border-border'>
              <CardContent className='p-6 space-y-3'>
                <h2 className='text-card-foreground text-lg font-semibold'>Delivery Details</h2>
                <p className='text-card-foreground/60 text-sm'>
                  Review the delivered credentials snapshot and export it in your preferred format.
                </p>
                <Button onClick={() => setIsDeliveryDialogOpen(true)} className='w-full'>
                  <Download className='mr-2 h-4 w-4' />
                  {order.deliveryStatus === 'PARTIAL' ? 'Open Partial Delivery Popup' : 'Open Delivery Popup'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className='bg-card backdrop-blur-sm border border-border'>
            <CardContent className='p-6 space-y-4'>
              <div>
                <h2 className='text-card-foreground text-lg font-semibold'>Full Order Details</h2>
                <p className='text-card-foreground/60 text-sm mt-1'>
                  Accounts, credentials, passwords, files, and delivery history for this order.
                </p>
              </div>

              <OrderDeliveredContent
                deliveryStatus={order.deliveryStatus}
                quantityDelivered={(order as any).quantityDelivered}
                quantityPending={(order as any).quantityPending}
                deliveryAccounts={((order as any).deliveryAccounts as any[]) || []}
                deliveries={((order as any).deliveries as any[]) || []}
                productType={order.product?.type}
                productPlatform={order.product?.platform}
                productName={order.product?.name}
                telegramTransfer={(order as any).telegramTransfer}
                premiumSubscription={(order as any).premiumSubscription}
                clientInput={(order as any).clientInput}
                serviceNotes={(order as any).serviceNotes}
                fulfillmentHistory={((order as any).fulfillmentHistory as any[]) || []}
                emptyTitle='Delivery details are not ready yet'
                emptyDescription='This section will automatically show credentials, files, and fulfillment notes after the order is delivered.'
              />
            </CardContent>
          </Card>

          {canReviewCurrentProduct ? (
            <Card className='bg-card backdrop-blur-sm border border-border'>
              <CardContent className='p-6 space-y-3'>
                <h2 className='text-card-foreground text-lg font-semibold'>Leave a Review</h2>
                <p className='text-card-foreground/60 text-sm'>
                  Share feedback for this product so it appears on the product page after admin approval.
                </p>
                <Button onClick={() => router.push('/user/reviews')} className='w-full'>
                  Review This Product
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className='bg-card backdrop-blur-sm border border-border'>
            <CardContent className='p-6'>
              <h2 className='text-card-foreground text-lg font-semibold mb-4'>Order Summary</h2>
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <p className='text-card-foreground/60 text-sm'>Subtotal</p>
                  <p className='text-card-foreground text-base font-medium'>
                    ${parseFloat(order.subtotal.toString()).toFixed(2)}
                  </p>
                </div>

                {parseFloat(order.discount.toString()) > 0 && (
                  <div className='flex justify-between items-center'>
                    <p className='text-card-foreground/60 text-sm'>Discount</p>
                    <p className='text-green-400 text-base font-medium'>
                      -${parseFloat(order.discount.toString()).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className='border-t border-border pt-3 mt-3'>
                  <div className='flex justify-between items-center'>
                    <p className='text-card-foreground text-base font-semibold'>Total</p>
                    <p className='text-primary text-xl font-bold'>
                      ${parseFloat(order.total.toString()).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderDeliveryDialog
        open={isDeliveryDialogOpen}
        onOpenChange={setIsDeliveryDialogOpen}
        orderId={order.id}
        orderNumber={order.orderNumber}
        isAuthenticated={true}
        productName={order.product?.name}
        productPlatform={order.product?.platform}
        productType={order.product?.type}
      />
    </div>
  )
}
