'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { getDeliveryKind, isPremiumProductType } from '@/lib/deliveryTypes'
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  FileText,
  KeyRound,
  Link2,
  PackageCheck,
  Smartphone,
  UserRound
} from 'lucide-react'

type DeliveryAccount = Record<string, any>
type DeliveryRecord = Record<string, any>

interface OrderDeliveredContentProps {
  deliveryStatus?: string | null
  quantityDelivered?: number | null
  quantityPending?: number | null
  deliveryAccounts?: DeliveryAccount[]
  deliveries?: DeliveryRecord[]
  productType?: string | null
  productPlatform?: string | null
  productName?: string | null
  telegramTransfer?: Record<string, any> | null
  premiumSubscription?: Record<string, any> | null
  clientInput?: string | null
  serviceNotes?: string | null
  fulfillmentHistory?: any[]
  customer?: {
    id?: number | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    username?: string | null
    phone?: string | null
    country?: string | null
    isGuest?: boolean | null
  } | null
  guestEmail?: string | null
  customerName?: string | null
  customerPhone?: string | null
  showCustomer?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const getAccountFields = (account: DeliveryAccount) => {
  const credentials = account?.credentials || {}
  const hasTwoFactorEnabled = Boolean(
    account?.password ||
      account?.twoFactorSecret ||
      (account?.backupCodes || []).length ||
      credentials?.password ||
      credentials?.twoFactorSecret ||
      (credentials?.backupCodes || []).length
  )
  const usernameOrId =
    account?.username ||
    credentials?.username ||
    account?.socialId ||
    credentials?.socialId ||
    credentials?.id ||
    account?.email ||
    credentials?.email ||
    ''
  const socialId =
    account?.socialId ||
    credentials?.socialId ||
    (credentials?.id && credentials.id !== usernameOrId ? credentials.id : '')

  return [
    { label: 'Username / ID', value: usernameOrId },
    { label: 'Social ID', value: socialId },
    { label: 'Email', value: account?.email || credentials?.email || '' },
    { label: '2FA Status', value: hasTwoFactorEnabled ? 'Enabled' : 'Not Enabled' },
    {
      label: 'Phone',
      value:
        account?.phone ||
        account?.phoneNumber ||
        credentials?.phone ||
        credentials?.phoneNumber ||
        ''
    },
    { label: 'Password', value: account?.password || account?.meta?.password || credentials?.password || '' },
    { label: 'Recovery Email', value: account?.recoveryEmail || credentials?.recoveryEmail || '' },
    { label: '2FA Secret', value: account?.twoFactorSecret || credentials?.twoFactorSecret || '' },
    {
      label: 'Backup Codes',
      value: (account?.backupCodes || credentials?.backupCodes || []).join(', ')
    },
    { label: 'Session Data', value: account?.sessionData || credentials?.sessionData || '' },
    { label: 'Note', value: account?.note || credentials?.note || '' }
  ].filter((field) => field.value)
}

const getFileEntries = (deliveryAccounts: DeliveryAccount[], deliveries: DeliveryRecord[]) => {
  const accountFiles = deliveryAccounts
    .map((account, index) => ({
      name: account?.fileName || account?.meta?.fileName || `File ${index + 1}`,
      url: account?.fileUrl || account?.meta?.fileUrl || ''
    }))
    .filter((file) => file.url)

  const deliveryFiles = deliveries
    .map((delivery, index) => ({
      name: delivery?.meta?.fileName || `Delivery File ${index + 1}`,
      url: delivery?.fileUrl || ''
    }))
    .filter((file) => file.url)

  return [...accountFiles, ...deliveryFiles].filter(
    (file, index, list) => list.findIndex((entry) => entry.url === file.url) === index
  )
}

const formatTimestamp = (value: string | Date | null | undefined) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString()
}

const isReplacementDelivery = (delivery: DeliveryRecord) =>
  Boolean(
    delivery?.meta?.isReplacement ||
      delivery?.meta?.deliveryType === 'REPLACEMENT' ||
      delivery?.meta?.replacementReason
  )

