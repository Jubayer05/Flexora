'use client'

import CustomImage from '@/components/common/CustomImage'
import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Copy, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Cookies from 'js-cookie'

type PaymentDetails = {
  payment: {
    id: number
    status: string
    amount: string
    gateway: string
  }
  address?: string // Binance Pay ID
  qrCode?: string // QR code URL
  amount: string
  currency: string
}

export default function CryptoDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [step, setStep] = useState<'make-payment' | 'verify-payment'>('make-payment')
  const [binanceOrderId, setBinanceOrderId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showGuestEmailPrompt, setShowGuestEmailPrompt] = useState(false)
  const [guestEmailInput, setGuestEmailInput] = useState('')
  const [submittingEmail, setSubmittingEmail] = useState(false)

  useEffect(() => {
    if (!orderId) {
      toast.error('Order ID is required')
      router.push('/')
      return
    }

    loadPaymentDetails()
  }, [orderId])

  const handleGuestEmailSubmit = async () => {
    const email = guestEmailInput.trim()
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    setSubmittingEmail(true)
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('guestOrderEmail', email)
      }
      setShowGuestEmailPrompt(false)
      setGuestEmailInput('')
      setLoading(true)
      await loadPaymentDetails()
    } finally {
      setSubmittingEmail(false)
    }
  }

  const loadPaymentDetails = async () => {
    try {
      console.log('[CryptoDetails] Loading payment details for order:', orderId)

      // For guest checkout: backend requires userId (from token) OR guestEmail in query
      const isLoggedIn = !!Cookies.get('token')
      const guestEmailFromUrl = searchParams.get('guestEmail')
      const guestEmailFromStorage =
        typeof window !== 'undefined' ? sessionStorage.getItem('guestOrderEmail') : null
      const guestEmail = guestEmailFromUrl || guestEmailFromStorage || undefined

      const query = new URLSearchParams()
      if (!isLoggedIn && guestEmail) {
        query.set('guestEmail', guestEmail)
      }
      const queryString = query.toString()

      // Get payment details from order
      const orderResponse = await requests.get<{
        success: boolean
        data: {
          id: number
          orderNumber: string
          total: string
          status: string
          payment?: {
            id: number
            status: string
            amount: string
            gateway: string
            gatewayTxnId: string
            meta?: any
          }
        }
      }>(`/customer/orders/${orderId}${queryString ? `?${queryString}` : ''}`, {
        skipAuthRedirect: true
      } as any)

      console.log('[CryptoDetails] Order response:', orderResponse)

      if (!orderResponse.success) {
        console.error('[CryptoDetails] Order response failed:', orderResponse)
        toast.error('Order not found')
        router.push('/')
        return
      }

      if (!orderResponse.data.payment) {
        console.error('[CryptoDetails] Payment not found in order response')
        toast.error('Payment not found for this order')
        router.push('/')
        return
      }

      const payment = orderResponse.data.payment
      const meta = payment.meta || {}

      console.log('[CryptoDetails] Payment data:', payment)
      console.log('[CryptoDetails] Payment meta:', meta)

      // Get address based on gateway type
      let address: string | undefined = undefined
      let qrCodeUrl: string | undefined = meta.qrCodeUrl
      let currency = 'USDT'

      if (payment.gateway === 'binance') {
        // Binance: use payId or gatewayTxnId
        address = meta.payId || payment.gatewayTxnId
        currency = 'USDT'
      } else if (payment.gateway === 'paygate') {
        // Paygate: use address_in from meta
        address = meta.address_in
        currency = meta.coin || 'USDC'
      } else {
        // Generic crypto gateway
        address = meta.address || meta.payId || payment.gatewayTxnId
      }

      if (!address) {
        console.error(`[CryptoDetails] No address found for ${payment.gateway} payment`)
        toast.error('Payment address not found')
        router.push('/')
        return
      }

      setPaymentDetails({
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          gateway: payment.gateway
        },
        address,
        qrCode: qrCodeUrl,
        amount: orderResponse.data.total,
        currency
      })

      console.log('[CryptoDetails] Payment details set:', {
        address,
        qrCode: qrCodeUrl,
        gateway: payment.gateway,
        currency
      })
    } catch (error: any) {
      console.error('[CryptoDetails] Error loading payment details:', error)
      const is401 = error?.response?.status === 401
      const isGuest = !Cookies.get('token')
      if (is401 && isGuest) {
        toast.error('Please provide your order email to view payment details.')
        setLoading(false)
        setShowGuestEmailPrompt(true)
        return
      }
      showError(error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPayId = () => {
    if (paymentDetails?.address) {
      navigator.clipboard.writeText(paymentDetails.address)
      setCopied(true)
      const label = paymentDetails.payment.gateway === 'binance' ? 'Binance ID' : 'Wallet Address'
      toast.success(`${label} copied!`)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConfirmPayment = () => {
    setStep('verify-payment')
  }

  const handleVerifyPayment = async () => {
    const isPaygatePayment = paymentDetails?.payment?.gateway === 'paygate'
    const isBinancePayment = paymentDetails?.payment?.gateway === 'binance'

    // For Binance, require Order ID
    if (isBinancePayment && !binanceOrderId.trim()) {
      toast.error('Please enter your Binance Order ID')
      return
    }

    // For generic crypto, Order ID/TX Hash is optional
    if (!orderId) {
      toast.error('Order ID is missing')
      return
    }

    if (!paymentDetails?.payment?.id) {
      toast.error('Payment ID is missing. Please refresh the page.')
      return
    }

    setVerifying(true)
    try {
      if (isBinancePayment) {
        // Binance verification
        console.log('[CryptoDetails] Verifying Binance payment:', {
          paymentId: paymentDetails.payment.id,
          orderId: parseInt(orderId),
          binanceOrderId: binanceOrderId.trim()
        })

        const response = await requests.post<{
          success: boolean
          message: string
          data?: any
        }>(`/payments/binance/verify`, {
          paymentId: paymentDetails.payment.id,
          orderId: parseInt(orderId),
          binanceOrderId: binanceOrderId.trim()
        })

        console.log('[CryptoDetails] Verification response:', response)

        if (response.success) {
          toast.success('Payment verified successfully!')
          router.push(`/payment/success?order_id=${orderId}`)
        } else {
          toast.error(response.message || 'Verification failed')
        }
      } else if (isPaygatePayment) {
        // Paygate - auto check payment status
        console.log('[CryptoDetails] Checking Paygate payment status:', {
          paymentId: paymentDetails.payment.id,
          orderId: parseInt(orderId)
        })

        const response = await requests.get<{
          success: boolean
          message: string
          data?: { payment?: { status: string }; status?: string }
        }>(`/payments/${paymentDetails.payment.id}/status`)

        console.log('[CryptoDetails] Payment status:', response)

        const paygateStatus = response.data?.status || response.data?.payment?.status

        if (response.success && paygateStatus === 'COMPLETED') {
          toast.success('Payment confirmed! Processing your order...')
          router.push(`/payment/success?order_id=${orderId}`)
        } else if (response.success && paygateStatus === 'PENDING') {
          toast.info(
            'Payment not yet confirmed. Please wait for blockchain confirmation (1-2 minutes)'
          )
        } else {
          toast.error(response.message || 'Payment verification failed')
        }
      } else {
        // Generic crypto - optional TX hash
        console.log('[CryptoDetails] Verifying crypto payment:', {
          paymentId: paymentDetails.payment.id,
          transactionHash: binanceOrderId.trim()
        })

        const response = await requests.post<{
          success: boolean
          message: string
          data?: any
        }>(`/payments/verify`, {
          paymentId: paymentDetails.payment.id,
          transactionHash: binanceOrderId.trim()
        })

        if (response.success) {
          toast.success('Payment verified successfully!')
          router.push(`/payment/success?order_id=${orderId}`)
        } else {
          toast.error(response.message || 'Verification failed')
        }
      }
    } catch (error) {
      console.error('[CryptoDetails] Verification error:', error)
      showError(error)
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    const isPaygate = paymentDetails?.payment?.gateway === 'paygate'
    if (!isPaygate) return
    if (step !== 'verify-payment') return
    if (!paymentDetails?.payment?.id) return

    const interval = setInterval(() => {
      if (!verifying) {
        handleVerifyPayment()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [step, paymentDetails?.payment?.gateway, paymentDetails?.payment?.id, verifying])

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (showGuestEmailPrompt) {
    return (
      <div className='min-h-screen bg-background flex flex-col justify-center items-center p-4'>
        <div className='max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6'>
          <Typography variant='h4' weight='semibold' className='mb-2'>
            Verify your order
          </Typography>
          <Typography variant='body2' className='text-muted-foreground mb-4'>
            Enter the email address you used when placing this order to view payment details.
          </Typography>
          <div className='space-y-3'>
            <Label htmlFor='guestEmail'>Order email</Label>
            <Input
              id='guestEmail'
              type='email'
              placeholder='your.email@example.com'
              value={guestEmailInput}
              onChange={(e) => setGuestEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGuestEmailSubmit()}
              disabled={submittingEmail}
            />
            <div className='flex gap-2'>
              <Button onClick={handleGuestEmailSubmit} disabled={submittingEmail || !guestEmailInput.trim()} className='flex-1'>
                {submittingEmail ? 'Loading...' : 'Continue'}
              </Button>
              <Button variant='outline' onClick={() => router.push('/')}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-4'>
        <Typography variant='h4' className='mb-4'>
          Payment Not Found
        </Typography>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  const isBinance = paymentDetails.payment.gateway === 'binance'
  const isPaygate = paymentDetails.payment.gateway === 'paygate'

  const getPaymentTitle = () => {
    if (isBinance) return 'Binance Internal Transfer'
    if (isPaygate) return 'Paygate Crypto Payment'
    return 'Crypto Payment'
  }

  const getAddressLabel = () => {
    if (isBinance) return 'Send to Binance ID'
    if (isPaygate) return 'Send to Paygate Wallet'
    return 'Payment Address'
  }

  return (
    <div className='min-h-screen bg-background py-8 px-4'>
      <div className='max-w-2xl mx-auto'>
        <div className='bg-card border border-border rounded-lg shadow-lg p-6 md:p-8'>
          {/* Header */}
          <div className='flex justify-between items-center mb-6'>
            <Typography variant='h4' weight='semibold'>
              {getPaymentTitle()}
            </Typography>
            <Button variant='ghost' size='icon' onClick={() => router.back()}>
              ×
            </Button>
          </div>

          {/* Progress Steps */}
          <div className='flex items-center justify-center mb-8'>
            <div className='flex items-center space-x-4'>
              {/* Step 1 */}
              <div className='flex flex-col items-center'>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step === 'make-payment'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  <span className='text-sm font-semibold'>1</span>
                </div>
                <span className='text-xs mt-2 text-muted-foreground'>Make payment</span>
              </div>

              <div className={`w-16 h-0.5 ${step === 'verify-payment' ? 'bg-primary' : 'bg-muted'}`} />

              {/* Step 2 */}
              <div className='flex flex-col items-center'>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step === 'verify-payment'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  <span className='text-sm font-semibold'>2</span>
                </div>
                <span className='text-xs mt-2 text-muted-foreground'>Verify payment</span>
              </div>
            </div>
          </div>

          {/* Step 1: Make Payment */}
          {step === 'make-payment' && (
            <div className='space-y-6'>
              {/* Amount */}
              <div className='text-center'>
                <Typography variant='h2' weight='bold' className='mb-2'>
                  {paymentDetails.amount} {paymentDetails.currency}
                </Typography>
              </div>

              {/* Pay ID / Address */}
              <div className='bg-muted/50 p-4 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <Label className='text-sm text-muted-foreground'>{getAddressLabel()}</Label>
                    <Typography variant='body1' weight='semibold' className='mt-1 break-all'>
                      {paymentDetails.address}
                    </Typography>
                  </div>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={handleCopyPayId}
                    className='ml-4 shrink-0'
                  >
                    {copied ? (
                      <Check className='h-4 w-4 text-green-500' />
                    ) : (
                      <Copy className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              {paymentDetails.qrCode && (
                <div className='flex flex-col items-center space-y-2'>
                  <Typography variant='body2' className='text-muted-foreground'>
                    {isBinance
                      ? 'Scan this QR code with your Binance app'
                      : isPaygate
                        ? 'Scan with your crypto wallet (MetaMask, Trust Wallet, etc.)'
                        : 'Scan this QR code'}
                  </Typography>
                  <div className='bg-white p-4 rounded-lg border-2 border-border'>
                    {/* Use regular img for external URLs (Cloudinary) */}
                    <img
                      src={paymentDetails.qrCode}
                      alt='Payment QR Code'
                      width={200}
                      height={200}
                      className='w-50 h-50 object-contain'
                      onError={(e) => {
                        console.error('[CryptoDetails] QR code failed to load:', paymentDetails.qrCode)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Instructions - Gateway Specific */}
              <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3'>
                <Typography variant='body2' weight='semibold' className='text-blue-900 dark:text-blue-100'>
                  Payment Instructions:
                </Typography>

                {isPaygate ? (
                  <div className='space-y-2 text-sm text-blue-800 dark:text-blue-200'>
                    <p>
                      <span className='font-semibold'>Step 1:</span> Send{' '}
                      <span className='font-mono font-semibold'>{paymentDetails.amount} {paymentDetails.currency}</span>{' '}
                      to the wallet address above
                    </p>
                    <p className='ml-4'>
                      • Open your crypto wallet (MetaMask, Trust Wallet, Coinbase, etc.)
                    </p>
                    <p className='ml-4'>
                      • Make sure you're on the <span className='font-semibold'>Polygon (Matic) network</span>
                    </p>
                    <p className='ml-4'>
                      • Enter the wallet address above or scan the QR code
                    </p>
                    <p className='ml-4'>
                      • Send exactly{' '}
                      <span className='font-mono font-semibold'>{paymentDetails.amount} USDC</span>
                    </p>
                    <p>
                      <span className='font-semibold'>Step 2:</span> Click "Confirm payment" below after sending
                    </p>
                    <p className='ml-4'>• We'll automatically detect your payment within 1-2 minutes</p>
                  </div>
                ) : isBinance ? (
                  <div className='space-y-2 text-sm text-blue-800 dark:text-blue-200'>
                    <p>
                      <span className='font-semibold'>Step 1:</span> Scan or copy the Binance ID
                    </p>
                    <p className='ml-4'>
                      • Scan the QR code with your Binance app, or
                    </p>
                    <p className='ml-4'>
                      • Copy the ID and paste in your Binance internal transfer
                    </p>
                    <p>
                      <span className='font-semibold'>Step 2:</span> Send the exact amount and confirm
                    </p>
                    <p className='ml-4'>
                      • Amount: <span className='font-mono'>{paymentDetails.amount}</span> USDT
                    </p>
                  </div>
                ) : (
                  <div className='space-y-2 text-sm text-blue-800 dark:text-blue-200'>
                    <p className='font-semibold'>Send cryptocurrency to the address above:</p>
                    <p className='ml-4'>
                      • Amount: <span className='font-mono font-semibold'>{paymentDetails.amount}</span>
                    </p>
                    <p className='ml-4'>
                      • Network: <span className='font-semibold'>Check wallet requirements</span>
                    </p>
                    <p className='ml-4'>• Click "Confirm payment" after sending</p>
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              <Button onClick={handleConfirmPayment} className='w-full' size='lg'>
                Confirm payment
              </Button>
            </div>
          )}

          {/* Step 2: Verify Payment */}
          {step === 'verify-payment' && (
            <div className='space-y-6'>
              {/* Payment Details Summary */}
              <div className='bg-muted/50 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Amount</span>
                  <Typography variant='body1' weight='semibold'>
                    {paymentDetails.amount} {paymentDetails.currency}
                  </Typography>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>{getAddressLabel()}</span>
                  <Typography variant='body1' weight='semibold' className='break-all'>
                    {paymentDetails.address}
                  </Typography>
                </div>
              </div>

              {isBinance ? (
                <>
                  {/* Order ID Input - Binance Only */}
                  <div className='space-y-2'>
                    <Label htmlFor='binanceOrderId'>Enter your Binance Order ID</Label>
                    <Input
                      id='binanceOrderId'
                      value={binanceOrderId}
                      onChange={(e) => setBinanceOrderId(e.target.value)}
                      placeholder='e.g. 1234567890123456'
                      className='text-lg'
                    />
                  </div>

                  {/* Example Payment Success Popup */}
                  <div className='bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Check className='h-5 w-5 text-green-500' />
                      <Typography
                        variant='body2'
                        weight='semibold'
                        className='text-green-700 dark:text-green-300'
                      >
                        Successful payment example:
                      </Typography>
                    </div>
                    <img
                      src='/images/binance-success.png'
                      alt='Binance Success'
                      className='rounded w-full'
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                </>
              ) : isPaygate ? (
                <>
                  {/* Paygate - Auto Status Check */}
                  <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                    <Typography variant='body2' className='text-blue-800 dark:text-blue-200'>
                      ✓ Sending{' '}
                      <span className='font-mono font-semibold'>
                        {paymentDetails.amount} {paymentDetails.currency}
                      </span>{' '}
                      to{' '}
                      <span className='font-mono font-semibold text-xs break-all'>{paymentDetails.address}</span>
                    </Typography>
                    <Typography variant='body2' className='text-blue-700 dark:text-blue-300 mt-2'>
                      We will automatically detect your payment once it&apos;s confirmed on the blockchain
                      (typically 1-2 minutes)
                    </Typography>
                  </div>
                </>
              ) : (
                <>
                  {/* Generic Crypto Verification */}
                  <div className='space-y-2'>
                    <Label htmlFor='txHash'>Transaction Hash (optional)</Label>
                    <Input
                      id='txHash'
                      value={binanceOrderId}
                      onChange={(e) => setBinanceOrderId(e.target.value)}
                      placeholder='Paste your transaction hash to verify'
                      className='text-sm font-mono'
                    />
                    <Typography variant='body2' className='text-xs text-muted-foreground'>
                      You can find this in your wallet after sending
                    </Typography>
                  </div>
                </>
              )}

              {/* Instructions */}
              {isBinance ? (
                <div className='space-y-2 text-sm text-muted-foreground'>
                  <p>1. Copy the Order ID from the successful payment details in your Binance account.</p>
                  <p>2. Paste it into the field above and tap &quot;Verify payment&quot;.</p>
                </div>
              ) : isPaygate ? (
                <div className='space-y-2 text-sm text-muted-foreground'>
                  <p>✓ Waiting for blockchain confirmation...</p>
                  <p>We automatically check for payments. Just click below to verify.</p>
                </div>
              ) : (
                <div className='space-y-2 text-sm text-muted-foreground'>
                  <p>1. (Optional) Paste your transaction hash to help us verify faster</p>
                  <p>2. Click &quot;Verify payment&quot; to complete</p>
                </div>
              )}

              {/* Verify Button */}
              <Button
                onClick={handleVerifyPayment}
                disabled={isBinance && !binanceOrderId.trim() ? true : verifying}
                className='w-full'
                size='lg'
              >
                {verifying ? (
                  <>
                    <span className='mr-2 animate-spin'>⏳</span>
                    {isBinance ? 'Verifying...' : isPaygate ? 'Checking payment...' : 'Verifying...'}
                  </>
                ) : isBinance ? (
                  'Verify payment'
                ) : isPaygate ? (
                  'Check payment status'
                ) : (
                  'Verify payment'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

