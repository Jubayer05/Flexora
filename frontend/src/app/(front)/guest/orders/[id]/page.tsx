'use client'

import { TransferStatusBadge } from '@/components/badge/TransferStatusBadge'
import { VerifyMembershipButton } from '@/components/button/VerifyMembershipButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import OrderDeliveryDialog from '@/components/order/OrderDeliveryDialog'
import OrderDeliveredContent from '@/components/order/OrderDeliveredContent'
import { Typography } from '@/components/common/typography'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import requests from '@/services/network/http'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  ArrowLeft,
  Clock,
  Download,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'

interface OrderDetails {
  id: number
  orderNumber: string
  status: string
  deliveryStatus: string
  product: {
    id: number
    name: string
    platform: string
    type: string
  }
  quantity: number
  quantityDelivered: number
  quantityPending: number
  total: number
  subtotal: number
  discount: number
  customerName?: string
  customerPhone?: string
  deliveryAccounts?: any[]
  deliveries?: any[]
  clientInput?: string | null
  serviceNotes?: string | null
  fulfillmentHistory?: any[]
  createdAt: string
  updatedAt: string
  telegramTransfer?: {
    id: number
    status: TelegramTransferStatus | 'WAITING_PERIOD'
    targetUrl?: string
    customerTelegram?: string
    joinVerified?: boolean
    transferProofUrl?: string
    failureReason?: string
    createdAt?: string
    updatedAt?: string
    meta?: Record<string, unknown>
  } | null
}

