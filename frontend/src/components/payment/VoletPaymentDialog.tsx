'use client'

import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, DollarSign, Lock, CreditCard, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import requests from '@/services/network/http'
import { useRouter } from 'next/navigation'

// Initialize Stripe (publishable key will be passed as prop)
let stripePromise: Promise<any> | null = null

function getStripePromise(publishableKey: string) {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

interface VoletPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  paymentMethodId: number
  amount: number
  currency: string
  publishableKey: string
}

function PaymentFormContent({
  clientSecret,
  orderId,
  amount,
  currency,
  onSuccess,
  onClose
}: {
  clientSecret: string
  orderId: number
  amount: number
  currency: string
  onSuccess?: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zipCode, setZipCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh the page.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardNumberElement = elements.getElement(CardNumberElement)

      if (!cardNumberElement) {
        throw new Error('Card number element not found')
      }

      // Create payment method using card number element
      // Stripe automatically collects expiry and CVC from their respective elements
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          address: {
            postal_code: zipCode
          }
        }
      })

      if (pmError || !paymentMethod) {
        setError(pmError?.message || 'Failed to create payment method')
        toast.error(pmError?.message || 'Failed to create payment method')
        return
      }

      // Confirm payment with 3D Secure if required
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod.id
        }
      )

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        toast.error(confirmError.message || 'Payment failed')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful!')
        onSuccess?.()
        onClose()
        router.push(`/payment/success?order_id=${orderId}&status=success`)
      } else if (paymentIntent?.status === 'requires_action') {
        // 3D Secure authentication required
        toast.info('Please complete authentication')
        // Stripe will handle the 3D Secure flow automatically
      } else {
        setError('Payment is still processing')
        toast.info('Payment is processing...')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during payment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const elementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af'
        }
      },
      invalid: {
        color: 'hsl(var(--destructive))'
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-5'>
      {/* Payment Method Selection - Only Card */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          className='flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium border-2 border-primary shadow-sm'
        >
          <CreditCard className='h-5 w-5' />
          Card
        </button>
      </div>

      {/* Secure Checkout Banner */}
      <div className='flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900'>
        <Lock className='h-4 w-4 text-green-600 dark:text-green-400' />
        <span className='text-sm text-green-700 dark:text-green-300 font-medium'>
          Secure, 1-click checkout with Link
        </span>
        <ChevronDown className='h-4 w-4 text-green-600 dark:text-green-400 ml-auto' />
      </div>

      {/* Card Number Field - Separate */}
      <div className='space-y-2'>
        <Label htmlFor='card-number' className='text-sm font-medium text-foreground'>
          Card number
        </Label>
        <div className='relative'>
          <div className='p-3 border-2 border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary'>
            <CardNumberElement
              id='card-number'
              options={elementOptions}
            />
          </div>
          {/* Card Type Logos */}
          <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none'>
            <span className='text-[10px] font-semibold text-muted-foreground'>Visa</span>
            <span className='text-[10px] font-semibold text-muted-foreground'>MC</span>
            <span className='text-[10px] font-semibold text-muted-foreground'>Amex</span>
            <span className='text-[10px] font-semibold text-muted-foreground'>UnionPay</span>
          </div>
        </div>
      </div>

      {/* Expiration and CVC Row - Below Card Number */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='card-expiry' className='text-sm font-medium text-foreground'>
            Expiration
          </Label>
          <div className='p-3 border-2 border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary'>
            <CardExpiryElement
              id='card-expiry'
              options={elementOptions}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='card-cvc' className='text-sm font-medium text-foreground'>
            CVC
          </Label>
          <div className='relative p-3 border-2 border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary'>
            <CardCvcElement
              id='card-cvc'
              options={elementOptions}
            />
            {/* CVC Icon */}
            <div className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none'>
              <div className='w-8 h-6 bg-muted rounded border-2 border-border flex items-center justify-center'>
                <div className='w-4 h-3 bg-background rounded-sm border border-border'></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZIP Code Field - Separate Below */}
      <div className='space-y-2'>
        <Label htmlFor='zip-code' className='text-sm font-medium text-foreground'>
          ZIP code
        </Label>
        <Input
          id='zip-code'
          type='text'
          placeholder='12345'
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className='p-3 border-2 border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary'
          required
        />
      </div>

      {error && (
        <div className='p-3 bg-destructive/10 border border-destructive rounded-lg'>
          <p className='text-sm text-destructive'>{error}</p>
        </div>
      )}

      {/* Pay Button - Using Primary Color */}
      <Button
        type='submit'
        disabled={!stripe || loading}
        className='w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg shadow-lg'
        size='lg'
      >
        {loading ? (
          <>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Processing Payment...
          </>
        ) : (
          <>
            <DollarSign className='mr-2 h-5 w-5' />
            Pay - {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency.toUpperCase()
            }).format(amount)}
          </>
        )}
      </Button>

      <p className='text-xs text-muted-foreground text-center'>
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  )
}

