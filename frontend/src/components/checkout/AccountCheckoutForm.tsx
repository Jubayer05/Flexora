'use client'

import CustomImage from '@/components/common/CustomImage'
import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { Loader2, Wallet } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import CouponInput from './CouponInput'
import VoletPaymentDialog from '@/components/payment/VoletPaymentDialog'
import PayGateProviderDialog, {
  PAYGATE_MULTI_PROVIDER_CODE,
  resolvePayGateProviderCode,
  type PayGateProviderOption
} from './PayGateProviderDialog'
import {
  calculatePaymentAdjustments,
  getPaymentBonusCopy,
  getPaymentFeeCopy
} from '@/utils/payment-adjustments'

type Product = {
  minQuantity: number
  id: number
  name: string
  description: string
  price: string
  platform: string
  type: string
  stockCount: number
  thumbnail: string | null
  images: string[]
  maxQuantity: number
}

type PaymentMethod = {
  id: number
  name: string
  gateway: string
  isActive: boolean
  minAmount: string
  currencies: string[]
  bonus: string
  bonusThreshold: string
  feeType: string | null
  feeValue: string | null
  testMode: boolean
}

type PayGateProvider = PayGateProviderOption

const PAYGATE_FALLBACK_PROVIDERS: PayGateProvider[] = [
  { code: 'card-wert', name: 'Wert', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 20, regions: ['GLOBAL'] },
  { code: 'card-stripe', name: 'Stripe', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 5, regions: ['GLOBAL'] },
  { code: 'card-ramp', name: 'Ramp', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 20, regions: ['EU', 'US', 'UK', 'GLOBAL'] },
  { code: 'card-bitnovo', name: 'Bitnovo', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 25, regions: ['EU', 'ES', 'PT', 'IT', 'FR'] },
  { code: 'card-mercuryo', name: 'Mercuryo', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 20, regions: ['EU', 'UK', 'GLOBAL'] },
  { code: 'card-transak', name: 'Transak', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 15, regions: ['EU', 'US', 'UK', 'LATAM', 'GLOBAL'] },
  { code: 'card-guardarian', name: 'Guardarian', type: 'card', method: 'polygon/usdc', isActive: true, minAmount: 20, regions: ['EU', 'UK', 'GLOBAL'] }
]

