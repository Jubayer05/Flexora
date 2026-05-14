'use client'

import { TransferStatusBadge } from '@/components/badge/TransferStatusBadge'
import GuestAccessSection from '@/components/auth/GuestAccessSection'
import { VerifyMembershipButton } from '@/components/button/VerifyMembershipButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/common/typography'
import requests from '@/services/network/http'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import axiosInstance from '@/services/api/axiosInstance'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Check, Clock, AlertCircle, Download, Eye, EyeOff, Copy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GuestOrder {
  id: number
  orderNumber: string
  guestEmail: string
  product: {
    id: number
    name: string
    platform: string
    type: string
  }
  quantity: number
  total: number
  status: string
  deliveryStatus: string
  quantityDelivered: number
  quantityPending: number
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

export default function GuestOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [step, setStep] = useState<'verify' | 'orders'>('verify')
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isRestoringAccess, setIsRestoringAccess] = useState(true)
  const [orders, setOrders] = useState<GuestOrder[]>([])
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [downloadingOrderId, setDownloadingOrderId] = useState<number | null>(null)
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'excel' | 'json' | null>(null)

  const finalizeGuestAccess = async (guestEmail: string, token?: string) => {
    const normalizedEmail = guestEmail.trim().toLowerCase()

    if (token) {
      sessionStorage.setItem('guestAccessToken', token)
      document.cookie = `guestAccessToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`
    }

    sessionStorage.setItem('guestVerifiedEmail', normalizedEmail)
    sessionStorage.setItem('guestOrderEmail', normalizedEmail)
    document.cookie = `guestAccessEmail=${encodeURIComponent(normalizedEmail)}; path=/; SameSite=Lax`
    setEmail(normalizedEmail)
    setVerifiedEmail(normalizedEmail)
    router.replace('/user/purchased-items')
  }

  useEffect(() => {
    const restoreGuestAccess = async () => {
      const storedEmail =
        sessionStorage.getItem('guestVerifiedEmail') || sessionStorage.getItem('guestOrderEmail') || ''
      const storedToken = sessionStorage.getItem('guestAccessToken')
      const tokenFromUrl = searchParams.get('token')
      const emailFromUrl = searchParams.get('email')

      if (storedEmail) {
        setEmail(storedEmail)
      }

      try {
        if (tokenFromUrl && emailFromUrl) {
          setEmail(emailFromUrl)
          const response = await requests.post('/customer/orders/guest/verify', {
            email: emailFromUrl,
            accessToken: tokenFromUrl
          })

          if (response.success && response.token) {
            toast.success('Guest access confirmed. Opening your dashboard.')
            await finalizeGuestAccess(emailFromUrl, response.token)
            return
          }
        }

        if (storedEmail && storedToken) {
          await finalizeGuestAccess(storedEmail, storedToken)
        }
      } catch (error: any) {
        console.error('Restore guest access error:', error)
        sessionStorage.removeItem('guestAccessToken')
        sessionStorage.removeItem('guestVerifiedEmail')
      } finally {
        setIsRestoringAccess(false)
      }
    }

    restoreGuestAccess()
  }, [searchParams])

  const handleVerifyEmail = async () => {
    if (!email.trim()) {
      toast.error('Enter the email you used at checkout.')
      return
    }

    if (verificationCode.trim().length !== 6) {
      toast.error('Enter the 6-digit verification code from your email.')
      return
    }

    setIsVerifying(true)
    try {
      const response = await requests.post('/customer/orders/guest/verify', {
        email: email.trim(),
        verificationCode: verificationCode.trim()
      })

      if (response.success && response.token) {
        toast.success('Guest access verified. Opening your dashboard.')
        await finalizeGuestAccess(email.trim(), response.token)
      } else {
        toast.error(response.message || "That code doesn't look right. Please check it and try again.")
      }
    } catch (error: any) {
      console.error('Verification error:', error)
      toast.error(error?.response?.data?.message || "We couldn't verify that code. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRequestCode = async () => {
    if (!email.trim()) {
      toast.error('Enter the email you used at checkout.')
      return
    }

    setIsVerifying(true)
    try {
      const response = await requests.post('/customer/orders/guest/send-code', {
        email: email.trim()
      })

      if (response.success) {
        toast.success('Verification code sent. Please check your inbox.')
      } else {
        toast.error(response.message || "We couldn't send the code. Please try again.")
      }
    } catch (error: any) {
      console.error('Request code error:', error)
      toast.error(error?.response?.data?.message || "We couldn't send the verification code. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const fetchGuestOrders = async (guestEmail: string) => {
    setIsLoadingOrders(true)
    try {
      const response = await requests.get('/customer/orders', {
        params: {
          guestEmail: guestEmail.trim(),
          guest: true
        }
      })

      if (response.success) {
        // Backend returns orders in 'orders' property
        const ordersData = response.orders || response.data || []
        if (Array.isArray(ordersData)) {
          setOrders(ordersData)
          if (ordersData.length === 0) {
            toast.info('No purchases were found for this email.')
          }
        } else {
          setOrders([])
          toast.error("We couldn't read the order response. Please refresh and try again.")
        }
      } else {
        toast.error(response.message || "We couldn't load your orders right now.")
        setOrders([])
      }
    } catch (error: any) {
      console.error('Fetch orders error:', error)
      toast.error(error?.response?.data?.message || "We couldn't load your orders right now.")
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const downloadOrder = async (orderId: number, format: 'txt' | 'excel' | 'json') => {
    setDownloadingOrderId(orderId)
    setDownloadFormat(format)
    try {
      const blobData = await axiosInstance.get(`/customer/orders/guest/download`, {
        params: {
          orderId,
          email: verifiedEmail,
          format
        },
        responseType: 'blob',
        skipAuthRedirect: true
      } as any)

      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.orderNumber || 'Order'

      // Create blob and download
      const blob = new Blob([blobData.data], {
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
      a.download = `${orderNumber}.${format === 'excel' ? 'csv' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Download ready as ${format === 'excel' ? 'CSV for Excel' : format.toUpperCase()}.`)
    } catch (error: any) {
      console.error('Download error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })
      const errorMsg = error?.response?.data?.message || error?.message || `We couldn't download this order as ${format.toUpperCase()}.`
      toast.error(errorMsg)
    } finally {
      setDownloadingOrderId(null)
      setDownloadFormat(null)
    }
  }

  const handleLogout = () => {
    setStep('verify')
    setVerifiedEmail('')
    setOrders([])
    setEmail('')
    sessionStorage.removeItem('guestVerifiedEmail')
    sessionStorage.removeItem('guestOrderEmail')
    sessionStorage.removeItem('guestAccessToken')
    toast.success('Guest session closed.')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
    toast.success('Code copied.')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Check className='w-5 h-5 text-green-500' />
      case 'PROCESSING':
        return <Clock className='w-5 h-5 text-blue-500' />
      case 'PENDING':
        return <AlertCircle className='w-5 h-5 text-yellow-500' />
      default:
        return <AlertCircle className='w-5 h-5 text-gray-500' />
    }
  }

  if (false) {
    return (
      <div className='min-h-screen bg-background py-12 px-4'>
        <div className='max-w-md mx-auto'>
          <div className='bg-card rounded-lg border border-border p-8 shadow-sm'>
            <div className='text-center mb-8'>
              <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4'>
                <Mail className='w-6 h-6 text-primary' />
              </div>
              <Typography variant='h3' className='mb-2 text-foreground'>
                Access Your Orders
              </Typography>
              <Typography variant='body2' className='text-muted-foreground'>
                Continue through guest login to verify your email and open your guest dashboard.
              </Typography>
            </div>

            {isRestoringAccess ? (
              <div className='flex items-center justify-center py-6 text-muted-foreground'>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Checking your guest session...
              </div>
            ) : (
              <div className='space-y-3'>
                <Button onClick={() => router.push('/guest-login')} className='w-full'>
                  Guest Login
                </Button>
                <Button onClick={() => router.push('/login')} variant='outline' className='w-full'>
                  Back to Login
                </Button>
              </div>
            )}

            <Button
              onClick={() => {
                sessionStorage.removeItem('guestAccessToken')
                sessionStorage.removeItem('guestVerifiedEmail')
                sessionStorage.removeItem('guestOrderEmail')
                router.push('/shop')
              }}
              variant='ghost'
              className='w-full mt-4'
            >
              Back to Shop
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className='min-h-screen bg-background py-12 px-4'>
        <div className='max-w-md mx-auto'>
          <div className='bg-card rounded-lg border border-border p-8 shadow-sm'>
            <div className='text-center mb-8'>
              <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4'>
                <Mail className='w-6 h-6 text-primary' />
              </div>
              <Typography variant='h3' className='mb-2 text-foreground'>
                Guest Dashboard Access
              </Typography>
              <Typography variant='body2' className='text-muted-foreground'>
                Continue through guest login to verify your email and open your main dashboard with
                limited guest access.
              </Typography>
            </div>

            {isRestoringAccess ? (
              <div className='flex items-center justify-center py-6 text-muted-foreground'>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Checking your guest session...
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                  Guest users get limited access to downloads and purchases. To save everything in
                  your account, sign up later with the same email.
                </div>

                <Button onClick={() => router.push('/guest-login')} className='w-full'>
                  Guest Login
                </Button>
                <Button onClick={() => router.push('/login')} variant='outline' className='w-full'>
                  Sign In
                </Button>
              </div>
            )}

            <Button
              onClick={() => {
                sessionStorage.removeItem('guestAccessToken')
                sessionStorage.removeItem('guestVerifiedEmail')
                sessionStorage.removeItem('guestOrderEmail')
                router.push('/shop')
              }}
              variant='ghost'
              className='w-full mt-4'
            >
              Back to Shop
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (false) {
    const hasToken = sessionStorage.getItem('guestAccessToken')
    const tokenEmail = email
    
    return (
      <div className='min-h-screen bg-background py-12 px-4'>
      <div className='max-w-md mx-auto'>
          <div className='bg-card rounded-lg border border-border p-8 shadow-sm'>
            {/* Header */}
            <div className='text-center mb-8'>
              <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4'>
                <Mail className='w-6 h-6 text-primary' />
              </div>
              <Typography variant='h3' className='mb-2 text-foreground'>
                Access Your Orders
              </Typography>
              <Typography variant='body2' className='text-muted-foreground'>
                {hasToken && tokenEmail
                  ? 'Your email has been verified via secure link'
                  : 'Enter your email and verification code to view your orders'}
              </Typography>
            </div>

            {!hasToken && !isRestoringAccess && (
              <GuestAccessSection
                initialEmail={email}
                className='mb-6'
                onVerified={async (guestEmail, token) => {
                  await finalizeGuestAccess(guestEmail, token)
                }}
              />
            )}

            {/* If coming from email link with token, show simplified flow */}
            {hasToken && tokenEmail && (
              <div className='space-y-4 mb-6'>
                <div className='bg-green-500/10 border border-green-500/20 rounded-lg p-4'>
                  <div className='flex gap-3'>
                    <Check className='w-5 h-5 text-green-500 shrink-0 mt-0.5' />
                    <div>
                      <Typography variant='body2' weight='semibold' className='text-green-700 dark:text-green-300 mb-1'>
                        Email Verified
                      </Typography>
                      <Typography variant='caption' className='text-green-700/80 dark:text-green-200/70'>
                        Your email ({tokenEmail}) has been verified via the secure link from your payment confirmation
                      </Typography>
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <Typography variant='body2' weight='semibold' className='text-foreground'>
                    Choose how to access your orders:
                  </Typography>
                  
                  {/* Option 1: Using token (already verified) */}
                  <Button
                    onClick={async () => {
                      setIsVerifying(true)
                      try {
                        setVerifiedEmail(tokenEmail)
                        sessionStorage.setItem('guestVerifiedEmail', tokenEmail)
                        toast.success('Opening your orders...')
                        await fetchGuestOrders(tokenEmail)
                        setStep('orders')
                      } catch (error) {
                        toast.error('Failed to load orders')
                      } finally {
                        setIsVerifying(false)
                      }
                    }}
                    disabled={isVerifying}
                    className='w-full'
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Opening...
                      </>
                    ) : (
                      <>
                        <Check className='mr-2 h-4 w-4' />
                        View My Orders (Easy Access)
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className='relative my-4'>
                    <div className='absolute inset-0 flex items-center'>
                      <div className='w-full border-t border-border'></div>
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-card px-2 text-muted-foreground'>Or</span>
                    </div>
                  </div>

                  {/* Option 2: Using verification code */}
                  <div className='space-y-3'>
                    <Typography variant='caption' className='text-muted-foreground block'>
                      Use your 6-digit verification code instead:
                    </Typography>
                    <div className='space-y-2'>
                      <div className='flex justify-between items-center'>
                        <Label htmlFor='verification-code-alt' className='text-foreground/80'>
                          Verification Code
                        </Label>
                        <button
                          onClick={handleRequestCode}
                          disabled={isVerifying || !email.trim()}
                          className='text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground/50 transition-colors'
                        >
                          {isVerifying ? 'Sending...' : 'Send Code'}
                        </button>
                      </div>
                      <div className='relative'>
                        <Input
                          id='verification-code-alt'
                          type={showCode ? 'text' : 'password'}
                          placeholder='000000'
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                          maxLength={6}
                          disabled={isVerifying}
                          className='bg-background border-border text-foreground placeholder:text-muted-foreground font-mono tracking-widest text-center'
                        />
                        <button
                          onClick={() => setShowCode(!showCode)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                        >
                          {showCode ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || !email.trim() || verificationCode.length !== 6}
                      variant='outline'
                      className='w-full'
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Checking code...
                        </>
                      ) : (
                        'Access with Code'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Form (shown if no token OR as alternative) */}
            {false && !hasToken && (
              <div className='space-y-4'>
                {/* Email Field */}
                <div className='space-y-2'>
                  <Label htmlFor='guest-email' className='text-foreground/80'>
                    Email Address
                  </Label>
                  <Input
                    id='guest-email'
                    type='email'
                    placeholder='your@email.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isVerifying}
                    className='bg-background border-border text-foreground placeholder:text-muted-foreground'
                  />
                </div>

                {/* Legacy Order Number Field */}
                <div className='space-y-2'>
                  <Label htmlFor='order-number' className='text-foreground/80'>
                    Order Number (Optional)
                  </Label>
                  <Input
                    id='order-number'
                    type='text'
                    placeholder='ORD-XXXX-XXXXXX'
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    disabled={isVerifying}
                    className='bg-background border-border text-foreground placeholder:text-muted-foreground font-mono'
                  />
                </div>

                {/* Verification Code Field */}
                <div className='space-y-2'>
                  <div className='flex justify-between items-center'>
                    <Label htmlFor='verification-code' className='text-foreground/80'>
                      Verification Code
                    </Label>
                    <button
                      onClick={handleRequestCode}
                    disabled={isVerifying || !email.trim()}
                      className='text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground/50 transition-colors'
                    >
                      {isVerifying ? 'Sending...' : 'Send Code'}
                    </button>
                  </div>
                  <div className='relative'>
                    <Input
                      id='verification-code'
                      type={showCode ? 'text' : 'password'}
                      placeholder='000000'
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                      maxLength={6}
                      disabled={isVerifying}
                      className='bg-background border-border text-foreground placeholder:text-muted-foreground font-mono tracking-widest text-center'
                    />
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    >
                      {showCode ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Check your email for the 6-digit code (expires in 10 minutes)
                  </p>
                </div>

                {/* Info Box */}
                <div className='p-4 rounded-lg border border-blue-500/20 bg-blue-500/10 mt-6'>
                  <div className='text-blue-700 dark:text-blue-200 text-sm'>
                    <p className='font-semibold mb-2'>💡 Don't have a code?</p>
                    <p>Use Send Code to receive a fresh verification code by email.</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleVerifyEmail}
                  disabled={isVerifying || !email.trim() || verificationCode.length !== 6}
                  className='w-full mt-6'
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Checking code...
                    </>
                  ) : (
                    'Access My Orders'
                  )}
                </Button>
              </div>
            )}

            {/* Back Link */}
            <Button
              onClick={() => {
                sessionStorage.removeItem('guestAccessToken')
                router.push('/shop')
              }}
              variant='outline'
              className='w-full mt-4'
            >
              Back to Shop
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Orders View
  return (
    <div className='min-h-screen bg-background py-12 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div>
            <Typography variant='h2' className='mb-2 text-foreground'>
              Guest Dashboard
            </Typography>
            <Typography variant='body2' className='text-muted-foreground'>
              {verifiedEmail} • {orders.length} order{orders.length !== 1 ? 's' : ''}
            </Typography>
          </div>
        </div>

        <div className='mb-8 space-y-6'>
          <div className='rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6'>
            <Typography variant='h4' className='mb-2 text-foreground'>
              You are using guest access.
            </Typography>
            <Typography variant='body2' className='text-muted-foreground'>
              You can view delivered purchases now. Sign up with the same email to save your account
              details, support history, and future orders.
            </Typography>
            <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
              <Button onClick={() => router.push('/sign-up')} className='sm:flex-1'>
                Sign Up
              </Button>
              <Button onClick={() => router.push('/login')} variant='outline' className='sm:flex-1'>
                Sign In
              </Button>
              <Button onClick={handleLogout} variant='ghost' className='sm:w-auto'>
                Log Out
              </Button>
            </div>
          </div>

          <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
            <Typography variant='h4' className='mb-2 text-foreground'>
              Keep your purchases connected to one account
            </Typography>
            <Typography variant='body2' className='text-muted-foreground'>
              Create an account with the same email to manage purchases, downloads, balance, and
              support tickets from any device.
            </Typography>
          </div>
        </div>

        {isLoadingOrders ? (
          <div className='flex justify-center items-center py-12'>
            <div className='text-center'>
              <Loader2 className='w-8 h-8 animate-spin text-primary mx-auto mb-4' />
              <Typography variant='body2' className='text-muted-foreground'>
                Loading your orders...
              </Typography>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className='bg-card rounded-lg border border-border p-12 text-center shadow-sm'>
            <AlertCircle className='w-12 h-12 text-yellow-500 mx-auto mb-4' />
            <Typography variant='h4' className='text-foreground mb-2'>
              No orders found
            </Typography>
            <Typography variant='body2' className='text-muted-foreground mb-6'>
              We couldn't find any purchases associated with this guest email.
            </Typography>
            
            <div className='space-y-4'>
              <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6'>
                <p className='text-blue-700 dark:text-blue-200 text-sm mb-3'>Here's what you can do:</p>
                <ul className='text-left text-muted-foreground text-sm space-y-2'>
                  <li>1. Double-check that you used the same email as checkout</li>
                  <li>2. Try guest login again and request a fresh OTP</li>
                  <li>3. Sign in or sign up with the same email to manage everything in one place</li>
                </ul>
              </div>

              <div className='flex gap-3 flex-col sm:flex-row justify-center'>
                <Button onClick={() => handleLogout()} variant='outline'>
                  Try Again
                </Button>
                <Button onClick={() => router.push('/sign-up')}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Account Creation Promotion */}
            <div className='bg-linear-to-r from-blue-500/10 to-primary/10 border border-border rounded-lg p-6 mb-8'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <Typography variant='h4' className='text-foreground mb-2'>
                    Keep your purchases connected to one account
                  </Typography>
                  <Typography variant='body2' className='text-muted-foreground mb-3'>
                    Create an account with the same email to manage purchases, downloads, balance,
                    and support tickets from any device.
                  </Typography>
                  <ul className='text-muted-foreground text-sm space-y-1 mb-4'>
                    <li>📊 Access all orders anytime</li>
                    <li>🏅 Earn points with Rank System</li>
                    <li>💰 Get affiliate earnings</li>
                    <li>🎁 Exclusive subscriber offers</li>
                  </ul>
                </div>
                <Button onClick={() => router.push('/sign-up')} className='whitespace-nowrap'>
                  Sign Up
                </Button>
              </div>
            </div>

            {/* Orders List */}
            <div className='space-y-4'>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className='bg-card rounded-lg border border-border p-6 hover:border-primary/30 transition-colors shadow-sm'
                >
                  <div className='grid md:grid-cols-5 gap-4 items-start'>
                    {/* Order Number & Date */}
                    <div>
                      <p className='text-muted-foreground text-sm'>Order Number</p>
                      <p className='font-mono font-bold text-foreground'>{order.orderNumber}</p>
                      <p className='text-muted-foreground/80 text-xs mt-1'>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Product */}
                    <div>
                      <p className='text-muted-foreground text-sm'>Product</p>
                      <p className='text-foreground font-medium'>{order.product.name}</p>
                      <p className='text-muted-foreground/80 text-xs mt-1'>Qty: {order.quantity}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <p className='text-muted-foreground text-sm'>Status</p>
                      <div className='flex items-center gap-2 mt-1'>
                        {getStatusIcon(order.deliveryStatus)}
                        <span className='text-foreground font-medium'>{order.deliveryStatus}</span>
                      </div>
                      <p className='text-muted-foreground/80 text-xs mt-1'>
                        {order.quantityDelivered}/{order.quantity} delivered
                      </p>
                      {isTelegramTransferProduct(order.product) && order.telegramTransfer && (
                        <div className='mt-3 space-y-2'>
                          <TransferStatusBadge status={order.telegramTransfer.status} />
                          {order.telegramTransfer.status === 'VERIFICATION_REQUIRED' && (
                            <VerifyMembershipButton
                              transferId={order.telegramTransfer.id}
                              currentStatus={order.telegramTransfer.status}
                              guestEmail={verifiedEmail}
                              onVerified={() => fetchGuestOrders(verifiedEmail)}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex gap-2 justify-end flex-wrap'>
                      <Button
                        onClick={() => {
                          setSelectedOrderId(order.id)
                          router.push(`/guest/orders/${order.id}?email=${encodeURIComponent(verifiedEmail)}`)
                        }}
                        size='sm'
                        variant='outline'
                      >
                        <Eye className='w-4 h-4 mr-2' />
                        View Details
                      </Button>
                      {(order.deliveryStatus === 'DELIVERED' ||
                        (order.deliveryStatus === 'PARTIAL' && order.quantityDelivered > 0)) && (
                        <div className='flex gap-1'>
                          <Button
                            onClick={() => downloadOrder(order.id, 'txt')}
                            size='sm'
                            disabled={downloadingOrderId !== null}
                            className='bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          >
                            {downloadingOrderId === order.id && downloadFormat === 'txt' ? (
                              <>
                                <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                                <span className='text-xs'>TXT</span>
                              </>
                            ) : (
                              <>
                                <Download className='w-4 h-4 mr-1' />
                                <span className='text-xs'>TXT</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => downloadOrder(order.id, 'excel')}
                            size='sm'
                            disabled={downloadingOrderId !== null}
                            className='bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                          >
                            {downloadingOrderId === order.id && downloadFormat === 'excel' ? (
                              <>
                                <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                                <span className='text-xs'>XLS</span>
                              </>
                            ) : (
                              <>
                                <Download className='w-4 h-4 mr-1' />
                                <span className='text-xs'>XLS</span>
                              </>
                            )}
                          </Button>
                          {order.product?.type !== 'FILE' && (
                            <Button
                              onClick={() => downloadOrder(order.id, 'json')}
                              size='sm'
                              disabled={downloadingOrderId !== null}
                              className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                            >
                              {downloadingOrderId === order.id && downloadFormat === 'json' ? (
                                <>
                                  <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                                  <span className='text-xs'>JSON</span>
                                </>
                              ) : (
                                <>
                                  <Download className='w-4 h-4 mr-1' />
                                  <span className='text-xs'>JSON</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                      {order.deliveryStatus !== 'DELIVERED' &&
                        !(isTelegramTransferProduct(order.product) && order.telegramTransfer) && (
                        <div className='text-xs text-muted-foreground self-center px-2 py-1'>
                          Download available after delivery
                        </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Back Link */}
        <div className='mt-8 text-center'>
          <Button onClick={() => router.push('/shop')} variant='outline' className='w-full md:w-auto'>
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  )
}
