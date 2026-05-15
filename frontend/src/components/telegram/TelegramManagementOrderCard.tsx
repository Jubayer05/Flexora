'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreVertical,
  RefreshCw,
  X
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TelegramOrderDetailsCard } from './TelegramOrderDetailsCard'

interface Order {
  id: number
  orderNumber: string
  status: string
  deliveryStatus: string
  product?: {
    id: number
    name: string
    platform: string
    type: string
  }
  quantity: number
  total: number
  createdAt: string
  quantityDelivered?: number
  quantityPending?: number
  telegramTransfer?: any
  [key: string]: any
}

interface TelegramManagementOrderCardProps {
  order: Order
  requestingOtp: boolean
  kickingSession: boolean
  onViewDetails: (orderId: number) => void
  onOpenTransfer?: (order: Order) => void
  onOpenDelivery: (orderId: number, orderNumber: string) => void
  onDownloadInvoice: (orderId: number, orderNumber: string) => void
  onGetCode?: (order: Order) => void
  onRequestOtp?: (orderId: number) => void
  onKickSession?: (orderId: number) => void
}

export default TelegramManagementOrderCard

export function TelegramManagementOrderCard({
  order,
  requestingOtp,
  kickingSession,
  onViewDetails,
  onOpenTransfer,
  onOpenDelivery,
  onDownloadInvoice,
  onGetCode,
  onRequestOtp,
  onKickSession
}: TelegramManagementOrderCardProps) {
  return (
    <Card className="glass-card rounded-xl p-lg border border-outline-variant/20">
      <div className="flex flex-col gap-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-data-md text-data-md text-primary">#{order.orderNumber}</p>
            <p className="font-medium text-on-surface mt-xs">{order.product?.name || 'Product'}</p>
          </div>
          <Badge className={cn('rounded-full', getStatusColor(order.status))}>
            {order.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-md text-xs text-on-surface-variant">
          <span>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
          <span>Qty: {order.quantity}</span>
          <span className="font-semibold text-primary">${parseFloat(order.total.toString()).toFixed(2)}</span>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Delivery:</span>
            <Badge className={cn('rounded-full', getDeliveryStatusColor(order.deliveryStatus))}>
              {order.deliveryStatus}
            </Badge>
          </div>
        </div>

        <div className="flex gap-sm pt-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(order.id)}
            className="flex-1 border-outline-variant hover:bg-surface-container"
          >
            <Eye className="size-4 mr-1" />
            Details
          </Button>
          {order.deliveryStatus === 'DELIVERED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDelivery(order.id, order.orderNumber)}
              className="flex-1 border-outline-variant hover:bg-surface-container"
            >
              <Download className="size-4 mr-1" />
              Downloads
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}