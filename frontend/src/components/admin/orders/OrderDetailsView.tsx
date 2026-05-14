'use client'

import CustomImage from '@/components/common/CustomImage'
import StatusBadge from '@/components/common/StatusBadge'
import OrderDeliveredContent from '@/components/order/OrderDeliveredContent'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { isFileProductType, isPremiumProductType } from '@/lib/deliveryTypes'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Key,
  Package,
  Shield,
  ShoppingCart,
  Tag,
  Truck,
  User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProofViewer } from './ProofViewer'

interface OrderDetailsViewProps {
  order: Order
}

type AdminPurchasedItemDetail = Record<string, any>

const getItemAccounts = (item: AdminPurchasedItemDetail) => {
  const accountsFromItem = Array.isArray(item.deliveryAccounts) ? item.deliveryAccounts : []
  const accountsFromDeliveries = (Array.isArray(item.deliveries) ? item.deliveries : []).flatMap(
    (delivery: any) => (Array.isArray(delivery?.accounts) ? delivery.accounts : [])
  )
  const accounts = accountsFromItem.length > 0 ? accountsFromItem : accountsFromDeliveries

  return accounts.filter((account: any) => account && !account.fileUrl)
}

const getItemFiles = (item: AdminPurchasedItemDetail) => {
  const accountFiles = [
    ...(Array.isArray(item.deliveryAccounts) ? item.deliveryAccounts : []),
    ...(Array.isArray(item.deliveries)
      ? item.deliveries.flatMap((delivery: any) =>
          Array.isArray(delivery?.accounts) ? delivery.accounts : []
        )
      : [])
  ]
    .map((entry: any, index: number) => ({
      name: entry?.fileName || entry?.meta?.fileName || `File ${index + 1}`,
      url: entry?.fileUrl || entry?.meta?.fileUrl || ''
    }))
    .filter((file) => file.url)

  const deliveryFiles = (Array.isArray(item.deliveries) ? item.deliveries : [])
    .map((delivery: any, index: number) => ({
      name: delivery?.meta?.fileName || `Delivery File ${index + 1}`,
      url: delivery?.fileUrl || ''
    }))
    .filter((file) => file.url)

  return [...accountFiles, ...deliveryFiles].filter(
    (file, index, list) => list.findIndex((entry) => entry.url === file.url) === index
  )
}

const csvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

const getManualHistoryItems = (order: any) =>
  [
    ...(Array.isArray(order?.meta?.statusHistory) ? order.meta.statusHistory : []),
    ...(Array.isArray(order?.meta?.deliveryStatusHistory) ? order.meta.deliveryStatusHistory : [])
  ]
    .filter((entry) => entry && typeof entry === 'object')
    .sort(
      (left, right) =>
        new Date(right.changedAt || right.createdAt || 0).getTime() -
        new Date(left.changedAt || left.createdAt || 0).getTime()
    )