export default function VoletPaymentDialog({
  open,
  onOpenChange,
  orderId,
  paymentMethodId,
  amount,
  currency,
  publishableKey
}: VoletPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntentData, setPaymentIntentData] = useState<{
    clientSecret: string
    paymentIntentId: string
  } | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(getStripePromise(publishableKey))
    }
  }, [publishableKey])

  useEffect(() => {
    if (open && !paymentIntentData && stripePromise) {
      loadPaymentIntent()
    }
  }, [open, orderId, paymentMethodId, stripePromise])

  const loadPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await requests.post<{
        success: boolean
        message: string
        data: {
          clientSecret: string
          paymentIntentId: string
          paymentId: number
        }
      }>('/payments/volet/create-intent', {
        orderId,
        paymentMethodId
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to create payment intent')
      }

      setPaymentIntentData({
        clientSecret: response.data.clientSecret,
        paymentIntentId: response.data.paymentIntentId
      })
    } catch (err: any) {
      console.error('[VoletPaymentDialog] Error:', err)
      setError(err.message || 'Failed to initialize payment')
      toast.error(err.message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state when closing
    setTimeout(() => {
      setPaymentIntentData(null)
      setError(null)
    }, 300)
  }

  const options: StripeElementsOptions = {
    clientSecret: paymentIntentData?.clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        colorBackground: 'transparent',
        colorText: 'hsl(var(--foreground))',
        colorDanger: 'hsl(var(--destructive))',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md p-0 gap-0 overflow-hidden bg-card border-2'>
        {/* Header - Using Primary Color */}
        <div className='flex items-center justify-between p-6 border-b border-border bg-card'>
          <div className='flex items-center gap-3'>
            <DialogTitle className='text-3xl font-bold text-primary m-0'>
              PAYMENT DETAILS
            </DialogTitle>
          </div>
          <div className='flex items-center gap-2'>
            {/* Powered by Stripe Button */}
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-3 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium'
            >
              <CreditCard className='h-3 w-3 mr-1' />
              Powered by Stripe
            </Button>
            {/* Close Button */}
            <Button
              variant='ghost'
              size='icon'
              onClick={handleClose}
              className='h-8 w-8'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className='px-6 pb-6 pt-4 max-h-[calc(90vh-120px)] overflow-y-auto'>
          <p className='text-sm text-muted-foreground mb-6'>
            Please enter your card details below to process your payment.
          </p>

          {loading && !paymentIntentData ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
              <span className='ml-2 text-muted-foreground'>Loading payment form...</span>
            </div>
          ) : error && !paymentIntentData ? (
            <div className='py-12 text-center'>
              <p className='text-destructive mb-4'>{error}</p>
              <Button onClick={loadPaymentIntent} variant='outline'>
                Try Again
              </Button>
            </div>
          ) : paymentIntentData && stripePromise ? (
            <Elements stripe={stripePromise} options={options}>
              <PaymentFormContent
                clientSecret={paymentIntentData.clientSecret}
                orderId={orderId}
                amount={amount}
                currency={currency}
                onSuccess={handleSuccess}
                onClose={handleClose}
              />
            </Elements>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}