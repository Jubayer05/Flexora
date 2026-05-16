'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Download, Eye } from 'lucide-react'

type PurchasedOrder = {
  id: number
  orderNumber: string
  status: string
  deliveryStatus: string
  product?: { name?: string }
  quantity: number
  total: number | string
  createdAt: string | Date
  quantityDelivered?: number
}

type PurchasedOrderMobileCardProps = {
  order: PurchasedOrder
  onViewDetails: (orderId: number) => void
  onOpenDelivery: (orderId: number, orderNumber: string) => void
  onDownloadInvoice: (orderId: number, orderNumber: string) => void
}

export function PurchasedOrderMobileCard({
  order,
  onViewDetails,
  onOpenDelivery,
  onDownloadInvoice
}: PurchasedOrderMobileCardProps) {
  const canViewDelivery =
    order.deliveryStatus === 'DELIVERED' ||
    (order.deliveryStatus === 'PARTIAL' && Number(order.quantityDelivered || 0) > 0)

  return (
    <Card className='rounded-xl border border-border bg-card p-4'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='font-medium text-primary'>#{order.orderNumber}</p>
            <p className='mt-1 font-medium text-foreground'>{order.product?.name || 'Product'}</p>
          </div>
          <Badge className={cn('rounded-full', getStatusColor(order.status))}>{order.status}</Badge>
        </div>

        <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
          <span>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
          <span>Qty: {order.quantity}</span>
          <span className='font-semibold text-primary'>
            ${parseFloat(String(order.total)).toFixed(2)}
          </span>
        </div>

        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Delivery</span>
          <Badge className={cn('rounded-full', getDeliveryStatusColor(order.deliveryStatus))}>
            {order.deliveryStatus}
          </Badge>
        </div>

        <div className='flex gap-2 pt-1'>
          <Button variant='outline' size='sm' onClick={() => onViewDetails(order.id)} className='flex-1'>
            <Eye className='mr-1 size-4' />
            Details
          </Button>
          {canViewDelivery ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenDelivery(order.id, order.orderNumber)}
              className='flex-1'
            >
              <Download className='mr-1 size-4' />
              Delivery
            </Button>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            onClick={() => onDownloadInvoice(order.id, order.orderNumber)}
            className='flex-1'
          >
            <Download className='mr-1 size-4' />
            Invoice
          </Button>
        </div>
      </div>
    </Card>
  )
}
