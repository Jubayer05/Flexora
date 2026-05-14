'use client'

import MultiFormatDownload from '@/components/order/MultiFormatDownload'
import TelegramCredentialsDisplay from '@/components/telegram/TelegramCredentialsDisplay'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import {
  isFileProductType,
  isPremiumProductType,
  isTelegramAccountDelivery,
  isTelegramTransferDelivery
} from '@/lib/deliveryTypes'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { useState } from 'react'
import { AlertCircle, Download, Loader2, Shield } from 'lucide-react'

interface OrderDeliveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  orderNumber: string
  email?: string
  isAuthenticated?: boolean
  productName?: string
  productPlatform?: string
  productType?: string
}

interface TelegramAccount {
  id: number
  socialId?: string
  phoneNumber?: string
  phone?: string
  username?: string
  email?: string
  password?: string
  note?: string
  recoveryEmail?: string
  twoFactorSecret?: string
  sessionData?: string
  backupCodes?: string[]
  hasPremium?: boolean
  twoFactorEnabled?: boolean
  sessionExpiry?: string | Date | null
  meta?: Record<string, any>
  credentials?: Record<string, any>
  fileUrl?: string
  fileName?: string
  fileType?: string
}

interface DeliverySnapshot {
  id?: number
  status?: string
  accounts?: TelegramAccount[]
  fileUrl?: string | null
  meta?: Record<string, any> | null
}

interface GroupedItem {
  id: number | string
  quantity: number
  status?: string | null
  deliveryStatus?: string | null
  quantityDelivered?: number
  quantityPending?: number
  childOrderId?: number | null
  childOrderNumber?: string | null
  product?: {
    id: number
    name: string
    platform?: string | null
    type?: string | null
  } | null
}

interface OrderDeliveryResponse {
  success: boolean
  data: {
    deliveryStatus: string
    quantity: number
    quantityDelivered: number
    quantityPending: number
    product?: {
      id?: number
      name?: string
      platform?: string | null
      type?: string | null
    } | null
    telegramTransfer?: Record<string, any> | null
    deliveryAccounts?: TelegramAccount[]
    deliveries?: DeliverySnapshot[]
    items?: GroupedItem[]
    groupedOrders?: Array<{
      id: number
      orderNumber: string
      status: string
      deliveryStatus: string
      total?: string | number
      isCurrentOrder?: boolean
      product?: {
        name?: string
        platform?: string
        type?: string
      }
    }>
  }
}

const getAccountFields = (account: TelegramAccount) => {
  const credentials = account.credentials || {}
  const usernameOrId =
    account.username ||
    credentials.username ||
    account.socialId ||
    credentials.socialId ||
    credentials.id ||
    account.email ||
    credentials.email ||
    ''
  const socialId =
    account.socialId ||
    credentials.socialId ||
    (credentials.id && credentials.id !== usernameOrId ? credentials.id : '')

  return [
    { label: 'Username / ID', value: usernameOrId },
    { label: 'Social ID', value: socialId },
    { label: 'Email', value: account.email || credentials.email || '' },
    {
      label: 'Phone',
      value:
        account.phone ||
        account.phoneNumber ||
        credentials.phone ||
        credentials.phoneNumber ||
        ''
    },
    { label: 'Password', value: account.password || credentials.password || '' },
    { label: 'Recovery Email', value: account.recoveryEmail || credentials.recoveryEmail || '' },
    { label: '2FA Secret', value: account.twoFactorSecret || credentials.twoFactorSecret || '' },
    { label: 'Note', value: account.note || credentials.note || '' },
    {
      label: 'Backup Codes',
      value: (account.backupCodes || credentials.backupCodes || []).join(', ')
    },
    { label: 'Session Data', value: account.sessionData || credentials.sessionData || '' }
  ].filter((field) => field.value)
}

