'use client'

import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
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

interface VoletPaymentFormProps {
  clientSecret: string
  orderId: number
  amount: number
  currency: string
  publishableKey: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

function PaymentForm({
  clientSecret,
  orderId,
  amount,
  currency,
  onSuccess,
  onError
}: Omit<VoletPaymentFormProps, 'publishableKey'>) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh the page.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)

      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Confirm payment with 3D Secure if required
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement
          }
        }
      )

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        onError?.(confirmError.message || 'Payment failed')
        toast.error(confirmError.message || 'Payment failed')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful! Redirecting...')
        onSuccess?.()
        // Redirect to success page
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
      onError?.(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#9e2146'
      }
    },
    hidePostalCode: false
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-4'>
        <div className='p-4 border border-border rounded-lg bg-background'>
          <label className='text-sm font-medium mb-2 block'>
            Card Details
          </label>
          <div className='p-3 border border-border rounded-md bg-background'>
            <CardElement options={cardElementOptions} />
          </div>
          {error && (
            <p className='mt-2 text-sm text-destructive'>{error}</p>
          )}
        </div>

        <div className='flex justify-between items-center p-4 bg-muted rounded-lg'>
          <span className='font-medium'>Total Amount</span>
          <span className='text-lg font-bold'>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency.toUpperCase()
            }).format(amount)}
          </span>
        </div>
      </div>

      <Button
        type='submit'
        disabled={!stripe || loading}
        className='w-full'
        size='lg'
      >
        {loading ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Processing Payment...
          </>
        ) : (
          `Pay ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
          }).format(amount)}`
        )}
      </Button>

      <p className='text-xs text-muted-foreground text-center'>
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  )
}

export default function VoletPaymentForm({
  clientSecret,
  orderId,
  amount,
  currency,
  publishableKey,
  onSuccess,
  onError
}: VoletPaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(getStripePromise(publishableKey))
    }
  }, [publishableKey])

  if (!stripePromise) {
    return (
      <div className='flex items-center justify-center p-8'>
        <Loader2 className='h-6 w-6 animate-spin' />
        <span className='ml-2'>Loading payment form...</span>
      </div>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#6366f1',
        colorBackground: 'transparent',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      }
    }
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        orderId={orderId}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  )
}





