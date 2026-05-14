'use client'

import CustomImage from '@/components/common/CustomImage'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import VoletPaymentDialog from '@/components/payment/VoletPaymentDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import {
  calculatePaymentAdjustments,
  getPaymentBonusCopy,
  getPaymentFeeCopy
} from '@/utils/payment-adjustments'
import Cookies from 'js-cookie'
import { Loader2, Wallet } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import MotionLoader from '../common/MotionLoader'
import PayGateProviderDialog, {
  PAYGATE_MULTI_PROVIDER_CODE,
  resolvePayGateProviderCode,
  type PayGateProviderOption
} from './PayGateProviderDialog'

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

export default function TelegramTransferCheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')

  // Check if user is logged in
  const isLoggedIn = !!Cookies.get('token')

  const [step, setStep] = useState<'details' | 'payment'>('details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [telegramPhone, setTelegramPhone] = useState('')
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
  const {
    activeSubscription,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays,
    subscriptionRemainingLabel
  } = useActiveSubscriptionDiscount(isLoggedIn ? priceForTotals : 0)
  const totalWithDiscounts = Math.max(0, priceForTotals - subscriptionDiscountAmount)
  const selectedMethodForProvider = paymentMethods.find((m) => m.id === selectedPaymentMethod)
  const paymentAdjustment = calculatePaymentAdjustments(
    totalWithDiscounts,
    selectedMethodForProvider
  )
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
        if (guestData.telegram) {
          setTelegramPhone(guestData.telegram)
        }
        sessionStorage.removeItem('guestCheckoutData')
      } catch (error) {
        console.error('Failed to parse guest data:', error)
      }
    } else {
      const savedEmail = sessionStorage.getItem('guestCheckoutEmail')
      if (savedEmail) setGuestEmail(savedEmail)
    }
  }, [])

  // Validate phone number format (+1234567890)
  const validatePhoneFormat = (phone: string): boolean => {
    const phoneRegex = /^\+\d{10,15}$/
    return phoneRegex.test(phone)
  }

  const handleProceedToPayment = () => {
    if (!product) {
      toast.error('Product not found')
      return
    }

    // Validate guest information only if not logged in
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

    // Validate Telegram phone (always required)
    if (!telegramPhone.trim()) {
      toast.error('Please enter your Telegram phone number')
      return
    }

    if (!validatePhoneFormat(telegramPhone)) {
      toast.error('Please enter a valid phone number format (e.g., +1234567890)')
      return
    }

    setStep('payment')
  }

  const handleCompletePayment = async (skipPayGateProviderDialog: boolean = false) => {
    if (!product) {
      toast.error('Product not found')
      return
    }

    // Check if using wallet or payment method is selected
    const price = priceForTotals
    const totalToPay = total

    if (!useWallet && !selectedPaymentMethod) {
      toast.error('Please select a payment method or use wallet balance')
      return
    }

    // If using wallet, verify sufficient balance
    if (useWallet && walletAmount < totalToPay && !selectedPaymentMethod) {
      const remainingAmount = totalToPay - walletAmount
      toast.error(
        `Insufficient wallet balance. Available: $${walletAmount.toFixed(2)}, Need: $${totalToPay.toFixed(2)}. You need to select a payment method for the remaining $${remainingAmount.toFixed(2)}.`
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

    setIsSubmitting(true)
    try {
      // Step 1: Create Order with customerTelegram in meta
      const orderPayload: any = {
        productId: product.id,
        quantity: 1, // Always 1 for transfers
        customerTelegram: telegramPhone
      }

      // Only include guest info if not logged in
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

      const orderId = orderResponse.data.id
      toast.success('Order created successfully')

      // Store guest email in sessionStorage for order-success page
      if (!isLoggedIn && guestEmail) {
        sessionStorage.setItem('guestOrderEmail', guestEmail)
      }

      // Check if Volet gateway is selected - redirect to embedded payment page
      if (selectedMethod?.gateway === 'volet') {
        console.log('[AccountCheckout] Volet gateway detected, opening payment dialog')
        const orderAmount = totalWithDiscounts
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
      if (useWallet && walletAmount >= total) {
        const paymentResponse = await requests.post<{
          success: boolean
          message: string
          data: {
            payment: { id: number; status: string }
          }
        }>(
          '/payments/initiate',
          {
            orderId,
            walletAmount
          },
          { skipAuthRedirect: true } as any
        )

        if (!paymentResponse.success) {
          toast.error(paymentResponse.message || 'Failed to process wallet payment')
          return
        }

        toast.success(
          'Payment completed using wallet balance! Redirecting to your order details...'
        )
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
      }>(
        '/payments/initiate',
        {
          orderId,
          paymentMethodId: selectedPaymentMethod,
          walletAmount: useWallet ? walletAmount : undefined,
          paygateProviderCode:
            selectedMethod?.gateway?.toLowerCase() === 'paygate'
              ? resolvePayGateProviderCode(selectedPaygateProvider)
              : undefined
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

        window.location.href = paymentUrl
      } else if (address || qrCode) {
        if (!isLoggedIn && guestEmail) {
          sessionStorage.setItem('guestOrderEmail', guestEmail)
        }
        toast.success('Payment initiated! Redirecting...')
        router.push(`/payment/crypto-details?orderId=${orderId}`)
      } else {
        toast.success('Payment successful!')
        router.push(`/payment/success?order_id=${orderId}`)
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  // Show loading while hydrating
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

  // Determine current step for indicator
  const currentStep: 'review' | 'payment' = step === 'payment' ? 'payment' : 'review'

  // Payment Selection Step
  if (step === 'payment') {
    return (
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
                (stepItem.step === 'review' && currentStep === 'payment') ||
                (stepItem.step === 'payment' && false) // Payment step never completes in this component

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
          <Typography variant='h5' weight='semibold'>
            Select Payment Method
          </Typography>
          <Typography variant='body2' className='text-muted-foreground'>
            Choose your preferred payment method to complete the transfer purchase.
          </Typography>
        </div>

        {/* Order Summary */}
        <div className='space-y-2 bg-card p-4 border border-border rounded-lg shadow-sm'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Product</span>
            <span className='font-medium'>{product.name}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Your Telegram</span>
            <span className='font-medium'>{telegramPhone}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>Subtotal</span>
            <span className='font-medium'>${price.toFixed(2)}</span>
          </div>
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
              <span className='font-medium text-orange-500'>
                +${paymentAdjustment.feeAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className='flex justify-between items-center pt-2 border-muted-foreground border-t'>
            <span className='font-semibold'>Total</span>
            <span className='font-bold text-primary'>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Wallet Balance + Payment Method Section */}
        <div className='space-y-4 bg-card p-4 border border-border rounded-lg shadow-sm'>
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
                    : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                }`}
                disabled={isSubmitting || (balanceData?.data?.balance || 0) === 0}
              >
                <div className='flex items-center gap-4'>
                  <div className='relative w-12 h-12 rounded-lg overflow-hidden border bg-background shrink-0 flex items-center justify-center'>
                    <Wallet
                      className={`w-6 h-6 ${(balanceData?.data?.balance || 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          useWallet ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      >
                        {useWallet && <div className='w-2 h-2 rounded-full bg-white' />}
                      </div>

                      <Typography variant='body1' weight='bold' className='truncate'>
                        Wallet Balance
                      </Typography>
                    </div>

                    <Typography
                      variant='caption'
                      className={`${(balanceData?.data?.balance || 0) > 0 ? 'text-muted-foreground' : 'text-destructive'} mt-1 block`}
                    >
                      {(balanceData?.data?.balance || 0) > 0
                        ? `Available: $${(balanceData?.data?.balance || 0).toFixed(2)}`
                        : 'No balance available'}
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
                    Wallet covers ${walletAmount.toFixed(2)}. Select a payment method for the
                    remaining ${(total - walletAmount).toFixed(2)}.
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
              <Typography
                variant='body2'
                weight='bold'
                className='text-primary flex items-center gap-2'
              >
                ✓ Payment Method
              </Typography>
              <Typography variant='caption' className='text-primary mt-2'>
                Your wallet balance covers the full amount. No additional payment method needed.
              </Typography>
            </div>
          ) : (
            <div className='space-y-3'>
              <Typography variant='body2' weight='semibold'>
                {useWallet && walletAmount > 0
                  ? `Payment Methods (Remaining: $${(total - walletAmount).toFixed(2)})`
                  : 'Select Payment Method'}
              </Typography>

              {paymentMethods.filter((m) => m.isActive).length === 0 ? (
                <Typography variant='body2' className='text-muted-foreground'>
                  No payment methods available
                </Typography>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {paymentMethods
                    .filter((m) => m.isActive)
                    .map((method) => {
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
                              : 'border-muted-foreground bg-background/50 hover:border-primary hover:bg-primary/10'
                          }`}
                        >
                          <span className='text-sm capitalize'>
                            {method.name || method.gateway}
                          </span>
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

        {/* Action Buttons */}
        <div className='flex gap-3 pt-2'>
          <Button
            variant='outline'
            onClick={() => setStep('details')}
            className='flex-1'
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={() => {
              void handleCompletePayment()
            }}
            className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80 font-semibold'
            disabled={
              isSubmitting ||
              (!useWallet && !selectedPaymentMethod) ||
              (useWallet && walletAmount < total && !selectedPaymentMethod)
            }
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

        <PayGateProviderDialog
          open={showPayGateProviderDialog}
          onOpenChange={setShowPayGateProviderDialog}
          providers={paygateProviders}
          selectedProviderCode={selectedPaygateProvider}
          onSelectProvider={setSelectedPaygateProvider}
          amount={total}
          onConfirm={() => {
            setShowPayGateProviderDialog(false)
            handleCompletePayment(true)
          }}
          continueLabel='Continue with selected provider'
        />
      </div>
    )
  }

  // Details Step
  return (
    <>
      <Section>
        <Container className='max-w-3xl'>
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
                  (stepItem.step === 'review' && currentStep === 'payment') ||
                  (stepItem.step === 'payment' && false) // Payment step never completes in this component

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

          <div className='space-y-6 py-4'>
            {/* Product Summary */}
            <div className='space-y-4 bg-card p-4 border border-border rounded-lg shadow-sm'>
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
              <div className='space-y-2 pt-3 border-muted-foreground border-t'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Price</span>
                  <span className='font-semibold text-primary'>${price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Telegram Phone Number (Always Required) */}
            <div className='space-y-4 bg-amber-50 dark:bg-amber-500/10 p-4 border border-amber-200 dark:border-amber-500/40 rounded-lg'>
              <Typography variant='h6' weight='semibold'>
                🔔 Your Telegram Phone Number
              </Typography>
              <div className='space-y-2'>
                <Label htmlFor='telegramPhone'>
                  Telegram Phone Number *{' '}
                  <span className='text-xs text-muted-foreground'>(Format: +1234567890)</span>
                </Label>
                <Input
                  id='telegramPhone'
                  type='tel'
                  placeholder='+1234567890'
                  value={telegramPhone}
                  onChange={(e) => setTelegramPhone(e.target.value)}
                  required
                />
                <Typography variant='body2' className='text-muted-foreground text-xs'>
                  ⚠️ Enter the phone number associated with your Telegram account. This is required
                  for the ownership transfer process.
                </Typography>
              </div>
            </div>

            {/* Guest Information (only if not logged in) */}
            {!isLoggedIn && (
              <div className='space-y-4 bg-card p-4 border border-border rounded-lg shadow-sm'>
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
                    <Label htmlFor='customerPhone'>Contact Phone *</Label>
                    <Input
                      id='customerPhone'
                      type='tel'
                      placeholder='Enter your contact number'
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
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className='space-y-3 bg-card p-4 border border-border rounded-lg shadow-sm'>
              <Typography variant='h6' weight='semibold'>
                Order Summary
              </Typography>
              <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Transfer Service</span>
                  <span className='font-medium'>${price.toFixed(2)}</span>
                </div>
                <div className='flex justify-between items-center pt-2 border-muted-foreground border-t'>
                  <span className='font-semibold text-lg'>Total</span>
                  <span className='font-bold text-primary text-xl'>${price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3 pt-2'>
              <Button variant='outline' onClick={handleCancel} className='flex-1'>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPayment}
                className='flex-1 hover:bg-primary/90 bg-linear-to-b from-primary to-primary/80 font-semibold'
                disabled={isSubmitting}
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
                <span className='text-primary'>�</span>
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
                </a>{' '}
                or email{' '}
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
