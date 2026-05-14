'use client'

import CustomImage from '@/components/common/CustomImage'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { CheckCircle2, Loader2, Wallet } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import MotionLoader from '../common/MotionLoader'
import CouponInput from './CouponInput'
import { PremiumUpsell, PremiumDuration, type PremiumSelection } from './PremiumUpsell'
import OTPVerification from '../auth/OTPVerification'
import { Product } from '@/types/product'
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

const durationLabels: Record<PremiumDuration, string> = {
  '1-month': '1 Month',
  '3-month': '3 Months',
  '6-month': '6 Months',
  '12-month': '12 Months'
}

export default function TelegramAccountCheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const qtyParam = searchParams.get('qty')

  // Check if user is logged in
  const isLoggedIn = !!Cookies.get('token')

  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState<'order' | 'otp' | 'payment'>('order')
  const [otpCode, setOtpCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [showPremiumUpsell, setShowPremiumUpsell] = useState(false)
  const [premiumSelections, setPremiumSelections] = useState<PremiumSelection[]>([])
  const [premiumProductIds, setPremiumProductIds] = useState<Partial<Record<PremiumDuration, number>>>({})
  const [premiumTargetValues, setPremiumTargetValues] = useState<string[]>([])
  const [walletAmount, setWalletAmount] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [selectedPaygateProvider, setSelectedPaygateProvider] = useState('')
  const [showPayGateProviderDialog, setShowPayGateProviderDialog] = useState(false)

  const [voletDialogOpen, setVoletDialogOpen] = useState(false)
  const [voletDialogData, setVoletDialogData] = useState<{
    orderId: number
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)

  const { data: productData, loading } = useAsync<{ data: Product }>(
    productId ? () => `/products/${productId}` : null
  )

  // Fetch payment methods
  const { data: paymentMethodsData } = useAsync<{
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
  const selectedPremiumEntries = premiumSelections.filter(
    (selection): selection is PremiumSelection & { duration: PremiumDuration } =>
      selection.enabled && Boolean(selection.duration)
  )
  const requiresPremiumTargetsInput =
    selectedPremiumEntries.length > 0 && product?.type !== 'TELEGRAM_ACCOUNTS'
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

  // Load guest data from sessionStorage if available
  useEffect(() => {
    const guestDataStr = sessionStorage.getItem('guestCheckoutData')
    if (guestDataStr) {
      try {
        const guestData = JSON.parse(guestDataStr)
        setGuestEmail(guestData.email || '')
        setCustomerName(guestData.name || '')
        sessionStorage.removeItem('guestCheckoutData')
      } catch (error) {
        console.error('Failed to parse guest data:', error)
      }
    } else {
      const savedEmail = sessionStorage.getItem('guestCheckoutEmail')
      if (savedEmail) setGuestEmail(savedEmail)
    }
  }, [])

  // Ensure Volet dialog opens when data is set
  useEffect(() => {
    console.log('[TelegramAccountCheckout] useEffect check:', {
      hasDialogData: !!voletDialogData,
      dialogOpen: voletDialogOpen,
      dialogData: voletDialogData
    })
    
    if (voletDialogData && !voletDialogOpen) {
      console.log('[TelegramAccountCheckout] useEffect: Volet dialog data exists but dialog is closed, opening now')
      setVoletDialogOpen(true)
    }
  }, [voletDialogData, voletDialogOpen])

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


  const handleSendOTP = async () => {
    if (!product) {
      toast.error('Product not found')
      return
    }

    // For guests, skip OTP and go directly to payment
    if (!isLoggedIn) {
      if (!customerName.trim()) {
        toast.error('Please enter your name')
        return
      }

      if (!customerPhone.trim()) {
        toast.error('Please enter your phone number')
        return
      }

      if (!guestEmail.trim()) {
        toast.error('Please enter your email')
        return
      }

      // Guest flows skip OTP - go directly to premium upsell or payment
      toast.success('Proceeding to payment...')
      if (product?.type === 'TELEGRAM_ACCOUNTS') {
        setStep('payment')
        setTimeout(() => {
          setShowPremiumUpsell(true)
        }, 100)
      } else {
        setStep('payment')
      }
      return
    }

    // Authenticated users: Send OTP
    setIsSubmitting(true)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/customer/orders/send-otp',
        {
          productId,
          quantity
        }
      )

      if (response.success) {
        toast.success(response.message || 'OTP sent to your email!')
        setStep('otp')
      } else {
        toast.error(response.message || 'Failed to send OTP')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async (code?: string) => {
    const otpToVerify = code || otpCode
    if (!otpToVerify.trim()) {
      toast.error('Please enter the OTP code')
      return
    }

    setIsSubmitting(true)
    try {
      const verifyResponse = await requests.post<{ success: boolean; message: string }>(
        '/customer/orders/verify-otp',
        {
          otp: otpToVerify
        }
      )

      if (!verifyResponse.success) {
        toast.error(verifyResponse.message || 'Invalid OTP code')
        throw new Error(verifyResponse.message || 'Invalid OTP code')
      }

      // OTP verified successfully - check if this is a Telegram account product
      if (product?.type === 'TELEGRAM_ACCOUNTS') {
        // Move to payment step first, then show premium upsell
        setStep('payment')
        toast.success('OTP verified! Please choose if you want to add Premium.')
        // Show premium upsell dialog after moving to payment step
        setTimeout(() => {
          setShowPremiumUpsell(true)
        }, 100)
      } else {
        // Proceed directly to payment for non-Telegram products
        setStep('payment')
        toast.success('OTP verified! Please select a payment method.')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const uniqueDurations = Array.from(new Set(selectedPremiumEntries.map((entry) => entry.duration)))

    if (uniqueDurations.length === 0) {
      setPremiumProductIds({})
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const typeMap: Record<PremiumDuration, string> = {
          '1-month': 'PREMIUM_1M',
          '3-month': 'PREMIUM_3M',
          '6-month': 'PREMIUM_6M',
          '12-month': 'PREMIUM_12M'
        }

        const responses = await Promise.all(
          uniqueDurations.map(async (duration) => {
            const response = await requests.get<{ data: Product[] }>(
              `/products?type=${typeMap[duration]}&limit=1&isActive=true`
            )
            return [duration, response?.data?.[0]?.id ?? null] as const
          })
        )

        if (!cancelled) {
          setPremiumProductIds(
            responses.reduce<Partial<Record<PremiumDuration, number>>>((acc, [duration, id]) => {
              if (id) acc[duration] = id
              return acc
            }, {})
          )
        }
      } catch (error) {
        console.error('[TelegramAccountCheckout] Failed to load premium products:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedPremiumEntries])

  useEffect(() => {
    if (!requiresPremiumTargetsInput) {
      setPremiumTargetValues([])
      return
    }

    setPremiumTargetValues((current) =>
      selectedPremiumEntries.map((_, index) => current[index] ?? '')
    )
  }, [requiresPremiumTargetsInput, selectedPremiumEntries])

  const handlePremiumUpsellConfirm = (selections: PremiumSelection[]) => {
    setShowPremiumUpsell(false)
    if (selections.length > 0) {
      setPremiumSelections(selections)
    } else {
      setPremiumSelections([])
      setPremiumProductIds({})
      setPremiumTargetValues([])
    }

    setStep('payment')
    toast.success(
      selections.length > 0
        ? 'Premium selection saved. Please continue to payment.'
        : 'Proceeding without Premium add-on.'
    )
  }

  const buildOrderDrafts = () => {
    const drafts: Array<{ productId: number; quantity: number; premiumTargets?: string[] }> = [
      {
        productId: product!.id,
        quantity
      }
    ]

    if (selectedPremiumEntries.length === 0) {
      return drafts
    }

    const groupedPremiumOrders = selectedPremiumEntries.reduce<
      Partial<Record<PremiumDuration, { quantity: number; premiumTargets: string[] }>>
    >((acc, entry, index) => {
      const duration = entry.duration
      if (!acc[duration]) {
        acc[duration] = {
          quantity: 0,
          premiumTargets: []
        }
      }

      acc[duration]!.quantity += 1

      if (requiresPremiumTargetsInput) {
        const targetValue = premiumTargetValues[index]?.trim()
        if (targetValue) {
          acc[duration]!.premiumTargets.push(targetValue)
        }
      }

      return acc
    }, {})

    for (const [duration, groupedOrder] of Object.entries(groupedPremiumOrders) as Array<
      [PremiumDuration, { quantity: number; premiumTargets: string[] }]
    >) {
      const productIdForDuration = premiumProductIds[duration]

      if (!productIdForDuration) {
        throw new Error(`Premium product for ${duration} is not available right now.`)
      }

      drafts.push({
        productId: productIdForDuration,
        quantity: groupedOrder.quantity,
        ...(groupedOrder.premiumTargets.length > 0
          ? { premiumTargets: groupedOrder.premiumTargets }
          : {})
      })
    }

    return drafts
  }

  const handlePaymentMethodClick = async (methodId: number) => {
    // Set the selected payment method
    setSelectedPaymentMethod(methodId)
    
    // Check if this is a volet payment method
    const method = paymentMethods.find((m: any) => m.id === methodId)
    if (method?.gateway?.toLowerCase() === 'volet') {
      // For volet, we need to create the order first, then open the dialog
      // Validate required fields first
      if (!product) {
        toast.error('Product not found')
        return
      }

      // Validate guest info if not logged in
      if (!isLoggedIn) {
        if (!customerName.trim()) {
          toast.error('Please enter your name')
          return
        }
        if (!customerPhone.trim()) {
          toast.error('Please enter your phone number')
          return
        }
        if (!guestEmail.trim()) {
          toast.error('Please enter your email')
          return
        }
      }

      if (
        requiresPremiumTargetsInput &&
        premiumTargetValues.some((value) => !value.trim())
      ) {
        toast.error('Please enter a username or account number for each selected Premium package')
        return
      }

      // Validate stock and quantity
      if (product.stockCount !== undefined && product.stockCount < quantity) {
        toast.error(`Insufficient stock. Available: ${product.stockCount}, Requested: ${quantity}`)
        return
      }

      const minQuantity = product.minQuantity || 1
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
        // Create orders (main order + premium order if selected)
        const orders = buildOrderDrafts()

        // Create orders
        let orderResponse: any
        if (orders.length > 1) {
          // Multiple orders - use cart endpoint
          const cartPayload: any = {
            items: orders.map((order) => {
              const itemPayload: any = {
                productId: order.productId,
                quantity: order.quantity
              }
              if (order.premiumTargets?.length) itemPayload.premiumTargets = order.premiumTargets
              return itemPayload
            })
          }

          if (couponCode) {
            cartPayload.couponCode = couponCode
          }

          if (!isLoggedIn) {
            cartPayload.customerName = customerName
            cartPayload.customerPhone = customerPhone
            cartPayload.guestEmail = guestEmail
          }

          orderResponse = await requests.post<{
            success: boolean
            message: string
            data: {
              cartGroupNumber: string
              order: { id: number; orderNumber: string; total?: any }
              orders: Array<{ id: number; orderNumber: string }>
            }
          }>('/customer/orders/cart', cartPayload, { skipAuthRedirect: true } as any)

          if (!orderResponse.success) {
            toast.error(orderResponse.message || 'Failed to create orders')
            setIsSubmitting(false)
            return
          }

          const orderId = orderResponse.data.order?.id
          if (!orderId) {
            toast.error('Failed to get order ID')
            setIsSubmitting(false)
            return
          }

          // Store guest email in sessionStorage
          if (!isLoggedIn && guestEmail) {
            sessionStorage.setItem('guestOrderEmail', guestEmail)
          }

          // Open volet dialog
          const orderAmount = total
          const currency = method?.currencies?.[0] || 'USD'
          
          setVoletDialogData({
            orderId,
            paymentMethodId: methodId,
            amount: orderAmount,
            currency
          })
          setVoletDialogOpen(true)
          setIsSubmitting(false)
        } else {
          // Single order
          const orderPayload: any = {
            productId: product.id,
            quantity
          }

          if (couponCode) {
            orderPayload.couponCode = couponCode
          }

          if (!isLoggedIn) {
            orderPayload.customerName = customerName
            orderPayload.customerPhone = customerPhone
            orderPayload.guestEmail = guestEmail
          }

          if (orders[0]?.premiumTargets?.length) {
            orderPayload.meta = {
              premiumTargets: orders[0].premiumTargets,
              telegramUsername: orders[0].premiumTargets[0]
            }
          }

          orderResponse = await requests.post<{
            success: boolean
            message: string
            data: { id: number; orderNumber: string }
          }>('/customer/orders', orderPayload, { skipAuthRedirect: true } as any)

          if (!orderResponse.success) {
            toast.error(orderResponse.message || 'Failed to create order')
            setIsSubmitting(false)
            return
          }

          const orderId = orderResponse.data.id

          // Store guest email in sessionStorage
          if (!isLoggedIn && guestEmail) {
            sessionStorage.setItem('guestOrderEmail', guestEmail)
          }

          // Open volet dialog
          const orderAmount = total
          const currency = method?.currencies?.[0] || 'USD'
          
          setVoletDialogData({
            orderId,
            paymentMethodId: methodId,
            amount: orderAmount,
            currency
          })
          setVoletDialogOpen(true)
          setIsSubmitting(false)
        }
      } catch (error: any) {
        console.error('[TelegramAccountCheckout] Volet payment method click error:', error)
        if (!isLoggedIn && error?.response?.status === 401) {
          toast.error('Your session has expired. Please enter your email again and try checkout.')
        } else {
          showError(error)
        }
        setIsSubmitting(false)
      }
    }
  }

  const handleProceedToPayment = async (skipPayGateProviderDialog: boolean = false) => {
    if (!product) {
      toast.error('Product not found')
      return
    }

    // Check if using wallet or payment method is selected
    const price = parseFloat(product.price.toString())
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

    // Debug: Log payment method selection
    console.log('[TelegramAccountCheckout] Payment method selected:', {
      selectedPaymentMethod,
      selectedMethod,
      allPaymentMethods: paymentMethods,
      gateway: selectedMethod?.gateway
    })

    // Validate stock before checkout
    if (product.stockCount !== undefined && product.stockCount < quantity) {
      toast.error(`Insufficient stock. Available: ${product.stockCount}, Requested: ${quantity}`)
      return
    }

    // Validate quantity limits
    const minQuantity = product.minQuantity || 1
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
      console.log('[TelegramAccountCheckout] Starting payment process', {
        isLoggedIn,
        hasGuestEmail: !!guestEmail,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim()
      })

      // Validate guest info before proceeding
      if (!isLoggedIn) {
        if (!customerName.trim()) {
          toast.error('Please enter your name')
          setIsSubmitting(false)
          return
        }
        if (!customerPhone.trim()) {
          toast.error('Please enter your phone number')
          setIsSubmitting(false)
          return
        }
        if (!guestEmail.trim()) {
          toast.error('Please enter your email')
          setIsSubmitting(false)
          return
        }
      }

      // Step 1: Create Orders (main order + premium order if selected)
      if (
        requiresPremiumTargetsInput &&
        premiumTargetValues.some((value) => !value.trim())
      ) {
        toast.error('Please enter a username or account number for each selected Premium package.')
        setIsSubmitting(false)
        return
      }

      const orders = buildOrderDrafts()

      // Create orders - if multiple, use cart endpoint, otherwise single order endpoint
      let orderResponse: any
      if (orders.length > 1) {
        // Multiple orders - use cart endpoint
        const cartPayload: any = {
          items: orders.map((order) => {
            const itemPayload: any = {
              productId: order.productId,
              quantity: order.quantity
            }
            if (order.premiumTargets?.length) itemPayload.premiumTargets = order.premiumTargets
            return itemPayload
          })
        }

        if (couponCode) {
          cartPayload.couponCode = couponCode
        }

        if (!isLoggedIn) {
          cartPayload.customerName = customerName
          cartPayload.customerPhone = customerPhone
          cartPayload.guestEmail = guestEmail
        }

        orderResponse = await requests.post<{
          success: boolean
          message: string
          data: {
            cartGroupNumber: string
            order: { id: number; orderNumber: string; total?: any }
            orders: Array<{ id: number; orderNumber: string }>
          }
        }>('/customer/orders/cart', cartPayload, { skipAuthRedirect: true } as any)

        if (!orderResponse.success) {
          toast.error(orderResponse.message || 'Failed to create orders')
          setIsSubmitting(false)
          return
        }

        const orderId = orderResponse.data.order?.id
        if (!orderId) {
          toast.error('Failed to get order ID')
          setIsSubmitting(false)
          return
        }

        // Store guest email in sessionStorage for order-success page
        if (!isLoggedIn && guestEmail) {
          sessionStorage.setItem('guestOrderEmail', guestEmail)
        }

        // Check if Volet gateway is selected - open dialog BEFORE initiating payment
        const selectedMethodForVolet = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)
        console.log('[TelegramAccountCheckout] Checking for Volet gateway (multiple orders):', {
          selectedPaymentMethod,
          selectedMethod: selectedMethodForVolet,
          gateway: selectedMethodForVolet?.gateway,
          gatewayLower: selectedMethodForVolet?.gateway?.toLowerCase(),
          isVolet: selectedMethodForVolet?.gateway?.toLowerCase() === 'volet'
        })
        
        if (selectedMethodForVolet?.gateway?.toLowerCase() === 'volet') {
          console.log('[TelegramAccountCheckout] Volet gateway detected, opening payment dialog', {
            orderId,
            paymentMethodId: selectedPaymentMethod,
            amount: total
          })
          const orderAmount = total
          const currency = selectedMethodForVolet?.currencies?.[0] || 'USD'
          
          // Set dialog data and open dialog together
          const dialogData = {
            orderId,
            paymentMethodId: selectedPaymentMethod!,
            amount: orderAmount,
            currency
          }
          
          console.log('[TelegramAccountCheckout] Setting Volet dialog data (multiple orders):', dialogData)
          
          // Set both states - React will batch them
          setVoletDialogData(dialogData)
          setVoletDialogOpen(true)
          
          console.log('[TelegramAccountCheckout] Volet dialog states set (multiple orders), should open now')
          
          setIsSubmitting(false)
          return
        } else {
          console.log('[TelegramAccountCheckout] Not Volet gateway, proceeding with normal payment flow')
        }

        // Step 2: Initiate Payment for primary order
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
            selectedMethodForVolet?.gateway?.toLowerCase() === 'paygate'
              ? resolvePayGateProviderCode(selectedPaygateProvider)
              : undefined
        }, { skipAuthRedirect: true } as any)

        if (!paymentResponse.success) {
          toast.error(paymentResponse.message || 'Failed to initiate payment')
          return
        }

        const { paymentUrl, address, qrCode } = paymentResponse.data

        // Redirect to payment gateway or show crypto payment details
        if (paymentUrl) {
          const shouldOpenInNewTab = selectedMethodForVolet?.gateway?.toLowerCase() === 'paygate'

          if (shouldOpenInNewTab) {
            const checkoutTab = window.open(paymentUrl, '_blank', 'noopener,noreferrer')
            if (checkoutTab) {
              toast.success('PayGate checkout opened in a new tab.')
              return
            }
          }

          window.location.href = paymentUrl
        } else if (address || qrCode) {
          if (!isLoggedIn && guestEmail) {
            sessionStorage.setItem('guestOrderEmail', guestEmail)
          }
          toast.success('Payment initiated! Redirecting...')
          router.push(`/payment/crypto-details?orderId=${orderId}`)
        } else {
          toast.success('Payment successful! Redirecting to your delivery details...')
          router.push(`/payment/success?order_id=${orderId}&status=success`)
        }
        return
      } else {
        // Single order
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
          orderPayload.customerName = customerName
          orderPayload.customerPhone = customerPhone
          orderPayload.guestEmail = guestEmail
        }

        // Add Telegram username for premium orders (standalone premium only)
        // For Telegram Auto accounts, username will be auto-linked after delivery
        if (orders[0]?.premiumTargets?.length) {
          orderPayload.meta = {
            premiumTargets: orders[0].premiumTargets,
            telegramUsername: orders[0].premiumTargets[0]
          }
        }

        orderResponse = await requests.post<{
          success: boolean
          message: string
          data: { id: number; orderNumber: string }
        }>('/customer/orders', orderPayload, { skipAuthRedirect: true } as any)

        if (!orderResponse.success) {
          toast.error(orderResponse.message || 'Failed to create order')
          setIsSubmitting(false)
          return
        }

        const orderId = orderResponse.data.id

        // Store guest email in sessionStorage for order-success page
        if (!isLoggedIn && guestEmail) {
          sessionStorage.setItem('guestOrderEmail', guestEmail)
        }

        // Check if Volet gateway is selected - open dialog BEFORE initiating payment
        const selectedMethodForVolet = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)
        console.log('[TelegramAccountCheckout] Checking for Volet gateway (single order):', {
          selectedPaymentMethod,
          selectedMethod: selectedMethodForVolet,
          gateway: selectedMethodForVolet?.gateway,
          gatewayLower: selectedMethodForVolet?.gateway?.toLowerCase(),
          isVolet: selectedMethodForVolet?.gateway?.toLowerCase() === 'volet'
        })
        
        if (selectedMethodForVolet?.gateway?.toLowerCase() === 'volet') {
          console.log('[TelegramAccountCheckout] Volet gateway detected, opening payment dialog', {
            orderId,
            paymentMethodId: selectedPaymentMethod,
            amount: total
          })
          const orderAmount = total
          const currency = selectedMethodForVolet?.currencies?.[0] || 'USD'
          
          // Set dialog data and open dialog together
          const dialogData = {
            orderId,
            paymentMethodId: selectedPaymentMethod!,
            amount: orderAmount,
            currency
          }
          
          console.log('[TelegramAccountCheckout] Setting Volet dialog data (single order):', dialogData)
          
          // Set both states - React will batch them
          setVoletDialogData(dialogData)
          setVoletDialogOpen(true)
          
          console.log('[TelegramAccountCheckout] Volet dialog states set, should open now', {
            voletDialogData: dialogData,
            voletDialogOpen: true
          })
          
          // Force a check after state update
          setTimeout(() => {
            console.log('[TelegramAccountCheckout] After state update check:', {
              hasDialogData: !!voletDialogData,
              dialogOpen: voletDialogOpen
            })
          }, 100)
          
          setIsSubmitting(false)
          return
        } else {
          console.log('[TelegramAccountCheckout] Not Volet gateway, proceeding with normal payment flow')
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
            selectedMethodForVolet?.gateway?.toLowerCase() === 'paygate'
              ? resolvePayGateProviderCode(selectedPaygateProvider)
              : undefined
        }, { skipAuthRedirect: true } as any)

        if (!paymentResponse.success) {
          toast.error(paymentResponse.message || 'Failed to initiate payment')
          return
        }

        const { paymentUrl, address, qrCode } = paymentResponse.data

        // Redirect to payment gateway or show crypto payment details
        if (paymentUrl) {
          const shouldOpenInNewTab = selectedMethodForVolet?.gateway?.toLowerCase() === 'paygate'

          if (shouldOpenInNewTab) {
            const checkoutTab = window.open(paymentUrl, '_blank', 'noopener,noreferrer')
            if (checkoutTab) {
              toast.success('PayGate checkout opened in a new tab.')
              return
            }
          }

          window.location.href = paymentUrl
        } else if (address || qrCode) {
          if (!isLoggedIn && guestEmail) {
            sessionStorage.setItem('guestOrderEmail', guestEmail)
          }
          toast.success('Payment initiated! Redirecting...')
          router.push(`/payment/crypto-details?orderId=${orderId}`)
        } else {
          toast.success('Payment successful! Redirecting to your delivery details...')
          router.push(`/payment/success?order_id=${orderId}&status=success`)
        }
      }
    } catch (error: any) {
      console.error('[TelegramAccountCheckout] Payment process error:', {
        status: error?.response?.status,
        message: error?.message,
        errorData: error?.response?.data,
        isLoggedIn
      })
      
      // Handle specific errors for guests
      if (!isLoggedIn && error?.response?.status === 401) {
        toast.error('Your session has expired. Please enter your email again and try checkout.')
        setStep('order')
      } else {
        showError(error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Close modal first, then clear state
    router.back()
  }

  // Show loading while hydrating from sessionStorage
  if (loading) {
    return (
      <div className='top-0 left-0 z-20 absolute inset-0 flex justify-center items-center bg-background/30 backdrop-blur-sm w-full h-screen overflow-hidden!'>
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
        <Button variant='outline' onClick={handleCancel} className='mt-4'>
          Go Back
        </Button>
      </div>
    )
  }

  const price = priceForTotals
  const subtotal = subtotalForTotals

  // Determine step for indicator
  const getStepForIndicator = () => {
    if (step === 'payment') return 'confirm'
    if (step === 'otp') return 'payment'
    return 'review'
  }
  const currentStep = getStepForIndicator()

  // Payment Selection Step UI
  if (step === 'payment') {
    return (
      <>
        <PremiumUpsell
          isOpen={showPremiumUpsell}
          onClose={() => {
            setShowPremiumUpsell(false)
            setPremiumSelections([])
            setPremiumProductIds({})
            setPremiumTargetValues([])
          }}
          onConfirm={handlePremiumUpsellConfirm}
          accountCount={quantity}
        />
        <div className='space-y-6 py-4'>
        {/* Step Indicator */}
        <div className='mb-6'>
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
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
                        isCompleted ? 'bg-green-500' : 'bg-muted-foreground'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className='space-y-2 text-center'>
          <div className='flex justify-center mb-2'>
            <CheckCircle2 className='w-12 h-12 text-primary' />
          </div>
          <Typography variant='h5' weight='semibold'>
            {isLoggedIn ? 'OTP Verified!' : 'Ready to Checkout'}
          </Typography>
          <Typography variant='body2' className='text-muted-foreground'>
            {isLoggedIn
              ? 'Now select your payment method to complete the purchase.'
              : 'Select your payment method to complete your purchase.'}
          </Typography>
        </div>

        {/* Order Summary */}
        <div className='space-y-2 bg-card p-4 border border-border rounded-lg'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Product</span>
            <span className='font-medium'>{product.name}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Quantity</span>
            <span className='font-medium'>{quantity}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Subtotal</span>
            <span className='font-medium'>${subtotal.toFixed(2)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-green-600'>Coupon Discount</span>
              <span className='font-medium text-green-600'>-${couponDiscount.toFixed(2)}</span>
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
            <span className='font-semibold text-foreground'>Total</span>
            <span className='font-bold text-primary'>${total.toFixed(2)}</span>
          </div>
        </div>

        {requiresPremiumTargetsInput && (
          <div className='space-y-2 bg-primary/10 border border-primary/20 rounded-lg p-4'>
            <Label className='text-foreground'>
              Premium Targets <span className='text-destructive'>*</span>
            </Label>
            <div className='space-y-3'>
              {selectedPremiumEntries.map((entry, index) => (
                <div key={`${entry.slot}-${entry.duration}`} className='space-y-2 rounded-lg border border-primary/20 bg-background/70 p-3'>
                  <Label htmlFor={`premium-target-${index}`} className='text-sm text-foreground'>
                    {durationLabels[entry.duration]} &gt; Username or Account Number #{index + 1}
                  </Label>
                  <Input
                    id={`premium-target-${index}`}
                    type='text'
                    placeholder='@username or account number'
                    value={premiumTargetValues[index] ?? ''}
                    onChange={(e) =>
                      setPremiumTargetValues((current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index ? e.target.value.trim() : value
                        )
                      )
                    }
                    className='bg-background border-border text-foreground placeholder:text-muted-foreground'
                    required
                  />
                </div>
              ))}
            </div>
            <p className='text-xs text-muted-foreground'>
              Enter the Telegram username or account number for each selected Premium package.
            </p>
          </div>
        )}

        {/* Wallet Balance + Payment Method Section */}
        <div className='space-y-4 bg-card p-4 border border-border rounded-lg'>
          <Typography variant='h6' weight='semibold'>
            Payment & Wallet
          </Typography>

          {/* Wallet Balance Option - Only for logged in users */}
          {isLoggedIn && (
            <div className='space-y-3'>
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

              {paymentMethods.filter((m) => m.isActive).length === 0 ? (
                <Typography variant='body2' className='text-muted-foreground'>
                  No payment methods available
                </Typography>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {paymentMethods.filter((m) => m.isActive).map((method) => {
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
                  PayGate provider will be selected on continue.
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex gap-3 pt-2'>
          <Button
            variant='outline'
            onClick={() => setStep(isLoggedIn ? 'otp' : 'order')}
            className='flex-1'
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={() => {
              void handleProceedToPayment()
            }}
            className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80 font-semibold'
            disabled={
              isSubmitting ||
              (!useWallet && !selectedPaymentMethod) ||
              (useWallet && walletAmount < total && !selectedPaymentMethod) ||
              (requiresPremiumTargetsInput &&
                premiumTargetValues.some((value) => !value.trim()))
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 w-4 h-4 animate-spin' />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>

        {/* Security Badges */}
        <div className='flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border'>
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

        {/* Support Contact */}
        <div className='pt-4 text-center'>
          <Typography variant='caption' className='text-muted-foreground'>
            Need help?{' '}
            <a href='/contact' className='text-primary hover:underline'>
              Contact Support
            </a>
            {' '}or email{' '}
            <a href='mailto:support@uhqaccounts.com' className='text-primary hover:underline'>
              support@uhqaccounts.com
            </a>
          </Typography>
        </div>
      </div>

      <PayGateProviderDialog
        open={showPayGateProviderDialog}
        onOpenChange={setShowPayGateProviderDialog}
        providers={paygateProviders}
        selectedProviderCode={selectedPaygateProvider}
        onSelectProvider={setSelectedPaygateProvider}
        amount={total}
        onConfirm={() => {
          setShowPayGateProviderDialog(false)
          handleProceedToPayment(true)
        }}
        continueLabel='Continue with selected provider'
      />

      {/* Volet Payment Dialog */}
      {voletDialogData && (
        <VoletPaymentDialog
          key={`volet-${voletDialogData.orderId}`}
          open={voletDialogOpen}
          onOpenChange={(open) => {
            console.log('[TelegramAccountCheckout] Volet dialog onOpenChange:', open, 'current state:', voletDialogOpen)
            setVoletDialogOpen(open)
            if (!open) {
              // Clear dialog data when closing
              setTimeout(() => {
                console.log('[TelegramAccountCheckout] Clearing Volet dialog data')
                setVoletDialogData(null)
              }, 300)
            }
          }}
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

  // OTP Step UI
  if (step === 'otp') {
    return (
      <>
        <PremiumUpsell
          isOpen={showPremiumUpsell}
          onClose={() => {
            setShowPremiumUpsell(false)
            setPremiumSelections([])
            setPremiumProductIds({})
            setPremiumTargetValues([])
            // If user closes without selecting, proceed to payment
            setStep('payment')
            toast.success('OTP verified! Please select a payment method.')
          }}
          onConfirm={handlePremiumUpsellConfirm}
          accountCount={quantity}
        />
        <div className='space-y-6 py-4'>
        <div className='space-y-2 text-center'>
          <Typography variant='h5' weight='semibold'>
            Verify OTP
          </Typography>
          <Typography variant='body2' className='text-muted-foreground'>
            We&apos;ve sent a verification code to your email. Please enter it below to complete
            your order.
          </Typography>
        </div>

        {/* OTP Verification Component */}
        <OTPVerification
          onVerify={async (code) => {
            setOtpCode(code)
            await handleVerifyOTP(code)
          }}
          onResend={handleSendOTP}
          isLoading={isSubmitting}
          email={isLoggedIn ? undefined : guestEmail}
          maxLength={6}
          expiryMinutes={10}
          resendCooldownSeconds={120}
        />

        {/* Order Summary */}
        <div className='space-y-2 bg-card p-4 border border-border rounded-lg'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Product</span>
            <span className='font-medium'>{product.name}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Quantity</span>
            <span className='font-medium'>{quantity}</span>
          </div>
          <div className='flex justify-between items-center pt-2 border-border border-t'>
            <span className='font-semibold text-foreground'>Total</span>
            <span className='font-bold text-primary'>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Back Button */}
        <Button
          variant='outline'
          onClick={() => setStep('order')}
          className='w-full'
          disabled={isSubmitting}
        >
          Back
        </Button>

        {/* Fallback: If premium upsell should show but user wants to proceed directly */}
        {showPremiumUpsell && (
          <div className='mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg'>
            <p className='text-sm text-muted-foreground mb-2'>
              Premium selection dialog should appear above. If you don't see it, you can proceed directly to payment.
            </p>
            <Button
              variant='outline'
              onClick={() => {
                setShowPremiumUpsell(false)
                setStep('payment')
                toast.success('Proceeding to payment...')
              }}
              className='w-full'
            >
              Proceed to Payment (Skip Premium)
            </Button>
          </div>
        )}
      </div>
      {/* Volet Payment Dialog */}
      {voletDialogData && (
        <VoletPaymentDialog
          key={`volet-${voletDialogData.orderId}`}
          open={voletDialogOpen}
          onOpenChange={(open) => {
            console.log('[TelegramAccountCheckout] Volet dialog onOpenChange:', open, 'current state:', voletDialogOpen)
            setVoletDialogOpen(open)
            if (!open) {
              // Clear dialog data when closing
              setTimeout(() => {
                console.log('[TelegramAccountCheckout] Clearing Volet dialog data')
                setVoletDialogData(null)
              }, 300)
            }
          }}
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

  // Order Step UI
  return (
    <>
    <Section>
      <Container className='max-w-3xl'>
        <PremiumUpsell
          isOpen={showPremiumUpsell}
          onClose={() => {
            setShowPremiumUpsell(false)
            setPremiumSelections([])
            setPremiumProductIds({})
            setPremiumTargetValues([])
          }}
          onConfirm={handlePremiumUpsellConfirm}
          accountCount={quantity}
        />
        <div className='space-y-6 py-4'>
        {/* Product Summary */}
        <div className='space-y-4 bg-card p-4 border border-border rounded-lg'>
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
              <div className='flex justify-center items-center bg-primary/10 rounded-lg w-full h-full'>
                <div className='bg-primary rounded w-8 h-8' />
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
        </div>
      </div>

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
        {product.maxQuantity === 0 && (
          <Typography variant='caption' className='text-muted-foreground'>
            Unlimited quantity available
          </Typography>
        )}
      </div>

      {/* Guest Information (only if not logged in) */}
      {!isLoggedIn && (
        <div className='space-y-4 bg-card p-4 border border-border rounded-lg'>
          <Typography variant='h6' weight='semibold'>
            Your Information
          </Typography>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='customerName'>Full Name *</Label>
              <Input
                id='customerName'
                type='text'
                placeholder='Enter your full name'
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='customerPhone'>Phone Number *</Label>
              <Input
                id='customerPhone'
                type='tel'
                placeholder='Enter your phone number'
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='guestEmail'>Email Address *</Label>
              <Input
                id='guestEmail'
                type='email'
                placeholder='Enter your email'
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
              <Typography variant='body2' className='text-muted-foreground text-xs'>
                OTP will be sent to this email
              </Typography>
            </div>
          </div>
        </div>
      )}

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

      {/* Order Summary */}
      <div className='space-y-3 bg-card p-4 border border-border rounded-lg'>
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
              <span className='text-green-600'>Coupon Discount</span>
              <span className='font-medium text-green-600'>-${couponDiscount.toFixed(2)}</span>
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
          <div className='flex justify-between items-center pt-2 border-border border-t'>
            <span className='font-semibold text-lg text-foreground'>Total</span>
            <span className='font-bold text-primary text-xl'>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex gap-3 pt-2'>
        <Button variant='outline' onClick={handleCancel} className='flex-1'>
          Cancel
        </Button>
        <Button
          onClick={handleSendOTP}
          className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80 font-semibold'
          disabled={
            (product.maxQuantity !== 0 && quantity > product.maxQuantity) ||
            (product.maxQuantity === 0 && quantity > (product.stockCount || 0)) ||
            isSubmitting
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 w-4 h-4 animate-spin' />
              Sending OTP...
            </>
          ) : (
            'Proceed to Checkout'
          )}
        </Button>
      </div>

      {/* Security Badges */}
      <div className='flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border'>
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

      {/* Support Contact */}
      <div className='pt-4 text-center'>
        <Typography variant='caption' className='text-muted-foreground'>
          Need help?{' '}
          <a href='/contact' className='text-primary hover:underline'>
            Contact Support
          </a>
          {' '}or email{' '}
          <a href='mailto:support@uhqaccounts.com' className='text-primary hover:underline'>
            support@uhqaccounts.com
          </a>
        </Typography>
      </div>
    </div>
      </Container>
    </Section> 
    {/* Volet Payment Dialog */}
    {voletDialogData && (
      <VoletPaymentDialog
        key={`volet-${voletDialogData.orderId}`}
        open={voletDialogOpen}
        onOpenChange={(open) => {
          console.log('[TelegramAccountCheckout] Volet dialog onOpenChange:', open, 'current state:', voletDialogOpen)
          setVoletDialogOpen(open)
          if (!open) {
            // Clear dialog data when closing
            setTimeout(() => {
              console.log('[TelegramAccountCheckout] Clearing Volet dialog data')
              setVoletDialogData(null)
            }, 300)
          }
        }}
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