export default function GuestOrderDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()

  const [loading, setLoading] = useState(true)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [isDownloading, setIsDownloading] = useState<'txt' | 'excel' | 'json' | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [orderCopied, setOrderCopied] = useState(false)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)

  const orderId = searchParams.get('id') || (params?.id as string)
  const emailParam = searchParams.get('email')

  useEffect(() => {
    const email = emailParam || sessionStorage.getItem('guestVerifiedEmail') || ''
    if (email) {
      setGuestEmail(email)
      fetchOrderDetails(email)
    } else {
      toast.error('Email not found. Please access orders through the verification page.')
      router.push('/user/purchased-items')
    }
  }, [emailParam])

  const fetchOrderDetails = async (email: string) => {
    if (!orderId) {
      toast.error('Order ID not found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await requests.get(`/customer/orders/${orderId}`, {
        params: { guestEmail: email }
      })

      if (response.success && response.data) {
        setOrderDetails(response.data)
      } else if (response.data) {
        setOrderDetails(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching order:', error)
      toast.error(error?.response?.data?.message || 'Failed to load order details')
      router.push('/user/purchased-items')
    } finally {
      setLoading(false)
    }
  }

  const downloadOrder = async (format: 'txt' | 'excel' | 'json') => {
    if (!orderDetails) return

    setIsDownloading(format)
    try {
      const response = await requests.get(`/customer/orders/guest/download`, {
        params: {
          orderId: orderDetails.id,
          email: guestEmail,
          format
        },
        responseType: 'blob'
      })

      // Create blob and download
      const blob = response instanceof Blob
        ? response
        : new Blob([response], {
        type:
          format === 'json'
            ? 'application/json'
            : format === 'excel'
              ? 'text/csv;charset=utf-8'
              : 'text/plain'
        })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Order_${orderDetails.orderNumber}.${format === 'excel' ? 'csv' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Order downloaded as ${format.toUpperCase()}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to download as ${format.toUpperCase()}`)
    } finally {
      setIsDownloading(null)
    }
  }

  const copyOrderNumber = () => {
    if (orderDetails) {
      navigator.clipboard.writeText(orderDetails.orderNumber)
      setOrderCopied(true)
      setTimeout(() => setOrderCopied(false), 2000)
      toast.success('Order number copied!')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center px-4'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-primary mx-auto mb-4' />
          <Typography variant='body2' className='text-muted-foreground'>
            Loading order details...
          </Typography>
        </div>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center px-4'>
        <div className='w-full max-w-md text-center'>
          <Typography variant='h3' className='mb-4 text-foreground'>
            Order Not Found
          </Typography>
          <Button onClick={() => router.push('/user/purchased-items')} className='w-full'>
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background py-12 px-4'>
      <div className='max-w-3xl mx-auto'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8'>
          <Button variant='outline' size='sm' onClick={() => router.push('/user/purchased-items')}>
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Orders
          </Button>
          <Typography variant='h2' className='text-foreground'>
            Order Details
          </Typography>
        </div>

        {/* Order Summary Card */}
        <div className='bg-card rounded-lg border border-border p-8 mb-6 shadow-sm'>
          <div className='grid md:grid-cols-2 gap-6'>
            {/* Left Column */}
            <div className='space-y-6'>
              <div>
                <Label className='text-muted-foreground text-sm'>Order Number</Label>
                <div className='flex items-center gap-2 mt-1'>
                  <Typography variant='subtitle1' className='font-mono font-bold text-foreground'>
                    {orderDetails.orderNumber}
                  </Typography>
                  <button
                    onClick={copyOrderNumber}
                    className='text-muted-foreground hover:text-foreground transition-colors'
                  >
                    <Copy className={`w-4 h-4 ${orderCopied ? 'text-green-400' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <Label className='text-muted-foreground text-sm'>Product</Label>
                <Typography variant='subtitle1' className='mt-1 text-foreground'>
                  {orderDetails.product.name}
                </Typography>
              </div>

              <div>
                <Label className='text-muted-foreground text-sm'>Platform</Label>
                <Typography variant='subtitle1' className='mt-1 text-foreground'>
                  {orderDetails.product.platform}
                </Typography>
              </div>

              <div>
                <Label className='text-muted-foreground text-sm'>Quantity</Label>
                <Typography variant='subtitle1' className='mt-1 text-foreground'>
                  {orderDetails.quantity} {orderDetails.quantity === 1 ? 'item' : 'items'}
                </Typography>
              </div>
            </div>

            {/* Right Column */}
            <div className='space-y-6'>
              <div>
                <Label className='text-muted-foreground text-sm'>Order Date</Label>
                <Typography variant='subtitle1' className='mt-1 text-foreground'>
                  {new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </div>

              <div>
                <Label className='text-muted-foreground text-sm'>Status</Label>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='w-2 h-2 rounded-full bg-blue-500' />
                  <Typography variant='subtitle1' className='text-foreground'>
                    {orderDetails.status}
                  </Typography>
                </div>
              </div>

              <div>
                <Label className='text-muted-foreground text-sm'>Delivery Status</Label>
                <div className='flex items-center gap-2 mt-1'>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      orderDetails.deliveryStatus === 'DELIVERED'
                        ? 'bg-green-500'
                        : orderDetails.deliveryStatus === 'PROCESSING'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                    }`}
                  />
                  <Typography variant='subtitle1' className='text-foreground'>
                    {orderDetails.deliveryStatus}
                  </Typography>
                </div>
              </div>

              <div className='pt-2 border-t border-border'>
                <Label className='text-muted-foreground text-sm'>Total Amount</Label>
                <Typography variant='h2' className='mt-1 text-primary font-bold'>
                  ${parseFloat(orderDetails.total.toString()).toFixed(2)}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {isTelegramTransferProduct(orderDetails.product) && orderDetails.telegramTransfer && (
          <div className='bg-card rounded-lg border border-border p-6 mb-6 shadow-sm'>
            <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-3'>
                <div>
                  <Typography variant='subtitle1' className='font-semibold text-foreground'>
                    Transfer Progress
                  </Typography>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Follow the transfer steps from your email, then use the button below once you
                    have joined the group or channel.
                  </p>
                </div>

                <div className='space-y-2'>
                  <TransferStatusBadge status={orderDetails.telegramTransfer.status} />
                  {orderDetails.telegramTransfer.targetUrl && (
                    <p className='text-sm text-muted-foreground break-all'>
                      Target: {orderDetails.telegramTransfer.targetUrl}
                    </p>
                  )}
                  {orderDetails.telegramTransfer.failureReason && (
                    <p className='text-sm text-red-600 dark:text-red-400'>
                      {orderDetails.telegramTransfer.failureReason}
                    </p>
                  )}
                </div>
              </div>

              {orderDetails.telegramTransfer.status === 'VERIFICATION_REQUIRED' && (
                <VerifyMembershipButton
                  transferId={orderDetails.telegramTransfer.id}
                  currentStatus={orderDetails.telegramTransfer.status}
                  guestEmail={guestEmail}
                  onVerified={() => fetchOrderDetails(guestEmail)}
                />
              )}
            </div>
          </div>
        )}

        {/* Delivery Progress */}
        {orderDetails.deliveryStatus !== 'DELIVERED' &&
          !(isTelegramTransferProduct(orderDetails.product) && orderDetails.telegramTransfer) && (
          <div className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 mb-6'>
            <Typography variant='subtitle1' className='font-semibold mb-4 flex items-center gap-2 text-foreground'>
              <Clock className='w-5 h-5' />
              {orderDetails.deliveryStatus === 'PARTIAL' ? 'Partial Delivery Ready' : 'Order is Being Prepared'}
            </Typography>

            <div className='space-y-3'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>
                  Delivered: {orderDetails.quantityDelivered}/{orderDetails.quantity}
                </span>
                <span className='font-semibold text-foreground'>
                  {Math.round((orderDetails.quantityDelivered / orderDetails.quantity) * 100)}%
                </span>
              </div>
              <div className='w-full bg-amber-500/15 rounded-full h-2'>
                <div
                  className='bg-amber-500 rounded-full h-2 transition-all'
                  style={{
                    width: `${(orderDetails.quantityDelivered / orderDetails.quantity) * 100}%`
                  }}
                />
              </div>
              <p className='text-xs text-amber-700 dark:text-amber-200'>
                {orderDetails.quantityDelivered > 0
                  ? 'Delivered credentials are available now. Remaining items will appear automatically after restock.'
                  : 'Download options will be available once credentials are delivered.'}
              </p>
            </div>
          </div>
        )}

        {/* Download Section */}
        {(orderDetails.deliveryStatus === 'DELIVERED' ||
          (orderDetails.deliveryStatus === 'PARTIAL' && orderDetails.quantityDelivered > 0)) && (
          <div className='bg-card rounded-lg border border-border p-8 mb-6 shadow-sm'>
            <Typography variant='subtitle1' className='font-semibold mb-6 text-foreground'>
              {orderDetails.deliveryStatus === 'PARTIAL' ? 'Partial Delivery Options' : 'Delivery Options'}
            </Typography>

            <div className='space-y-4'>
              <Button
                onClick={() => setIsDeliveryDialogOpen(true)}
                className='w-full'
              >
                <Download className='w-4 h-4 mr-2' />
                {orderDetails.deliveryStatus === 'PARTIAL' ? 'Open Partial Delivery Popup' : 'Open Delivery Popup'}
              </Button>
              <p className='text-xs text-muted-foreground'>
                Open the shared delivery popup to review credentials and download TXT, Excel, or
                JSON exports.
              </p>
            </div>
          </div>
        )}

        <div className='bg-card rounded-lg border border-border p-8 mb-6 shadow-sm'>
          <div className='mb-6'>
            <Typography variant='subtitle1' className='font-semibold text-foreground'>
              Full Order Details
            </Typography>
            <p className='text-sm text-muted-foreground mt-1'>
              Review delivered credentials, passwords, files, and all order-related fulfillment data.
            </p>
          </div>

          <OrderDeliveredContent
            deliveryStatus={orderDetails.deliveryStatus}
            quantityDelivered={orderDetails.quantityDelivered}
            quantityPending={orderDetails.quantityPending}
            deliveryAccounts={orderDetails.deliveryAccounts || []}
            deliveries={orderDetails.deliveries || []}
            productType={orderDetails.product.type}
            productPlatform={orderDetails.product.platform}
            productName={orderDetails.product.name}
            telegramTransfer={orderDetails.telegramTransfer}
            premiumSubscription={(orderDetails as any).premiumSubscription}
            clientInput={orderDetails.clientInput}
            serviceNotes={orderDetails.serviceNotes}
            fulfillmentHistory={orderDetails.fulfillmentHistory || []}
            guestEmail={guestEmail}
            customerName={orderDetails.customerName}
            customerPhone={orderDetails.customerPhone}
            emptyTitle='Delivery details are not ready yet'
            emptyDescription='Once delivery is completed, this section will show the full credential and file snapshot for your order.'
          />
        </div>

        {/* Action Buttons */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button onClick={() => router.push('/user/purchased-items')} variant='outline' className='flex-1'>
            Back to Orders
          </Button>
          <Button onClick={() => router.push('/shop')} className='flex-1'>
            Continue Shopping
          </Button>
        </div>
      </div>

      {orderDetails && (
        <OrderDeliveryDialog
          open={isDeliveryDialogOpen}
          onOpenChange={setIsDeliveryDialogOpen}
          orderId={orderDetails.id}
          orderNumber={orderDetails.orderNumber}
          email={guestEmail}
          isAuthenticated={false}
          productName={orderDetails.product.name}
          productPlatform={orderDetails.product.platform}
          productType={orderDetails.product.type}
        />
      )}
    </div>
  )
}