export default function AccountCheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const qtyParam = searchParams.get('qty')

  // Check if user is logged in
  const isLoggedIn = !!Cookies.get('token')

  const [quantity, setQuantity] = useState(1)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [walletAmount, setWalletAmount] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [selectedPaygateProvider, setSelectedPaygateProvider] = useState<string>('')
  const [showPayGateProviderDialog, setShowPayGateProviderDialog] = useState(false)
  const [voletDialogOpen, setVoletDialogOpen] = useState(false)
  const [voletDialogData, setVoletDialogData] = useState<{
    orderId: number
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)

  // Fetch product details
  const { data: productData, loading: loadingProduct } = useAsync<{ data: Product }>(
    productId ? () => `/products/${productId}` : null
  )

  // Fetch payment methods
  const { data: paymentMethodsData, loading: loadingPaymentMethods } = useAsync<{
    success: boolean
    data: PaymentMethod[]
  }>(() => '/payment-methods')

  // Fetch user balance
  const { data: balanceData, loading: loadingUser } = useAsync<{
    success: boolean
    data: { balance: number }
  }>(isLoggedIn ? () => '/customer/balance' : null)

  const product = productData?.data
  const paymentMethods = paymentMethodsData?.data || []
  const priceForTotals = product ? parseFloat(product.price.toString()) : 0
  const subtotalForTotals = priceForTotals * quantity
  const {
    activeSubscription,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays,
    subscriptionRemainingLabel
  } = useActiveSubscriptionDiscount(isLoggedIn ? subtotalForTotals : 0)
  const totalWithDiscounts = Math.max(0, subtotalForTotals - subscriptionDiscountAmount - couponDiscount)
  const minAllowedQuantity = product?.minQuantity || 1
  const effectiveMaxQuantity = product
    ? (() => {
        const stockCount = product.stockCount || 0
        const rawMaxQ = Number(product.maxQuantity ?? 0)
        if (rawMaxQ === 0) return stockCount
        const maxQ = rawMaxQ > 0 ? rawMaxQ : 1000
        return Math.min(maxQ, stockCount)
      })()
    : 1

  // Filter out 'balance' payment method for guest users
  const availablePaymentMethods = isLoggedIn
    ? paymentMethods
    : paymentMethods.filter((method) => method.gateway !== 'balance')

  const selectedMethodForProvider = paymentMethods.find((m) => m.id === selectedPaymentMethod)
  const paymentAdjustment = calculatePaymentAdjustments(totalWithDiscounts, selectedMethodForProvider)
  const total = selectedPaymentMethod ? paymentAdjustment.finalAmount : totalWithDiscounts
  const paygateSelected = selectedMethodForProvider?.gateway?.toLowerCase() === 'paygate'

  const { data: paygateProvidersData } = useAsync<{
    success: boolean
    data: {
      providers: PayGateProvider[]
    }
  }>(() => (paygateSelected ? '/payments/paygate/providers' : null))

  const apiPayGateProviders = paygateProvidersData?.data?.providers || []
  const activePayGateProviders = apiPayGateProviders.filter((provider) => provider.isActive)
  const paygateProviders =
    activePayGateProviders.length > 0 ? activePayGateProviders : PAYGATE_FALLBACK_PROVIDERS

  useEffect(() => {
    if (!paygateSelected) {
      setSelectedPaygateProvider('')
      return
    }

    if (!selectedPaygateProvider) {
      setSelectedPaygateProvider(PAYGATE_MULTI_PROVIDER_CODE)
    }
  }, [paygateProviders, paygateSelected, selectedPaygateProvider])

  // Load guest data from sessionStorage if available
  useEffect(() => {
    const guestDataStr = sessionStorage.getItem('guestCheckoutData')
    if (guestDataStr) {
      try {
        const guestData = JSON.parse(guestDataStr)
        setGuestEmail(guestData.email || '')
        sessionStorage.removeItem('guestCheckoutData')
      } catch (error) {
        console.error('Failed to parse guest data:', error)
      }
    } else {
      const savedEmail = sessionStorage.getItem('guestCheckoutEmail')
      if (savedEmail) setGuestEmail(savedEmail)
    }
  }, [])

  // Initialize quantity from URL (?qty=) when provided
  useEffect(() => {
    if (!qtyParam) return
    const q = Number(qtyParam)
    if (!Number.isFinite(q) || q <= 0) return
    setQuantity(Math.floor(q))
  }, [qtyParam])

  useEffect(() => {
    if (!product) return
    setQuantity((current) => Math.max(minAllowedQuantity, Math.min(current, effectiveMaxQuantity)))
  }, [product, minAllowedQuantity, effectiveMaxQuantity])

  const processCheckout = async (skipPayGateProviderDialog: boolean = false) => {
    if (!product) {
      toast.error('Product not found')
      return
    }

    // Validate guest information only if not logged in
    if (!isLoggedIn) {
      if (!guestEmail.trim()) {
        toast.error('Please enter your email')
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail.trim())) {
        toast.error('Please enter a valid email address')
        return
      }
    }

    // Check if using wallet or payment method is selected
    const totalWithCoupon = total

    if (!useWallet && !selectedPaymentMethod) {
      toast.error('Please select a payment method or use wallet balance')
      return
    }

    // If using wallet, verify sufficient balance
    if (useWallet && walletAmount < totalWithCoupon && !selectedPaymentMethod) {
      const remainingAmount = totalWithCoupon - walletAmount
      toast.error(
        `Insufficient wallet balance. Available: $${walletAmount.toFixed(2)}, Need: $${totalWithCoupon.toFixed(2)}. You need to select a payment method for the remaining $${remainingAmount.toFixed(2)}.`
      )
      return
    }

    const selectedMethod = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)
    const selectedGateway = selectedMethod?.gateway?.toLowerCase()

    if (selectedGateway === 'paygate' && !skipPayGateProviderDialog) {
      if (!selectedPaygateProvider) {
        setSelectedPaygateProvider(PAYGATE_MULTI_PROVIDER_CODE)
      }

      setShowPayGateProviderDialog(true)
      return
    }

    // Validate stock before checkout
    if (product.stockCount !== undefined && product.stockCount < quantity) {
      toast.error(`Insufficient stock. Available: ${product.stockCount}, Requested: ${quantity}`)
      return
    }

    // Validate quantity limits
    const minQuantity = 1
    if (quantity < minQuantity) {
      toast.error(`Minimum quantity is ${minQuantity}`)
      return
    }
    
    if (quantity > effectiveMaxQuantity) {
      toast.error(`Maximum quantity per order is ${effectiveMaxQuantity}`)
      return
    }

    setIsSubmitting(true)
    try {
      // Step 1: Create Order
      const orderPayload: any = {
        productId: product.id,
        quantity
      }

      // Include coupon code if applied
      if (couponCode) {
        orderPayload.couponCode = couponCode
      }

      // Only include guest info if not logged in
      if (!isLoggedIn) {
        orderPayload.guestEmail = guestEmail
      }

      const orderResponse = await requests.post<{
        success: boolean
        message: string
        data: { id: number; orderNumber: string }
      }>('/customer/orders', orderPayload, { skipAuthRedirect: true } as any)

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create order')
        return
      }

      const orderId = orderResponse.data.id

      // Check if Volet gateway is selected - open dialog
      if (selectedMethod?.gateway === 'volet') {
        console.log('[AccountCheckout] Volet gateway detected, opening payment dialog')
        const orderAmount = total
        const currency = selectedMethod?.currencies?.[0] || 'USD'
        
        setVoletDialogData({
          orderId,
          paymentMethodId: selectedPaymentMethod!,
          amount: orderAmount,
          currency
        })
        setVoletDialogOpen(true)
        setIsSubmitting(false)
        return
      }

      // Step 2: Initiate Payment
      // If using wallet to cover full amount, only send wallet amount (no payment method)
      if (useWallet && walletAmount >= totalWithCoupon) {
        const paymentResponse = await requests.post<{
          success: boolean
          message: string
          data: {
            payment: { id: number; status: string }
          }
        }>('/payments/initiate', {
          orderId,
          walletAmount
        }, { skipAuthRedirect: true } as any)

        if (!paymentResponse.success) {
          toast.error(paymentResponse.message || 'Failed to process wallet payment')
          return
        }

        toast.success('Payment completed using wallet balance! Redirecting to your delivery details...')
        router.push(`/payment/success?order_id=${orderId}&status=success`)
        return
      }

      // Otherwise use payment method (with optional partial wallet payment)
      const paymentResponse = await requests.post<{
        success: boolean
        message: string
        data: {
          payment: { id: number; status: string }
          paymentUrl?: string
          address?: string
          qrCode?: string
        }
      }>('/payments/initiate', {
        orderId,
        paymentMethodId: selectedPaymentMethod,
        walletAmount: useWallet ? walletAmount : undefined,
        paygateProviderCode:
          selectedMethod?.gateway?.toLowerCase() === 'paygate'
            ? resolvePayGateProviderCode(selectedPaygateProvider)
            : undefined
      }, { skipAuthRedirect: true } as any)

      if (!paymentResponse.success) {
        toast.error(paymentResponse.message || 'Failed to initiate payment')
        return
      }

      const { paymentUrl, address, qrCode } = paymentResponse.data

      // Step 3: Redirect to payment or show success
      if (paymentUrl) {
        const shouldOpenInNewTab = selectedMethod?.gateway?.toLowerCase() === 'paygate'

        if (shouldOpenInNewTab) {
          const checkoutTab = window.open(paymentUrl, '_blank', 'noopener,noreferrer')
          if (checkoutTab) {
            toast.success('PayGate checkout opened in a new tab.')
            return
          }
        }

        toast.success('Redirecting to payment gateway...')
        window.location.href = paymentUrl
      } else if (address || qrCode) {
        // Crypto payment (Binance, etc.) - redirect to crypto-details page
        if (!isLoggedIn && guestEmail) {
          sessionStorage.setItem('guestOrderEmail', guestEmail)
        }
        toast.success('Payment initiated! Redirecting...')
        router.push(`/payment/crypto-details?orderId=${orderId}`)
      } else {
        toast.success('Payment completed! Redirecting to your delivery details...')
        router.push(`/payment/success?order_id=${orderId}&status=success`)
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await processCheckout()
  }

  if (loadingProduct || loadingPaymentMethods || (isLoggedIn && loadingUser)) {
    return (
      <div className='top-0 left-0 z-20 absolute inset-0 flex justify-center items-center bg-background/80 backdrop-blur-sm w-full h-screen overflow-hidden!'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (!productId || !product) {
    return (
      <div className='py-12 text-center'>
        <Typography variant='body1' className='text-muted-foreground'>
          No product selected for checkout
        </Typography>
        <Button variant='outline' onClick={() => router.back()} className='mt-4'>
          Go Back
        </Button>
      </div>
    )
  }

  const price = priceForTotals
  const subtotal = subtotalForTotals

  // Determine current step
  // Note: 'review' step is implicit (always completed before payment/confirm)
  const currentStep: 'payment' | 'confirm' = selectedPaymentMethod ? 'confirm' : 'payment'

  return (
    <>
    <form onSubmit={handleSubmit} className='space-y-6 py-4'>
      {/* Step Indicator */}
      <div className='mb-6'>
        <div className='flex items-center justify-center gap-2 sm:gap-4'>
          {[
            { label: 'Review', step: 'review' },
            { label: 'Payment', step: 'payment' },
            { label: 'Confirm', step: 'confirm' }
          ].map((stepItem, index) => {
            const isActive = currentStep === stepItem.step
            // Review is always completed (we're past it if we're on payment or confirm)
            // Payment is completed if we're on confirm
            const isCompleted = 
              (stepItem.step === 'payment' && currentStep === 'confirm')
            
            return (
              <div key={stepItem.step} className='flex items-center'>
                <div className='flex flex-col items-center'>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-primary border-primary text-white'
                        : isActive
                          ? 'bg-primary border-primary text-white'
                          : 'bg-muted border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {stepItem.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 mx-2 transition-all ${
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      {/* Product Summary */}
      <div className='space-y-4 bg-card text-card-foreground p-4 border border-border rounded-lg'>
        <div className='flex items-start gap-4'>
          {/* Product Image */}
          <div className='relative shrink-0 w-20 h-20'>
            {product.thumbnail || product.images.length > 0 ? (
              <CustomImage
                src={product?.thumbnail || product.images[0]}
                alt={product.name}
                fill
                className='rounded-lg object-cover'
              />
            ) : (
              <div className='flex justify-center items-center bg-muted rounded-lg w-full h-full'>
                <div className='bg-muted-foreground/20 rounded w-8 h-8' />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className='flex-1 space-y-1'>
            <Typography variant='h5' weight='semibold'>
              {product.name}
            </Typography>
            <Typography variant='body2' className='text-muted-foreground line-clamp-2'>
              {product.description}
            </Typography>
            <div className='flex gap-4 text-sm'>
              <span className='text-muted-foreground'>
                Platform: <span className='font-medium'>{product.platform}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className='space-y-2 pt-3 border-border border-t'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Unit Price</span>
            <span className='font-semibold text-primary'>${price.toFixed(2)}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Available Stock</span>
            <span className='font-semibold'>{product.stockCount}</span>
          </div>
        </div>
      </div>

      {/* Customer Information - Only show for guests */}
      {!isLoggedIn && (
        <div className='space-y-4 bg-card text-card-foreground p-4 border border-border rounded-lg'>
          <Typography variant='h6' weight='semibold'>
            Email Address
          </Typography>

          <div className='space-y-2'>
            <Label htmlFor='guestEmail'>Your Email *</Label>
            <Input
              id='guestEmail'
              type='email'
              placeholder='your@email.com'
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete='email'
            />
            <Typography variant='caption' className='text-muted-foreground'>
              Account credentials will be sent to this email address
            </Typography>
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className='space-y-2'>
        <Label htmlFor='quantity'>Quantity</Label>
        <div className='flex items-center gap-1 rounded-lg border p-1 w-fit'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => {
              setQuantity((current) => Math.max(minAllowedQuantity, current - 1))
            }}
            disabled={quantity <= minAllowedQuantity || isSubmitting}
            className='h-8 w-8'
          >
            -
          </Button>
          <Input
            id='quantity'
            type='number'
            min={minAllowedQuantity}
            max={effectiveMaxQuantity}
            value={quantity}
            onChange={(e) => {
              const newQty = parseInt(e.target.value) || minAllowedQuantity
              const finalQty = Math.max(minAllowedQuantity, Math.min(newQty, effectiveMaxQuantity))
              setQuantity(finalQty)
            }}
            className='w-20 text-center border-0 focus-visible:ring-0'
            disabled={isSubmitting}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => {
              setQuantity((current) => Math.min(effectiveMaxQuantity, current + 1))
            }}
            disabled={isSubmitting || quantity >= effectiveMaxQuantity}
            className='h-8 w-8'
          >
            +
          </Button>
        </div>
        {product.stockCount !== undefined && (
          <Typography variant='caption' className='text-muted-foreground'>
            Available: {product.stockCount} {product.stockCount === 1 ? 'item' : 'items'}
          </Typography>
        )}
      </div>

      {/* Coupon Code Input */}
      {product && (
        <CouponInput
          productId={product.id}
          orderAmount={subtotal}
          onCouponApplied={(discount, code) => {
            setCouponDiscount(discount)
            setCouponCode(code)
          }}
          onCouponRemoved={() => {
            setCouponDiscount(0)
            setCouponCode('')
          }}
          disabled={isSubmitting}
        />
      )}

      {/* Wallet Balance + Payment Method Section */}
      <div className='space-y-4 bg-card p-4 border border-border rounded-lg'>
        <Typography variant='h6' weight='semibold'>
          Payment & Wallet
        </Typography>

        {/* Wallet Balance Option - Only for logged in users */}
        {isLoggedIn && (
          <div className='space-y-3'>
            <button
              type='button'
              onClick={() => {
                if (useWallet) {
                  setUseWallet(false)
                  setWalletAmount(0)
                  setSelectedPaymentMethod(null)
                } else {
                  setUseWallet(true)
                  setWalletAmount(Math.min(balanceData?.data?.balance || 0, total))
                  setSelectedPaymentMethod(null)
                }
              }}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                useWallet
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              disabled={isSubmitting || (balanceData?.data?.balance || 0) === 0}
            >
              <div className='flex items-center gap-4'>
                <div className='relative w-12 h-12 rounded-lg overflow-hidden border bg-background shrink-0 flex items-center justify-center'>
                  <Wallet className={`w-6 h-6 ${(balanceData?.data?.balance || 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        useWallet ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {useWallet && <div className='w-2 h-2 rounded-full bg-background' />}
                    </div>

                    <Typography variant='body1' weight='bold' className='truncate'>
                      Wallet Balance
                    </Typography>
                  </div>

                  <Typography variant='caption' className={`${(balanceData?.data?.balance || 0) > 0 ? 'text-muted-foreground' : 'text-destructive'} mt-1 block`}>
                    {(balanceData?.data?.balance || 0) > 0 ? `Available: $${(balanceData?.data?.balance || 0).toFixed(2)}` : 'No balance available'}
                  </Typography>
                </div>

                {useWallet && (balanceData?.data?.balance || 0) > 0 && (
                  <Typography variant='body2' weight='bold' className='text-primary'>
                    Use ${Math.min(walletAmount, total).toFixed(2)}
                  </Typography>
                )}
              </div>
            </button>

            {useWallet && walletAmount < total && (
              <div className='bg-accent/50 border border-accent rounded-lg p-3'>
                <Typography variant='body2' className='text-muted-foreground'>
                  ℹ️ Wallet covers ${walletAmount.toFixed(2)}. Select a payment method for the remaining ${(total - walletAmount).toFixed(2)}.
                </Typography>
              </div>
            )}

            {useWallet && walletAmount >= total && (
              <div className='bg-primary/10 border border-primary/30 rounded-lg p-3'>
                <Typography variant='body2' className='text-primary text-center font-medium'>
                  ✓ Wallet balance covers the full amount!
                </Typography>
              </div>
            )}
          </div>
        )}

        {/* Payment Method Selection */}
        {useWallet && walletAmount >= total ? (
          <div className='bg-primary/10 border-2 border-primary/30 rounded-lg p-4'>
            <Typography variant='body2' weight='bold' className='text-primary flex items-center gap-2'>
              ✓ Payment Method
            </Typography>
            <Typography variant='caption' className='text-primary mt-2'>
              Your wallet balance covers the full amount. No additional payment method needed.
            </Typography>
          </div>
        ) : (
          <div className='space-y-3'>
            <Typography variant='body2' weight='semibold'>
              {useWallet && walletAmount > 0 ? `Payment Methods (Remaining: $${(total - walletAmount).toFixed(2)})` : 'Select Payment Method'}
            </Typography>

            {availablePaymentMethods.length === 0 ? (
              <Typography variant='body2' className='text-muted-foreground'>
                No payment methods available
              </Typography>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {availablePaymentMethods.map((method) => {
                  const feeCopy = getPaymentFeeCopy(method)
                  const bonusCopy = getPaymentBonusCopy(method)

                  return (
                    <button
                      key={method.id}
                      type='button'
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      disabled={isSubmitting}
                      className={`flex-1 min-w-max px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/20 font-semibold'
                          : 'border-border bg-background/50 hover:border-primary hover:bg-primary/10'
                      }`}
                    >
                      <span className='text-sm capitalize'>{method.name || method.gateway}</span>
                      {(feeCopy || bonusCopy) && (
                        <span className='mt-1 flex flex-wrap justify-center gap-1 text-[11px]'>
                          {feeCopy && <span className='text-orange-500'>{feeCopy}</span>}
                          {bonusCopy && <span className='text-green-500'>{bonusCopy}</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {paygateSelected && (
              <Typography variant='caption' className='text-muted-foreground'>
                PayGate providers will appear in a popup after you click Continue.
              </Typography>
            )}
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className='space-y-3 bg-card text-card-foreground p-4 border border-border rounded-lg'>
        <Typography variant='h6' weight='semibold'>
          Order Summary
        </Typography>
        <div className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Subtotal ({quantity} items)</span>
            <span className='font-medium'>${subtotal.toFixed(2)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-primary'>Coupon Discount</span>
              <span className='font-medium text-primary'>-${couponDiscount.toFixed(2)}</span>
            </div>
          )}
          {subscriptionDiscountAmount > 0 && (
            <div className='space-y-1 rounded-lg border border-primary/20 bg-primary/10 p-3'>
              <div className='flex justify-between items-center gap-3'>
                <span className='text-green-600'>
                  Subscription Discount ({subscriptionDiscountPercent}%)
                </span>
                <span className='font-medium text-green-600'>
                  -${subscriptionDiscountAmount.toFixed(2)}
                </span>
              </div>
              <Typography variant='caption' className='block text-muted-foreground'>
                {activeSubscription?.package?.name || 'Subscription'} is valid for{' '}
                {subscriptionDurationDays} days. {subscriptionRemainingLabel}
              </Typography>
            </div>
          )}
          {selectedPaymentMethod && paymentAdjustment.feeAmount > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-orange-500'>Payment Fee</span>
              <span className='font-medium text-orange-500'>+${paymentAdjustment.feeAmount.toFixed(2)}</span>
            </div>
          )}
          <div className='flex justify-between items-center pt-2 border-border border-t'>
            <span className='font-semibold text-lg'>Total</span>
            <span className='font-bold text-primary text-xl'>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex gap-3 pt-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.back()}
          className='flex-1'
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type='submit'
          className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80 font-semibold'
          disabled={product.stockCount === 0 || isSubmitting || (!useWallet && !selectedPaymentMethod) || (useWallet && walletAmount < total && !selectedPaymentMethod)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 w-4 h-4 animate-spin' />
              Processing...
            </>
          ) : (
            'Complete Purchase'
          )}
        </Button>
      </div>

      {/* Security Badges */}
      <div className='flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border'>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='text-primary'>🔒</span>
          <span>SSL Secured</span>
        </div>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='text-blue-500'>🛡️</span>
          <span>256-bit Encryption</span>
        </div>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='text-purple-500'>✓</span>
          <span>PCI Compliant</span>
        </div>
      </div>

      {/* Support Contact */}
      <div className='pt-4 text-center'>
        <Typography variant='caption' className='text-muted-foreground'>
          Need help?{' '}
          <Link href='/contact' className='text-primary hover:underline'>
            Contact Support
          </Link>
          {' '}or email{' '}
          <a href='mailto:support@uhqaccounts.com' className='text-primary hover:underline'>
            support@uhqaccounts.com
          </a>
        </Typography>
      </div>
    </form>

    <PayGateProviderDialog
      open={showPayGateProviderDialog}
      onOpenChange={setShowPayGateProviderDialog}
      providers={paygateProviders}
      selectedProviderCode={selectedPaygateProvider}
      onSelectProvider={setSelectedPaygateProvider}
      amount={total}
      onConfirm={() => {
        setShowPayGateProviderDialog(false)
        processCheckout(true)
      }}
      continueLabel='Continue with selected provider'
    />

    {/* Volet Payment Dialog */}
    {voletDialogData && (
      <VoletPaymentDialog
        open={voletDialogOpen}
        onOpenChange={setVoletDialogOpen}
        orderId={voletDialogData!.orderId}
        paymentMethodId={voletDialogData!.paymentMethodId}
        amount={voletDialogData!.amount}
        currency={voletDialogData!.currency}
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      />
    )}
    </>
  )
}
