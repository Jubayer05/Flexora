'use client'

import { TransferStatusBadge } from '@/components/badge/TransferStatusBadge'
import { VerifyMembershipButton } from '@/components/button/VerifyMembershipButton'
import MotionLoader from '@/components/common/MotionLoader'
import { TransferDetailModal } from '@/components/modals/TransferDetailModal'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/common/CustomSelect'
import OrderDeliveryDialog from '@/components/order/OrderDeliveryDialog'
import { OrderPhoneCell } from '@/components/order/OrderPhoneCell'
import TelegramOrderDetailsCard from '@/components/telegram/TelegramOrderDetailsCard'
import TelegramCodeDialog from '@/components/telegram/TelegramCodeDialog'
import TelegramManagementOrderCard from '@/components/telegram/TelegramManagementOrderCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getDeliveryStatusColor, getStatusColor } from '@/components/ui/custom-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import useAsync from '@/hooks/useAsync'
import { useMounted } from '@/hooks/useMounted'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { format } from 'date-fns'
import {
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  KeyRound,
  LogOut,
  MoreVertical,
  RefreshCw,
  X
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function PurchasedItems() {
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const mounted = useMounted()
  const token = mounted ? Cookies.get('token') : null
  const [guestEmail, setGuestEmail] = useState('')
  const [guestAccessToken, setGuestAccessToken] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('ALL')
  const [requestingOtp, setRequestingOtp] = useState<number | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<{
    transfer: any
    productName: string
  } | null>(null)
  const [showTransferSuccess, setShowTransferSuccess] = useState(false)
  const [selectedOrderForDownload, setSelectedOrderForDownload] = useState<{
    orderId: number
    orderNumber: string
  } | null>(null)
  const [selectedCodeOrder, setSelectedCodeOrder] = useState<{
    orderId: number
    orderNumber: string
  } | null>(null)
  const [kickDialogOpen, setKickDialogOpen] = useState<number | null>(null)
  const [kickingSession, setKickingSession] = useState<number | null>(null)

  // Check for transfer success on mount
  useEffect(() => {
    if (searchParams.get('transferSuccess') === 'true') {
      setShowTransferSuccess(true)
      // Clean URL
      window.history.replaceState({}, '', '/user/purchased-items')
    }
  }, [searchParams])

  useEffect(() => {
    if (!mounted || token) return

    const guestToken = Cookies.get('guestAccessToken') || sessionStorage.getItem('guestAccessToken')
    const email =
      Cookies.get('guestAccessEmail') ||
      sessionStorage.getItem('guestVerifiedEmail') || sessionStorage.getItem('guestOrderEmail') || ''

    if (guestToken && email) {
      sessionStorage.setItem('guestAccessToken', guestToken)
      sessionStorage.setItem('guestVerifiedEmail', email)
      sessionStorage.setItem('guestOrderEmail', email)
      setGuestAccessToken(guestToken)
      setGuestEmail(email)
      return
    }

    setGuestAccessToken('')
    setGuestEmail('')
  }, [mounted, token])

  const isGuestSession = !token && !!guestEmail

  const { data, loading, error, mutate } = useAsync<{
    success: boolean
    orders: Order[]
    message: string
    pagination: PaginationMeta
  }>(
    () => {
      if (!mounted) return null

      const baseQuery =
        `/customer/orders?page=${page}&limit=${limit}` +
        (productTypeFilter !== 'ALL'
          ? `&productType=${productTypeFilter === 'TELEGRAM_ACCOUNTS' ? 'TELEGRAM_ACCOUNTS' : productTypeFilter}`
          : '')

      if (token) {
        return baseQuery
      }

      if (guestEmail && guestAccessToken) {
        return `${baseQuery}&guestEmail=${encodeURIComponent(guestEmail)}`
      }

      return null
    },
    true,
    true
  )
  const { data: reviewSummary } = useAsync<{ success: boolean; data: { pendingReviewsCount: number } }>(
    () => (token ? '/customer/feedbacks/summary' : null),
    false,
    false
  )

  useEffect(() => {
    if (!mounted || token || !guestEmail || !guestAccessToken) return
    void mutate()
  }, [mounted, token, guestEmail, guestAccessToken, mutate])

  // Filter orders client-side (supports both ACCOUNT and TELEGRAM_ACCOUNTS for Telegram)
  const filteredOrders = (data?.orders || []).filter((order) => {
    const matchesProductType =
      productTypeFilter === 'ALL'
        ? true
        : productTypeFilter === 'TELEGRAM_ACCOUNTS'
          ? order.product?.type === 'TELEGRAM_ACCOUNTS' ||
            (order.product?.platform === 'TELEGRAM' && order.product?.type === 'ACCOUNT')
          : order.product?.type === productTypeFilter

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : order.status === statusFilter || order.deliveryStatus === statusFilter

    const createdAt = new Date(order.createdAt)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - 7)
    const startOfLast30 = new Date(startOfToday)
    startOfLast30.setDate(startOfToday.getDate() - 30)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const matchesDate =
      dateFilter === 'ALL'
        ? true
        : dateFilter === 'TODAY'
          ? createdAt >= startOfToday
          : dateFilter === 'LAST_7_DAYS'
            ? createdAt >= startOfWeek
            : dateFilter === 'LAST_30_DAYS'
              ? createdAt >= startOfLast30
              : dateFilter === 'THIS_MONTH'
                ? createdAt >= startOfMonth
                : true

    return matchesProductType && matchesStatus && matchesDate
  })

  useEffect(() => {
    if (!mounted) return

    const shouldOpenDelivery = searchParams.get('openDelivery') === 'true'
    const requestedOrderId = Number(searchParams.get('orderId') || '')
    const requestedOrderNumber = searchParams.get('orderNumber') || ''

    if (!shouldOpenDelivery || !requestedOrderId || selectedOrderForDownload) return

    const matchedOrder = (data?.orders || []).find((order) => order.id === requestedOrderId)
    if (!matchedOrder) return

    const canOpenDelivery =
      matchedOrder.deliveryStatus === 'DELIVERED' ||
      (matchedOrder.deliveryStatus === 'PARTIAL' &&
        Number((matchedOrder as any).quantityDelivered || 0) > 0)

    if (!canOpenDelivery) return

    setSelectedOrderForDownload({
      orderId: matchedOrder.id,
      orderNumber: requestedOrderNumber || matchedOrder.orderNumber
    })

    const url = new URL(window.location.href)
    url.searchParams.delete('openDelivery')
    url.searchParams.delete('orderId')
    url.searchParams.delete('orderNumber')
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
  }, [mounted, searchParams, data?.orders, selectedOrderForDownload])

  const handleNextPage = () => {
    if (data?.pagination.hasNext) {
      setPage((prev) => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (data?.pagination.hasPrev) {
      setPage((prev) => prev - 1)
    }
  }

  const handleRequestOtp = async (orderId: number) => {
    setRequestingOtp(orderId)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/customer/telegram-accounts/request-otp',
        { orderId }
      )

      if (response.success) {
        toast.success(response.message || 'OTP sent successfully to your email')
      } else {
        toast.error(response.message || 'Failed to send OTP')
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to send OTP. Please try again.'
      toast.error(message)
    } finally {
      setRequestingOtp(null)
    }
  }

  const handleDownloadInvoice = async (orderId: number, orderNumber: string) => {
    try {
      const authToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1]

      const guestQuery = !authToken && guestEmail ? `?guestEmail=${encodeURIComponent(guestEmail)}` : ''

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_ROOT_API}/customer/orders/${orderId}/invoice${guestQuery}`,
        {
          method: 'GET',
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...(guestEmail && !authToken
              ? {
                  'x-guest-access-token': sessionStorage.getItem('guestAccessToken') || ''
                }
              : {})
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
      link.setAttribute('download', `invoice-${orderNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice downloaded successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice')
    }
  }

  const canRequestOrderOtp = (order: Order) => {
    return !isGuestSession && (order as any).canRequestOtp === true
  }

  const handleKickAdminSession = async (orderId: number) => {
    setKickingSession(orderId)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/customer/telegram-accounts/kick-admin-session',
        { orderId }
      )

      if (response.success) {
        toast.success(response.message || 'Admin session kicked successfully')
        setKickDialogOpen(null)
      } else {
        toast.error(response.message || 'Failed to kick admin session')
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to kick admin session. Please try again.'
      )
    } finally {
      setKickingSession(null)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }
  const orders = filteredOrders

  if (false && isGuestSession) {
    return (
      <div className='space-y-6 mx-auto max-w-6xl font-manrope'>
        <Alert className='border-amber-500/20 bg-amber-500/10'>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
          <AlertTitle className='text-foreground'>You're logged in as a guest.</AlertTitle>
          <AlertDescription className='space-y-4 text-muted-foreground'>
            <p>
              Enjoy limited access to your downloads and purchases. To unlock more options and save
              your details for later, sign up using the same email.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button onClick={() => push('/sign-up')} className='sm:flex-1'>
                Sign Up
              </Button>
              <Button onClick={() => push('/login')} variant='outline' className='sm:flex-1'>
                Sign In
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Card className='border border-border bg-card p-6'>
          <h2 className='text-xl font-semibold text-card-foreground'>
            Sign up now to keep your purchases and details safe
          </h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Sign up now to store your purchases, manage your account settings, and access your past
            purchases from any device. By signing up, you will also unlock full dashboard features.
          </p>
        </Card>

        <div className='space-y-1'>
          <h1 className='text-card-foreground text-2xl font-semibold'>Guest Purchases</h1>
          <p className='text-card-foreground/60 text-base'>
            {guestEmail} {orders.length > 0 ? `• ${orders.length} order${orders.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        {error && (
          <Alert className='border-red-500/20 bg-red-500/10'>
            <AlertTriangle className='h-4 w-4 text-red-500' />
            <AlertTitle className='text-foreground'>Unable to load guest purchases</AlertTitle>
            <AlertDescription className='text-muted-foreground'>
              Your guest session is active, but the purchases request failed. Refresh the page or
              verify your guest login again.
            </AlertDescription>
          </Alert>
        )}

        {orders.length === 0 ? (
          <Card className='border border-border bg-card p-8 text-center'>
            <p className='text-lg font-medium text-card-foreground'>No purchases found yet</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Once you place a guest order with this email, it will appear here.
            </p>
          </Card>
        ) : (
          <div className='grid gap-4'>
            {orders.map((order) => (
              <Card key={order.id} className='border border-border bg-card p-5'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='space-y-2'>
                    <p className='text-sm text-muted-foreground'>Order #{order.orderNumber}</p>
                    <h3 className='text-lg font-semibold text-card-foreground'>
                      {order.product?.name || 'Product'}
                    </h3>
                    <div className='flex flex-wrap gap-3 text-sm text-muted-foreground'>
                      <span>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
                      <span>Status: {order.status}</span>
                      <span>Delivery: {order.deliveryStatus}</span>
                      <span>${parseFloat(order.total.toString()).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Button
                      variant='outline'
                      onClick={() =>
                        push(`/guest/orders/${order.id}?email=${encodeURIComponent(guestEmail)}`)
                      }
                    >
                      <Eye className='mr-2 h-4 w-4' />
                      View Details
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() =>
                        setSelectedOrderForDownload({
                          orderId: order.id,
                          orderNumber: order.orderNumber
                        })
                      }
                    >
                      <Download className='mr-2 h-4 w-4' />
                      Downloads
                    </Button>
                    <Button onClick={() => handleDownloadInvoice(order.id, order.orderNumber)}>
                      Download Invoice
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {selectedOrderForDownload && (
          <OrderDeliveryDialog
            open={!!selectedOrderForDownload}
            onOpenChange={(open) => !open && setSelectedOrderForDownload(null)}
            orderId={selectedOrderForDownload!.orderId}
            orderNumber={selectedOrderForDownload!.orderNumber}
            email={guestEmail}
            isAuthenticated={false}
            productName={
              orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.name
            }
            productPlatform={
              orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.platform
            }
            productType={
              orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.type
            }
          />
        )}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className='text-center py-12 font-manrope'>
        <p className='text-card-foreground/60 text-lg font-medium'>No orders found</p>
        <p className='text-card-foreground/60 text-sm mt-2'>
          No orders match the current filters yet.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-4 mx-auto max-w-6xl font-manrope'>
      {/* Transfer Success Alert */}
      {showTransferSuccess && (
        <div className='relative p-4 bg-emerald-50 dark:bg-green-500/10 border border-emerald-200 dark:border-green-500/20 rounded-lg'>
          <button
            onClick={() => setShowTransferSuccess(false)}
            className='absolute top-3 right-3 text-emerald-600 hover:text-emerald-500 dark:text-green-400 dark:hover:text-green-300'
          >
            <X className='h-4 w-4' />
          </button>
          <div className='flex gap-3 pr-8'>
            <CheckCircle2 className='h-5 w-5 text-emerald-600 dark:text-green-400 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-emerald-800 dark:text-green-400 text-base font-semibold'>
                Transfer Order Created Successfully!
              </p>
              <p className='text-emerald-700 dark:text-green-300 text-sm mt-1'>
                Your group/channel transfer request has been initiated. Follow the steps below to
                complete the transfer.
              </p>

              {/* Bot Registration Warning */}
              <div className='mt-3 p-3 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/20 rounded'>
                <div className='text-sm text-amber-800 dark:text-yellow-300 space-y-1'>
                  <div className='font-semibold text-amber-900 dark:text-yellow-400'>
                    ⚠️ Important: Register with Our Bot First
                  </div>
                  <div className='flex gap-2'>
                    <span>1.</span>
                    <span>
                      Open{' '}
                      <a
                        href='https://t.me/uhqaccountsbot'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-semibold underline hover:text-amber-700 dark:hover:text-yellow-200'
                      >
                        @uhqaccountsbot
                      </a>{' '}
                      on Telegram
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span>2.</span>
                    <span>Send /start command (with the slash)</span>
                  </div>
                  <div className='flex gap-2'>
                    <span>3.</span>
                    <span>
                      Click the <span className='font-semibold'>📱 Share My Contact</span> button
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span>4.</span>
                    <span>This registers your phone number for verification</span>
                  </div>
                </div>
              </div>

              {/* Transfer Steps */}
              <div className='mt-3 space-y-1 text-sm text-emerald-700 dark:text-green-300'>
                <div className='font-medium text-emerald-800 dark:text-green-400'>Transfer Process:</div>
                <div className='flex gap-2'>
                  <span>1.</span>
                  <span>Check your email for the group/channel link and instructions</span>
                </div>
                <div className='flex gap-2'>
                  <span>2.</span>
                  <span>Join the group/channel using the provided link</span>
                </div>
                <div className='flex gap-2'>
                  <span>3.</span>
                  <span>
                    Click the <span className='font-semibold'>Verify Membership</span> button in the
                    Transfer column below
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-card-foreground text-2xl font-semibold'>My Orders</h1>
          <p className='text-card-foreground/60 text-base'>
            Track and manage your purchased items
          </p>
        </div>
        <div className='grid w-full gap-3 sm:grid-cols-3 lg:w-auto'>
          <CustomSelect
            placeholder='Filter by Product Type'
            value={productTypeFilter}
            onChange={(value) => {
              setProductTypeFilter(value as string)
              setPage(1) // Reset to first page when filter changes
            }}
            showSearch={false}
            staticOptions={[
              { label: 'All Types', value: 'ALL' },
              { label: 'Telegram Accounts', value: 'TELEGRAM_ACCOUNTS' },
              { label: 'Account', value: 'ACCOUNT' },
              { label: 'Service', value: 'SERVICE' },
              { label: 'Premium', value: 'PREMIUM' }
            ]}
            className='bg-background border-border text-card-foreground sm:min-w-[180px]'
          />
          <CustomSelect
            placeholder='Filter by Status'
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as string)
              setPage(1)
            }}
            showSearch={false}
            staticOptions={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Partial', value: 'PARTIAL' },
              { label: 'Delivered', value: 'DELIVERED' },
              { label: 'Processing', value: 'PROCESSING' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]}
            className='bg-background border-border text-card-foreground sm:min-w-[180px]'
          />
          <CustomSelect
            placeholder='Filter by Date'
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value as string)
              setPage(1)
            }}
            showSearch={false}
            staticOptions={[
              { label: 'All Dates', value: 'ALL' },
              { label: 'Today', value: 'TODAY' },
              { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
              { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
              { label: 'This Month', value: 'THIS_MONTH' }
            ]}
            className='bg-background border-border text-card-foreground sm:min-w-[180px]'
          />
        </div>
      </div>

      {isGuestSession ? (
        <Alert className='border-amber-500/20 bg-amber-500/10'>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
          <AlertTitle className='text-foreground'>Support tickets require registration</AlertTitle>
          <AlertDescription className='space-y-3 text-muted-foreground'>
            <p>
              To open a support ticket for any of these orders, sign up using the same email you used
              for guest access. Your purchases will stay linked to the same account.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button onClick={() => push('/sign-up')} className='sm:flex-1'>
                Sign Up With Same Email
              </Button>
              <Button onClick={() => push('/login')} variant='outline' className='sm:flex-1'>
                Sign In
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {!isGuestSession && Number(reviewSummary?.data?.pendingReviewsCount || 0) > 0 ? (
        <Alert className='border-primary/20 bg-primary/5'>
          <CheckCircle2 className='h-4 w-4 text-primary' />
          <AlertTitle className='text-foreground'>Reviews waiting for your feedback</AlertTitle>
          <AlertDescription className='flex flex-col gap-3 text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
            <span>
              You have {Number(reviewSummary?.data?.pendingReviewsCount || 0)} remaining product review
              {Number(reviewSummary?.data?.pendingReviewsCount || 0) === 1 ? '' : 's'} to leave.
            </span>
            <Button onClick={() => push('/user/reviews')} className='sm:w-auto'>
              Open Reviews
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Mobile Cards */}
      <div className='space-y-3 md:hidden'>
        {orders.map((order) => (
          <TelegramManagementOrderCard
            key={order.id}
            order={order}
            requestingOtp={requestingOtp === order.id}
            kickingSession={kickingSession === order.id}
            onViewDetails={(orderId) =>
              isGuestSession
                ? push(`/guest/orders/${orderId}?email=${encodeURIComponent(guestEmail)}`)
                : push(`/user/purchased-items/${orderId}`)
            }
            onOpenTransfer={(selectedOrder) =>
              setSelectedTransfer({
                transfer: selectedOrder.telegramTransfer,
                productName: selectedOrder.product?.name || 'Transfer Product'
              })
            }
            onOpenDelivery={(orderId, orderNumber) =>
              setSelectedOrderForDownload({ orderId, orderNumber })
            }
            onDownloadInvoice={handleDownloadInvoice}
            onGetCode={(selectedOrder) =>
              setSelectedCodeOrder({
                orderId: selectedOrder.id,
                orderNumber: selectedOrder.orderNumber
              })
            }
            onRequestOtp={handleRequestOtp}
            onKickSession={(orderId) => setKickDialogOpen(orderId)}
          />
        ))}
      </div>

      {/* Orders Table */}
      <Card className='hidden border border-border bg-card backdrop-blur-sm md:block'>
        <Table
          containerClassName='bg-card border-border'
          className='text-card-foreground'
        >
          <TableHeader className='[&_tr]:border-border'>
            <TableRow className='border-border hover:bg-muted/20'>
              <TableHead className='bg-muted/30 text-muted-foreground'>Order #</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Product</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Phone</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Quantity</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Total</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Status</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Delivery</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Transfer</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground'>Date</TableHead>
              <TableHead className='bg-muted/30 text-muted-foreground text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='[&_tr]:border-border'>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <TableRow className='border-border hover:bg-muted/20'>
                {/* Order Number */}
                <TableCell>
                  <span className='text-primary font-medium'>#{order.orderNumber}</span>
                </TableCell>

                {/* Product Name */}
                <TableCell>
                  <span className='text-card-foreground font-medium'>{order.product?.name || 'N/A'}</span>
                </TableCell>

                {/* Phone Number - for Telegram account orders */}
                <TableCell>
                  <OrderPhoneCell
                    orderId={order.id}
                    isTelegramAccount={
                      order.product?.platform === 'TELEGRAM' &&
                      (order.product?.type === 'ACCOUNT' || order.product?.type === 'TELEGRAM_ACCOUNTS')
                    }
                    isDelivered={order.deliveryStatus === 'DELIVERED'}
                  />
                </TableCell>

                {/* Quantity */}
                <TableCell>
                  <span className='text-card-foreground/60'>{order.quantity}</span>
                </TableCell>

                {/* Total */}
                <TableCell>
                  <span className='font-semibold text-primary'>
                    ${parseFloat(order.total.toString()).toFixed(2)}
                  </span>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
                      getStatusColor(order.status)
                    )}
                  >
                    {order.status}
                  </span>
                </TableCell>

                {/* Delivery Status */}
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
                      getDeliveryStatusColor(order.deliveryStatus)
                    )}
                  >
                    {order.deliveryStatus}
                  </span>
                </TableCell>

                {/* Transfer Status - Only show for SERVICE type products */}
                <TableCell>
                  {isTelegramTransferProduct(order.product) && order.telegramTransfer ? (
                    <div className='flex flex-col gap-2'>
                      <TransferStatusBadge status={order.telegramTransfer.status} />
                      {order.telegramTransfer.status === 'VERIFICATION_REQUIRED' && (
                        <VerifyMembershipButton
                          transferId={order.telegramTransfer.id}
                          currentStatus={order.telegramTransfer.status}
                          onVerified={() => window.location.reload()}
                        />
                      )}
                    </div>
                  ) : (
                    <span className='text-card-foreground/60 text-sm'>N/A</span>
                  )}
                </TableCell>

                {/* Date */}
                <TableCell className='text-card-foreground/60'>
                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className='text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 w-8 p-0 text-card-foreground hover:bg-muted'
                      >
                        <MoreVertical className='h-4 w-4' />
                        <span className='sr-only'>Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='end'
                      className='w-48 bg-card border-border'
                    >
                      <DropdownMenuItem
                        onClick={() =>
                          isGuestSession
                            ? push(`/guest/orders/${order.id}?email=${encodeURIComponent(guestEmail)}`)
                            : push(`/user/purchased-items/${order.id}`)
                        }
                        className='cursor-pointer text-card-foreground hover:bg-muted'
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        View Details
                      </DropdownMenuItem>
                      {isTelegramTransferProduct(order.product) && order.telegramTransfer && (
                        <DropdownMenuItem
                          onClick={() =>
                            setSelectedTransfer({
                              transfer: order.telegramTransfer,
                              productName: order.product?.name || 'Transfer Product'
                            })
                          }
                          className='cursor-pointer text-card-foreground hover:bg-muted'
                        >
                          <ArrowRightLeft className='mr-2 h-4 w-4' />
                          View Transfer
                        </DropdownMenuItem>
                      )}
                      {canRequestOrderOtp(order) && (
                        <DropdownMenuItem
                          onClick={() => handleRequestOtp(order.id)}
                          disabled={requestingOtp === order.id}
                          className='cursor-pointer text-card-foreground hover:bg-muted'
                        >
                          <KeyRound className='mr-2 h-4 w-4' />
                          {requestingOtp === order.id ? 'Sending...' : 'Request OTP'}
                        </DropdownMenuItem>
                      )}
                      {(order.deliveryStatus === 'DELIVERED' ||
                        (order.deliveryStatus === 'PARTIAL' &&
                          Number((order as any).quantityDelivered || 0) > 0)) && (
                        <DropdownMenuItem
                          className='cursor-pointer text-card-foreground hover:bg-muted'
                          onClick={() =>
                            setSelectedOrderForDownload({
                              orderId: order.id,
                              orderNumber: order.orderNumber
                            })
                          }
                        >
                          <Download className='mr-2 h-4 w-4' />
                          View Delivery
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className='cursor-pointer text-card-foreground hover:bg-muted'
                        onClick={() => handleDownloadInvoice(order.id, order.orderNumber)}
                      >
                        <Download className='mr-2 h-4 w-4' />
                        Download Invoice
                      </DropdownMenuItem>
                      {order.status === 'PENDING' && (
                        <DropdownMenuItem className='cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400'>
                          <RefreshCw className='mr-2 h-4 w-4' />
                          Cancel Order
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              {(order.product?.platform === 'TELEGRAM' &&
                (order.product?.type === 'ACCOUNT' || order.product?.type === 'TELEGRAM_ACCOUNTS') &&
                (order.deliveryStatus === 'DELIVERED' ||
                  (order.deliveryStatus === 'PARTIAL' &&
                    Number((order as any).quantityDelivered || 0) > 0))) && (
                <TableRow className='bg-muted/20 dark:bg-muted/10 border-border hover:bg-muted/30 dark:hover:bg-muted/20'>
                  <TableCell colSpan={11} className='p-0 text-card-foreground'>
                    <div className='p-4'>
                      <TelegramOrderDetailsCard
                        order={order}
                        onDownloadClick={(orderId, orderNumber) =>
                          setSelectedOrderForDownload({ orderId, orderNumber })
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination Controls */}
      {data?.pagination && (
        <div className='flex justify-between items-center'>
          <div className='text-sm text-card-foreground/60'>
            Showing {orders.length} of {data.pagination.total} orders
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='icon'
              onClick={handlePrevPage}
              disabled={!data.pagination.hasPrev}
              className='border-border text-card-foreground hover:bg-muted'
            >
              <ChevronLeft className='h-4 w-4' />
              <span className='sr-only'>Previous page</span>
            </Button>

            <div className='text-sm text-card-foreground/60 px-3'>
              Page {data.pagination.page} of{' '}
              {data.pagination.pages || Math.ceil(data.pagination.total / limit)}
            </div>

            <Button
              variant='outline'
              size='icon'
              onClick={handleNextPage}
              disabled={!data.pagination.hasNext}
              className='border-border text-card-foreground hover:bg-muted'
            >
              <ChevronRight className='h-4 w-4' />
              <span className='sr-only'>Next page</span>
            </Button>
          </div>
        </div>
      )}

      {selectedCodeOrder && (
        <TelegramCodeDialog
          open={!!selectedCodeOrder}
          onOpenChange={(open) => !open && setSelectedCodeOrder(null)}
          orderId={selectedCodeOrder.orderId}
          orderNumber={selectedCodeOrder.orderNumber}
        />
      )}

      <Dialog open={kickDialogOpen !== null} onOpenChange={(open) => !open && setKickDialogOpen(null)}>
        <DialogContent className='border-border bg-card text-card-foreground sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
              <AlertTriangle className='h-5 w-5' />
              Logout Admin Session?
            </DialogTitle>
            <DialogDescription className='text-muted-foreground'>
              This removes our active Telegram session from your account.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <Alert className='border-red-500/20 bg-red-500/10'>
              <AlertTriangle className='h-4 w-4 text-red-500' />
              <AlertTitle className='text-red-600 dark:text-red-400'>Important</AlertTitle>
              <AlertDescription className='mt-2 text-red-700 dark:text-red-300/90'>
                After logout, you may no longer be able to get codes from us for this account.
              </AlertDescription>
            </Alert>

            <Alert className='border-amber-500/20 bg-amber-500/10'>
              <AlertTriangle className='h-4 w-4 text-amber-500' />
              <AlertTitle className='text-amber-600 dark:text-amber-400'>Session Note</AlertTitle>
              <AlertDescription className='mt-2 text-amber-700 dark:text-amber-300/90'>
                Make sure you already have full access before continuing.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setKickDialogOpen(null)}
              className='border-border bg-background text-card-foreground hover:bg-muted'
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => kickDialogOpen && handleKickAdminSession(kickDialogOpen)}
              disabled={kickingSession === kickDialogOpen}
            >
              {kickingSession === kickDialogOpen ? (
                <>
                  <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className='mr-2 h-4 w-4' />
                  Logout Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Detail Modal */}
      {selectedTransfer && (
        <TransferDetailModal
          open={!!selectedTransfer}
          onOpenChange={(open) => !open && setSelectedTransfer(null)}
          transfer={selectedTransfer.transfer}
          productName={selectedTransfer.productName}
        />
      )}

      {/* Download Credentials Modal */}
      {selectedOrderForDownload && (
        <OrderDeliveryDialog
          open={!!selectedOrderForDownload}
          onOpenChange={(open) => !open && setSelectedOrderForDownload(null)}
          orderId={selectedOrderForDownload!.orderId}
          orderNumber={selectedOrderForDownload!.orderNumber}
          email={isGuestSession ? guestEmail : undefined}
          isAuthenticated={!isGuestSession}
          productName={
            orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.name
          }
          productPlatform={
            orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.platform
          }
          productType={
            orders.find((entry) => entry.id === selectedOrderForDownload!.orderId)?.product?.type
          }
        />
      )}
    </div>
  )
}
