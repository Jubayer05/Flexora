'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import MultiFormatDownload from '@/components/order/MultiFormatDownload'
import OrderDeliveryDialog from '@/components/order/OrderDeliveryDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { AlertCircle, CheckCircle, Clock, XCircle, Download, Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type PaymentStatus = 'success' | 'pending' | 'failed' | 'cancelled'

type PaymentDetails = {
  orderId: number
  orderNumber: string
  amount: string
  status: string
  gateway: string
  createdAt: string
  isTransferOrder?: boolean // Flag for transfer orders
  hasDelivery?: boolean // Flag for orders with delivery
  productName?: string
  productType?: string
  productPlatform?: string
}

type GroupedOrder = {
  id: number
  orderNumber: string
  status: string
  deliveryStatus: string
  total: string
  isCurrentOrder?: boolean
  product?: {
    name?: string
    platform?: string
    type?: string
  }
}

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'UhqAccount_Test_bot'
  const transferBotUsername = rawBotUsername.startsWith('@')
    ? rawBotUsername
    : `@${rawBotUsername}`
  const transferBotLink = `https://t.me/${transferBotUsername.replace(/^@/, '')}`
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [guestEmail, setGuestEmail] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([])
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false)
  const hasAutoOpenedDelivery = useRef(false)
  const deliveryPollingStarted = useRef(false)

  const buildDashboardUrl = () => {
    if (!paymentDetails) return '/user/purchased-items'
    if (!paymentDetails.hasDelivery) return '/user/purchased-items'

    const params = new URLSearchParams({
      openDelivery: 'true',
      orderId: String(paymentDetails.orderId),
      orderNumber: paymentDetails.orderNumber
    })

    return `/user/purchased-items?${params.toString()}`
  }

  // Get parameters from URL
  const orderId = searchParams.get('order_id')
  const paymentId = searchParams.get('payment_id')
  const statusParam = searchParams.get('status')

  // Initialize: Check authentication and load guest email
  useEffect(() => {
    setIsAuthenticated(!!Cookies.get('token'))
    const storedGuestEmail = sessionStorage.getItem('guestOrderEmail')
    if (storedGuestEmail) {
      setGuestEmail(storedGuestEmail)
      // Request verification code for guest orders
      requestVerificationCode(storedGuestEmail)
    }
    setIsInitialized(true)
  }, [])

  // Request verification code for guest orders
  const requestVerificationCode = async (email: string) => {
    try {
      const response = await requests.post('/customer/orders/guest/send-code', {
        email: email.trim()
      })
      
      if (response.success) {
        // Code has been sent to email, store a flag to show message
        sessionStorage.setItem('guestCodeSent', 'true')
        console.log('[PaymentSuccess] Verification code sent to guest email')
      }
    } catch (error) {
      console.error('[PaymentSuccess] Failed to send verification code:', error)
      // Don't fail the payment success page, just log it
    }
  }

  useEffect(() => {
    const fetchByPaymentId = async (id: string) => {
      const response = await requests.get<{
        success: boolean
        data: {
          id: number
          status: string
          amount: string
          gateway: string
          createdAt: string
          order: {
            id: number
            orderNumber: string
          }
        }
      }>(`/payments/${id}`)

      if (response.success && response.data) {
        setPaymentDetails({
          orderId: response.data.order.id,
          orderNumber: response.data.order.orderNumber,
          amount: response.data.amount,
          status: response.data.status,
          gateway: response.data.gateway,
          createdAt: response.data.createdAt
        })

        if (response.data.status === 'COMPLETED') {
          setStatus('success')
        } else if (response.data.status === 'FAILED') {
          setStatus('failed')
        } else if (response.data.status === 'PENDING') {
          setStatus('pending')
        }
      }
    }

    const fetchByOrderId = async (id: string) => {
      // Check if user is authenticated
      const isAuthenticated = !!Cookies.get('token')

      // Build query string with guest email only if not authenticated
      const queryParams = new URLSearchParams()
      if (!isAuthenticated && guestEmail) {
        queryParams.set('guestEmail', guestEmail)
      }
      const queryString = queryParams.toString()
      const url = `/customer/orders/${id}${queryString ? `?${queryString}` : ''}`

      const response = await requests.get<{
        success: boolean
        data: {
          id: number
          orderNumber: string
          total: string
          status: string
          deliveryStatus: string
          quantityDelivered: number
          product?: {
            id: number
            type: string
            platform: string
            name: string
          }
          groupedOrders?: GroupedOrder[]
          payment?: {
            gateway: string
            status: string
            createdAt: string
          }
        }
      }>(url)

      if (response.success && response.data) {
        const isTransfer = isTelegramTransferProduct(response.data.product)

        const hasDelivery =
          (response.data.deliveryStatus === 'DELIVERED' ||
            response.data.deliveryStatus === 'PARTIAL') &&
          response.data.quantityDelivered > 0 &&
          !isTransfer

        setPaymentDetails({
          orderId: response.data.id,
          orderNumber: response.data.orderNumber,
          amount: response.data.total,
          status: response.data.payment?.status || 'PENDING',
          gateway: response.data.payment?.gateway || 'Unknown',
          createdAt: response.data.payment?.createdAt || new Date().toISOString(),
          isTransferOrder: isTransfer,
          hasDelivery,
          productName: response.data.product?.name,
          productType: response.data.product?.type,
          productPlatform: response.data.product?.platform
        })
        setGroupedOrders(response.data.groupedOrders || [])

        if (response.data.payment?.status === 'COMPLETED') {
          setStatus('success')
        } else if (response.data.payment?.status === 'FAILED') {
          setStatus('failed')
        }
        // Important: Don't override a successful status from the gateway with a PENDING database status
        // The webhook may not have processed yet, but the gateway confirmed success
      }
    }

    const fetchPaymentStatus = async () => {
      try {
        // Start with status from URL params (what the payment gateway returned)
        let displayStatus: PaymentStatus = statusParam as PaymentStatus || 'pending'
        
        if (statusParam) {
          setStatus(statusParam as PaymentStatus)
        }

        // Priority 1: Payment ID
        if (paymentId) {
          await fetchByPaymentId(paymentId)
        }
        // Priority 2: Order ID (from Stripe success_url or other gateways)
        else if (orderId) {
          await fetchByOrderId(orderId)
          // For guests showing success from URL, don't let PENDING override it
          // The webhook might still be processing
          if (statusParam === 'success' && displayStatus === 'success') {
            setStatus('success')
          }
        }
        // No payment details available, but we have status from URL
        else if (statusParam) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Failed to fetch payment status:', error)
        // Only set failed if we don't have a success status from URL
        if (statusParam !== 'success') {
          setStatus('failed')
        }
      } finally {
        setLoading(false)
      }
    }

    // Only fetch when initialization is complete
    if (isInitialized) {
      fetchPaymentStatus()
    }
  }, [paymentId, orderId, statusParam, guestEmail, isInitialized])

  useEffect(() => {
    if (
      status === 'success' &&
      paymentDetails?.hasDelivery &&
      !isDownloadDialogOpen &&
      !hasAutoOpenedDelivery.current
    ) {
      hasAutoOpenedDelivery.current = true
      setIsDownloadDialogOpen(true)
    }
  }, [status, paymentDetails?.hasDelivery, isDownloadDialogOpen])

  useEffect(() => {
    if (
      !isInitialized ||
      !orderId ||
      status !== 'success' ||
      paymentDetails?.hasDelivery ||
      hasAutoOpenedDelivery.current ||
      deliveryPollingStarted.current
    ) {
      return
    }

    deliveryPollingStarted.current = true
    let isCancelled = false
    let attempts = 0
    const maxAttempts = 8
    const intervalMs = 1500

    const pollForDelivery = async () => {
      attempts += 1

      try {
        const isUserAuthenticated = !!Cookies.get('token')
        const queryParams = new URLSearchParams()

        if (!isUserAuthenticated && guestEmail) {
          queryParams.set('guestEmail', guestEmail)
        }

        queryParams.set('_', `${Date.now()}`)
        const queryString = queryParams.toString()
        const url = `/customer/orders/${orderId}${queryString ? `?${queryString}` : ''}`

        const response = await requests.get<{
          success: boolean
          data: {
            id: number
            orderNumber: string
            total: string
            status: string
            deliveryStatus: string
            quantityDelivered: number
            product?: {
              id: number
              type: string
              platform: string
              name: string
            }
            groupedOrders?: GroupedOrder[]
            payment?: {
              gateway: string
              status: string
              createdAt: string
            }
          }
        }>(url)

        if (!response.success || !response.data || isCancelled) {
          if (attempts < maxAttempts) {
            setTimeout(pollForDelivery, intervalMs)
          }
          return
        }

        const isTransfer = isTelegramTransferProduct(response.data.product)

        const hasDelivery =
          (response.data.deliveryStatus === 'DELIVERED' ||
            response.data.deliveryStatus === 'PARTIAL') &&
          response.data.quantityDelivered > 0 &&
          !isTransfer

        if (hasDelivery) {
          setPaymentDetails((current) =>
            current
              ? {
                  ...current,
                  hasDelivery: true,
                  productName: response.data.product?.name || current.productName,
                  productType: response.data.product?.type || current.productType,
                  productPlatform: response.data.product?.platform || current.productPlatform
                }
              : current
          )
          setGroupedOrders(response.data.groupedOrders || [])
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(pollForDelivery, intervalMs)
        }
      } catch (error) {
        if (!isCancelled && attempts < maxAttempts) {
          setTimeout(pollForDelivery, intervalMs)
        }
      }
    }

    const timeoutId = setTimeout(pollForDelivery, intervalMs)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [isInitialized, orderId, status, paymentDetails?.hasDelivery, guestEmail])

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  const getStatusConfig = () => {
    const isTransfer = paymentDetails?.isTransferOrder
    const isGuest = !isAuthenticated && guestEmail

    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className='w-20 h-20 text-green-500' />,
          title: isTransfer ? 'Transfer Order Created!' : 'Payment Successful!',
          message: isTransfer
            ? 'Your group/channel transfer request has been initiated. Check your email for the next steps to complete the ownership transfer.'
            : isGuest
            ? 'Your payment has been processed successfully. Check your email for your guest OTP and access details.'
            : 'Your payment has been processed successfully. Account credentials have been sent to your email.',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10'
        }
      case 'pending':
        return {
          icon: <Clock className='w-20 h-20 text-yellow-500' />,
          title: 'Payment Pending',
          message:
            "Your payment is being processed. You will receive a confirmation email once it's completed.",
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10'
        }
      case 'cancelled':
        return {
          icon: <AlertCircle className='w-20 h-20 text-orange-500' />,
          title: 'Payment Cancelled',
          message: 'Your payment was cancelled. No charges were made.',
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10'
        }
      case 'failed':
      default:
        return {
          icon: <XCircle className='w-20 h-20 text-red-500' />,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or contact support.',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10'
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div className='flex justify-center items-center px-4 py-10 min-h-screen bg-background'>
      <div className='w-full max-w-3xl'>
        <div className='space-y-4 bg-card p-8 border border-border rounded-xl shadow-xl'>
          {/* Status Icon */}
          <div className='flex justify-center mb-4'>
            <div className={`${statusConfig.bgColor} rounded-full p-6 shadow-lg`}>
              {statusConfig.icon}
            </div>
          </div>

          {/* Title */}
          <div className='space-y-3 text-center mb-3'>
            <Typography variant='h2' weight='bold' className={statusConfig.color}>
              {statusConfig.title}
            </Typography>
            <Typography variant='body1' className='text-muted-foreground max-w-xl mx-auto'>
              {statusConfig.message}
            </Typography>
          </div>

          {/* Transfer Instructions */}
          {status === 'success' && paymentDetails?.isTransferOrder && (
            <div className='space-y-3'>
              {/* Bot Registration Instruction */}
              <div className='space-y-3 bg-yellow-500/10 p-4 border border-yellow-500/30 rounded-lg'>
                <Typography variant='body1' weight='semibold' className='text-yellow-400'>
                  ⚠️ Important: Register with Our Bot First
                </Typography>
                <div className='space-y-2 text-yellow-300 text-sm'>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>1.</span>
                    <span>
                      Open{' '}
                      <a
                        href={transferBotLink}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-semibold text-yellow-200 hover:underline'
                      >
                        @{transferBotUsername}
                      </a>{' '}
                      on Telegram
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>2.</span>
                    <span>
                      Send <span className='font-semibold'>/start</span> command (with the slash)
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>3.</span>
                    <span>
                      Click the <span className='font-semibold'>📱 Share My Contact</span> button
                      that appears
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>4.</span>
                    <span>This will register your phone number for verification</span>
                  </div>
                </div>
                <div className='mt-2 pt-2 border-yellow-500/20 border-t'>
                  <p className='text-yellow-400 text-xs'>
                    💡 You must complete this step before proceeding with the transfer process
                  </p>
                </div>
              </div>

              {/* Transfer Steps */}
              <div className='space-y-3 bg-blue-500/10 p-4 border border-blue-500/30 rounded-lg'>
                <Typography variant='body1' weight='semibold' className='text-blue-400'>
                  📋 Transfer Process Steps:
                </Typography>
                <div className='space-y-2 text-blue-300 text-sm'>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>1.</span>
                    <span>Check your email for the group/channel link and instructions</span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>2.</span>
                    <span>Join the group/channel using the provided link</span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>3.</span>
                    <span>
                      Go to <span className='font-semibold'>My Orders</span> and click the{' '}
                      <span className='font-semibold'>Verify Membership</span> button in the
                      Transfer column
                    </span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='font-semibold shrink-0'>4.</span>
                    <span>Wait for the automated transfer process to complete</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guest Order Access Info */}
          {status === 'success' && !isAuthenticated && guestEmail && (
            <div className='bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-6 space-y-4'>
              <div className='flex items-center gap-3'>
                <div className='bg-purple-500/20 rounded-full p-3'>
                  <Mail className='w-6 h-6 text-purple-500' />
                </div>
                <Typography variant='h6' weight='semibold' className='text-foreground'>
                  Guest Access Details
                </Typography>
              </div>
              
              <div className='space-y-3 text-sm'>
                <div className='grid sm:grid-cols-2 gap-4'>
                  {/* Email Access */}
                  <div className='bg-background/50 rounded-lg p-4 border border-border'>
                    <Typography variant='body2' weight='semibold' className='text-foreground mb-2 flex items-center gap-2'>
                      <span className='bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold'>1</span>
                      Guest Login OTP
                    </Typography>
                    <p className='text-muted-foreground text-xs mb-2'>
                      We sent your guest OTP and access details to <span className='font-semibold'>{guestEmail}</span>
                    </p>
                    <Button variant='outline' size='sm' disabled className='w-full opacity-50'>
                      Check Email
                    </Button>
                  </div>

                  {/* Manual Access */}
                  <div className='bg-background/50 rounded-lg p-4 border border-border'>
                    <Typography variant='body2' weight='semibold' className='text-foreground mb-2 flex items-center gap-2'>
                      <span className='bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold'>2</span>
                      Main Dashboard
                    </Typography>
                    <p className='text-muted-foreground text-xs mb-2'>
                      Use the same email to open your guest dashboard and access limited features
                    </p>
                    <Button
                      onClick={() => router.push('/user/purchased-items')}
                      variant='outline'
                      size='sm'
                      className='w-full hover:bg-purple-500/10'
                    >
                      Open Dashboard
                    </Button>
                  </div>
                </div>

                <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
                  <Typography variant='body2' className='text-blue-700 dark:text-blue-300 flex gap-2'>
                    <span className='shrink-0'>ℹ️</span>
                    <span><strong>Same email matters:</strong> Sign up or sign in with this same email to keep your purchases and details safe.</span>
                  </Typography>
                </div>
              </div>
            </div>
          )}

          {/* Payment Receipt */}
          {paymentDetails && status === 'success' && (
            <div className='space-y-4 bg-muted/50 dark:bg-muted/20 p-6 rounded-xl border border-border shadow-sm'>
              <Typography variant='h6' weight='semibold' className='flex items-center gap-2 text-foreground'>
                <CheckCircle className='w-5 h-5 text-green-500' />
                Payment Receipt
              </Typography>
              <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Order Number</span>
                  <span className='font-medium'>{paymentDetails.orderNumber}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Payment Method</span>
                  <span className='font-medium capitalize'>{paymentDetails.gateway}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Amount Paid</span>
                  <span className='font-medium'>
                    ${parseFloat(paymentDetails.amount).toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Payment Date</span>
                  <span className='font-medium'>
                    {new Date(paymentDetails.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Status</span>
                  <span className={`font-medium uppercase ${statusConfig.color}`}>
                    {paymentDetails.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && groupedOrders.length > 1 && (
            <div className='space-y-4 bg-muted/50 dark:bg-muted/20 p-6 rounded-xl border border-border shadow-sm'>
              <Typography variant='h6' weight='semibold' className='text-foreground'>
                Related Orders From This Purchase
              </Typography>
              <div className='space-y-3'>
                {groupedOrders.map((groupedOrder) => (
                  <div
                    key={groupedOrder.id}
                    className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-background/50 p-4'
                  >
                    <div>
                      <p className='font-medium text-foreground'>
                        {groupedOrder.product?.name || groupedOrder.orderNumber}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {groupedOrder.orderNumber}
                        {groupedOrder.isCurrentOrder ? ' • Current order' : ''}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm text-muted-foreground'>
                        ${parseFloat(groupedOrder.total).toFixed(2)}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          router.push('/user/purchased-items')
                        }
                      >
                        View Orders
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details (for non-success states) */}
          {paymentDetails && status !== 'success' && (
            <div className='space-y-3 bg-background/50 p-4 rounded-lg'>
              <Typography variant='h6' weight='semibold'>
                Payment Details
              </Typography>
              <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Order Number</span>
                  <span className='font-medium'>{paymentDetails.orderNumber}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Amount</span>
                  <span className='font-medium'>
                    ${parseFloat(paymentDetails.amount).toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Status</span>
                  <span className={`font-medium uppercase ${statusConfig.color}`}>
                    {paymentDetails.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps Information - For Authenticated Users */}
          {status === 'success' && isAuthenticated && (
            <div className='bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm'>
              <Typography variant='h6' weight='semibold' className='mb-4 text-foreground'>
                What's Next?
              </Typography>
              <ul className='space-y-3 text-sm'>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-green-500 shrink-0 mt-0.5' />
                  <span className='text-foreground'>Your payment has been confirmed and order is being processed</span>
                </li>
                {paymentDetails?.hasDelivery ? (
                  <li className='flex items-start gap-3'>
                    <CheckCircle className='w-5 h-5 text-green-500 shrink-0 mt-0.5' />
                    <span className='text-foreground'>Account credentials will be delivered via email once ready</span>
                  </li>
                ) : (
                  <li className='flex items-start gap-3'>
                    <CheckCircle className='w-5 h-5 text-green-500 shrink-0 mt-0.5' />
                    <span className='text-foreground'>You will receive an email notification when your order is ready</span>
                  </li>
                )}
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-green-500 shrink-0 mt-0.5' />
                  <span className='text-foreground'>Check your order status anytime in your account dashboard</span>
                </li>
              </ul>
            </div>
          )}

          {/* Next Steps Information - For Guest Users */}
          {status === 'success' && !isAuthenticated && guestEmail && (
            <div className='bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm space-y-4'>
              <Typography variant='h6' weight='semibold' className='text-foreground'>
                ✉️ What's Next?
              </Typography>
              <div className='space-y-3 text-sm'>
                <div className='bg-white dark:bg-slate-900/50 rounded-lg p-3 border border-blue-200 dark:border-blue-900'>
                  <Typography variant='body2' weight='semibold' className='text-foreground mb-2'>
                    Check Your Email
                  </Typography>
                  <p className='text-muted-foreground'>
                    We've sent an email to <span className='font-semibold'>{guestEmail}</span> with your guest OTP and guest dashboard access details.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Typography variant='body2' weight='semibold' className='text-foreground'>
                    Step-by-step:
                  </Typography>
                  <ol className='space-y-2 text-muted-foreground start-1 ps-5'>
                    <li className='list-decimal'>
                    Check your email inbox (and spam folder) for your guest OTP and access message
                    </li>
                    <li className='list-decimal'>
                      Use the same email to complete guest login and open your dashboard
                    </li>
                    <li className='list-decimal'>
                      Access your downloads and purchases from the guest dashboard once delivery is complete
                    </li>
                  </ol>
                </div>

                <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3'>
                  <Typography variant='body2' className='text-yellow-700 dark:text-yellow-300 flex gap-2'>
                    <span>💡</span>
                    <span>Can't find the email? Check spam, then open guest login with the same email.</span>
                  </Typography>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - For Success Status */}
          <div className='flex sm:flex-row flex-col gap-3 pt-2'>
            {status === 'success' && (
              <>
                {/* Download Invoice Button */}
                {paymentDetails && (
                  <Button
                    variant='outline'
                    onClick={async () => {
                      try {
                        const token = Cookies.get('token')
                        const response = await fetch(
                          `${process.env.NEXT_PUBLIC_APP_ROOT_API}/customer/orders/${paymentDetails.orderId}/invoice${!isAuthenticated && guestEmail ? `?guestEmail=${encodeURIComponent(guestEmail)}` : ''}`,
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
                        link.setAttribute('download', `invoice-${paymentDetails.orderNumber}.pdf`)
                        document.body.appendChild(link)
                        link.click()
                        link.remove()
                        window.URL.revokeObjectURL(url)
                      } catch (error: any) {
                        console.error('Failed to download invoice:', error)
                      }
                    }}
                    className='w-full sm:w-auto'
                  >
                    📄 Download Invoice
                  </Button>
                )}

                {/* Download Order Credentials Button - Only show if delivery is complete */}
                {paymentDetails && paymentDetails.hasDelivery && (
                  <Button
                    onClick={() => setIsDownloadDialogOpen(true)}
                    variant='outline'
                    className='w-full sm:w-auto'
                  >
                    <Download className='w-4 h-4 mr-2' />
                    {paymentDetails.productPlatform === 'TELEGRAM' &&
                    (paymentDetails.productType === 'ACCOUNT' ||
                      paymentDetails.productType === 'TELEGRAM_ACCOUNTS')
                      ? 'View Delivery Details'
                      : 'Download Order Credentials'}
                  </Button>
                )}

                {/* For Authenticated Users */}
                {isAuthenticated ? (
                  <>
                    <Button
                      onClick={() => router.push(buildDashboardUrl())}
                      className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80'
                    >
                      View My Orders
                    </Button>
                    <Button variant='outline' onClick={() => router.push('/shop')} className='flex-1'>
                      Continue Shopping
                    </Button>
                  </>
                ) : (
                  <>
                    {/* For Guest Users - Show guest orders access button */}
                    <Button
                      onClick={() => router.push(buildDashboardUrl())}
                      className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80'
                    >
                      Open Dashboard
                    </Button>
                    <Button variant='outline' onClick={() => router.push('/sign-up')} className='flex-1'>
                      Sign Up
                    </Button>
                    <Button variant='outline' onClick={() => router.push('/login')} className='flex-1'>
                      Sign In
                    </Button>
                    <Button variant='outline' onClick={() => router.push('/shop')} className='flex-1'>
                      Continue Shopping
                    </Button>
                  </>
                )}
              </>
            )}

            {status === 'pending' && (
              <>
                {isAuthenticated ? (
                  <Button
                    onClick={() => router.push(buildDashboardUrl())}
                    className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80'
                  >
                    Check Order Status
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push('/login')}
                    className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80'
                  >
                    Login to Check Status
                  </Button>
                )}
                <Button variant='outline' onClick={() => router.push('/shop')} className='flex-1'>
                  Back to Shop
                </Button>
              </>
            )}

            {(status === 'failed' || status === 'cancelled') && (
              <>
                <Button
                  onClick={() => {
                    if (paymentDetails?.orderId) {
                      router.push(`/checkout/accounts?id=${paymentDetails.orderId}`)
                    } else {
                      router.push('/shop')
                    }
                  }}
                  className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80'
                >
                  Try Again
                </Button>
                <Button variant='outline' onClick={() => router.push('/shop')} className='flex-1'>
                  Back to Shop
                </Button>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className='pt-4 border-muted-foreground border-t text-center'>
            <Typography variant='caption' className='text-muted-foreground'>
              Need help? Contact our{' '}
              <a href='/support' className='text-primary hover:underline'>
                support team
              </a>
            </Typography>
          </div>
        </div>
      </div>

      {/* Download Credentials Dialog */}
      {paymentDetails && paymentDetails.hasDelivery && (
        <OrderDeliveryDialog
          open={isDownloadDialogOpen}
          onOpenChange={setIsDownloadDialogOpen}
          orderId={paymentDetails.orderId}
          orderNumber={paymentDetails.orderNumber}
          email={guestEmail || undefined}
          isAuthenticated={isAuthenticated}
          productName={paymentDetails.productName}
          productPlatform={paymentDetails.productPlatform}
          productType={paymentDetails.productType}
        />
      )}
    </div>
  )
}