export default function OrderDeliveredContent({
  deliveryStatus,
  quantityDelivered,
  quantityPending,
  deliveryAccounts = [],
  deliveries = [],
  productType,
  productPlatform,
  productName,
  telegramTransfer,
  premiumSubscription,
  clientInput,
  serviceNotes,
  fulfillmentHistory = [],
  customer,
  guestEmail,
  customerName,
  customerPhone,
  showCustomer = false,
  emptyTitle = 'Order details are not available yet',
  emptyDescription = 'Delivered credentials, files, and fulfillment notes will appear here after the order is completed.'
}: OrderDeliveredContentProps) {
  const normalizedAccounts =
    deliveryAccounts.length > 0
      ? deliveryAccounts
      : deliveries.flatMap((delivery) =>
          Array.isArray(delivery?.accounts) ? delivery.accounts : []
        )

  const fileEntries = getFileEntries(normalizedAccounts, deliveries)
  const hasAccountData = normalizedAccounts.some((account) => getAccountFields(account).length > 0)
  const deliveryKind = getDeliveryKind({
    type: productType,
    platform: productPlatform,
    telegramUrl: telegramTransfer?.targetUrl
  })
  const isPremiumDelivery = deliveryKind === 'premium' || isPremiumProductType(productType)
  const isTransferDelivery = deliveryKind === 'telegram-transfer' || Boolean(telegramTransfer)
  const isTelegramAccount = deliveryKind === 'telegram-account'
  const replacementDeliveries = deliveries.filter(isReplacementDelivery)
  const hasFulfillmentData =
    Boolean(clientInput) ||
    Boolean(serviceNotes) ||
    fileEntries.length > 0 ||
    hasAccountData ||
    deliveries.length > 0 ||
    fulfillmentHistory.length > 0 ||
    Boolean(telegramTransfer) ||
    isPremiumDelivery

  const customerLabel =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() ||
    customerName ||
    customer?.email ||
    guestEmail ||
    'Customer'

  return (
    <div className='space-y-4'>
      {deliveryStatus === 'PARTIAL' && Number(quantityDelivered || 0) > 0 && (
        <Alert className='border-amber-500/30 bg-amber-500/10'>
          <AlertCircle className='h-4 w-4 text-amber-600' />
          <AlertTitle>Partial delivery available</AlertTitle>
          <AlertDescription>
            {Number(quantityDelivered || 0)} item{Number(quantityDelivered || 0) === 1 ? '' : 's'} delivered.
            {Number(quantityPending || 0) > 0 ? ` ${Number(quantityPending || 0)} still pending.` : ''}
          </AlertDescription>
        </Alert>
      )}

      {replacementDeliveries.length > 0 && (
        <Alert className='border-green-500/30 bg-green-500/10'>
          <PackageCheck className='h-4 w-4 text-green-600' />
          <AlertTitle>Replacement delivered</AlertTitle>
          <AlertDescription>
            {replacementDeliveries.length} replacement deliver
            {replacementDeliveries.length === 1 ? 'y is' : 'ies are'} available in this order dashboard.
          </AlertDescription>
        </Alert>
      )}

      {showCustomer && (
        <Card className='border-border bg-muted/20 p-4 space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-sm text-muted-foreground'>Customer</p>
              <p className='font-semibold'>{customerLabel}</p>
            </div>
            <Badge variant={customer?.isGuest || guestEmail ? 'secondary' : 'outline'}>
              {customer?.isGuest || guestEmail ? 'Guest User' : 'Registered User'}
            </Badge>
          </div>

          <div className='grid gap-3 md:grid-cols-2'>
            {(customer?.email || guestEmail) && (
              <div className='space-y-1'>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Email</p>
                <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                  {customer?.email || guestEmail}
                </div>
              </div>
            )}
            {(customer?.username || customerPhone || customer?.phone) && (
              <div className='space-y-1'>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  {customer?.username ? 'Username' : 'Phone'}
                </p>
                <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                  {customer?.username || customerPhone || customer?.phone}
                </div>
              </div>
            )}
            {customer?.country && (
              <div className='space-y-1'>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Country</p>
                <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                  {customer.country}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {fileEntries.length > 0 && (
        <Card className='border-blue-500/30 bg-blue-500/5 p-4'>
          <div className='flex items-start gap-3'>
            <FileText className='mt-0.5 h-5 w-5 text-blue-500' />
            <div className='min-w-0 flex-1 space-y-3'>
              <div>
                <p className='font-semibold'>File Delivery</p>
                <p className='text-sm text-muted-foreground'>
                  File products are delivered as direct download links. TXT, Excel, and JSON exports
                  are not needed for this item.
                </p>
              </div>
              <div className='space-y-2'>
                {fileEntries.map((file, index) => (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary'
                  >
                    <span className='min-w-0 break-all'>{file.name}</span>
                    <span className='shrink-0 font-medium text-primary'>Download</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isTelegramAccount && (
        <Card className='border-emerald-500/30 bg-emerald-500/5 p-4'>
          <div className='flex items-start gap-3'>
            <Smartphone className='mt-0.5 h-5 w-5 text-emerald-500' />
            <div className='min-w-0 flex-1'>
              <p className='font-semibold'>Telegram Account Delivery</p>
              <p className='text-sm text-muted-foreground'>
                Telegram account boxes show phone number, 2FA status, and account credentials below.
                Use the Telegram delivery actions on the order page when a login code is needed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isTransferDelivery && (
        <Card className='border-sky-500/30 bg-sky-500/5 p-4'>
          <div className='flex items-start gap-3'>
            <Link2 className='mt-0.5 h-5 w-5 text-sky-500' />
            <div className='min-w-0 flex-1 space-y-3'>
              <div>
                <p className='font-semibold'>Group / Channel Transfer</p>
                <p className='text-sm text-muted-foreground'>
                  Customer joins the target URL, then the system verifies membership and continues
                  ownership/admin transfer automatically.
                </p>
              </div>
              <div className='grid gap-3 md:grid-cols-2'>
                {telegramTransfer?.targetUrl && (
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Target</p>
                    <a
                      href={telegramTransfer.targetUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block rounded-md border border-border bg-background px-3 py-2 text-sm text-primary break-all hover:underline'
                    >
                      {telegramTransfer.targetUrl}
                    </a>
                  </div>
                )}
                <div className='space-y-1'>
                  <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Transfer Status</p>
                  <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                    {telegramTransfer?.status || deliveryStatus || 'Processing'}
                  </div>
                </div>
                {telegramTransfer?.customerTelegram && (
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Customer Telegram</p>
                    <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                      {telegramTransfer.customerTelegram}
                    </div>
                  </div>
                )}
                <div className='space-y-1'>
                  <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Join Verified</p>
                  <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                    {telegramTransfer?.joinVerified ? 'Verified' : 'Waiting for verification'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {isPremiumDelivery && (
        <Card className='border-purple-500/30 bg-purple-500/5 p-4'>
          <div className='flex items-start gap-3'>
            {deliveryStatus === 'DELIVERED' || premiumSubscription?.status === 'ACTIVE' ? (
              <CheckCircle2 className='mt-0.5 h-5 w-5 text-green-500' />
            ) : (
              <Crown className='mt-0.5 h-5 w-5 text-purple-500' />
            )}
            <div className='min-w-0 flex-1 space-y-2'>
              <p className='font-semibold'>Premium Delivery</p>
              <p className='text-sm text-muted-foreground'>
                {deliveryStatus === 'DELIVERED' || premiumSubscription?.status === 'ACTIVE'
                  ? 'Premium is delivered.'
                  : 'Premium activation is being processed.'}
              </p>
              {(premiumSubscription?.telegramUserId || premiumSubscription?.expiresAt) && (
                <div className='grid gap-3 md:grid-cols-2'>
                  {premiumSubscription?.telegramUserId && (
                    <div className='rounded-md border border-border bg-background px-3 py-2 text-sm break-all'>
                      Telegram: {premiumSubscription.telegramUserId}
                    </div>
                  )}
                  {premiumSubscription?.expiresAt && (
                    <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                      Expires: {formatTimestamp(premiumSubscription.expiresAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {hasFulfillmentData ? (
        <Accordion type='multiple' className='w-full space-y-3'>
          {(clientInput || serviceNotes || fulfillmentHistory.length > 0) && (
            <AccordionItem value='service-context' className='rounded-lg border border-border bg-card px-4'>
              <AccordionTrigger className='py-4 text-left'>
                <span className='flex items-center gap-2 font-semibold'>
                  <UserRound className='h-4 w-4' />
                  Fulfillment Notes
                </span>
              </AccordionTrigger>
              <AccordionContent className='space-y-4 pb-4'>
                {clientInput && (
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Client Input</p>
                    <div className='rounded-md border border-border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap break-words'>
                      {clientInput}
                    </div>
                  </div>
                )}
                {serviceNotes && (
                  <div className='space-y-1'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Service Notes</p>
                    <div className='rounded-md border border-border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap break-words'>
                      {serviceNotes}
                    </div>
                  </div>
                )}
                {fulfillmentHistory.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Fulfillment History</p>
                    <div className='space-y-2'>
                      {fulfillmentHistory.map((entry, index) => (
                        <div key={`${entry?.createdAt || entry?.timestamp || index}`} className='rounded-md border border-border bg-muted/20 p-3 text-sm'>
                          <p className='font-medium'>{entry?.status || entry?.label || `Update ${index + 1}`}</p>
                          {entry?.note && (
                            <p className='mt-1 whitespace-pre-wrap break-words text-muted-foreground'>{entry.note}</p>
                          )}
                          <p className='mt-1 text-xs text-muted-foreground'>
                            {formatTimestamp(entry?.createdAt || entry?.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {(hasAccountData || fileEntries.length > 0 || productType === 'FILE') && (
            <AccordionItem value='delivered-content' className='rounded-lg border border-border bg-card px-4'>
              <AccordionTrigger className='py-4 text-left'>
                <span className='flex items-center gap-2 font-semibold'>
                  <KeyRound className='h-4 w-4' />
                  Delivered Content
                </span>
              </AccordionTrigger>
              <AccordionContent className='space-y-4 pb-4'>
                {productName && (
                  <p className='text-sm text-muted-foreground'>
                    Showing the latest delivered snapshot for {productName}.
                  </p>
                )}

                {hasAccountData && (
                  <div className='space-y-3'>
                    {normalizedAccounts.map((account, index) => {
                      const fields = getAccountFields(account)
                      if (fields.length === 0) return null

                      return (
                        <Card key={`${account?.id || index}-${index}`} className='border-border bg-muted/20 p-4 space-y-3'>
                          <div className='flex items-center justify-between gap-3'>
                            <div>
                              <p className='font-semibold'>Account #{index + 1}</p>
                              <p className='text-xs text-muted-foreground'>
                                Credentials, passwords, and related delivery data
                              </p>
                            </div>
                            {account?.hasPremium !== undefined && (
                              <Badge variant={account.hasPremium ? 'default' : 'secondary'}>
                                {account.hasPremium ? 'Premium' : 'Standard'}
                              </Badge>
                            )}
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
                )}

                {fileEntries.length > 0 && (
                  <div className='space-y-3'>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold'>Delivered Files</p>
                      <p className='text-sm text-muted-foreground'>
                        Direct file links attached to this order delivery.
                      </p>
                    </div>

                    {fileEntries.map((file, index) => (
                      <Card key={`${file.url}-${index}`} className='border-border bg-muted/20 p-4 space-y-2'>
                        <div className='flex items-start gap-3'>
                          <FileText className='mt-0.5 h-4 w-4 text-primary' />
                          <div className='min-w-0 flex-1'>
                            <p className='font-medium'>{file.name}</p>
                            <a
                              href={file.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='break-all text-sm text-primary hover:underline'
                            >
                              {file.url}
                            </a>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {deliveries.length > 0 && (
            <AccordionItem value='delivery-history' className='rounded-lg border border-border bg-card px-4'>
              <AccordionTrigger className='py-4 text-left'>
                <span className='flex items-center gap-2 font-semibold'>
                  <PackageCheck className='h-4 w-4' />
                  Delivery History
                </span>
              </AccordionTrigger>
              <AccordionContent className='space-y-3 pb-4'>
                {deliveries.map((delivery, index) => (
                  <Card key={`${delivery?.id || index}-${index}`} className='border-border bg-muted/20 p-4 space-y-3'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div>
                        <p className='font-semibold'>Delivery #{index + 1}</p>
                        <p className='text-xs text-muted-foreground'>
                          Created {formatTimestamp(delivery?.createdAt)}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-2'>
                        {isReplacementDelivery(delivery) && (
                          <Badge className='bg-green-600 text-white hover:bg-green-600'>Replacement</Badge>
                        )}
                        <Badge variant='outline'>{delivery?.status || 'Unknown'}</Badge>
                      </div>
                    </div>

                    <div className='grid gap-3 md:grid-cols-3'>
                      <div className='space-y-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Delivered At</p>
                        <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                          {formatTimestamp(delivery?.deliveredAt)}
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Downloads</p>
                        <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                          {delivery?.downloadCount ?? 0}
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Format</p>
                        <div className='rounded-md border border-border bg-background px-3 py-2 text-sm'>
                          {delivery?.format || productType || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      ) : (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>{emptyTitle}</AlertTitle>
          <AlertDescription>{emptyDescription}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
