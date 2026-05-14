'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/common/typography'
import requests from '@/services/network/http'
import axiosInstance from '@/services/api/axiosInstance'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle,
  Loader2,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import Cookies from 'js-cookie'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TelegramCredentialsDisplay from '@/components/telegram/TelegramCredentialsDisplay'

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
  total: number
  subtotal: number
  discount: number
  customerName?: string
  customerPhone?: string
  createdAt: string
  quantityDelivered: number
  quantityPending: number
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [isDownloading, setIsDownloading] = useState<'txt' | 'excel' | 'json' | null>(null)
  const [guestEmail, setGuestEmail] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [showCode, setShowCode] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [telegramAccounts, setTelegramAccounts] = useState<any[]>([])
  const [loadingTelegramAccounts, setLoadingTelegramAccounts] = useState(false)

  const orderId = searchParams.get('order_id') || searchParams.get('orderId')
  const isGuest = searchParams.get('guest') === 'true'
  
  // Check if this is a Telegram account order
  // Note: Order response doesn't include product.type, so we check platform only
  // Product type 'TELEGRAM_ACCOUNTS' is confirmed from product list
  const isTelegramOrder = orderDetails?.product?.platform === 'TELEGRAM'

  useEffect(() => {
    setIsAuthenticated(!!Cookies.get('token'))
  }, [])

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true)

        // Get guest email from session if available
        const storedEmail = sessionStorage.getItem('guestOrderEmail')
        if (storedEmail) {
          setGuestEmail(storedEmail)
        }

        // Get stored verification code if available
        const storedCode = sessionStorage.getItem('guestOrderVerificationCode')
        if (storedCode) {
          setVerificationCode(storedCode)
        }

        // Fetch order details
        const response = await requests.get<OrderDetails>(`/customer/orders/${orderId}`, {
          params: isGuest && storedEmail ? { guestEmail: storedEmail } : {}
        })

        if (response) {
          setOrderDetails(response)
          
          // If Telegram order and delivered, fetch account details immediately
          // Note: Order response doesn't include product.type, so we check platform only
          if (
            response.product?.platform === 'TELEGRAM' &&
            response.deliveryStatus === 'DELIVERED'
          ) {
            fetchTelegramAccounts(response.id, isGuest, storedEmail ?? undefined)
          }
        }
      } catch (error: any) {
        console.error('Error fetching order:', error)
        toast.error('Could not load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderId, isGuest])

  // Fetch Telegram account details
  const fetchTelegramAccounts = async (orderId: number, isGuest: boolean, email?: string) => {
    try {
      setLoadingTelegramAccounts(true)
      const queryParams = isGuest && email ? `?guestEmail=${encodeURIComponent(email)}` : ''
      const response = await requests.get<{
        success: boolean
        accounts: any[]
      }>(`/customer/orders/${orderId}/telegram-accounts${queryParams}`)
      
      if (response.success && response.accounts) {
        setTelegramAccounts(response.accounts)
      }
    } catch (error: any) {
      console.error('Failed to fetch Telegram accounts:', error)
      // Don't show error to user, just log it
    } finally {
      setLoadingTelegramAccounts(false)
    }
  }

  const downloadOrder = async (format: 'txt' | 'excel' | 'json') => {
    if (!orderDetails) return

    setIsDownloading(format)
    try {
      let response: any

      if (isGuest && guestEmail) {
        // Guest download - use guest endpoint with skipAuthRedirect
        response = await axiosInstance.get(`/customer/orders/guest/download`, {
          params: {
            orderId: orderDetails.id,
            email: guestEmail,
            format
          },
          responseType: 'blob',
          skipAuthRedirect: true
        } as any)
      } else {
        // Authenticated user download
        response = await axiosInstance.get(`/customer/orders/${orderDetails.id}/download`, {
          params: {
            format
          },
          responseType: 'blob'
        } as any)
      }

      // Create blob and download
      const blob = new Blob([response.data], {
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

      toast.success(`Order downloaded as ${format === 'excel' ? 'CSV (Excel)' : format.toUpperCase()}`)
    } catch (error: any) {
      console.error('Download error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })
      const errorMsg = error?.response?.data?.message || error?.message || `Failed to download as ${format.toUpperCase()}`
      toast.error(errorMsg)
    } finally {
      setIsDownloading(null)
    }
  }

  const supportsJsonDownload = orderDetails?.product?.type !== 'FILE'

  const copyToClipboard = () => {
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
      toast.success('Code copied to clipboard')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-primary mx-auto mb-4' />
          <Typography variant='body2' className='text-white/60'>
            Loading your order...
          </Typography>
        </div>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center px-4'>
        <div className='w-full max-w-md text-center'>
          <div className='p-4 rounded-lg border border-red-900/30 bg-red-950/20 mb-4'>
            <div className='text-red-200 text-sm'>Order details could not be loaded</div>
          </div>
          <Button onClick={() => router.push('/')} className='w-full'>
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background py-12 px-4'>
      <div className='max-w-3xl mx-auto'>
        {/* Success Header */}
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4'>
            <CheckCircle className='w-10 h-10 text-green-400' />
          </div>
          <Typography variant='h1' className='mb-2 text-white'>
            Order Confirmed!
          </Typography>
          <Typography variant='body2' className='text-white/60'>
            Thank you for your purchase. Your order has been placed successfully.
          </Typography>
        </div>

        {/* Immediate Telegram Credentials Display - Only for delivered Telegram orders */}
        {isTelegramOrder && orderDetails.deliveryStatus === 'DELIVERED' && (
          <div className='bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6 mb-6'>
            {loadingTelegramAccounts ? (
              <div className='text-center py-8'>
                <Loader2 className='w-6 h-6 animate-spin text-green-400 mx-auto mb-2' />
                <p className='text-white/60 text-sm'>Loading your Telegram credentials...</p>
              </div>
            ) : telegramAccounts.length > 0 ? (
              <TelegramCredentialsDisplay
                accounts={telegramAccounts}
                productName={orderDetails.product.name}
                orderId={orderDetails.id}
              />
            ) : (
              <div className='text-center py-4'>
                <p className='text-white/60 text-sm'>
                  Account details are being prepared. Please check back in a few moments.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Order Summary Card */}
        <div className='bg-slate-900 rounded-lg border border-white/20 p-8 mb-6'>
          <div className='grid md:grid-cols-2 gap-6'>
            {/* Left Column */}
            <div className='space-y-6'>
              <div>
                <Label className='text-white/60 text-sm'>Order Number</Label>
                <div className='flex items-center gap-2 mt-1'>
                  <Typography variant='subtitle1' className='font-mono font-bold text-white'>
                    {orderDetails.orderNumber}
                  </Typography>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(orderDetails.orderNumber)
                      toast.success('Order number copied')
                    }}
                    className='text-white/60 hover:text-white transition-colors'
                  >
                    <Copy className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div>
                <Label className='text-white/60 text-sm'>Product</Label>
                <Typography variant='subtitle1' className='mt-1 text-white'>
                  {orderDetails.product.name}
                </Typography>
              </div>

              <div>
                <Label className='text-white/60 text-sm'>Platform</Label>
                <Typography variant='subtitle1' className='mt-1 text-white'>
                  {orderDetails.product.platform}
                </Typography>
              </div>

              <div>
                <Label className='text-white/60 text-sm'>Quantity</Label>
                <Typography variant='subtitle1' className='mt-1 text-white'>
                  {orderDetails.quantity} {orderDetails.quantity === 1 ? 'item' : 'items'}
                </Typography>
              </div>
            </div>

            {/* Right Column */}
            <div className='space-y-6'>
              <div>
                <Label className='text-white/60 text-sm'>Order Date</Label>
                <Typography variant='subtitle1' className='mt-1 text-white'>
                  {new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </div>

              <div>
                <Label className='text-white/60 text-sm'>Status</Label>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='w-2 h-2 rounded-full bg-blue-500' />
                  <Typography variant='subtitle1' className='text-white'>{orderDetails.status}</Typography>
                </div>
              </div>

              <div>
                <Label className='text-white/60 text-sm'>Delivery Status</Label>
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
                  <Typography variant='subtitle1' className='text-white'>{orderDetails.deliveryStatus}</Typography>
                </div>
              </div>

              <div className='pt-2 border-t border-white/10'>
                <Label className='text-white/60 text-sm'>Total Amount</Label>
                <Typography variant='h2' className='mt-1 text-primary font-bold'>
                  ${parseFloat(orderDetails.total.toString()).toFixed(2)}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Access Information */}
        {isGuest && guestEmail && (
          <div className='bg-blue-950/20 border border-blue-900/30 rounded-lg p-6 mb-6'>
            <Typography variant='subtitle1' className='font-semibold mb-4 flex items-center gap-2 text-white'>
              📧 Access Your Order
            </Typography>

            <div className='space-y-4'>
              <div className='p-4 rounded-lg bg-blue-950/40 border border-blue-900/50'>
                <p className='text-blue-200 text-sm mb-3'>
                  <strong>✓ Success!</strong> We've sent your guest OTP and access details to your email.
                </p>
                <p className='text-blue-200 text-sm'>
                  Use the same email to log in as a guest and open your limited dashboard at:
                </p>
                <a
                  href='/user/purchased-items'
                  className='text-primary hover:text-primary/80 font-semibold mt-2 inline-block'
                >
                  Open Dashboard
                </a>
              </div>

              <div>
                <Label className='text-sm text-blue-200'>Email</Label>
                <Input
                  type='email'
                  value={guestEmail}
                  readOnly
                  className='mt-2 bg-white/5 border-white/10 text-white'
                  disabled
                />
              </div>

              <div className='p-3 rounded-lg border border-blue-900/30 bg-blue-950/20'>
                <div className='text-blue-200 text-xs'>
                  <p className='font-semibold mb-2'>💡 How to Access Your Orders:</p>
                  <ol className='space-y-1 ml-4 list-decimal'>
                    <li>Check your email for the guest OTP</li>
                    <li>Open guest login with the same email</li>
                    <li>Verify the OTP</li>
                    <li>Access your purchases and downloads from the guest dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Section */}
        {orderDetails.deliveryStatus === 'DELIVERED' && (
          <div className='bg-slate-900 rounded-lg border border-white/20 p-8 mb-6'>
            <Typography variant='subtitle1' className='font-semibold mb-6 text-white'>
              Download Your Order
            </Typography>

            <div className={`grid gap-4 ${supportsJsonDownload ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <Button
                onClick={() => downloadOrder('txt')}
                disabled={isDownloading !== null}
                variant='outline'
                className='flex flex-col items-center justify-center gap-2 h-auto py-6'
              >
                {isDownloading === 'txt' ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    <span className='text-xs'>Downloading...</span>
                  </>
                ) : (
                  <>
                    <FileText className='w-6 h-6 text-blue-600' />
                    <span className='font-semibold'>Download as TXT</span>
                    <span className='text-xs text-muted-foreground'>Plain text format</span>
                  </>
                )}
              </Button>

              <Button
                onClick={() => downloadOrder('excel')}
                disabled={isDownloading !== null}
                variant='outline'
                className='flex flex-col items-center justify-center gap-2 h-auto py-6'
              >
                {isDownloading === 'excel' ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    <span className='text-xs'>Downloading...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className='w-6 h-6 text-green-600' />
                    <span className='font-semibold'>Download as Excel</span>
                    <span className='text-xs text-muted-foreground'>Spreadsheet format</span>
                  </>
                )}
              </Button>

              {supportsJsonDownload && (
                <Button
                  onClick={() => downloadOrder('json')}
                  disabled={isDownloading !== null}
                  variant='outline'
                  className='flex flex-col items-center justify-center gap-2 h-auto py-6'
                >
                  {isDownloading === 'json' ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      <span className='text-xs'>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <FileJson className='w-6 h-6 text-amber-600' />
                      <span className='font-semibold'>Download as JSON</span>
                      <span className='text-xs text-muted-foreground'>Data format</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            <p className='text-xs text-white/60 mt-4'>
              Download your complete order details in your preferred format. All files include
              account credentials and purchase information.
            </p>
          </div>
        )}

        {/* Delivery Status Section */}
        {orderDetails.deliveryStatus !== 'DELIVERED' && (
          <div className='bg-amber-950/20 border border-amber-900/30 rounded-lg p-6 mb-6'>
            <Typography variant='subtitle1' className='font-semibold mb-4 flex items-center gap-2 text-white'>
              ⏳ Your Order is Being Prepared
            </Typography>

            <div className='space-y-3'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-white/60'>
                  Delivered: {orderDetails.quantityDelivered}/{orderDetails.quantity}
                </span>
                <span className='font-semibold text-white'>
                  {Math.round((orderDetails.quantityDelivered / orderDetails.quantity) * 100)}%
                </span>
              </div>
              <div className='w-full bg-amber-900/20 rounded-full h-2'>
                <div
                  className='bg-amber-500 rounded-full h-2 transition-all'
                  style={{
                    width: `${(orderDetails.quantityDelivered / orderDetails.quantity) * 100}%`
                  }}
                />
              </div>
              <p className='text-xs text-amber-200'>
                We're preparing your order. Download options will be available once all items are
                delivered.
              </p>
            </div>
          </div>
        )}

        {/* Registration CTA - Only for guests */}
        {!isAuthenticated && (
          <div className='bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-lg p-8 mb-6'>
            <Typography variant='h3' className='mb-3 font-bold text-white'>
              💎 Register to Unlock Extra Features
            </Typography>

            <Typography variant='body2' className='text-white/60 mb-4'>
              Sign up now to keep your purchases and details safe:
            </Typography>

            <ul className='grid md:grid-cols-2 gap-3 mb-6 text-sm'>
              <li className='flex items-start gap-2'>
                <span className='text-primary font-bold mt-1'>✓</span>
                <span className='text-white/60'>
                  <strong>Store purchases</strong> - Keep everything in one place
                </span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-primary font-bold mt-1'>✓</span>
                <span className='text-white/60'>
                  <strong>Manage settings</strong> - Use the same email for full access
                </span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-primary font-bold mt-1'>✓</span>
                <span className='text-white/60'>
                  <strong>Past purchases</strong> - Access them from any device
                </span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-primary font-bold mt-1'>✓</span>
                <span className='text-white/60'>
                  <strong>Full dashboard</strong> - Unlock all dashboard features
                </span>
              </li>
            </ul>

            <div className='flex flex-col sm:flex-row gap-3'>
              <Button onClick={() => router.push('/sign-up')} className='flex-1 font-semibold'>
                Sign Up
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant='outline'
                className='flex-1 font-semibold'
              >
                Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button
            onClick={() => router.push('/shop')}
            variant='outline'
            className='flex-1'
          >
            Continue Shopping
          </Button>
          <Button onClick={() => router.push('/')} className='flex-1'>
            Back to Home
          </Button>
        </div>

        {/* Additional Info */}
        <div className='mt-12 grid md:grid-cols-3 gap-4'>
          <div className='p-4 rounded-lg bg-slate-50 border border-slate-200 text-center'>
            <div className='text-2xl mb-2'>📧</div>
            <Typography variant='subtitle1' className='font-semibold text-sm mb-1'>
              Email Confirmation
            </Typography>
            <Typography variant='body2' className='text-xs text-muted-foreground'>
              Check your email for order details and credentials
            </Typography>
          </div>

          <div className='p-4 rounded-lg bg-slate-50 border border-slate-200 text-center'>
            <div className='text-2xl mb-2'>🔒</div>
            <Typography variant='subtitle1' className='font-semibold text-sm mb-1'>
              Secure Download
            </Typography>
            <Typography variant='body2' className='text-xs text-muted-foreground'>
              All files are encrypted and verified for security
            </Typography>
          </div>

          <div className='p-4 rounded-lg bg-slate-50 border border-slate-200 text-center'>
            <div className='text-2xl mb-2'>🆘</div>
            <Typography variant='subtitle1' className='font-semibold text-sm mb-1'>
              Need Help?
            </Typography>
            <Typography variant='body2' className='text-xs text-muted-foreground'>
              Contact support@uhqaccounts.com anytime
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