export default function OrderDeliveryDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  email,
  isAuthenticated = false,
  productName,
  productPlatform,
  productType
}: OrderDeliveryDialogProps) {
  const [selectedGroupedOrder, setSelectedGroupedOrder] = useState<{
    orderId: number
    orderNumber: string
    productName?: string
    productPlatform?: string
    productType?: string
  } | null>(null)

  const orderQuery = !isAuthenticated && email ? `?guestEmail=${encodeURIComponent(email)}` : ''

  const { data: orderData, loading: loadingOrder } = useAsync<OrderDeliveryResponse>(
    open ? () => `/customer/orders/${orderId}${orderQuery}` : null,
    false,
    false
  )

  const deliveredAccounts = orderData?.data?.deliveryAccounts || []
  const effectiveProduct = {
    name: productName || orderData?.data?.product?.name || '',
    platform: productPlatform || orderData?.data?.product?.platform || '',
    type: productType || orderData?.data?.product?.type || ''
  }
  const isTelegramAccountOrder = isTelegramAccountDelivery(
    effectiveProduct.platform,
    effectiveProduct.type
  )
  const isTransferOrder = isTelegramTransferDelivery({
    platform: effectiveProduct.platform,
    type: effectiveProduct.type,
    telegramUrl: orderData?.data?.telegramTransfer?.targetUrl
  })
  const isFileOrder = isFileProductType(effectiveProduct.type)
  const isPremiumOrder = isPremiumProductType(effectiveProduct.type)
  const deliveryFileEntries = Array.from(new Map([
    ...deliveredAccounts.filter((account) => account.fileUrl),
    ...(orderData?.data?.deliveries || []).flatMap((delivery, deliveryIndex) => {
      const accountFiles = (delivery.accounts || []).filter((account) => account.fileUrl)
      const deliveryFile =
        delivery.fileUrl && accountFiles.length === 0
          ? [
              {
                id: delivery.id || deliveryIndex,
                fileUrl: delivery.fileUrl,
                fileName: delivery.meta?.fileName || `File ${deliveryIndex + 1}`,
                fileType: delivery.meta?.fileType || 'File'
              } as TelegramAccount
            ]
          : []

      return [...accountFiles, ...deliveryFile]
    })
  ].map((file, index) => [file.fileUrl || `${file.fileName}-${index}`, file])).values())
  const normalizedTelegramAccounts = deliveredAccounts.map((account) => ({
    ...account,
    sessionExpiry: account.sessionExpiry ? new Date(account.sessionExpiry) : undefined
  }))
  const groupedItems = orderData?.data?.items || []
  const groupedOrders = orderData?.data?.groupedOrders || []
  const isPartiallyDelivered = orderData?.data?.deliveryStatus === 'PARTIAL'
  const quantityDelivered = orderData?.data?.quantityDelivered || 0
  const quantityPending = orderData?.data?.quantityPending || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Download className='w-5 h-5' />
            Delivery Details
          </DialogTitle>
          <DialogDescription>
            Review and download the delivered credentials for order `{orderNumber}`.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <Alert>
            <Shield className='h-4 w-4' />
            <AlertTitle>Keep these credentials secure</AlertTitle>
            <AlertDescription>
              Only download or share this information on trusted devices. Delete exported files after
              saving them to your password manager or secure vault.
            </AlertDescription>
          </Alert>

          {loadingOrder ? (
            <div className='flex items-center justify-center py-8 text-muted-foreground'>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              Loading delivered credentials...
            </div>
          ) : (
            <>
              {groupedItems.length > 1 && (
                <Card className='border-border bg-muted/30 p-4 space-y-3'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold'>Grouped Purchase Summary</h3>
                    <p className='text-sm text-muted-foreground'>
                      Multiple items from this checkout are grouped under order `{orderNumber}` for
                      simpler history and tracking.
                    </p>
                  </div>

                  <div className='space-y-3'>
                    {groupedItems.map((item, index) => {
                      const isTelegramItem =
                        item.product?.platform === 'TELEGRAM' &&
                        (item.product?.type === 'ACCOUNT' ||
                          item.product?.type === 'TELEGRAM_ACCOUNTS')
                      const isTransferItem = isTelegramTransferProduct(item.product)
                      const itemDelivered =
                        item.deliveryStatus === 'DELIVERED' ||
                        (item.deliveryStatus === 'PARTIAL' && Number(item.quantityDelivered || 0) > 0)

                      return (
                        <div
                          key={`${item.id}-${index}`}
                          className='rounded-lg border border-border bg-background/70 p-3'
                        >
                          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                              <p className='font-medium'>{item.product?.name || `Item ${index + 1}`}</p>
                              <p className='text-xs text-muted-foreground'>
                                Qty: {item.quantity}
                                {item.childOrderNumber ? ` • ${item.childOrderNumber}` : ''}
                              </p>
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {item.status || 'PENDING'} • {item.deliveryStatus || 'PENDING'}
                            </div>
                          </div>

                          <div className='mt-3 space-y-3'>
                            {isTelegramItem ? (
                              <div className='rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'>
                                Telegram items stay on the OTP flow. Open this item to view the
                                number, 2FA status, and Telegram-specific delivery details.
                              </div>
                            ) : isTransferItem ? (
                              <div className='rounded-md border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300'>
                                Transfer items keep their own progress flow. Open this item to review
                                the submitted Telegram username/phone, join link, and ownership
                                status.
                              </div>
                            ) : itemDelivered && item.childOrderId && item.childOrderNumber ? (
                              <div className='rounded-md border border-border bg-muted/30 p-3 space-y-3'>
                                <p className='text-sm text-muted-foreground'>
                                  Download links for this delivered item are available below.
                                </p>
                                <MultiFormatDownload
                                  orderId={Number(item.childOrderId)}
                                  orderNumber={item.childOrderNumber}
                                  email={email}
                                  isAuthenticated={isAuthenticated}
                                  productType={item.product?.type || undefined}
                                />
                              </div>
                            ) : (
                              <p className='text-sm text-muted-foreground'>
                                This item will show its own delivery tools as soon as delivery is
                                ready.
                              </p>
                            )}

                            {item.childOrderId && item.childOrderNumber ? (
                              <Button
                                type='button'
                                variant='outline'
                                className='w-full sm:w-auto'
                                onClick={() => {
                                  if (isTransferItem) {
                                    const transferUrl = isAuthenticated
                                      ? `/user/purchased-items/${Number(item.childOrderId)}`
                                      : `/guest/orders/${Number(item.childOrderId)}?email=${encodeURIComponent(email || '')}`
                                    window.location.href = transferUrl
                                    return
                                  }

                                  setSelectedGroupedOrder({
                                    orderId: Number(item.childOrderId),
                                    orderNumber: item.childOrderNumber || `Item ${index + 1}`,
                                    productName: item.product?.name || undefined,
                                    productPlatform: item.product?.platform || undefined,
                                    productType: item.product?.type || undefined
                                  })
                                }}
                              >
                                {isTransferItem
                                  ? 'Open Transfer Item'
                                  : isTelegramItem
                                    ? 'Open Telegram Delivery'
                                    : 'Open Item Delivery'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {groupedOrders.length > 1 && (
                <Card className='border-border bg-muted/30 p-4 space-y-3'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold'>Related Orders In This Checkout</h3>
                    <p className='text-sm text-muted-foreground'>
                      These child orders are linked to the same purchase group and stay organized
                      under one checkout flow.
                    </p>
                  </div>

                  <div className='space-y-2'>
                    {groupedOrders.map((groupedOrder) => (
                      <div
                        key={groupedOrder.id}
                        className='flex flex-col gap-2 rounded-lg border border-border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between'
                      >
                        <div>
                          <p className='font-medium'>
                            {groupedOrder.product?.name || groupedOrder.orderNumber}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {groupedOrder.orderNumber}
                            {groupedOrder.isCurrentOrder ? ' • Current group order' : ''}
                          </p>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          {groupedOrder.status} • {groupedOrder.deliveryStatus}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {isPartiallyDelivered && (
                <Alert className='border-amber-500/30 bg-amber-500/10'>
                  <AlertCircle className='h-4 w-4 text-amber-500' />
                  <AlertTitle>Partial delivery available</AlertTitle>
                  <AlertDescription>
                    {quantityDelivered} credential{quantityDelivered === 1 ? '' : 's'} delivered now,
                    {` ${quantityPending} pending`} and will appear here automatically after restock.
                  </AlertDescription>
                </Alert>
              )}

              {isPremiumOrder ? (
                <Card className='border-purple-500/30 bg-purple-500/5 p-4'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold'>Premium Delivery</h3>
                    <p className='text-sm text-muted-foreground'>
                      {orderData?.data?.deliveryStatus === 'DELIVERED'
                        ? 'Premium is delivered.'
                        : 'Premium activation is being processed.'}
                    </p>
                  </div>
                </Card>
              ) : isTransferOrder ? (
                <Card className='border-sky-500/30 bg-sky-500/5 p-4'>
                  <div className='space-y-3'>
                    <div className='space-y-1'>
                      <h3 className='text-base font-semibold'>Group / Channel Transfer</h3>
                      <p className='text-sm text-muted-foreground'>
                        Customer joins the target URL, then the system verifies membership and
                        continues the Telegram transfer flow.
                      </p>
                    </div>
                    <div className='grid gap-3 md:grid-cols-2'>
                      {orderData?.data?.telegramTransfer?.targetUrl && (
                        <div className='space-y-1'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Target</p>
                          <a
                            href={orderData.data.telegramTransfer.targetUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='block rounded-md border border-border bg-background px-3 py-2 text-sm text-primary break-all hover:underline'
                          >
                            {orderData.data.telegramTransfer.targetUrl}
                          </a>
                        </div>
                      )}
                      <div className='space-y-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Transfer Status</p>
                        <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                          {orderData?.data?.telegramTransfer?.status ||
                            orderData?.data?.deliveryStatus ||
                            'Processing'}
                        </div>
                      </div>
                      {orderData?.data?.telegramTransfer?.customerTelegram && (
                        <div className='space-y-1'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Customer Telegram</p>
                          <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                            {orderData.data.telegramTransfer.customerTelegram}
                          </div>
                        </div>
                      )}
                      <div className='space-y-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Join Verified</p>
                        <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                          {orderData?.data?.telegramTransfer?.joinVerified
                            ? 'Verified'
                            : 'Waiting for verification'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : isTelegramAccountOrder && deliveredAccounts.length > 0 ? (
                <TelegramCredentialsDisplay
                  accounts={normalizedTelegramAccounts}
                  productName={effectiveProduct.name || 'Telegram Account'}
                  orderId={orderId}
                />
              ) : isFileOrder && deliveryFileEntries.length > 0 ? (
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold'>Delivered Files</h3>
                    <p className='text-sm text-muted-foreground'>
                      These are the file links assigned to your order.
                    </p>
                  </div>

                  {deliveryFileEntries.map((file, index) => (
                    <Card
                      key={`${file.fileUrl || file.fileName}-${index}`}
                      className='border-border bg-muted/30 p-4 space-y-2'
                    >
                      <p className='font-semibold'>{file.fileName || `File ${index + 1}`}</p>
                      <a
                        href={file.fileUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-primary hover:underline break-all'
                      >
                        {file.fileUrl}
                      </a>
                    </Card>
                  ))}
                </div>
              ) : isFileOrder ? (
                <Alert>
                  <AlertCircle className='h-4 w-4' />
                  <AlertTitle>File delivery link is not ready yet</AlertTitle>
                  <AlertDescription>
                    This file order will show direct download links here once delivery data is
                    attached. TXT, Excel, and JSON exports are not shown for file products.
                  </AlertDescription>
                </Alert>
              ) : deliveredAccounts.length > 0 ? (
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <h3 className='text-base font-semibold'>Delivered Credentials</h3>
                    <p className='text-sm text-muted-foreground'>
                      This preview matches the latest delivered account snapshot used by the
                      dashboard, email, and downloads.
                    </p>
                  </div>

                  {deliveredAccounts.map((account, index) => {
                    const fields = getAccountFields(account)

                    return (
                      <Card key={`${account.id}-${index}`} className='border-border bg-muted/30 p-4 space-y-3'>
                        <div>
                          <p className='font-semibold'>Account #{index + 1}</p>
                          <p className='text-xs text-muted-foreground'>
                            Delivered credential snapshot
                          </p>
                        </div>

                        <div className='grid gap-3 md:grid-cols-2'>
                          {fields.map((field) => (
                            <div key={`${field.label}-${index}`} className='space-y-1'>
                              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                {field.label}
                              </p>
                              <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all whitespace-pre-wrap'>
                                {field.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className='h-4 w-4' />
                  <AlertTitle>Credentials not available yet</AlertTitle>
                  <AlertDescription>
                    No delivered credential snapshot is ready yet. Once delivery completes, the same
                    credentials will appear here, in your email, and in downloaded files.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {!isTelegramAccountOrder && !isTransferOrder ? (
            <MultiFormatDownload
              orderId={orderId}
              orderNumber={orderNumber}
              email={email}
              isAuthenticated={isAuthenticated}
              productType={effectiveProduct.type}
            />
          ) : (
            <Alert className='border-blue-500/30 bg-blue-500/10'>
              <AlertCircle className='h-4 w-4 text-blue-500' />
              <AlertTitle>
                {isTransferOrder ? 'Telegram transfer delivery' : 'Telegram account delivery'}
              </AlertTitle>
              <AlertDescription>
                {isTransferOrder
                  ? 'Group and channel transfer orders use the transfer status flow instead of TXT, JSON, or Excel downloads.'
                  : 'Telegram account orders use the secure OTP/code flow instead of TXT, JSON, or Excel downloads. Use the dashboard actions to request code access and manage the delivered account safely.'}
              </AlertDescription>
            </Alert>
          )}

          <Card className='border-border bg-muted/20 p-4 space-y-3'>
            <div className='space-y-1'>
              <h3 className='text-base font-semibold'>Need help with this order?</h3>
              <p className='text-sm text-muted-foreground'>
                Keep delivery issues linked to the order so support can track the exact item and
                latest delivery state.
              </p>
            </div>

            {isAuthenticated ? (
              <Button asChild variant='outline' className='w-full sm:w-auto'>
                <a href={`/user/tickets/create?orderNumber=${encodeURIComponent(orderNumber)}`}>
                  Open Support Ticket
                </a>
              </Button>
            ) : (
              <Alert className='border-amber-500/20 bg-amber-500/10'>
                <AlertCircle className='h-4 w-4 text-amber-500' />
                <AlertTitle>Support tickets require registration</AlertTitle>
                <AlertDescription>
                  Sign up with the same email to keep this order linked to a ticket and future
                  replies.
                </AlertDescription>
              </Alert>
            )}
          </Card>

          <div className='flex justify-end'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {selectedGroupedOrder ? (
        <OrderDeliveryDialog
          open={!!selectedGroupedOrder}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedGroupedOrder(null)
          }}
          orderId={selectedGroupedOrder.orderId}
          orderNumber={selectedGroupedOrder.orderNumber}
          email={email}
          isAuthenticated={isAuthenticated}
          productName={selectedGroupedOrder.productName}
          productPlatform={selectedGroupedOrder.productPlatform}
          productType={selectedGroupedOrder.productType}
        />
      ) : null}
    </Dialog>
  )
}
