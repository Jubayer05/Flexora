'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { toast } from 'sonner'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import CustomImage from '@/components/common/CustomImage'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
// import MotionLoader from '@/components/common/motion-loader'
import MotionLoader from '@/components/common/MotionLoader'
import useAsync from '@/hooks/useAsync'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import requests from '@/services/network/http'
import { useCartStore } from '@/stores/cart-store'
import VoletPaymentDialog from '@/components/payment/VoletPaymentDialog'
import PayGateProviderDialog, {
  PAYGATE_MULTI_PROVIDER_CODE,
  resolvePayGateProviderCode,
  type PayGateProviderOption
} from '@/components/checkout/PayGateProviderDialog'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { Minus, Plus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaymentFeeCopy } from '@/utils/payment-adjustments'

type PaymentMethod = {
  id: number
  gateway: string
  name: string
  thumbnail?: string | null
  isActive: boolean
  currencies: string[]
  minAmount: number
  testMode: boolean
  bonus?: string | null
  bonusThreshold?: string | null
  feeType?: string | null
  feeValue?: string | null
  meta?: any
}

type PayGateProvider = PayGateProviderOption

const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

export default function CheckoutCartClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLoggedIn = !!Cookies.get('token')

  // Check for guest token access
  const guestOrderId = searchParams.get('orderId')
  const guestToken = searchParams.get('token')
  const guestEmailParam = searchParams.get('email')
  const isGuestAccess = !!(guestOrderId && guestToken && guestEmailParam)

  const items = useCartStore((s) => s.items)
  const hydrated = useCartStore((s) => s.hydrated)
  const subtotal = useCartStore((s) => s.getSubtotal())
  const setQuantity = useCartStore((s) => s.setQuantity)
  const setCustomerTelegram = useCartStore((s) => s.setCustomerTelegram)
  const setClientInput = useCartStore((s) => s.setClientInput)
  const clear = useCartStore((s) => s.clear)
  const isUpdating = useCartStore((s) => s.isUpdating)

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [selectedPaygateProvider, setSelectedPaygateProvider] = useState('')
  const [showPayGateProviderDialog, setShowPayGateProviderDialog] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [premiumTargetsByProduct, setPremiumTargetsByProduct] = useState<Record<number, string[]>>({})
  const [guestEmail, setGuestEmail] = useState(
    guestEmailParam || (typeof window !== 'undefined' ? sessionStorage.getItem('guestCheckoutEmail') : '') || ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentLinks, setPaymentLinks] = useState<Array<{ orderNumber: string; paymentUrl: string }>>([])
  const [walletAmount, setWalletAmount] = useState(0)
  const [feeAmount, setFeeAmount] = useState(0)
  const [guestOrderData, setGuestOrderData] = useState<any>(null)
  const [guestAccessError, setGuestAccessError] = useState('')
  const [isValidatingGuestAccess, setIsValidatingGuestAccess] = useState(false)
  const [voletDialogOpen, setVoletDialogOpen] = useState(false)
  const [voletDialogData, setVoletDialogData] = useState<{
    orderId: number
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)

  // Debounce refs for quantity updates
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const {
    data: paymentMethodsData,
    loading: loadingPaymentMethods,
    error: paymentMethodsError
  } = useAsync<{
    success: boolean
    data: PaymentMethod[]
  }>(() => '/payment-methods')
  
  
  const { data: balanceData } = useAsync<{
    success: boolean
    data: { balance: number }
  }>(isLoggedIn ? () => '/customer/balance' : null)

  const { data: profileResponse } = useAsync<{
    success?: boolean
    data?: { discountPercent?: number; rank?: string }
  }>(isLoggedIn ? () => '/customer/profile' : null)
  const profileData = profileResponse?.data
  const rankDiscountPercent = Number(profileData?.discountPercent ?? 0)
  const rankDiscountAmount = useMemo(
    () =>
      rankDiscountPercent > 0
        ? Math.round((subtotal * rankDiscountPercent) / 100 * 100) / 100
        : 0,
    [subtotal, rankDiscountPercent]
  )
  const {
    activeSubscription,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays,
    subscriptionRemainingLabel
  } = useActiveSubscriptionDiscount(subtotal)

  // Validate guest access token on component mount
  useEffect(() => {
    if (!isGuestAccess) return

    const validateGuestAccess = async () => {
      setIsValidatingGuestAccess(true)
      setGuestAccessError('')
      try {
        const response = await requests.post('/guest-checkout/validate-token', {
          orderId: parseInt(guestOrderId!),
          token: guestToken!,
          email: guestEmailParam!
        })

        if (response.success) {
          // Token is valid, fetch order details
          const orderResponse = await requests.get(
            `/guest-checkout/orders/${guestOrderId}?token=${guestToken}&email=${encodeURIComponent(guestEmailParam!)}`
          )
          
          if (orderResponse.success) {
            setGuestOrderData(orderResponse.data)
            console.log('[CheckoutCart] Guest order loaded:', orderResponse.data)
          }
        }
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || 'Invalid or expired access token'
        setGuestAccessError(errorMessage)
        console.error('[CheckoutCart] Guest access validation failed:', error)
        toast.error(errorMessage)
      } finally {
        setIsValidatingGuestAccess(false)
      }
    }

    validateGuestAccess()
  }, [isGuestAccess, guestOrderId, guestToken, guestEmailParam])

  // Handle both response structures: { success, data } or direct array
  const paymentMethods = Array.isArray(paymentMethodsData)
    ? paymentMethodsData
    : paymentMethodsData?.data || []
  const availablePaymentMethods = isLoggedIn
    ? paymentMethods
    : paymentMethods.filter((m) => m.gateway !== 'balance')
  const selectedMethodForProvider = availablePaymentMethods.find(
    (method) => method.id === selectedPaymentMethod
  )
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

  const userBalance = balanceData?.data?.balance || 0

  // Calculate payment breakdown when payment method or subtotal changes
  useEffect(() => {
    if (!selectedPaymentMethod || subtotal <= 0) {
      setFeeAmount(0)
      return
    }

    const calculateBreakdown = async () => {
      try {
        const response = await requests.post<{
          success: boolean
          data: {
            baseAmount: number
            feeAmount: number
            finalAmount: number
            hasFee: boolean
            hasBonus: boolean
          }
        }>('/payments/calculate-breakdown', {
          orderTotal: Math.max(
            0,
            subtotal - subscriptionDiscountAmount - rankDiscountAmount - couponDiscount
          ),
          paymentMethodId: selectedPaymentMethod
        })

        if (response.success && response.data) {
          setFeeAmount(response.data.feeAmount)
        }
      } catch {
        setFeeAmount(0)
      }
    }

    calculateBreakdown()
  }, [selectedPaymentMethod, subtotal, subscriptionDiscountAmount, couponDiscount, rankDiscountAmount])

  // Calculate totals (subtotal - subscription - rank - coupon = baseTotal; then fee, then wallet)
  const baseTotal = useMemo(
    () => Math.max(0, subtotal - subscriptionDiscountAmount - rankDiscountAmount - couponDiscount),
    [subtotal, subscriptionDiscountAmount, rankDiscountAmount, couponDiscount]
  )
  const totalAfterBonusFee = useMemo(() => {
    let amount = baseTotal
    if (feeAmount > 0) {
      amount += feeAmount
    }
    return Math.max(0, amount)
  }, [baseTotal, feeAmount])

  const walletAmountToUse = Math.min(walletAmount, totalAfterBonusFee)
  const remainingAfterWallet = Math.max(0, totalAfterBonusFee - walletAmountToUse)
  const finalTotal = remainingAfterWallet

  const missingTransferInfo = useMemo(() => {
    return items.some((i) => {
      if (i.type === 'SERVICE' || isTelegramTransferProduct(i)) {
        if (isTelegramTransferProduct(i)) {
          return !i.customerTelegram?.trim()
        } else {
          return !i.clientInput?.trim()
        }
      }
      return false
    })
  }, [items])

  const missingPremiumTargets = useMemo(
    () =>
      items.some((item) => {
        if (!PREMIUM_PRODUCT_TYPES.has(String(item.type))) return false
        const targets = premiumTargetsByProduct[item.productId] || []
        return Array.from({ length: item.quantity }, (_, index) => targets[index] ?? '').some(
          (value) => !value.trim()
        )
      }),
    [items, premiumTargetsByProduct]
  )

  useEffect(() => {
    setPremiumTargetsByProduct((current) => {
      const next: Record<number, string[]> = {}

      for (const item of items) {
        if (!PREMIUM_PRODUCT_TYPES.has(String(item.type))) continue
        next[item.productId] = Array.from(
          { length: item.quantity },
          (_, index) => current[item.productId]?.[index] ?? ''
        )
      }

      return next
    })
  }, [items])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer))
      debounceTimers.current.clear()
    }
  }, [])

  // Quantity update handler with proper event handling
  const handleQuantityChange = useCallback(
    async (productId: number, newQuantity: number, e?: React.MouseEvent) => {
      // Prevent event bubbling and default behavior
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      // Prevent multiple rapid clicks
      if (isUpdating(productId)) {
        return
      }

      // Immediate update (optimistic) - no debounce for better UX
      try {
        await setQuantity(productId, newQuantity)
      } catch (error) {
        toast.error('Failed to update quantity')
      }
    },
    [setQuantity, isUpdating]
  )

  // Only redirect to cart if we're on the main /checkout route (cart checkout)
  // Don't redirect if we're on individual checkout pages like /checkout/accounts, /checkout/telegram/account, etc.
  useEffect(() => {
    if (hydrated && items.length === 0 && pathname === '/checkout') {
      router.replace('/cart')
    }
  }, [hydrated, items.length, router, pathname])

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    try {
      const endpoint = isLoggedIn ? '/customer/coupons/validate' : '/coupons/validate'
      const response = await requests.post<{
        success: boolean
        message: string
        data: {
          isValid: boolean
          canApply: boolean
          discountAmount?: number
          reason?: string
        }
      }>(endpoint, {
        code: couponCode.toUpperCase(),
        productIds: items.map((i) => i.productId),
        orderAmount: subtotal
      })

      if (!response.success || !response.data.isValid || !response.data.canApply) {
        setCouponDiscount(0)
        toast.error(response.data.reason || response.message || 'Invalid coupon')
        return
      }

      const discount = response.data.discountAmount || 0
      setCouponDiscount(discount)
      toast.success(`Coupon applied! You saved $${discount.toFixed(2)}`)
    } catch {
      setCouponDiscount(0)
      toast.error('Failed to validate coupon')
    }
  }

  const removeCoupon = () => {
    setCouponDiscount(0)
    setCouponCode('')
    toast.info('Coupon removed')
  }

  const handlePlaceOrder = async (skipPayGateProviderDialog: boolean = false) => {
    if (items.length === 0) return

    if (!isLoggedIn) {
      if (!guestEmail.trim()) {
        toast.error('Please enter your email')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail.trim())) {
        toast.error('Please enter a valid email address')
        return
      }
    }

    if (remainingAfterWallet > 0 && !selectedPaymentMethod) {
      toast.error('Please select a payment method for the remaining amount')
      return
    }

    if (missingTransferInfo) {
      toast.error('Please fill required client input for service items')
      return
    }

    if (missingPremiumTargets) {
      toast.error('Please enter a username or account number for each Premium package')
      return
    }

    const selectedMethod = paymentMethods.find((method) => method.id === selectedPaymentMethod)
    const selectedGateway = selectedMethod?.gateway?.toLowerCase()

    if (
      remainingAfterWallet > 0 &&
      selectedGateway === 'paygate' &&
      !skipPayGateProviderDialog
    ) {
      if (!selectedPaygateProvider) {
        setSelectedPaygateProvider(PAYGATE_MULTI_PROVIDER_CODE)
      }

      setShowPayGateProviderDialog(true)
      return
    }

    setIsSubmitting(true)
    setPaymentLinks([])
    try {
      // Step 1: create cart orders
      const createRes = await requests.post<{
        success: boolean
        message: string
        data: {
          cartGroupNumber: string
          order: { id: number; orderNumber: string; total: any }
          orders: Array<{ id: number; orderNumber: string; total: any }>
        }
      }>('/customer/orders/cart', {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          ...(PREMIUM_PRODUCT_TYPES.has(String(i.type)) &&
          (premiumTargetsByProduct[i.productId] || []).filter((value) => value.trim()).length
            ? {
                premiumTargets: (premiumTargetsByProduct[i.productId] || [])
                  .map((value) => value.trim())
                  .filter(Boolean)
              }
            : {}),
          ...(isTelegramTransferProduct(i) && i.customerTelegram
            ? { customerTelegram: i.customerTelegram }
            : {}),
          ...((i.type === 'SERVICE' && i.platform !== 'TELEGRAM') && i.clientInput
            ? { clientInput: i.clientInput }
            : {})
        })),
        ...(couponCode ? { couponCode } : {}),
        ...(!isLoggedIn ? { guestEmail } : {})
      }, { skipAuthRedirect: true } as any)

      if (!createRes.success) {
        toast.error(createRes.message || 'Failed to create orders')
        return
      }

      const links: Array<{ orderNumber: string; paymentUrl: string }> = []

      const cryptoPayments: Array<{ orderId: number; orderNumber: string }> = []
      const checkoutOrder = createRes.data.order

      // Get selected payment method details to check gateway
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod)
      const isBinance = selectedMethod?.gateway === 'binance'
      const isVolet = selectedMethod?.gateway === 'volet'

      // Handle Volet (embedded Stripe Elements) - open dialog BEFORE initiating payment
      // Volet uses Payment Intent API, not Checkout Session (only when we have a payment method for remaining)
      if (remainingAfterWallet > 0 && isVolet && checkoutOrder?.id) {
        console.log('[CheckoutCart] Volet gateway detected, opening payment dialog')
        const orderAmount = parseFloat(checkoutOrder.total.toString())
        const currency = selectedMethod?.currencies?.[0] || 'USD'
        
        setVoletDialogData({
          orderId: checkoutOrder.id,
          paymentMethodId: selectedPaymentMethod!,
          amount: orderAmount,
          currency
        })
        setVoletDialogOpen(true)
        return // Exit early for Volet embedded payment
      }

      const payRes = await requests.post<{
        success: boolean
        message: string
        data: {
          paymentUrl?: string
          address?: string
          qrCode?: string
        }
      }>('/payments/initiate', {
        orderId: checkoutOrder.id,
        ...(remainingAfterWallet > 0 ? { paymentMethodId: selectedPaymentMethod } : {}),
        ...(walletAmountToUse > 0 ? { walletAmount: walletAmountToUse } : {}),
        ...(remainingAfterWallet > 0 && selectedMethod?.gateway?.toLowerCase() === 'paygate'
          ? { paygateProviderCode: resolvePayGateProviderCode(selectedPaygateProvider) }
          : {})
      }, { skipAuthRedirect: true } as any)

      if (!payRes.success) {
        toast.error(payRes.message || `Failed to initiate payment for ${checkoutOrder.orderNumber}`)
        return
      }

      const { paymentUrl, address, qrCode } = payRes.data || {}

      if (paymentUrl) {
        console.log('[CheckoutCart] Has paymentUrl, adding to links')
        links.push({ orderNumber: checkoutOrder.orderNumber, paymentUrl })
      } else if (address || qrCode) {
        console.log('[CheckoutCart] Has address/qrCode, adding to cryptoPayments')
        cryptoPayments.push({ orderId: checkoutOrder.id, orderNumber: checkoutOrder.orderNumber })
      } else {
        console.log('[CheckoutCart] No paymentUrl, address, or qrCode - will redirect to success page')
      }

      await clear()

      // Debug logging
      console.log('[CheckoutCart] Payment processing complete:', {
        cryptoPaymentsCount: cryptoPayments.length,
        linksCount: links.length,
        cryptoPayments: cryptoPayments,
        links: links
      })

      // If we have crypto payments, redirect to crypto-details page for the first one
      if (cryptoPayments.length > 0) {
        console.log('[CheckoutCart] Redirecting to crypto-details for order:', cryptoPayments[0].orderId)
        if (!isLoggedIn && guestEmail) {
          sessionStorage.setItem('guestOrderEmail', guestEmail)
        }
        toast.success('Payment initiated! Redirecting...')
        router.push(`/payment/crypto-details?orderId=${cryptoPayments[0].orderId}`)
        return
      }

      // If we have payment gateway URLs, redirect to the first one
      if (links.length === 1) {
        console.log('[CheckoutCart] Redirecting to payment gateway')
        const singlePaymentUrl = links[0].paymentUrl
        const shouldOpenInNewTab = selectedMethod?.gateway?.toLowerCase() === 'paygate'

        if (shouldOpenInNewTab) {
          const checkoutTab = window.open(singlePaymentUrl, '_blank', 'noopener,noreferrer')
          if (checkoutTab) {
            toast.success('PayGate checkout opened in a new tab.')
            return
          }
        }

        toast.success('Redirecting to payment gateway...')
        window.location.href = singlePaymentUrl
        return
      }

      if (links.length > 1) {
        setPaymentLinks(links)
        toast.success('Orders created. Complete payments below.')
        return
      }

      // Balance payments or instant completion
      console.log('[CheckoutCart] No crypto payments or links, redirecting to success page')
      toast.success('Payment completed! Redirecting to your delivery details...')
      router.push(`/payment/success?order_id=${checkoutOrder.id}&status=success`)
    } catch (error: any) {
      toast.error(error?.message || 'Checkout failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hydrated || loadingPaymentMethods) {
    return (
      <div className='top-0 left-0 z-20 absolute inset-0 flex justify-center items-center bg-background/30 backdrop-blur-sm w-full h-screen overflow-hidden!'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  // Show loading state for guest access validation
  if (isGuestAccess && isValidatingGuestAccess) {
    return (
      <div className='top-0 left-0 z-20 absolute inset-0 flex justify-center items-center bg-background/30 backdrop-blur-sm w-full h-screen overflow-hidden!'>
        <div className='flex flex-col items-center gap-3'>
          <MotionLoader size='lg' variant='dots' />
          <Typography variant='body2'>Validating your access...</Typography>
        </div>
      </div>
    )
  }

  // Show error state for guest access
  if (isGuestAccess && guestAccessError) {
    return (
      <Section variant='xl' className='py-8'>
        <Container>
          <div className='flex flex-col items-center justify-center gap-4 py-8'>
            <Typography variant='h4' weight='bold'>
              Access Denied
            </Typography>
            <Typography variant='body2' className='text-red-500'>
              {guestAccessError}
            </Typography>
            <Button asChild>
              <Link href='/'>Return to Home</Link>
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  // Determine current step — show confirm when payment method selected OR wallet covers full amount
  const currentStep = items.length > 0
    ? selectedPaymentMethod || remainingAfterWallet === 0
      ? 'confirm'
      : 'payment'
    : 'review'

  return (
    <>
    <Section variant='xl' className='py-4 sm:py-6 md:py-8 overflow-x-hidden'>
      <Container className='min-w-0'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Typography variant='h3' weight='bold' className='text-xl sm:text-2xl md:text-3xl'>
            Checkout
          </Typography>
          <Button variant='outline' asChild className='w-full sm:w-auto'>
            <Link href='/cart'>Back to cart</Link>
          </Button>
        </div>

        {/* Step Indicator */}
        <div className='my-8'>
          <div className='flex items-center justify-center gap-2 sm:gap-4'>
            {[
              { label: 'Review', step: 'review' },
              { label: 'Payment', step: 'payment' },
              { label: 'Confirm', step: 'confirm' }
            ].map((stepItem, index) => {
              const isActive = currentStep === stepItem.step
              const isCompleted = 
                (stepItem.step === 'review' && currentStep !== 'review') ||
                (stepItem.step === 'payment' && currentStep === 'confirm')
              
              return (
                <div key={stepItem.step} className='flex items-center'>
                  <div className='flex flex-col items-center'>
                    <div
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm shrink-0',
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white dark:bg-green-600 dark:border-green-600'
                          : isActive
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className='h-5 w-5' />
                      ) : (
                        <span className='text-sm font-semibold'>{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1 sm:mt-2 text-xs font-medium transition-colors whitespace-nowrap',
                        isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {stepItem.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={cn(
                        'h-0.5 w-8 sm:w-16 mx-2 transition-all',
                        isCompleted 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-border'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <Separator className='my-4 sm:my-6' />

        {paymentLinks.length > 1 ? (
          <div className='space-y-3 min-w-0'>
            <Typography variant='h5' weight='semibold' className='text-lg sm:text-xl'>
              Complete payments
            </Typography>
            <Typography variant='body2' className='text-muted-foreground text-sm sm:text-base'>
              Your cart was split into multiple orders (one per product). Please complete payment for each order:
            </Typography>
            <div className='space-y-2'>
              {paymentLinks.map((l) => (
                <Button key={l.orderNumber} asChild className='w-full'>
                  <a href={l.paymentUrl} target='_blank' rel='noreferrer'>
                    Pay {l.orderNumber}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6'>
            <div className='lg:col-span-8 space-y-3 sm:space-y-4 min-w-0'>
              {items.map((item) => {
                const unit = Number(item.unitPrice) || 0
                const lineTotal = unit * item.quantity
                const isTransfer = isTelegramTransferProduct(item)
                const isPremiumItem = PREMIUM_PRODUCT_TYPES.has(String(item.type))
                const minQuantity = Math.max(1, Number(item.minQuantity ?? 1))
                const stockCount = Math.max(0, Number(item.stockCount ?? 0))
                const rawMaxQuantity = Number(item.maxQuantity ?? 0)
                const effectiveMax = isPremiumItem
                  ? 1000
                  : rawMaxQuantity === 0
                    ? stockCount
                    : Math.min(rawMaxQuantity > 0 ? rawMaxQuantity : 1000, stockCount)

                return (
                  <Card
                    key={item.productId}
                    className='overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-shadow'
                  >
                    <CardContent className='p-3 sm:p-4'>
                      <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
                        <div className='relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted self-center sm:self-start'>
                          {item.thumbnail ? (
                            <CustomImage src={item.thumbnail} alt={item.name || 'Product'} fill className='object-cover' />
                          ) : (
                            <div className='h-full w-full bg-muted flex items-center justify-center'>
                              <div className='h-8 w-8 rounded bg-muted-foreground/20' />
                            </div>
                          )}
                        </div>

                        <div className='flex-1 min-w-0 flex flex-col'>
                          <div className='flex flex-col min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3'>
                            <div className='min-w-0 flex-1'>
                              <Typography variant='h6' weight='semibold' className='line-clamp-2 mb-1 text-base sm:text-lg'>
                                {item.name || `Product #${item.productId}`}
                              </Typography>
                              <Typography variant='body2' className='text-muted-foreground text-sm'>
                                Unit: <span className='font-medium text-foreground'>${unit.toFixed(2)}</span>
                              </Typography>
                            </div>

                            <div className='text-left min-[480px]:text-right shrink-0'>
                              <Typography variant='body2' className='text-muted-foreground text-xs mb-1'>
                                Subtotal
                              </Typography>
                              <Typography variant='h6' weight='bold' className='text-primary'>
                                ${lineTotal.toFixed(2)}
                              </Typography>
                            </div>
                          </div>

                          <div className='flex flex-wrap items-center gap-2 sm:gap-3 mt-auto'>
                            <div className='flex items-center gap-1 rounded-lg border border-border bg-background p-1'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 hover:bg-muted'
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleQuantityChange(item.productId, item.quantity - 1, e)
                                }}
                                disabled={item.quantity <= minQuantity || isSubmitting || isUpdating(item.productId)}
                              >
                                <Minus className='h-4 w-4' />
                              </Button>
                              <div className='min-w-10 text-center text-sm font-semibold text-foreground'>
                                {item.quantity}
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 hover:bg-muted'
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleQuantityChange(item.productId, item.quantity + 1, e)
                                }}
                                disabled={item.quantity >= effectiveMax || isSubmitting || isUpdating(item.productId)}
                              >
                                <Plus className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>

                          {(item.type === 'SERVICE' || isTransfer) && (
                            <div className='mt-3 sm:mt-4 space-y-2 p-3 rounded-lg border border-border bg-muted/30'>
                              <Typography variant='body2' className='text-muted-foreground text-sm font-medium'>
                                {item.platform === 'TELEGRAM'
                                  ? 'Telegram phone number (required for transfer)'
                                  : item.clientInputLabel || 'Client Input (required)'}
                              </Typography>
                              <Input
                                placeholder={
                                  item.platform === 'TELEGRAM'
                                    ? '+1234567890'
                                    : item.clientInputLabel || 'Enter required information'
                                }
                                value={
                                  item.platform === 'TELEGRAM'
                                    ? item.customerTelegram || ''
                                    : item.clientInput || ''
                                }
                                onChange={(e) => {
                                  if (item.platform === 'TELEGRAM') {
                                    setCustomerTelegram(item.productId, e.target.value)
                                  } else {
                                    setClientInput(item.productId, e.target.value)
                                  }
                                }}
                                disabled={isSubmitting}
                                className='bg-background'
                              />
                            </div>
                          )}

                          {isPremiumItem && (
                            <div className='mt-3 sm:mt-4 space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3'>
                              <Typography variant='body2' className='text-sm font-medium text-amber-600 dark:text-amber-400'>
                                Premium Targets
                              </Typography>
                              <Typography variant='caption' className='text-muted-foreground'>
                                Enter one username or account number for each Premium package in this cart item.
                              </Typography>
                              <div className='space-y-2'>
                                {Array.from({ length: item.quantity }, (_, index) => (
                                  <Input
                                    key={`premium-target-${item.productId}-${index}`}
                                    placeholder={`${item.name || 'Premium'} #${index + 1} > username or account number`}
                                    value={premiumTargetsByProduct[item.productId]?.[index] ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\s/g, '')
                                      setPremiumTargetsByProduct((current) => ({
                                        ...current,
                                        [item.productId]: Array.from(
                                          { length: item.quantity },
                                          (_, targetIndex) =>
                                            targetIndex === index
                                              ? value
                                              : current[item.productId]?.[targetIndex] ?? ''
                                        )
                                      }))
                                    }}
                                    disabled={isSubmitting}
                                    className='bg-background'
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className='lg:col-span-4 min-w-0'>
              <Card className='sticky top-2 sm:top-4 border-border bg-card shadow-sm'>
                <CardContent className='p-4 sm:p-5 space-y-4'>
                  <Typography variant='h6' weight='semibold' className='pb-2 border-b border-border'>
                    Payment & totals
                  </Typography>

                  {!isLoggedIn && (
                    <div className='space-y-2 p-3 rounded-lg border border-border bg-muted/30'>
                      <Typography variant='body2' className='text-muted-foreground text-sm font-medium mb-2'>
                        Email for order tracking
                      </Typography>
                      <Input
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder='you@example.com'
                        disabled={isSubmitting}
                        className='bg-background'
                      />
                    </div>
                  )}

                  {isLoggedIn && userBalance > 0 && (
                    <div className='space-y-2 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-3'>
                    <div className='flex items-center justify-between'>
                      <Typography variant='body2' className='font-medium'>
                        Your Balance
                      </Typography>
                      <Typography variant='h6' weight='bold' className='text-primary'>
                        ${userBalance.toFixed(2)}
                      </Typography>
                    </div>
                    <div className='space-y-2'>
                      <Typography variant='body2' className='text-muted-foreground text-xs'>
                        Use wallet balance (optional)
                      </Typography>
                      <div className='flex flex-col min-[360px]:flex-row gap-2'>
                        <Input
                          type='number'
                          min={0}
                          max={Math.min(userBalance, totalAfterBonusFee)}
                          step={0.01}
                          value={walletAmount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setWalletAmount(Math.min(val, Math.min(userBalance, totalAfterBonusFee)))
                          }}
                          placeholder='0.00'
                          disabled={isSubmitting}
                          className='flex-1 min-w-0'
                        />
                        <div className='flex gap-2 shrink-0'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setWalletAmount(Math.min(userBalance, totalAfterBonusFee))}
                            disabled={isSubmitting}
                            className='flex-1 min-[360px]:flex-none'
                          >
                            Use All
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setWalletAmount(0)}
                            disabled={isSubmitting}
                            className='flex-1 min-[360px]:flex-none'
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      {walletAmountToUse > 0 && (
                        <Typography variant='body2' className='text-green-600 text-xs'>
                          Using ${walletAmountToUse.toFixed(2)} from wallet
                        </Typography>
                      )}
                    </div>
                  </div>
                )}

                  <div className='space-y-2'>
                    <Typography variant='body2' className='text-muted-foreground text-sm font-medium'>
                      Coupon code
                    </Typography>
                    {couponDiscount > 0 ? (
                      <div className='flex items-center justify-between p-3 rounded-lg border border-green-500/30 bg-green-500/5 dark:bg-green-500/10'>
                        <Typography variant='body2' className='text-green-600 dark:text-green-400 font-semibold'>
                          -${couponDiscount.toFixed(2)}
                        </Typography>
                        <Button variant='ghost' size='sm' onClick={removeCoupon} disabled={isSubmitting}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className='flex flex-col min-[480px]:flex-row gap-2'>
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder='Enter code'
                          disabled={isSubmitting}
                          className='flex-1 min-w-0 bg-background'
                        />
                        <Button onClick={validateCoupon} disabled={isSubmitting} size='default' className='w-full min-[480px]:w-auto shrink-0'>
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>

                <Separator />

                  <div className='space-y-2'>
                    <Typography variant='h6' weight='semibold' className='text-sm'>
                      Select payment method
                    </Typography>
                    {paymentMethodsError ? (
                      <Typography variant='body2' className='text-destructive'>
                        Error loading payment methods. Please refresh the page.
                      </Typography>
                    ) : availablePaymentMethods.length === 0 ? (
                      <Typography variant='body2' className='text-muted-foreground'>
                        No payment methods available. Please contact support.
                      </Typography>
                    ) : availablePaymentMethods.length === 1 ? (
                      // Single method: show directly
                      <div className='flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/10 dark:bg-primary/20'>
                      {availablePaymentMethods[0].thumbnail ? (
                        <CustomImage
                          src={availablePaymentMethods[0].thumbnail}
                          alt={availablePaymentMethods[0].name || availablePaymentMethods[0].gateway}
                          width={40}
                          height={40}
                          className='object-contain'
                        />
                      ) : (
                        <div className='h-10 w-10 rounded bg-muted flex items-center justify-center'>
                          <span className='text-xs font-semibold uppercase'>
                            {availablePaymentMethods[0].gateway.slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold capitalize'>
                            {availablePaymentMethods[0].name || availablePaymentMethods[0].gateway}
                          </span>
                          {availablePaymentMethods[0].meta?.recommended && (
                            <span className='text-xs bg-green-500 text-white px-2 py-0.5 rounded'>Recommended</span>
                          )}
                        </div>
                        {availablePaymentMethods[0].meta?.processingTime && (
                          <span className='text-xs text-muted-foreground'>
                            ⏱️ {availablePaymentMethods[0].meta.processingTime}
                          </span>
                        )}
                      </div>
                      {availablePaymentMethods[0].bonus && parseFloat(availablePaymentMethods[0].bonus) > 0 && (
                        <span className='text-xs text-green-500 font-medium'>
                          +{parseFloat(availablePaymentMethods[0].bonus)}% bonus
                        </span>
                      )}
                      {getPaymentFeeCopy(availablePaymentMethods[0]) && (
                        <span className='text-xs text-orange-600 dark:text-orange-400 font-medium'>
                          {getPaymentFeeCopy(availablePaymentMethods[0])}
                        </span>
                      )}
                    </div>
                    ) : (
                      <div className='grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3'>
                        {availablePaymentMethods.map((method) => {
                          const isRecommended = method.meta?.recommended === true
                          return (
                            <button
                              key={method.id}
                              type='button'
                              onClick={() => setSelectedPaymentMethod(method.id)}
                              disabled={isSubmitting}
                              className={cn(
                                'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                selectedPaymentMethod === method.id
                                  ? 'border-primary bg-primary/20 dark:bg-primary/30 font-semibold shadow-sm'
                                  : isRecommended
                                    ? 'border-green-500/50 bg-green-500/5 dark:bg-green-500/10 hover:border-green-500/70'
                                    : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                              )}
                            >
                              {isRecommended && (
                                <span className='absolute -top-2 -right-2 text-xs bg-green-500 dark:bg-green-600 text-white px-1.5 py-0.5 rounded shadow-sm'>
                                  ⭐
                                </span>
                              )}
                              {method.thumbnail ? (
                                <CustomImage
                                  src={method.thumbnail}
                                  alt={method.name || method.gateway}
                                  width={40}
                                  height={40}
                                  className='object-contain'
                                />
                              ) : (
                                <div className='h-10 w-10 rounded bg-muted flex items-center justify-center border border-border'>
                                  <span className='text-xs font-semibold uppercase text-foreground'>
                                    {method.gateway.slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <span className='text-xs font-medium capitalize text-center text-foreground'>
                                {method.name || method.gateway}
                              </span>
                              {method.meta?.processingTime && (
                                <span className='text-xs text-muted-foreground'>
                                  ⏱️ {method.meta.processingTime}
                                </span>
                              )}
                              {method.bonus && parseFloat(method.bonus) > 0 && (
                                <span className='text-xs text-green-600 dark:text-green-400 font-medium'>
                                  +{parseFloat(method.bonus)}% bonus
                                </span>
                              )}
                              {method.feeType && method.feeValue && (
                                <span className='text-xs text-orange-600 dark:text-orange-400 font-medium'>
                                  {method.feeType === 'PERCENTAGE'
                                    ? `+${parseFloat(method.feeValue)}% fee`
                                    : `+$${parseFloat(method.feeValue)} fee`}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {paygateSelected && (
                      <Typography variant='caption' className='text-muted-foreground'>
                        PayGate provider will be selected on continue.
                      </Typography>
                    )}
                  </div>

                  <Separator className='my-4' />

                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Subtotal</span>
                      <span className='font-semibold text-foreground'>${subtotal.toFixed(2)}</span>
                    </div>
                    {rankDiscountAmount > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-green-600 dark:text-green-400'>
                          Rank discount{profileData?.rank ? ` (${profileData.rank})` : ''} ({rankDiscountPercent}%)
                        </span>
                        <span className='font-semibold text-green-600 dark:text-green-400'>
                          -${rankDiscountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {subscriptionDiscountAmount > 0 && (
                      <div className='space-y-1 rounded-lg border border-primary/20 bg-primary/10 p-3'>
                        <div className='flex items-center justify-between gap-3'>
                          <span className='text-green-600 dark:text-green-400'>
                            Subscription discount ({subscriptionDiscountPercent}%)
                          </span>
                          <span className='font-semibold text-green-600 dark:text-green-400'>
                            -${subscriptionDiscountAmount.toFixed(2)}
                          </span>
                        </div>
                        <Typography variant='body2' className='text-muted-foreground text-xs'>
                          {activeSubscription?.package?.name || 'Subscription'} discount is valid
                          for {subscriptionDurationDays} days. {subscriptionRemainingLabel}
                        </Typography>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-green-600 dark:text-green-400'>Coupon</span>
                        <span className='font-semibold text-green-600 dark:text-green-400'>-${couponDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {feeAmount > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-orange-600 dark:text-orange-400'>Fee</span>
                        <span className='font-semibold text-orange-600 dark:text-orange-400'>+${feeAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {walletAmountToUse > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-blue-600 dark:text-blue-400'>Wallet</span>
                        <span className='font-semibold text-blue-600 dark:text-blue-400'>-${walletAmountToUse.toFixed(2)}</span>
                      </div>
                    )}
                    <div className='flex items-center justify-between pt-3 border-t border-border'>
                      <span className='font-semibold text-foreground'>
                        {walletAmountToUse > 0 && remainingAfterWallet > 0
                          ? 'Remaining to pay'
                          : 'Total'}
                      </span>
                      <span className='font-bold text-primary text-lg'>${finalTotal.toFixed(2)}</span>
                    </div>
                    {walletAmountToUse > 0 && remainingAfterWallet > 0 && (
                      <Typography variant='body2' className='text-muted-foreground text-xs pt-1'>
                        ${walletAmountToUse.toFixed(2)} from wallet + ${remainingAfterWallet.toFixed(2)} via{' '}
                        {availablePaymentMethods.find((m) => m.id === selectedPaymentMethod)?.gateway || 'payment'}
                      </Typography>
                    )}
                    {walletAmountToUse > 0 && remainingAfterWallet === 0 && (
                      <Typography variant='body2' className='text-muted-foreground text-xs pt-1'>
                        Paid with wallet balance (${walletAmountToUse.toFixed(2)})
                      </Typography>
                    )}
                  </div>

                  <Button
                    className='w-full mt-4'
                    size='lg'
                    onClick={() => {
                      void handlePlaceOrder()
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Place order'}
                  </Button>

                  {/* Security Badges */}
                  <div className='flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-4 border-t border-border'>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span className='text-green-500 dark:text-green-400'>🔒</span>
                      <span>SSL Secured</span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span className='text-blue-500 dark:text-blue-400'>🛡️</span>
                      <span>256-bit Encryption</span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span className='text-purple-500 dark:text-purple-400'>✓</span>
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
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </Section>

    <PayGateProviderDialog
      open={showPayGateProviderDialog}
      onOpenChange={setShowPayGateProviderDialog}
      providers={paygateProviders}
      selectedProviderCode={selectedPaygateProvider}
      onSelectProvider={setSelectedPaygateProvider}
      amount={remainingAfterWallet}
      onConfirm={() => {
        setShowPayGateProviderDialog(false)
        handlePlaceOrder(true)
      }}
      continueLabel='Continue with selected provider'
    />

    {/* Volet Payment Dialog */}
    {voletDialogData && (
      <VoletPaymentDialog
        open={voletDialogOpen}
        onOpenChange={setVoletDialogOpen}
        orderId={voletDialogData.orderId}
        paymentMethodId={voletDialogData.paymentMethodId}
        amount={voletDialogData.amount}
        currency={voletDialogData.currency}
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      />
    )}
    </>
  )
}


