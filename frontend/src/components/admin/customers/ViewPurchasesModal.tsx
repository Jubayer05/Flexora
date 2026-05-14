'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { getImgUrl } from '@/lib/get-image-url'
import { Calendar, ChevronDown, ChevronUp, Package, ShoppingBag, TrendingUp } from 'lucide-react'
import Image from 'next/image'

import OrderDetailsView from '@/components/admin/orders/OrderDetailsView'

interface ViewPurchasesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

interface OrderResponse {
  success: boolean
  orders: Order[]
  pagination: PaginationMeta
}

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PARTIAL: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-600 border-red-500/20',
    REFUNDED: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  }

  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

const getDeliveryStatusColor = (status: DeliveryStatus): string => {
  const colors: Record<DeliveryStatus, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    PROCESSING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    DELIVERED: 'bg-green-500/10 text-green-600 border-green-500/20',
    FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
    PARTIAL: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  }

  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

const formatDate = (date: Date | string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num)
}

export function ViewPurchasesModal({ open, onOpenChange, user }: ViewPurchasesModalProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const isSyntheticGuest = (user as any)?.customerListSource === 'guest-order'
  const orderQuery = user?.email && isSyntheticGuest
    ? `/admin/orders?includeItems=true&guestEmail=${encodeURIComponent(user.email)}&page=1&limit=100`
    : user?.id
      ? `/admin/orders?includeItems=true&userId=${user.id}&page=1&limit=100`
      : null

  const { data, loading } = useAsync<OrderResponse>(() => orderQuery)

  const totalSpent =
    data?.orders?.reduce((sum, order) => {
      const orderTotal = typeof order.total === 'string' ? parseFloat(order.total) : order.total
      return sum + orderTotal
    }, 0) || 0

  const totalOrders = data?.pagination?.total || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-6xl md:max-w-7xl lg:max-w-8xl xl:max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold flex items-center gap-3'>
            <div className='p-2 bg-primary/10 rounded-lg'>
              <ShoppingBag className='h-6 w-6 text-primary' />
            </div>
            <div>
              <div>Purchase History</div>
              {user && (
                <div className='text-sm font-normal text-muted-foreground mt-1 flex items-center gap-2'>
                  <span>
                    {[user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email}
                  </span>
                  {user.isGuest && <Badge variant='secondary'>Guest User</Badge>}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='overflow-auto custom-scrollbar'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 py-4'>
            <div className='bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-muted-foreground'>Total Orders</p>
                  <p className='text-2xl font-bold text-blue-600'>{totalOrders}</p>
                </div>
                <Package className='h-8 w-8 text-blue-500/50' />
              </div>
            </div>

            <div className='bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-muted-foreground'>Total Spent</p>
                  <p className='text-2xl font-bold text-green-600'>{formatCurrency(totalSpent)}</p>
                </div>
                <TrendingUp className='h-8 w-8 text-green-500/50' />
              </div>
            </div>

            <div className='bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-muted-foreground'>Avg. Order Value</p>
                  <p className='text-2xl font-bold text-purple-600'>
                    {formatCurrency(totalOrders > 0 ? totalSpent / totalOrders : 0)}
                  </p>
                </div>
                <Calendar className='h-8 w-8 text-purple-500/50' />
              </div>
            </div>
          </div>

          <div className='flex-1 px-1 pb-4'>
            {loading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='text-center'>
                  <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
                  <p className='text-muted-foreground'>Loading orders...</p>
                </div>
              </div>
            ) : !data?.orders || data.orders.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='p-4 bg-muted/30 rounded-full mb-4'>
                  <ShoppingBag className='h-12 w-12 text-muted-foreground/50' />
                </div>
                <h3 className='text-lg font-semibold mb-2'>No Orders Yet</h3>
                <p className='text-muted-foreground max-w-sm'>
                  This customer hasn&apos;t placed any orders yet.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {data.orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id
                  const items =
                    order.items && order.items.length > 0
                      ? order.items
                      : [
                          {
                            id: order.id,
                            product: order.product,
                            quantity:
                              (order as any).quantity ?? (order as any).quantityOrdered ?? 1,
                            unitPrice: (order as any).unitPrice ?? order.subtotal ?? order.total,
                            totalPrice: order.total
                          }
                        ]

                  return (
                    <div
                      key={order.id}
                      className='border border-border rounded-lg p-4 hover:border-primary/50 transition-colors bg-card'
                    >
                      <div className='flex items-start justify-between gap-4 mb-4 pb-3 border-b border-border'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold text-lg'>#{order.orderNumber}</span>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            <Badge className={getDeliveryStatusColor(order.deliveryStatus)}>
                              {order.deliveryStatus}
                            </Badge>
                          </div>
                          <p className='text-sm text-muted-foreground flex items-center gap-1'>
                            <Calendar className='h-3 w-3' />
                            {formatDate(order.createdAt)}
                          </p>
                        </div>

                        <div className='text-right'>
                          <p className='text-sm text-muted-foreground'>Total</p>
                          <p className='text-xl font-bold text-primary'>
                            {formatCurrency(order.total)}
                          </p>
                          {order.discount && parseFloat(order.discount.toString()) > 0 && (
                            <p className='text-xs text-green-600'>
                              Saved {formatCurrency(order.discount)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {items.map((item: any) => (
                          <div
                            key={item.id}
                            className='flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors'
                          >
                            {item.product?.thumbnail && (
                              <div className='relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0'>
                                <Image
                                  src={getImgUrl(item.product.thumbnail).toString()}
                                  alt={item.product.name || 'Product'}
                                  fill
                                  className='object-cover'
                                  sizes='48px'
                                />
                              </div>
                            )}
                            <div className='flex-1 min-w-0'>
                              <p className='font-medium truncate'>
                                {item.product?.name || 'Unknown Product'}
                              </p>
                              <p className='text-sm text-muted-foreground'>
                                SKU: {item.product?.sku || 'N/A'}
                              </p>
                            </div>
                            <div className='text-right flex-shrink-0'>
                              <p className='font-medium'>
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                              <p className='text-sm font-semibold text-primary'>
                                {formatCurrency(item.totalPrice)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className='mt-4 pt-3 border-t border-border space-y-1'>
                        <div className='flex justify-between text-sm'>
                          <span className='text-muted-foreground'>Subtotal</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.discount && parseFloat(order.discount.toString()) > 0 && (
                          <div className='flex justify-between text-sm text-green-600'>
                            <span>Discount</span>
                            <span>-{formatCurrency(order.discount)}</span>
                          </div>
                        )}
                        <div className='flex justify-between font-semibold text-base pt-1'>
                          <span>Total</span>
                          <span className='text-primary'>{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      <div className='mt-4 pt-4 border-t border-border'>
                        <Button
                          variant='outline'
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className='w-full sm:w-auto'
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className='mr-2 h-4 w-4' />
                              Hide Full Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className='mr-2 h-4 w-4' />
                              View Full Purchase Details
                            </>
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className='mt-6 pt-6 border-t border-border'>
                          <OrderDetailsView order={order} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