export default function OrderDetailsView({ order: initialOrder }: OrderDetailsViewProps) {
  const router = useRouter()
  const [isProofViewerOpen, setIsProofViewerOpen] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<'txt' | 'json' | 'excel' | null>(null)
  const [updatingItemAction, setUpdatingItemAction] = useState<string | null>(null)
  const { data, loading, mutate } = useAsync<{
    success: boolean
    data: Order & {
      items?: OrderItem[]
      deliveries?: any[]
      telegramTransfer?: any
      telegramAccounts?: any[]
      premiumSubscription?: any
      itemDetails?: AdminPurchasedItemDetail[]
    }
  }>(() => `/admin/orders/${initialOrder.id}`)

  const order = data?.data || initialOrder
  const manualHistoryItems = getManualHistoryItems(order)
  const isFileProduct = isFileProductType(order.product?.type)
  const isPremiumProduct = isPremiumProductType(order.product?.type)
  const deliveredFileLinks = (((order as any).deliveries as any[]) || [])
    .flatMap((delivery) => (Array.isArray(delivery?.accounts) ? delivery.accounts : []))
    .map((entry, index) => ({
      name: entry?.fileName || `File ${index + 1}`,
      url: entry?.fileUrl || ''
    }))
    .filter((file) => file.url)
  const deliveredAccounts =
    ((order as any).deliveries?.[0]?.accounts as any[]) ||
    ((order as any).telegramAccounts as any[]) ||
    []
  const purchasedItemDetails =
    (((order as any).itemDetails as AdminPurchasedItemDetail[]) || []).length > 0
      ? ((order as any).itemDetails as AdminPurchasedItemDetail[]) || []
      : [
          {
            id: order.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            product: order.product,
            quantity: order.quantity,
            unitPrice: (order as any).unitPrice,
            totalPrice: order.subtotal || order.total,
            status: order.status,
            deliveryStatus: order.deliveryStatus,
            quantityDelivered: (order as any).quantityDelivered,
            quantityPending: (order as any).quantityPending,
            deliveries: (order as any).deliveries || [],
            deliveryAccounts: ((order as any).telegramAccounts as any[]) || [],
            telegramTransfer: (order as any).telegramTransfer,
            premiumSubscription: (order as any).premiumSubscription
          }
        ]
  const hasStructuredPurchasedItems = purchasedItemDetails.length > 0

  const triggerBlobDownload = (content: string, mimeType: string, fileName: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const normalizeAdminAccount = (account: any) => {
    const credentials = account?.credentials || account || {}
    return {
      username: account?.username || credentials?.username || '',
      email: account?.email || credentials?.email || '',
      phone:
        account?.phone ||
        account?.phoneNumber ||
        credentials?.phone ||
        credentials?.phoneNumber ||
        '',
      password: account?.password || account?.meta?.password || credentials?.password || '',
      hasPremium: Boolean(account?.hasPremium ?? credentials?.hasPremium),
      meta: account?.meta || credentials?.meta || {}
    }
  }

  const buildItemExport = (items: AdminPurchasedItemDetail[], format: 'txt' | 'json' | 'excel') => {
    const payload = items.map((item) => {
      const accounts = getItemAccounts(item).map(normalizeAdminAccount)
      const files = getItemFiles(item)

      return {
        orderNumber: item.orderNumber || order.orderNumber,
        product: item.product?.name || 'Product',
        productType: item.product?.type || 'N/A',
        platform: item.product?.platform || 'N/A',
        quantity: Number(item.quantity || 0),
        delivered: Number(item.quantityDelivered || accounts.length || files.length || 0),
        pending: Number(item.quantityPending || 0),
        status: item.status || 'N/A',
        deliveryStatus: item.deliveryStatus || 'N/A',
        accounts,
        files,
        telegramTransfer: item.telegramTransfer || null,
        premiumSubscription: item.premiumSubscription || null
      }
    })

    if (format === 'json') {
      return {
        content: JSON.stringify(
          {
            orderNumber: order.orderNumber,
            customer: order.user?.email || order.guestEmail || null,
            generatedAt: new Date().toISOString(),
            items: payload
          },
          null,
          2
        ),
        mimeType: 'application/json;charset=utf-8',
        extension: 'json'
      }
    }

    if (format === 'excel') {
      const rows = [
        [
          'Order Number',
          'Product',
          'Type',
          'Platform',
          'Item #',
          'Username',
          'Email',
          'Phone',
          'Password',
          'Premium',
          'File URL',
          'Transfer Status'
        ]
          .map(csvValue)
          .join(',')
      ]

      payload.forEach((item) => {
        const maxRows = Math.max(item.accounts.length, item.files.length, 1)
        for (let index = 0; index < maxRows; index++) {
          const account = item.accounts[index] || {}
          const file = item.files[index] || {}
          rows.push(
            [
              item.orderNumber,
              item.product,
              item.productType,
              item.platform,
              index + 1,
              account.username,
              account.email,
              account.phone,
              account.password,
              account.hasPremium ? 'Yes' : 'No',
              file.url,
              item.telegramTransfer?.status || item.premiumSubscription?.status || ''
            ]
              .map(csvValue)
              .join(',')
          )
        }
      })

      return {
        content: rows.join('\n'),
        mimeType: 'text/csv;charset=utf-8',
        extension: 'csv'
      }
    }

    const lines: string[] = [
      `Order Number: ${order.orderNumber}`,
      `Customer: ${order.user?.email || order.guestEmail || 'N/A'}`,
      `Generated At: ${new Date().toISOString()}`,
      ''
    ]

    payload.forEach((item, itemIndex) => {
      lines.push(`${itemIndex + 1}. ${item.product}`)
      lines.push(`Type: ${item.productType}`)
      lines.push(`Platform: ${item.platform}`)
      lines.push(`Quantity: ${item.quantity}`)
      lines.push(`Status: ${item.status} / ${item.deliveryStatus}`)

      item.accounts.forEach((account, accountIndex) => {
        lines.push(`Account #${accountIndex + 1}`)
        if (account.username) lines.push(`Username: ${account.username}`)
        if (account.email) lines.push(`Email: ${account.email}`)
        if (account.phone) lines.push(`Phone: ${account.phone}`)
        if (account.password) lines.push(`Password: ${account.password}`)
        lines.push(`Premium: ${account.hasPremium ? 'Yes' : 'No'}`)
      })

      item.files.forEach((file, fileIndex) => {
        lines.push(`File #${fileIndex + 1}: ${file.name}`)
        lines.push(`URL: ${file.url}`)
      })

      if (item.telegramTransfer?.status) {
        lines.push(`Transfer Status: ${item.telegramTransfer.status}`)
      }
      if (item.premiumSubscription?.status) {
        lines.push(`Premium Status: ${item.premiumSubscription.status}`)
      }
      lines.push('')
    })

    return {
      content: lines.join('\n'),
      mimeType: 'text/plain;charset=utf-8',
      extension: 'txt'
    }
  }

  const handlePurchasedItemDownload = (
    items: AdminPurchasedItemDetail[],
    format: 'txt' | 'json' | 'excel',
    fileNamePrefix: string
  ) => {
    const exportData = buildItemExport(items, format)
    triggerBlobDownload(
      exportData.content,
      exportData.mimeType,
      `${fileNamePrefix}.${exportData.extension}`
    )
    toast.success(`Exported ${items.length > 1 ? 'all items' : 'item'} as ${format.toUpperCase()}`)
  }

  const handleItemStatusUpdate = async (
    item: AdminPurchasedItemDetail,
    updateType: 'status' | 'delivery'
  ) => {
    const targetOrderId = Number(item.childOrderId || item.orderId || item.id)
    if (!targetOrderId) {
      toast.error('Item order ID not found')
      return
    }

    const actionKey = `${updateType}-${targetOrderId}`
    setUpdatingItemAction(actionKey)
    try {
      if (updateType === 'status') {
        await requests.put(`/admin/orders/${targetOrderId}/status`, {
          status: 'COMPLETED'
        })
        toast.success(`${item.product?.name || 'Item'} marked as completed`)
      } else {
        await requests.put(`/admin/orders/${targetOrderId}/delivery`, {
          deliveryStatus: 'DELIVERED'
        })
        toast.success(`${item.product?.name || 'Item'} marked as delivered`)
      }
      await mutate()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to update ${item.product?.name || 'item'}`
      )
    } finally {
      setUpdatingItemAction(null)
    }
  }

  const handleAdminDeliveryDownload = (format: 'txt' | 'json' | 'excel') => {
    if (!deliveredAccounts.length) {
      toast.error('No delivered credentials found for this order')
      return
    }

    setDownloadingFormat(format)
    try {
      const accounts = deliveredAccounts.map(normalizeAdminAccount)
      const baseFileName = `order-${order.orderNumber}-delivery`

      if (format === 'json') {
        triggerBlobDownload(
          JSON.stringify(
            {
              orderNumber: order.orderNumber,
              product: order.product?.name,
              deliveryStatus: order.deliveryStatus,
              customer: order.user?.email || order.guestEmail || null,
              generatedAt: new Date().toISOString(),
              accounts
            },
            null,
            2
          ),
          'application/json;charset=utf-8',
          `${baseFileName}.json`
        )
      } else if (format === 'excel') {
        const rows = [
          'Account #,Username,Email,Phone,Password,Premium',
          ...accounts.map(
            (account, index) =>
              `"${index + 1}","${account.username}","${account.email}","${account.phone}","${account.password}","${account.hasPremium ? 'Yes' : 'No'}"`
          )
        ]
        triggerBlobDownload(rows.join('\n'), 'text/csv;charset=utf-8', `${baseFileName}.csv`)
      } else {
        const lines = [
          `Order Number: ${order.orderNumber}`,
          `Product: ${order.product?.name || 'N/A'}`,
          `Delivery Status: ${order.deliveryStatus}`,
          `Customer: ${order.user?.email || order.guestEmail || 'N/A'}`,
          ''
        ]

        accounts.forEach((account, index) => {
          lines.push(`Account #${index + 1}`)
          if (account.username) lines.push(`Username: ${account.username}`)
          if (account.email) lines.push(`Email: ${account.email}`)
          if (account.phone) lines.push(`Phone: ${account.phone}`)
          if (account.password) lines.push(`Password: ${account.password}`)
          lines.push(`Premium: ${account.hasPremium ? 'Yes' : 'No'}`)
          lines.push('')
        })

        triggerBlobDownload(lines.join('\n'), 'text/plain;charset=utf-8', `${baseFileName}.txt`)
      }

      toast.success(`Delivery exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to export delivery:', error)
      toast.error('Failed to export delivery details')
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleInvoiceDownload = async () => {
    try {
      const token = Cookies.get('adminToken')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_ROOT_API}/admin/orders/${order.id}/invoice`,
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
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
    } catch (error) {
      console.error('Failed to download admin invoice:', error)
      toast.error('Failed to download invoice')
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className='space-y-6'>
      {/* Order Summary Section */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShoppingCart className='w-5 h-5' />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground'>Order Number</span>
              <span className='font-mono font-medium'>{order.orderNumber}</span>
            </div>
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground'>Order ID</span>
              <span className='font-medium'>#{order.id}</span>
            </div>
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground flex items-center gap-1'>
                <CalendarDays className='w-3 h-3' />
                Created At
              </span>
              <span className='text-sm'>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            {order.deliveredAt && (
              <div className='flex items-start justify-between'>
                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                  <Truck className='w-3 h-3' />
                  Delivered At
                </span>
                <span className='text-sm'>{new Date(order.deliveredAt).toLocaleString()}</span>
              </div>
            )}
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground'>Order Status</span>
              <StatusBadge type='order' status={order.status} />
            </div>
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground'>Delivery Status</span>
              <StatusBadge status={order.deliveryStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <User className='w-5 h-5' />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center gap-3'>
              <Avatar className='w-10 h-10'>
                <AvatarImage
                  src={
                    (order.user as any)?.avatar || (order.user as any)?.profilePicture || undefined
                  }
                  alt={
                    order.user?.firstName || order.customerName || order.guestEmail || 'Customer'
                  }
                />
                <AvatarFallback className='bg-primary/10 text-primary'>
                  {(
                    order.user?.firstName?.[0] ||
                    order.customerName?.[0] ||
                    order.user?.email?.[0] ||
                    order.guestEmail?.[0] ||
                    'C'
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <div className='font-medium'>
                  {[order.user?.firstName, (order.user as any)?.lastName]
                    .filter(Boolean)
                    .join(' ') ||
                    order.customerName ||
                    'Guest Customer'}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {order.user?.email || order.guestEmail || 'N/A'}
                </div>
                {order.user?.username && (
                  <div className='text-sm text-muted-foreground'>@{order.user.username}</div>
                )}
                {order.user?.telegramUsername && (
                  <div className='text-sm text-muted-foreground'>
                    Telegram: @{order.user.telegramUsername}
                  </div>
                )}
              </div>
            </div>
            <Separator />
            {order.user?.id ? (
              <div className='flex items-start justify-between'>
                <span className='text-sm text-muted-foreground'>Customer ID</span>
                <span className='font-medium'>#{order.user.id}</span>
              </div>
            ) : null}
            <div className='flex items-start justify-between'>
              <span className='text-sm text-muted-foreground'>User Type</span>
              <Badge variant={order.user?.isGuest || order.guestEmail ? 'secondary' : 'outline'}>
                {order.user?.isGuest || order.guestEmail ? 'Guest User' : 'Registered User'}
              </Badge>
            </div>
            {(order.user?.phone || (order as any).customerPhone) && (
              <div className='flex items-start justify-between gap-4'>
                <span className='text-sm text-muted-foreground'>Phone</span>
                <span className='text-right text-sm'>
                  {order.user?.phone || (order as any).customerPhone}
                </span>
              </div>
            )}
            {(order.user as any)?.country && (
              <div className='flex items-start justify-between gap-4'>
                <span className='text-sm text-muted-foreground'>Country</span>
                <span className='text-right text-sm'>{(order.user as any).country}</span>
              </div>
            )}
            {order.user?.totalOrders !== null && order.user?.totalOrders !== undefined && (
              <div className='flex items-start justify-between'>
                <span className='text-sm text-muted-foreground'>Total Orders</span>
                <Badge variant='secondary'>{order.user.totalOrders}</Badge>
              </div>
            )}
            {order.user?.totalSpent !== null && order.user?.totalSpent !== undefined && (
              <div className='flex items-start justify-between'>
                <span className='text-sm text-muted-foreground'>Total Spent</span>
                <span className='font-semibold text-green-600'>
                  ${Number(order.user.totalSpent).toFixed(2)}
                </span>
              </div>
            )}
            {order.user?.email && (
              <>
                <Separator />
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => router.push(`/admin/customers?search=${order.user?.email}`)}
                    className='flex-1'
                  >
                    <User className='mr-2 w-4 h-4' />
                    View Profile
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => router.push(`/admin/orders?customerId=${order.user?.id}`)}
                    className='flex-1'
                  >
                    <Package className='mr-2 w-4 h-4' />
                    All Orders
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {manualHistoryItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CalendarDays className='w-5 h-5' />
              Manual Status History
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {manualHistoryItems.slice(0, 8).map((entry: any, index: number) => (
              <div key={`${entry.changedAt || index}-${index}`} className='rounded-lg border p-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold'>
                      {String(entry.action || 'STATUS_UPDATE').replace(/_/g, ' ')}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {entry.from || 'N/A'} → {entry.to || 'N/A'}
                    </p>
                  </div>
                  <Badge variant='outline'>{entry.source || 'ADMIN_UPDATE'}</Badge>
                </div>
                <div className='mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2'>
                  <span>
                    {entry.changedAt
                      ? new Date(entry.changedAt).toLocaleString()
                      : 'Time not available'}
                  </span>
                  {entry.actorEmail && <span className='break-all'>By: {entry.actorEmail}</span>}
                </div>
                {entry.note && <p className='mt-2 text-sm text-muted-foreground'>{entry.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {order.items && order.items.length > 1 && !hasStructuredPurchasedItems && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {order.items.map((item: any) => (
                <div key={item.id} className='rounded-lg border p-4 space-y-2'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <div className='font-medium'>
                        {item.product?.name || `Product #${item.productId}`}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        Quantity: {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                      </div>
                      {item.childOrderNumber && (
                        <div className='text-xs text-muted-foreground mt-1'>
                          {item.childOrderNumber}
                        </div>
                      )}
                    </div>
                    <div className='text-right'>
                      <div className='font-semibold text-primary'>
                        ${Number(item.totalPrice).toFixed(2)}
                      </div>
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
            </CardContent>
          </Card>
          <Separator />
        </>
      )}

      {purchasedItemDetails.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                All Purchased Item Details
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-5'>
              {purchasedItemDetails.map((item, itemIndex) => {
                const accounts = getItemAccounts(item)
                const files = getItemFiles(item)
                const isPremiumItem = isPremiumProductType(item.product?.type)
                const hasTransfer = Boolean(item.telegramTransfer)
                const exportPrefix = `order-${order.orderNumber}-item-${itemIndex + 1}`
                const targetOrderId = Number(item.childOrderId || item.orderId || item.id)
                const completingThisItem = updatingItemAction === `status-${targetOrderId}`
                const deliveringThisItem = updatingItemAction === `delivery-${targetOrderId}`
                const isItemCompleted = item.status === 'COMPLETED'
                const isItemDelivered = item.deliveryStatus === 'DELIVERED'

                return (
                  <div
                    key={`${item.orderId || item.id}-${itemIndex}`}
                    className='rounded-lg border border-border p-4 space-y-4'
                  >
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h3 className='text-base font-semibold'>
                            {item.product?.name || `Item ${itemIndex + 1}`}
                          </h3>
                          <Badge variant='outline'>{item.product?.type || 'N/A'}</Badge>
                          {item.product?.platform && (
                            <Badge variant='secondary'>{item.product.platform}</Badge>
                          )}
                        </div>
                        <div className='mt-1 text-sm text-muted-foreground'>
                          {item.orderNumber || order.orderNumber} · Qty {Number(item.quantity || 0)}{' '}
                          · Delivered{' '}
                          {Number(item.quantityDelivered || accounts.length || files.length || 0)}
                          {Number(item.quantityPending || 0) > 0
                            ? ` · Pending ${Number(item.quantityPending || 0)}`
                            : ''}
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleItemStatusUpdate(item, 'status')}
                          disabled={
                            !targetOrderId || isItemCompleted || updatingItemAction !== null
                          }
                        >
                          {completingThisItem
                            ? 'Completing...'
                            : isItemCompleted
                              ? 'Completed'
                              : 'Mark Item Completed'}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleItemStatusUpdate(item, 'delivery')}
                          disabled={
                            !targetOrderId || isItemDelivered || updatingItemAction !== null
                          }
                        >
                          {deliveringThisItem
                            ? 'Delivering...'
                            : isItemDelivered
                              ? 'Delivered'
                              : 'Mark Item Delivered'}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handlePurchasedItemDownload([item], 'txt', exportPrefix)}
                        >
                          <Download className='mr-2 w-4 h-4' />
                          TXT
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handlePurchasedItemDownload([item], 'excel', exportPrefix)}
                        >
                          <Download className='mr-2 w-4 h-4' />
                          CSV
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handlePurchasedItemDownload([item], 'json', exportPrefix)}
                        >
                          <Download className='mr-2 w-4 h-4' />
                          JSON
                        </Button>
                      </div>
                    </div>

                    <div className='grid gap-3 md:grid-cols-3'>
                      <div className='rounded-md border border-border bg-muted/20 px-3 py-2'>
                        <p className='text-xs text-muted-foreground'>Order Status</p>
                        <div className='mt-1'>
                          <StatusBadge type='order' status={item.status || order.status} />
                        </div>
                      </div>
                      <div className='rounded-md border border-border bg-muted/20 px-3 py-2'>
                        <p className='text-xs text-muted-foreground'>Delivery Status</p>
                        <div className='mt-1'>
                          <StatusBadge status={item.deliveryStatus || order.deliveryStatus} />
                        </div>
                      </div>
                      <div className='rounded-md border border-border bg-muted/20 px-3 py-2'>
                        <p className='text-xs text-muted-foreground'>Total</p>
                        <p className='mt-1 font-semibold'>
                          ${Number(item.totalPrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {(item.clientInput ||
                      item.serviceNotes ||
                      item.fulfillmentHistory?.length > 0) && (
                      <div className='rounded-lg border border-border bg-muted/10 p-3 space-y-2 text-sm'>
                        <p className='font-medium'>Fulfillment Notes</p>
                        {item.clientInput && (
                          <div>
                            <span className='text-muted-foreground'>Client Input: </span>
                            <span className='whitespace-pre-wrap break-words'>
                              {item.clientInput}
                            </span>
                          </div>
                        )}
                        {item.serviceNotes && (
                          <div>
                            <span className='text-muted-foreground'>Service Notes: </span>
                            <span className='whitespace-pre-wrap break-words'>
                              {item.serviceNotes}
                            </span>
                          </div>
                        )}
                        {item.fulfillmentHistory?.length > 0 && (
                          <div className='text-muted-foreground'>
                            {item.fulfillmentHistory.length} fulfillment update
                            {item.fulfillmentHistory.length === 1 ? '' : 's'} recorded.
                          </div>
                        )}
                      </div>
                    )}

                    {accounts.length > 0 && (
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-3'>
                          <p className='font-medium'>Delivered Accounts ({accounts.length})</p>
                          <Badge variant='secondary'>{item.product?.name || 'Accounts'}</Badge>
                        </div>
                        <div className='max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/10 p-3'>
                          <div className='space-y-3'>
                            {accounts.map((account: any, accountIndex: number) => {
                              const normalized = normalizeAdminAccount(account)

                              return (
                                <div
                                  key={`${account?.id || accountIndex}-${accountIndex}`}
                                  className='rounded-md border border-border bg-background p-3'
                                >
                                  <div className='mb-2 flex items-center justify-between gap-3'>
                                    <p className='font-medium'>Account #{accountIndex + 1}</p>
                                    <Badge variant={normalized.hasPremium ? 'default' : 'outline'}>
                                      {normalized.hasPremium ? 'Premium' : 'Standard'}
                                    </Badge>
                                  </div>
                                  <div className='grid gap-2 md:grid-cols-2'>
                                    {normalized.username && (
                                      <div className='text-sm break-all'>
                                        <span className='text-muted-foreground'>Username: </span>
                                        {normalized.username}
                                      </div>
                                    )}
                                    {normalized.email && (
                                      <div className='text-sm break-all'>
                                        <span className='text-muted-foreground'>Email: </span>
                                        {normalized.email}
                                      </div>
                                    )}
                                    {normalized.phone && (
                                      <div className='text-sm break-all'>
                                        <span className='text-muted-foreground'>Phone: </span>
                                        {normalized.phone}
                                      </div>
                                    )}
                                    {normalized.password && (
                                      <div className='text-sm break-all'>
                                        <span className='text-muted-foreground'>Password: </span>
                                        {normalized.password}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {files.length > 0 && (
                      <div className='space-y-2'>
                        <p className='font-medium'>Delivered Files ({files.length})</p>
                        <div className='grid gap-2'>
                          {files.map((file, fileIndex) => (
                            <Button
                              key={`${file.url}-${fileIndex}`}
                              asChild
                              variant='outline'
                              className='justify-start'
                            >
                              <a href={file.url} target='_blank' rel='noopener noreferrer'>
                                <Download className='mr-2 w-4 h-4' />
                                <span>{file.name}</span>
                              </a>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasTransfer && (
                      <div className='rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm'>
                        <p className='font-medium'>Telegram Transfer</p>
                        <p className='text-muted-foreground'>
                          Status: {item.telegramTransfer?.status || 'Processing'}
                          {item.telegramTransfer?.joinVerified
                            ? ' · Join verified'
                            : ' · Waiting for join verification'}
                        </p>
                        {item.telegramTransfer?.targetUrl && (
                          <a
                            href={item.telegramTransfer.targetUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='mt-1 block break-all text-primary hover:underline'
                          >
                            {item.telegramTransfer.targetUrl}
                          </a>
                        )}
                      </div>
                    )}

                    {isPremiumItem && (
                      <div className='rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-sm'>
                        <p className='font-medium'>Premium Service</p>
                        <p className='text-muted-foreground'>
                          {item.deliveryStatus === 'DELIVERED'
                            ? 'Premium is delivered.'
                            : 'Premium delivery is being processed.'}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              <Separator />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-semibold'>Download All Items</p>
                  <p className='text-sm text-muted-foreground'>
                    Export every purchased item, delivered account, file link, premium status, and
                    transfer status.
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handlePurchasedItemDownload(
                        purchasedItemDetails,
                        'txt',
                        `order-${order.orderNumber}-all-items`
                      )
                    }
                  >
                    <Download className='mr-2 w-4 h-4' />
                    All TXT
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handlePurchasedItemDownload(
                        purchasedItemDetails,
                        'excel',
                        `order-${order.orderNumber}-all-items`
                      )
                    }
                  >
                    <Download className='mr-2 w-4 h-4' />
                    All CSV
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handlePurchasedItemDownload(
                        purchasedItemDetails,
                        'json',
                        `order-${order.orderNumber}-all-items`
                      )
                    }
                  >
                    <Download className='mr-2 w-4 h-4' />
                    All JSON
                  </Button>
                  <Button variant='outline' size='sm' onClick={handleInvoiceDownload}>
                    <FileText className='mr-2 w-4 h-4' />
                    Invoice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Separator />
        </>
      )}

      {!hasStructuredPurchasedItems && (
        <>
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='w-5 h-5' />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-start gap-4'>
                {order.product?.thumbnail && (
                  <CustomImage
                    src={order.product.thumbnail}
                    alt={order.product.name}
                    width={80}
                    height={80}
                    className='rounded-md object-cover'
                  />
                )}
                <div className='flex-1 space-y-2'>
                  <div className='flex items-start justify-between gap-4'>
                    <h4 className='font-medium text-base'>{order.product?.name || 'N/A'}</h4>
                    <Badge className='whitespace-nowrap'>
                      <Tag className='w-3 h-3 mr-1' />
                      {order.product?.platform || 'N/A'}
                    </Badge>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    SKU: <span className='font-mono'>{order.product?.sku || 'N/A'}</span>
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Product ID: #{order.product?.id || 'N/A'}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Product Type: <Badge variant='outline'>{order.product?.type || 'N/A'}</Badge>
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Quantity: <span className='font-medium'>{order.quantity}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Key className='w-5 h-5' />
                Full Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderDeliveredContent
                deliveryStatus={order.deliveryStatus}
                quantityDelivered={(order as any).quantityDelivered}
                quantityPending={(order as any).quantityPending}
                deliveryAccounts={((order as any).telegramAccounts as any[]) || []}
                deliveries={((order as any).deliveries as any[]) || []}
                productType={order.product?.type}
                productPlatform={order.product?.platform}
                productName={order.product?.name}
                telegramTransfer={(order as any).telegramTransfer}
                premiumSubscription={(order as any).premiumSubscription}
                clientInput={(order as any).clientInput}
                serviceNotes={(order as any).serviceNotes}
                fulfillmentHistory={((order as any).fulfillmentHistory as any[]) || []}
                customer={(order as any).user}
                guestEmail={(order as any).guestEmail}
                customerName={(order as any).customerName}
                customerPhone={(order as any).customerPhone}
                showCustomer={false}
                emptyTitle='No delivered order details yet'
                emptyDescription='Credentials, passwords, files, and fulfillment updates will appear here once the order is processed.'
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Premium Subscription Info */}
      {(order as any).premiumSubscription && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='w-5 h-5' />
                Premium Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <span className='text-sm text-muted-foreground'>Status:</span>{' '}
                  <Badge variant='default'>
                    {(order as any).premiumSubscription.status || 'Active'}
                  </Badge>
                </div>
                {(order as any).premiumSubscription.expiresAt && (
                  <div>
                    <span className='text-sm text-muted-foreground'>Expires At:</span>{' '}
                    <span className='text-sm'>
                      {new Date((order as any).premiumSubscription.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {(order as any).premiumSubscription.telegramUserId && (
                  <div>
                    <span className='text-sm text-muted-foreground'>Telegram User ID:</span>{' '}
                    <span className='font-mono text-sm'>
                      {(order as any).premiumSubscription.telegramUserId}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Transfer Proofs */}
      {(order as any).telegramTransfer && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='w-5 h-5' />
                Transfer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <span className='text-sm text-muted-foreground'>Transfer Status:</span>{' '}
                    <Badge variant='outline'>
                      {(order as any).telegramTransfer.status || 'N/A'}
                    </Badge>
                  </div>
                  {(order as any).telegramTransfer.chatIdentifier && (
                    <div>
                      <span className='text-sm text-muted-foreground'>Chat Identifier:</span>{' '}
                      <span className='font-mono text-sm'>
                        {(order as any).telegramTransfer.chatIdentifier}
                      </span>
                    </div>
                  )}
                </div>
                {(order as any).telegramTransfer.transferProofUrl && (
                  <div>
                    <span className='text-sm text-muted-foreground mb-2 block'>
                      Transfer Proof:
                    </span>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setIsProofViewerOpen(true)}
                      >
                        <ExternalLink className='w-4 h-4 mr-1' />
                        View Proof
                      </Button>
                      <ProofViewer
                        screenshotUrl={(order as any).telegramTransfer.transferProofUrl}
                        orderNumber={order.orderNumber}
                        transferId={(order as any).telegramTransfer.id}
                        isOpen={isProofViewerOpen}
                        onOpenChange={setIsProofViewerOpen}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Files/Downloads Section */}
      {!hasStructuredPurchasedItems &&
        (order as any).deliveries &&
        (order as any).deliveries.length > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Download className='w-5 h-5' />
                  Download Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isFileProduct ? (
                  <div className='space-y-3'>
                    {deliveredFileLinks.length > 0 ? (
                      deliveredFileLinks.map((file, index) => (
                        <Button key={`${file.url}-${index}`} asChild variant='outline' size='sm'>
                          <a href={file.url} target='_blank' rel='noopener noreferrer'>
                            <Download className='mr-2 w-4 h-4' />
                            Download {file.name}
                          </a>
                        </Button>
                      ))
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        No direct file links are available yet.
                      </p>
                    )}
                  </div>
                ) : isPremiumProduct ? (
                  <p className='text-sm text-muted-foreground'>
                    Premium orders do not use TXT, JSON, or Excel credential downloads.
                  </p>
                ) : (
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleAdminDeliveryDownload('txt')}
                      disabled={downloadingFormat !== null}
                    >
                      <Download className='mr-2 w-4 h-4' />
                      {downloadingFormat === 'txt' ? 'Downloading TXT...' : 'Download TXT'}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleAdminDeliveryDownload('json')}
                      disabled={downloadingFormat !== null}
                    >
                      <Download className='mr-2 w-4 h-4' />
                      {downloadingFormat === 'json' ? 'Downloading JSON...' : 'Download JSON'}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleAdminDeliveryDownload('excel')}
                      disabled={downloadingFormat !== null}
                    >
                      <Download className='mr-2 w-4 h-4' />
                      {downloadingFormat === 'excel' ? 'Downloading Excel...' : 'Download Excel'}
                    </Button>
                  </div>
                )}
                <div className='mt-3'>
                  <Button variant='outline' size='sm' onClick={handleInvoiceDownload}>
                    <FileText className='mr-2 w-4 h-4' />
                    Download Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

      {/* Payment Information */}
      {(order as any).payment && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CreditCard className='w-5 h-5' />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Payment Method</span>
                <Badge variant='secondary'>{(order as any).payment.method}</Badge>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Payment Status</span>
                <StatusBadge type='payment' status={(order as any).payment.status} />
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Payment ID</span>
                <span className='font-medium'>#{(order as any).payment.id}</span>
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Payment Amount</span>
                <span className='font-semibold text-lg'>
                  ${Number((order as any).payment.amount).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Order Totals */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <DollarSign className='w-5 h-5' />
            Order Totals
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>Subtotal</span>
            <span className='font-medium'>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>Discount</span>
            <span className='font-medium text-red-600'>-${Number(order.discount).toFixed(2)}</span>
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='font-semibold'>Total Amount</span>
            <span className='font-bold text-xl text-primary'>
              ${Number(order.total).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-40' />
          </CardHeader>
          <CardContent className='space-y-3'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-40' />
          </CardHeader>
          <CardContent className='space-y-3'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
