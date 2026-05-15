'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Download,
  Eye,
  KeyRound,
  Loader2,
  Phone,
  RefreshCw,
  Shield
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TelegramCodeDialog } from './TelegramCodeDialog'

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

interface TelegramOrderDetailsCardProps {
  order: Order
  onDownloadClick: (orderId: number, orderNumber: string) => void
}

export default TelegramOrderDetailsCard

export function TelegramOrderDetailsCard({ order, onDownloadClick }: TelegramOrderDetailsCardProps) {
  const [loadingCode, setLoadingCode] = useState(false)

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-on-surface flex items-center gap-sm">
          <Phone className="size-4 text-tertiary" />
          Telegram Account Details
        </h4>
        <Badge className={cn('rounded-full', getDeliveryStatusColor(order.deliveryStatus))}>
          {order.deliveryStatus}
        </Badge>
      </div>

      <div className="bg-surface-container rounded-lg p-md space-y-sm">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Quantity:</span>
          <span className="text-on-surface font-medium">{order.quantity}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Delivered:</span>
          <span className="text-on-surface font-medium">{order.quantityDelivered || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Pending:</span>
          <span className="text-on-surface font-medium">{order.quantityPending || 0}</span>
        </div>
      </div>

      <div className="flex gap-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownloadClick(order.id, order.orderNumber)}
          className="flex-1 border-outline-variant hover:bg-surface-container"
        >
          <Download className="size-4 mr-1" />
          Get Credentials
        </Button>
      </div>
    </div>
  )
}