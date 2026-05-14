'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OrderPhoneCell } from '@/components/order/OrderPhoneCell'
import { VerifyMembershipButton } from '@/components/button/VerifyMembershipButton'
import { cn } from '@/lib/utils'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { format } from 'date-fns'
import {
  ArrowRightLeft,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  Loader2,
  LogOut
} from 'lucide-react'

interface TelegramManagementOrderCardProps {
  order: any
  requestingOtp?: boolean
  kickingSession?: boolean
  onViewDetails: (orderId: number) => void
  onOpenTransfer: (order: any) => void
  onOpenDelivery: (orderId: number, orderNumber: string) => void
  onDownloadInvoice: (orderId: number, orderNumber: string) => void
  onGetCode: (order: any) => void
  onRequestOtp: (orderId: number) => void
  onKickSession: (orderId: number) => void
}

export default function TelegramManagementOrderCard({
  order,
  requestingOtp = false,
  kickingSession = false,
  onViewDetails,
  onOpenTransfer,
  onOpenDelivery,
  onDownloadInvoice,
  onGetCode,
  onRequestOtp,
  onKickSession
}: TelegramManagementOrderCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isTelegramAccount =
    order.product?.platform === 'TELEGRAM' &&
    (order.product?.type === 'ACCOUNT' || order.product?.type === 'TELEGRAM_ACCOUNTS')

  const isTelegramTransfer = isTelegramTransferProduct(order.product) && Boolean(order.telegramTransfer)

  const isDelivered =
    order.deliveryStatus === 'DELIVERED' ||
    (order.deliveryStatus === 'PARTIAL' && Number((order as any).quantityDelivered || 0) > 0)

  const productLabel = useMemo(() => {
    if (isTelegramTransfer) return 'Transfer'
    if (isTelegramAccount) return 'Telegram Account'
    return order.product?.type || 'Order'
  }, [isTelegramAccount, isTelegramTransfer, order.product?.type])

  return (
    <Card className='overflow-hidden rounded-3xl border-border bg-card text-card-foreground shadow-sm'>
      <button
        type='button'
        onClick={() => setExpanded((value) => !value)}
        className='flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/20'
      >
        <div className='min-w-0 flex-1 space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <p className='text-base font-semibold text-card-foreground'>Account #{order.orderNumber}</p>
              <p className='text-sm text-muted-foreground'>{order.product?.name || 'Product'}</p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                order.deliveryStatus === 'DELIVERED'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : order.deliveryStatus === 'PROCESSING'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {order.deliveryStatus}
            </span>
          </div>

          <div className='grid gap-2 text-sm sm:grid-cols-2'>
            <div className='rounded-2xl border border-border bg-muted/25 px-3 py-2'>
              <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Category
              </p>
              <p className='mt-1 text-card-foreground'>{productLabel}</p>
            </div>
            <div className='rounded-2xl border border-border bg-muted/25 px-3 py-2'>
              <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Date
              </p>
              <p className='mt-1 text-card-foreground'>
                {format(new Date(order.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className='rounded-2xl border border-border bg-muted/25 px-3 py-2 sm:col-span-2'>
              <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Phone / Access
              </p>
              <div className='mt-1'>
                <OrderPhoneCell
                  orderId={order.id}
                  isTelegramAccount={isTelegramAccount}
                  isDelivered={isDelivered}
                />
              </div>
            </div>
          </div>
        </div>

        <ChevronDown
          className={cn(
            'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className='space-y-3 border-t border-border bg-muted/10 p-4'>
          {isTelegramAccount && (
            <>
              <div className='grid grid-cols-2 gap-3'>
                <Button
                  type='button'
                  onClick={() => onGetCode(order)}
                  className='h-11 rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400'
                >
                  <KeyRound className='mr-2 h-4 w-4' />
                  Get Code
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onRequestOtp(order.id)}
                  disabled={requestingOtp}
                  className='h-11 rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'
                >
                  {requestingOtp ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending
                    </>
                  ) : (
                    <>
                      <Download className='mr-2 h-4 w-4' />
                      Request OTP
                    </>
                  )}
                </Button>
                {isDelivered && (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => onOpenDelivery(order.id, order.orderNumber)}
                    className='h-11 rounded-2xl border-border bg-background text-card-foreground hover:bg-muted'
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Session
                  </Button>
                )}
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onKickSession(order.id)}
                  disabled={kickingSession}
                  className='h-11 rounded-2xl border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400'
                >
                  {kickingSession ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Logging out
                    </>
                  ) : (
                    <>
                      <LogOut className='mr-2 h-4 w-4' />
                      Logout
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {isTelegramTransfer && order.telegramTransfer && (
            <div className='grid grid-cols-1 gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenTransfer(order)}
                className='h-11 rounded-2xl border-border bg-background text-card-foreground hover:bg-muted'
              >
                <ArrowRightLeft className='mr-2 h-4 w-4' />
                View Transfer Progress
              </Button>

              {order.telegramTransfer.targetUrl && (
                <Button
                  type='button'
                  variant='outline'
                  asChild
                  className='h-11 rounded-2xl border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
                >
                  <a
                    href={order.telegramTransfer.targetUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <ExternalLink className='mr-2 h-4 w-4' />
                    Open Link
                  </a>
                </Button>
              )}

              {order.telegramTransfer.status === 'VERIFICATION_REQUIRED' && (
                <div className='rounded-2xl border border-border bg-background/60 p-3'>
                  <VerifyMembershipButton
                    transferId={order.telegramTransfer.id}
                    currentStatus={order.telegramTransfer.status}
                    onVerified={() => window.location.reload()}
                  />
                </div>
              )}
            </div>
          )}

          <div className='grid grid-cols-2 gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onViewDetails(order.id)}
              className='h-10 rounded-2xl border-border bg-background text-card-foreground hover:bg-muted'
            >
              <Eye className='mr-2 h-4 w-4' />
              Details
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => onDownloadInvoice(order.id, order.orderNumber)}
              className='h-10 rounded-2xl border-border bg-background text-card-foreground hover:bg-muted'
            >
              <Download className='mr-2 h-4 w-4' />
              Invoice
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
