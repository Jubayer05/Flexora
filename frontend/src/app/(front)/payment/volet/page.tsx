'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import VoletPaymentForm from '@/components/payment/VoletPaymentForm'
import requests from '@/services/network/http'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'

export default function VoletPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const paymentMethodId = searchParams.get('paymentMethodId')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntentData, setPaymentIntentData] = useState<{
    clientSecret: string
    paymentIntentId: string
    paymentId: number
    orderId: number
    amount: number
    currency: string
  } | null>(null)
  const [publishableKey, setPublishableKey] = useState<string>('')

  useEffect(() => {
    if (!orderId || !paymentMethodId) {
      setError('Order ID and Payment Method ID are required')
      setLoading(false)
      return
    }

    loadPaymentIntent()
  }, [orderId, paymentMethodId])

  const loadPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      // Create Payment Intent
      const response = await requests.post<{
        success: boolean
        message: string
        data: {
          clientSecret: string
          paymentIntentId: string
          paymentId: number
        }
      }>('/payments/volet/create-intent', {
        orderId: parseInt(orderId!),
        paymentMethodId: parseInt(paymentMethodId!)
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to create payment intent')
      }

      // Get order details for amount and currency
      const orderResponse = await requests.get<{
        success: boolean
        data: {
          id: number
          total: string
          payment?: {
            method?: {
              currencies: string[]
            }
          }
        }
      }>(`/customer/orders/${orderId}`)

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error('Failed to load order details')
      }

      const amount = parseFloat(orderResponse.data.total)
      const currency = orderResponse.data.payment?.method?.currencies?.[0] || 'USD'

      // Get publishable key from environment or payment method
      // For now, we'll use an environment variable
      // In production, this should be stored in payment method metadata
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
      
      if (!pk) {
        throw new Error('Stripe publishable key not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      }

      setPublishableKey(pk)
      setPaymentIntentData({
        clientSecret: response.data.clientSecret,
        paymentIntentId: response.data.paymentIntentId,
        paymentId: response.data.paymentId,
        orderId: parseInt(orderId!),
        amount,
        currency
      })
    } catch (err: any) {
      console.error('[VoletPayment] Error:', err)
      setError(err.message || 'Failed to initialize payment')
      toast.error(err.message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    toast.success('Payment successful!')
    router.push(`/payment/success?order_id=${orderId}&status=success`)
  }

  const handleError = (error: string) => {
    setError(error)
    toast.error(error)
  }

  if (loading) {
    return (
      <Section>
        <Container>
          <div className='flex items-center justify-center py-16'>
            <MotionLoader size='lg' variant='dots' />
          </div>
        </Container>
      </Section>
    )
  }

  if (error && !paymentIntentData) {
    return (
      <Section>
        <Container>
          <div className='max-w-2xl mx-auto py-16 text-center'>
            <Typography variant='h3' className='mb-4'>
              Payment Error
            </Typography>
            <Typography variant='body1' className='text-destructive mb-6'>
              {error}
            </Typography>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  if (!paymentIntentData || !publishableKey) {
    return (
      <Section>
        <Container>
          <div className='max-w-2xl mx-auto py-16 text-center'>
            <Typography variant='h3' className='mb-4'>
              Configuration Error
            </Typography>
            <Typography variant='body1' className='mb-6'>
              Payment form is not properly configured. Please contact support.
            </Typography>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container>
        <div className='max-w-2xl mx-auto py-8'>
          <Typography variant='h2' className='mb-2 text-center'>
            Complete Payment
          </Typography>
          <Typography variant='body2' className='text-muted-foreground text-center mb-8'>
            Order #{orderId}
          </Typography>

          <div className='bg-card border border-border rounded-lg p-6'>
            <VoletPaymentForm
              clientSecret={paymentIntentData.clientSecret}
              orderId={paymentIntentData.orderId}
              amount={paymentIntentData.amount}
              currency={paymentIntentData.currency}
              publishableKey={publishableKey}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>

          {error && (
            <div className='mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg'>
              <Typography variant='body2' className='text-destructive'>
                {error}
              </Typography>
            </div>
          )}
        </div>
      </Container>
    </Section>
  )
}





