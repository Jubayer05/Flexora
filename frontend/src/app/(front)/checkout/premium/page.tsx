'use client'

import Cookies from 'js-cookie'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import PayGateProviderDialog, {
  PAYGATE_MULTI_PROVIDER_CODE,
  resolvePayGateProviderCode,
  type PayGateProviderOption
} from '@/components/checkout/PayGateProviderDialog'
import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import VoletPaymentDialog from '@/components/payment/VoletPaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import {
  calculatePaymentAdjustments,
  getPaymentBonusCopy,
  getPaymentFeeCopy
} from '@/utils/payment-adjustments'
import { ArrowLeft, Crown, Loader2, Wallet } from 'lucide-react'

interface Product {
  minQuantity: number
  maxQuantity?: number | null
  stockCount?: number | null
  id: number
  name: string
  slug: string
  description: string
  type: string
  price: any // may come as string OR object from API
  thumbnail?: string
  images: string[]
}

interface PaymentMethod {
  id: number
  name: any
  gateway: string
  isActive: boolean
  minAmount: any
  currencies: string[]
  bonus?: any
  bonusThreshold?: any
  feeType?: any | null
  feeValue?: any | null
  testMode: boolean
  thumbnail?: any | null
}

type PayGateProvider = PayGateProviderOption

export default function PremiumCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isLoggedIn = !!Cookies.get('token')

  const [productId, setProductId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<'guest-info' | 'targets' | 'payment'>(
    isLoggedIn ? 'targets' : 'guest-info'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [premiumTargets, setPremiumTargets] = useState<string[]>([''])
  const [guestEmail, setGuestEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [selectedPaygateProvider, setSelectedPaygateProvider] = useState('')
  const [showPayGateProviderDialog, setShowPayGateProviderDialog] = useState(false)
  const [useWalletBalance, setUseWalletBalance] = useState(false)
  const [walletBalanceAmount, setWalletBalanceAmount] = useState(0)
  const [voletDialogOpen, setVoletDialogOpen] = useState(false)
  const [voletDialogData, setVoletDialogData] = useState<{
    orderId: number
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)

  // Helper to safely convert any value to string for rendering (prevents React child object crash)
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return String(value)

    // If something has a real toString (not Object.prototype.toString), try it
    if (typeof value === 'object') {
      if (typeof value?.toString === 'function' && value.toString !== Object.prototype.toString) {
        try {
          return value.toString()
        } catch {
          return ''
        }
      }

      // Prisma Decimal sometimes arrives as plain object {s,e,d}; don't render it directly
      // Returning '' avoids crash; backend should ideally send strings for decimals.
      return ''
    }

    return String(value)
  }

  // Safe number helper (avoids NaN display)
  const safeNumber = (value: any, fallback = 0) => {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
    const str = safeString(value)
    const n = parseFloat(str)
    return Number.isFinite(n) ? n : fallback
  }

  // Fetch payment methods
  const { data: paymentMethodsData, loading: paymentMethodsLoading } = useAsync<{
    success: boolean
    data: PaymentMethod[]
  }>(() => '/payment-methods')

  // Fetch user's wallet balance (only if logged in)
  const { data: balanceData, loading: balanceLoading } = useAsync<{
    success: boolean
    data: { balance: number } | { id: number; balance: number }
  }>(() => (isLoggedIn ? '/customer/balance' : null))

  const userBalance = useMemo(() => {
    if (!balanceData?.data) return 0
    const data = balanceData.data as any
    return parseFloat(data.balance || 0)
  }, [balanceData])

  const paymentMethods = useMemo(() => {
    const list = paymentMethodsData?.data
    return Array.isArray(list) ? list : []
  }, [paymentMethodsData])

  const selectedMethodForProvider = paymentMethods.find((m) => m.id === selectedPaymentMethod)
  const paygateSelected = selectedMethodForProvider?.gateway?.toLowerCase() === 'paygate'

  const { data: paygateProvidersData } = useAsync<{
    success: boolean
    data: {
      providers: PayGateProvider[]
    }
  }>(() => (paygateSelected ? '/payments/paygate/providers' : null))

  const paygateProviders =
    paygateProvidersData?.data?.providers?.filter((provider) => provider.isActive) || []

  useEffect(() => {
    if (!paygateSelected) {
      setSelectedPaygateProvider('')
      return
    }

    if (!selectedPaygateProvider) {
      setSelectedPaygateProvider(PAYGATE_MULTI_PROVIDER_CODE)
    }
  }, [paygateProviders, paygateSelected, selectedPaygateProvider])

  // Initialize from search params after mount
  useEffect(() => {
    const id = searchParams?.get('id')
    const qty = parseInt(searchParams?.get('qty') || '1', 10)

    setProductId(id)
    setQuantity(Number.isFinite(qty) && qty > 0 ? qty : 1)
    setMounted(true)

    // Pre-fill guest email from sessionStorage if available
    const savedEmail = sessionStorage.getItem('guestCheckoutEmail')
    if (savedEmail && !isLoggedIn) setGuestEmail(savedEmail)
  }, [searchParams, isLoggedIn])

  // Fetch product details
  const {
    data: productData,
    loading: productLoading,
    error: productError
  } = useAsync<{
    success: boolean
    data: Product
  }>(() => (productId ? `/products/${productId}` : null))

  // Extract product safely
  const product: Product | null = useMemo(() => {
    if (!productData) return null
    if ((productData as any)?.data && typeof (productData as any).data === 'object')
      return (productData as any).data
    if (typeof productData === 'object' && (productData as any).id) return productData as any
    return null
  }, [productData])

  const safeProductName = product ? safeString(product.name) : ''
  const unitPrice = product ? safeNumber(product.price, 0) : 0
  const safeProductDescription = product ? safeString(product.description) : ''
  const subtotalPrice = unitPrice * quantity
  const {
    activeSubscription,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays,
    subscriptionRemainingLabel
  } = useActiveSubscriptionDiscount(isLoggedIn ? subtotalPrice : 0)
  const baseTotalPrice = Math.max(0, subtotalPrice - subscriptionDiscountAmount)
  const paymentAdjustment = calculatePaymentAdjustments(baseTotalPrice, selectedMethodForProvider)
  const totalPrice = selectedPaymentMethod ? paymentAdjustment.finalAmount : baseTotalPrice
  const minAllowedQuantity = 1
  const effectiveMaxQuantity = 1000

  useEffect(() => {
    if (!product) return
    setQuantity((current) => Math.max(minAllowedQuantity, Math.min(current, effectiveMaxQuantity)))
  }, [product, minAllowedQuantity, effectiveMaxQuantity])

  useEffect(() => {
    setPremiumTargets((current) =>
      Array.from({ length: quantity }, (_, index) => current[index] ?? '')
    )
  }, [quantity])

  // When balance covers full amount and no payment choice yet, default to wallet so user can place order without selecting a payment method
  useEffect(() => {
    if (
      isLoggedIn &&
      step === 'payment' &&
      userBalance >= totalPrice &&
      totalPrice > 0 &&
      !useWalletBalance &&
      !selectedPaymentMethod
    ) {
      setUseWalletBalance(true)
      setWalletBalanceAmount(totalPrice)
    }
  }, [isLoggedIn, step, userBalance, totalPrice, useWalletBalance, selectedPaymentMethod])

  const handleSubmitTargets = async (e: React.FormEvent) => {
    e.preventDefault()

    if (premiumTargets.some((value) => !value.trim())) {
      return toast.error('Please enter a username or account number for each Premium package')
    }

    const invalidTarget = premiumTargets.find((value) => value.trim().replace(/^@/, '').length < 3)
    if (invalidTarget) {
      return toast.error('Each username or account number must be at least 3 characters')
    }

    setStep('payment')
  }

  const handleSubmitGuestInfo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) return toast.error('Please enter your name')
    if (!customerPhone.trim()) return toast.error('Please enter your phone number')
    if (!guestEmail.trim()) return toast.error('Please enter your email')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guestEmail)) return toast.error('Please enter a valid email address')

    setStep('targets')
  }

  const handleProceedToCheckout = async (skipPayGateProviderDialog: boolean = false) => {
    if (!product) return toast.error('Product not found')
    if (premiumTargets.some((value) => !value.trim())) {
      return toast.error('Please enter a username or account number for each Premium package')
    }

    if (!isLoggedIn && !guestEmail.trim()) {
      setStep('guest-info')
      return toast.error('Please enter your email to continue')
    }

    // Check if using wallet or payment method is selected
    if (!useWalletBalance && !selectedPaymentMethod) {
      return toast.error('Please select a payment method or use wallet balance')
    }

    // If using wallet, verify sufficient balance
    if (useWalletBalance && walletBalanceAmount < totalPrice && !selectedPaymentMethod) {
      return toast.error(
        'Insufficient wallet balance. Please select a payment method for the remaining amount.'
      )
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

    setIsSubmitting(true)
    try {
      const orderPayload: any = {
        productId: product.id,
        quantity: quantity || 1,
        meta: {
          premiumTargets: premiumTargets.map((value) => value.trim()),
          telegramUsername: premiumTargets[0]?.trim()
        }
      }

      if (!isLoggedIn) {
        orderPayload.customerName = customerName
        orderPayload.customerPhone = customerPhone
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

      const orderId = orderResponse.data?.id
      if (!orderId) {
        toast.error('Failed to get order ID')
        return
      }

      if (!isLoggedIn && guestEmail) sessionStorage.setItem('guestOrderEmail', guestEmail)

      // If using wallet balance to cover full amount
      if (useWalletBalance && walletBalanceAmount >= totalPrice) {
        const walletPaymentResponse = await requests.post<{
          success: boolean
          message: string
          data: { payment: { id: number; status: string } }
        }>(
          '/payments/initiate',
          {
            orderId,
            walletAmount: walletBalanceAmount,
            meta: {
              premiumTargets: premiumTargets.map((value) => value.trim()),
              telegramUsername: premiumTargets[0]?.trim()
            }
          },
          { skipAuthRedirect: true } as any
        )

        if (!walletPaymentResponse.success) {
          toast.error(walletPaymentResponse.message || 'Failed to process wallet payment')
          return
        }

        toast.success(
          'Payment completed using wallet balance! Redirecting to your delivery details...'
        )
        router.push(`/payment/success?order_id=${orderId}&status=success`)
        return
      }

      // Check if selected payment method is Volet (embedded Stripe Elements)
      // Volet uses Payment Intent API, not Checkout Session
      if (selectedPaymentMethod) {
        const selectedMethod = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)
        if (selectedMethod?.gateway?.toLowerCase() === 'volet') {
          console.log('[PremiumCheckout] Volet gateway detected, opening payment dialog', {
            orderId,
            paymentMethodId: selectedPaymentMethod,
            amount: totalPrice
          })
          const orderAmount = totalPrice - (useWalletBalance ? walletBalanceAmount : 0)
          const currency = selectedMethod?.currencies?.[0] || 'USD'

          // Set dialog data and open dialog together
          const dialogData = {
            orderId,
            paymentMethodId: selectedPaymentMethod,
            amount: orderAmount,
            currency
          }

          console.log('[PremiumCheckout] Setting Volet dialog data:', dialogData)

          // Set both states - React will batch them
          setVoletDialogData(dialogData)
          setVoletDialogOpen(true)

          setIsSubmitting(false)
          return // Exit early for Volet embedded payment
        }
      }

      // Otherwise use selected payment method
      const selectedMethod = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)
      const paymentResponse = await requests.post<{
        success: boolean
        message: string
        data: {
          payment: { id: number; status: string }
          paymentUrl?: string
          address?: string
          qrCode?: string
        }
      }>(
        '/payments/initiate',
        {
          orderId,
          paymentMethodId: selectedPaymentMethod,
          walletAmount: useWalletBalance ? walletBalanceAmount : 0,
          paygateProviderCode:
            selectedMethod?.gateway?.toLowerCase() === 'paygate'
              ? resolvePayGateProviderCode(selectedPaygateProvider)
              : undefined,
          meta: {
            premiumTargets: premiumTargets.map((value) => value.trim()),
            telegramUsername: premiumTargets[0]?.trim()
          }
        },
        { skipAuthRedirect: true } as any
      )

      if (!paymentResponse.success) {
        toast.error(paymentResponse.message || 'Failed to initiate payment')
        return
      }

      const { paymentUrl, address, qrCode } = paymentResponse.data

      // Redirect to payment gateway or show crypto payment details
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
        toast.success('Payment initiated! Redirecting...')
        router.push(`/payment/crypto-details?orderId=${orderId}`)
      } else {
        toast.success('Payment completed! Redirecting to your delivery details...')
        router.push(`/payment/success?order_id=${orderId}&status=success`)
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error?.message || 'Failed to complete checkout')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted || productLoading) {
    return (
      <Section>
        <Container>
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        </Container>
      </Section>
    )
  }

  if (!productId || !product || !product.id) {
    return (
      <Section>
        <Container>
          <div className='text-center py-16'>
            <Typography variant='h3' className='mb-4'>
              Product Not Found
            </Typography>
            <Typography variant='body2' className='text-muted-foreground mb-4'>
              {productError ? (
                <>
                  Error:{' '}
                  {typeof productError === 'string' ? productError : 'Failed to load product'}
                </>
              ) : (
                <>Product ID: {productId || 'None'}</>
              )}
            </Typography>
            <Button asChild>
              <Link href='/shop'>Back to Shop</Link>
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  const currentStep: 'review' | 'payment' = step === 'payment' ? 'payment' : 'review'

  return (
    <>
      <Section className='py-8 md:py-12'>
        <Container className='max-w-6xl'>
          {/* Header */}
          <div className='mb-8'>
            <Button variant='ghost' size='sm' className='mb-4 -ml-2' onClick={() => router.back()}>
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back
            </Button>

            <div className='flex items-center gap-3 mb-6'>
              <div className='p-3 rounded-lg bg-amber-500/10 border border-amber-500/20'>
                <Crown className='w-6 h-6 text-amber-500' />
              </div>
              <div>
                <Typography variant='h4' weight='bold' className='mb-1'>
                  Telegram Premium Checkout
                </Typography>
                <Typography variant='body2' className='text-muted-foreground'>
                  {isLoggedIn
                    ? 'Complete your premium subscription purchase'
                    : 'Create an account or checkout as guest'}
                </Typography>
              </div>
            </div>

            {/* Step Indicator */}
            <div className='mb-8'>
              <div className='flex items-center justify-center gap-2 sm:gap-4'>
                {[
                  { label: 'Review', step: 'review' as const },
                  { label: 'Payment', step: 'payment' as const }
                ].map((stepItem, index) => {
                  const isActive = currentStep === stepItem.step
                  const isCompleted = stepItem.step === 'review' && currentStep === 'payment'

                  return (
                    <div key={stepItem.step} className='flex items-center'>
                      <div className='flex flex-col items-center'>
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                              : isActive
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-muted border-muted-foreground text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <span
                          className={`mt-2 text-sm font-semibold ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {stepItem.label}
                        </span>
                      </div>

                      {index < 1 && (
                        <div
                          className={`h-1 w-12 sm:w-20 mx-3 transition-all rounded-full ${isCompleted ? 'bg-primary' : 'bg-muted-foreground'}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>
            {/* Product Summary */}
            <div className='lg:col-span-1 order-2 lg:order-1'>
              <Card className='sticky top-6 border-2'>
                <CardHeader className='pb-4 border-b'>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <Crown className='w-5 h-5 text-amber-500' />
                    Order Summary
                  </CardTitle>
                </CardHeader>

                <CardContent className='space-y-5 pt-4'>
                  {product &&
                    (product.thumbnail || (Array.isArray(product.images) && product.images[0])) && (
                      <div className='relative w-full h-48 rounded-xl overflow-hidden bg-linear-to-br from-amber-500/10 to-primary/10 border-2 border-amber-500/20'>
                        <CustomImage
                          src={
                            safeString(product.thumbnail) ||
                            safeString(Array.isArray(product.images) ? product.images[0] : '')
                          }
                          alt={safeProductName}
                          fill
                          className='object-cover'
                        />
                      </div>
                    )}

                  <div className='space-y-3'>
                    <div>
                      <Typography variant='h5' weight='bold' className='mb-2'>
                        {safeProductName}
                      </Typography>
                      {safeProductDescription && (
                        <Typography variant='body2' className='text-muted-foreground line-clamp-2'>
                          {safeProductDescription}
                        </Typography>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className='space-y-3'>
                    <div className='flex justify-between items-center py-2'>
                      <span className='text-sm text-muted-foreground'>Unit Price</span>
                      <span className='text-base font-semibold'>${unitPrice.toFixed(2)}</span>
                    </div>

                    <div className='flex justify-between items-center py-2'>
                      <span className='text-sm text-muted-foreground'>Quantity</span>
                      <div className='flex items-center gap-2 rounded-lg border-2 p-1.5 bg-muted/50'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setQuantity((q) => Math.max(minAllowedQuantity, q - 1))
                          }}
                          disabled={quantity <= minAllowedQuantity}
                          className='h-7 w-7'
                        >
                          -
                        </Button>

                        <span className='min-w-10 text-center text-sm font-bold'>{quantity}</span>

                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setQuantity((q) =>
                              Math.min(effectiveMaxQuantity, Math.max(minAllowedQuantity, q + 1))
                            )
                          }}
                          disabled={quantity >= effectiveMaxQuantity}
                          className='h-7 w-7'
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {subscriptionDiscountAmount > 0 && (
                      <>
                        <div className='flex justify-between items-center py-1 px-3'>
                          <span className='text-sm text-muted-foreground'>Subtotal</span>
                          <span className='text-sm font-semibold'>${subtotalPrice.toFixed(2)}</span>
                        </div>
                        <div className='space-y-1 rounded-lg border border-primary/20 bg-primary/10 p-3'>
                          <div className='flex justify-between items-center gap-3'>
                            <span className='text-sm text-green-600'>
                              Subscription Discount ({subscriptionDiscountPercent}%)
                            </span>
                            <span className='text-sm font-semibold text-green-600'>
                              -${subscriptionDiscountAmount.toFixed(2)}
                            </span>
                          </div>
                          <Typography variant='caption' className='block text-muted-foreground'>
                            {activeSubscription?.package?.name || 'Subscription'} is valid for{' '}
                            {subscriptionDurationDays} days. {subscriptionRemainingLabel}
                          </Typography>
                        </div>
                      </>
                    )}

                    {selectedPaymentMethod && paymentAdjustment.feeAmount > 0 && (
                      <div className='flex justify-between items-center py-1 px-3'>
                        <span className='text-sm text-orange-500'>Payment Fee</span>
                        <span className='text-sm font-semibold text-orange-500'>
                          +${paymentAdjustment.feeAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className='flex justify-between items-center py-2 bg-primary/5 rounded-lg px-3'>
                      <span className='text-base font-bold'>Total</span>
                      <span className='text-xl font-bold text-primary'>
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className='bg-linear-to-br from-amber-500/10 to-primary/10 rounded-xl p-4 space-y-3 border border-amber-500/20'>
                    <Typography variant='body2' weight='bold' className='flex items-center gap-2'>
                      <Crown className='w-4 h-4 text-amber-500' />
                      What you get:
                    </Typography>
                    <ul className='text-sm space-y-2 text-muted-foreground'>
                      <li className='flex items-start gap-2'>
                        <span className='text-primary mt-0.5'>✓</span>
                        <span>Instant Premium activation</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <span className='text-primary mt-0.5'>✓</span>
                        <span>Automatic activation via Fragment API</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <span className='text-primary mt-0.5'>✓</span>
                        <span>No manual setup required</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checkout Form */}
            <div className='lg:col-span-2 order-1 lg:order-2'>
              {step === 'guest-info' ? (
                <Card className='border-2'>
                  <CardHeader className='pb-4 border-b'>
                    <CardTitle className='text-xl'>Guest Information</CardTitle>
                    <CardDescription className='text-base mt-2'>
                      Please provide your contact information to proceed
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='pt-6'>
                    <form onSubmit={handleSubmitGuestInfo} className='space-y-5'>
                      <div className='space-y-2'>
                        <Label htmlFor='name' className='text-sm font-semibold'>
                          Full Name <span className='text-red-500'>*</span>
                        </Label>
                        <Input
                          id='name'
                          type='text'
                          placeholder='John Doe'
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          disabled={isSubmitting}
                          className='text-base h-11'
                          required
                        />
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='email' className='text-sm font-semibold'>
                          Email Address <span className='text-red-500'>*</span>
                        </Label>
                        <Input
                          id='email'
                          type='email'
                          placeholder='your.email@example.com'
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          disabled={isSubmitting}
                          className='text-base h-11'
                          required
                          autoComplete='email'
                        />
                        <Typography variant='caption' className='text-muted-foreground'>
                          We&apos;ll send your order confirmation to this email
                        </Typography>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='phone' className='text-sm font-semibold'>
                          Phone Number <span className='text-red-500'>*</span>
                        </Label>
                        <Input
                          id='phone'
                          type='tel'
                          placeholder='+1234567890'
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          disabled={isSubmitting}
                          className='text-base h-11'
                          required
                          autoComplete='tel'
                        />
                      </div>

                      <Button
                        type='submit'
                        size='lg'
                        className='w-full'
                        disabled={
                          isSubmitting ||
                          !customerName.trim() ||
                          !guestEmail.trim() ||
                          !customerPhone.trim()
                        }
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                            Processing...
                          </>
                        ) : (
                          <>Continue</>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : step === 'targets' ? (
                <Card className='border-2'>
                  <CardHeader className='pb-4 border-b'>
                    <CardTitle className='text-xl flex items-center gap-2'>
                      <Crown className='w-5 h-5 text-amber-500' />
                      Telegram Premium Subscription
                    </CardTitle>
                    <CardDescription className='text-base mt-2'>
                      Enter a username or account number for each Premium package you are buying
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='pt-6'>
                    <form onSubmit={handleSubmitTargets} className='space-y-5'>
                      <div className='space-y-4'>
                        {premiumTargets.map((target, index) => (
                          <div
                            key={`premium-target-${index}`}
                            className='space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-4'
                          >
                            <Label
                              htmlFor={`premium-target-${index}`}
                              className='text-sm font-semibold'
                            >
                              {safeProductName || 'Premium Package'} #{index + 1}{' '}
                              <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                              id={`premium-target-${index}`}
                              type='text'
                              placeholder='Telegram username or account number'
                              value={target}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\s/g, '')
                                setPremiumTargets((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? value : entry
                                  )
                                )
                              }}
                              disabled={isSubmitting}
                              className='text-base h-11'
                              required
                            />
                            <Typography variant='caption' className='text-muted-foreground'>
                              Example: <code>@john_doe</code>, <code>john_doe</code>, or a Telegram
                              account number.
                            </Typography>
                          </div>
                        ))}
                      </div>

                      <div className='bg-linear-to-br from-blue-500/10 to-primary/10 border-2 border-blue-500/20 rounded-xl p-5 space-y-3'>
                        <Typography
                          variant='body2'
                          weight='bold'
                          className='text-blue-600 dark:text-blue-400 flex items-center gap-2'
                        >
                          <Crown className='w-4 h-4' />
                          How it works:
                        </Typography>
                        <ul className='text-sm text-blue-600/90 dark:text-blue-400/90 space-y-2'>
                          <li className='flex items-start gap-2'>
                            <span className='font-bold'>1.</span>
                            <span>
                              Enter one username or account number for each Premium package
                            </span>
                          </li>
                          <li className='flex items-start gap-2'>
                            <span className='font-bold'>2.</span>
                            <span>Complete payment securely</span>
                          </li>
                          <li className='flex items-start gap-2'>
                            <span className='font-bold'>3.</span>
                            <span>Premium activates automatically</span>
                          </li>
                          <li className='flex items-start gap-2'>
                            <span className='font-bold'>4.</span>
                            <span>
                              Valid for <strong>{safeProductName}</strong>
                            </span>
                          </li>
                        </ul>
                      </div>

                      <Button
                        type='submit'
                        size='lg'
                        className='w-full'
                        disabled={isSubmitting || premiumTargets.some((value) => !value.trim())}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                            Processing...
                          </>
                        ) : (
                          <>Continue to Payment</>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className='border-2'>
                  <CardHeader className='pb-4 border-b'>
                    <CardTitle className='text-xl'>Payment Method</CardTitle>
                    <CardDescription className='text-base mt-2'>
                      Select your preferred payment method to complete your purchase
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='space-y-6 pt-6'>
                    <div className='bg-linear-to-br from-muted/50 to-muted/30 rounded-xl p-5 space-y-4 border-2'>
                      <div className='space-y-3'>
                        <Typography variant='caption' className='text-muted-foreground font-medium'>
                          Premium Targets
                        </Typography>
                        <div className='space-y-2'>
                          {premiumTargets.map((target, index) => (
                            <div
                              key={`premium-summary-${index}`}
                              className='flex items-center justify-between rounded-lg border border-primary/10 bg-background/60 px-3 py-2'
                            >
                              <Typography variant='caption' className='text-muted-foreground'>
                                {safeProductName || 'Premium Package'} #{index + 1}
                              </Typography>
                              <Typography variant='body2' weight='bold' className='text-primary'>
                                {target.trim() || '-'}
                              </Typography>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div className='flex items-center justify-between'>
                        <Typography variant='caption' className='text-muted-foreground font-medium'>
                          Product
                        </Typography>
                        <Typography variant='body2' weight='bold'>
                          {safeProductName}
                        </Typography>
                      </div>
                      <Separator />
                      {subscriptionDiscountAmount > 0 && (
                        <>
                          <div className='flex items-center justify-between'>
                            <Typography
                              variant='caption'
                              className='text-muted-foreground font-medium'
                            >
                              Subtotal
                            </Typography>
                            <Typography variant='body2' weight='bold'>
                              ${subtotalPrice.toFixed(2)}
                            </Typography>
                          </div>
                          <div className='space-y-1 rounded-lg border border-primary/20 bg-primary/10 p-3'>
                            <div className='flex items-center justify-between gap-3'>
                              <Typography variant='caption' className='text-green-600 font-medium'>
                                Subscription Discount ({subscriptionDiscountPercent}%)
                              </Typography>
                              <Typography variant='body2' weight='bold' className='text-green-600'>
                                -${subscriptionDiscountAmount.toFixed(2)}
                              </Typography>
                            </div>
                            <Typography variant='caption' className='block text-muted-foreground'>
                              {activeSubscription?.package?.name || 'Subscription'} is valid for{' '}
                              {subscriptionDurationDays} days. {subscriptionRemainingLabel}
                            </Typography>
                          </div>
                          <Separator />
                        </>
                      )}
                      <div className='flex items-center justify-between pt-2'>
                        <Typography variant='body1' weight='bold'>
                          Total Amount
                        </Typography>
                        <Typography variant='h5' weight='bold' className='text-primary'>
                          ${totalPrice.toFixed(2)}
                        </Typography>
                      </div>
                    </div>

                    {/* Wallet Balance Option */}
                    {isLoggedIn && (
                      <div className='space-y-3'>
                        <button
                          type='button'
                          onClick={() => {
                            if (useWalletBalance) {
                              setUseWalletBalance(false)
                              setWalletBalanceAmount(0)
                              setSelectedPaymentMethod(null)
                            } else {
                              setUseWalletBalance(true)
                              setWalletBalanceAmount(Math.min(userBalance, totalPrice))
                              setSelectedPaymentMethod(null)
                            }
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            useWalletBalance
                              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                              : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                          }`}
                          disabled={isSubmitting || userBalance === 0}
                        >
                          <div className='flex items-center gap-4'>
                            <div className='relative w-12 h-12 rounded-lg overflow-hidden border bg-background shrink-0 flex items-center justify-center'>
                              <Wallet
                                className={`w-6 h-6 ${userBalance > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                              />
                            </div>

                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2'>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    useWalletBalance
                                      ? 'border-primary bg-primary'
                                      : 'border-muted-foreground'
                                  }`}
                                >
                                  {useWalletBalance && (
                                    <div className='w-2 h-2 rounded-full bg-white' />
                                  )}
                                </div>

                                <Typography variant='body1' weight='bold'>
                                  Wallet Balance
                                </Typography>
                              </div>

                              <Typography
                                variant='caption'
                                className={`${userBalance > 0 ? 'text-muted-foreground' : 'text-red-500'} mt-1 block`}
                              >
                                {userBalance > 0
                                  ? `Available: $${userBalance.toFixed(2)}`
                                  : 'No balance available'}
                              </Typography>
                            </div>

                            {useWalletBalance && userBalance > 0 && (
                              <Typography variant='body2' weight='bold' className='text-primary'>
                                Use ${Math.min(userBalance, totalPrice).toFixed(2)}
                              </Typography>
                            )}
                          </div>
                        </button>

                        {useWalletBalance && walletBalanceAmount < totalPrice && (
                          <div className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-3'>
                            <Typography
                              variant='body2'
                              className='text-amber-700 dark:text-amber-400'
                            >
                              ℹ️ Wallet covers ${walletBalanceAmount.toFixed(2)}. Select another
                              payment method for the remaining $
                              {(totalPrice - walletBalanceAmount).toFixed(2)}.
                            </Typography>
                          </div>
                        )}

                        {useWalletBalance && walletBalanceAmount >= totalPrice && (
                          <div className='bg-primary/10 border border-primary/20 rounded-lg p-3'>
                            <Typography
                              variant='body2'
                              className='text-primary text-center font-medium'
                            >
                              ✓ Wallet balance covers the full amount!
                            </Typography>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethodsLoading ? (
                      <div className='flex items-center justify-center py-12'>
                        <Loader2 className='w-6 h-6 animate-spin text-primary' />
                      </div>
                    ) : useWalletBalance && walletBalanceAmount >= totalPrice ? (
                      <div className='bg-primary/10 border-2 border-primary/30 rounded-xl p-5'>
                        <Typography
                          variant='body2'
                          weight='bold'
                          className='text-primary flex items-center gap-2 mb-2'
                        >
                          ✓ Payment Method
                        </Typography>
                        <Typography variant='body2' className='text-primary'>
                          Your wallet balance (${walletBalanceAmount.toFixed(2)}) covers the full
                          amount. No additional payment method needed.
                        </Typography>
                      </div>
                    ) : paymentMethods.length > 0 ? (
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <Typography
                            variant='body2'
                            weight='semibold'
                            className='text-muted-foreground mb-2'
                          >
                            {useWalletBalance && walletBalanceAmount > 0
                              ? `Payment Methods (Remaining: $${(totalPrice - walletBalanceAmount).toFixed(2)})`
                              : 'Available Payment Methods'}
                          </Typography>
                        </div>

                        {paymentMethods.map((method) => {
                          const feeCopy = getPaymentFeeCopy(method)
                          const bonusCopy = getPaymentBonusCopy(method)

                          return (
                            <button
                              key={method.id}
                              type='button'
                              onClick={() => setSelectedPaymentMethod(method.id)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                selectedPaymentMethod === method.id
                                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                  : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                              } ${!method.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isSubmitting || !method.isActive}
                            >
                              <div className='flex items-center gap-4'>
                                {safeString(method.thumbnail) && (
                                  <div className='relative w-12 h-12 rounded-lg overflow-hidden border bg-background shrink-0'>
                                    <CustomImage
                                      src={safeString(method.thumbnail)}
                                      alt={safeString(method.name) || 'Payment Method'}
                                      fill
                                      className='object-contain p-1'
                                    />
                                  </div>
                                )}

                                <div className='flex-1 min-w-0'>
                                  <div className='flex items-center gap-2'>
                                    <div
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        selectedPaymentMethod === method.id
                                          ? 'border-primary bg-primary'
                                          : 'border-muted-foreground'
                                      }`}
                                    >
                                      {selectedPaymentMethod === method.id && (
                                        <div className='w-2 h-2 rounded-full bg-white' />
                                      )}
                                    </div>

                                    <Typography variant='body1' weight='bold'>
                                      {safeString(method.name)}
                                    </Typography>
                                  </div>

                                  {feeCopy && (
                                    <Typography
                                      variant='caption'
                                      className='text-muted-foreground mt-1 block'
                                    >
                                      Fee: {feeCopy}
                                    </Typography>
                                  )}

                                  {bonusCopy && (
                                    <Typography
                                      variant='caption'
                                      className='text-green-600 dark:text-green-400 mt-1 block'
                                    >
                                      Bonus: {bonusCopy}
                                    </Typography>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}

                        {paygateSelected && (
                          <Typography variant='caption' className='text-muted-foreground'>
                            PayGate provider will be selected on continue.
                          </Typography>
                        )}
                      </div>
                    ) : (
                      <div className='text-center py-12'>
                        <Typography variant='body2' className='text-muted-foreground'>
                          No payment methods available at the moment
                        </Typography>
                      </div>
                    )}

                    <div className='space-y-3 pt-2'>
                      <Button
                        size='lg'
                        className='w-full h-12 text-base font-bold shadow-lg'
                        onClick={() => handleProceedToCheckout()}
                        disabled={isSubmitting || (!useWalletBalance && !selectedPaymentMethod)}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Crown className='w-5 h-5 mr-2' />
                            Complete Purchase
                          </>
                        )}
                      </Button>

                      <Button
                        variant='outline'
                        size='lg'
                        className='w-full h-11'
                        onClick={() => setStep('targets')}
                        disabled={isSubmitting}
                      >
                        ← Back to Premium Targets
                      </Button>
                    </div>

                    <div className='bg-linear-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/20 rounded-xl p-4'>
                      <Typography
                        variant='body2'
                        weight='bold'
                        className='text-green-700 dark:text-green-400 flex items-center gap-2 mb-1'
                      >
                        🔒 Secure Transaction
                      </Typography>
                      <Typography
                        variant='caption'
                        className='text-green-700/80 dark:text-green-400/80'
                      >
                        Your payment information is encrypted and secure. We use industry-standard
                        SSL encryption to protect your data.
                      </Typography>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-center gap-4 pt-6 mt-6 border-t border-muted-foreground'>
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <span className='text-green-500'>🔒</span>
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

          <div className='pt-4 text-center'>
            <Typography variant='caption' className='text-muted-foreground'>
              Need help?{' '}
              <Link href='/contact' className='text-primary hover:underline'>
                Contact Support
              </Link>{' '}
              or email{' '}
              <a href='mailto:support@flexora.com' className='text-primary hover:underline'>
                support@flexora.com
              </a>
            </Typography>
          </div>
        </Container>
      </Section>

      <PayGateProviderDialog
        open={showPayGateProviderDialog}
        onOpenChange={setShowPayGateProviderDialog}
        providers={paygateProviders}
        selectedProviderCode={selectedPaygateProvider}
        onSelectProvider={setSelectedPaygateProvider}
        amount={Math.max(0, totalPrice - (useWalletBalance ? walletBalanceAmount : 0))}
        onConfirm={() => {
          setShowPayGateProviderDialog(false)
          handleProceedToCheckout(true)
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
