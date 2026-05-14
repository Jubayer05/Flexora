'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import requests from '@/services/network/http'
import { AlertCircle, ArrowLeft, CreditCard, RefreshCw, XCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type OrderDetails = {
  orderId: number
  orderNumber: string
  amount: string
  productName: string
  paymentMethod?: string
}

type PaymentMethod = {
  id: number
  gateway: string
  name: string
  thumbnail?: string | null
}

export default function PaymentFailedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [errorReason, setErrorReason] = useState<string | null>(null)

  const orderId = searchParams.get('order_id')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch order details
        if (orderId) {
          const orderResponse = await requests.get<{
            success: boolean
            data: {
              id: number
              orderNumber: string
              total: string
              product: {
                name: string
              }
              payment?: {
                method?: {
                  gateway: string
                }
              }
            }
          }>(`/customer/orders/${orderId}`)

          if (orderResponse.success && orderResponse.data) {
            setOrderDetails({
              orderId: orderResponse.data.id,
              orderNumber: orderResponse.data.orderNumber,
              amount: orderResponse.data.total,
              productName: orderResponse.data.product.name,
              paymentMethod: orderResponse.data.payment?.method?.gateway
            })
          }
        }

        // Fetch available payment methods for alternatives
        const methodsResponse = await requests.get<{
          success: boolean
          data: PaymentMethod[]
        }>('/payment-methods')

        if (methodsResponse.success && methodsResponse.data) {
          setPaymentMethods(methodsResponse.data.filter((m) => m.gateway !== orderDetails?.paymentMethod))
        }

        // Set error reason from URL param
        if (errorParam) {
          setErrorReason(decodeURIComponent(errorParam))
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orderId, errorParam])

  const getErrorMessage = () => {
    if (errorReason) {
      return errorReason
    }

    // Common error messages based on typical failure reasons
    const commonErrors = [
      'Insufficient funds in your account',
      'Payment method was declined',
      'Transaction timeout - please try again',
      'Invalid payment information',
      'Payment gateway temporarily unavailable'
    ]

    return commonErrors[0] // Default message
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-12'>
      <div className='max-w-2xl w-full'>
        <div className='bg-foreground/80 border border-red-500/20 rounded-lg p-8 space-y-6'>
          {/* Failed Icon */}
          <div className='flex justify-center'>
            <div className='bg-red-500/10 rounded-full p-4'>
              <XCircle className='w-20 h-20 text-red-500' />
            </div>
          </div>

          {/* Title */}
          <div className='text-center space-y-2'>
            <Typography variant='h3' weight='bold' className='text-red-500'>
              Payment Failed
            </Typography>
            <Typography variant='body1' className='text-muted-foreground'>
              Your payment could not be processed. No charges were made to your account.
            </Typography>
          </div>

          {/* Error Message */}
          <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-4'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div>
                <Typography variant='body2' weight='semibold' className='text-red-500 mb-1'>
                  Error Details
                </Typography>
                <Typography variant='body2' className='text-muted-foreground'>
                  {getErrorMessage()}
                </Typography>
              </div>
            </div>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className='bg-background/50 rounded-lg p-4 space-y-3'>
              <Typography variant='h6' weight='semibold'>
                Order Details
              </Typography>
              <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Order Number</span>
                  <span className='font-medium'>{orderDetails.orderNumber}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Product</span>
                  <span className='font-medium'>{orderDetails.productName}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>Amount</span>
                  <span className='font-medium'>${parseFloat(orderDetails.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Alternative Payment Methods */}
          {paymentMethods.length > 0 && (
            <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-4'>
              <Typography variant='h6' weight='semibold' className='mb-3 flex items-center gap-2'>
                <CreditCard className='w-5 h-5' />
                Try Alternative Payment Methods
              </Typography>
              <Typography variant='body2' className='text-muted-foreground mb-3'>
                You can retry with a different payment method:
              </Typography>
              <div className='flex flex-wrap gap-2'>
                {paymentMethods.slice(0, 3).map((method) => (
                  <Button
                    key={method.id}
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      if (orderDetails?.orderId) {
                        router.push(`/checkout/accounts?id=${orderDetails.orderId}`)
                      } else {
                        router.push('/shop')
                      }
                    }}
                  >
                    {method.name || method.gateway}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Common Reasons */}
          <div className='bg-muted/50 rounded-lg p-4'>
            <Typography variant='body2' weight='semibold' className='mb-2'>
              Common reasons for payment failure:
            </Typography>
            <ul className='space-y-1 text-sm text-muted-foreground'>
              <li>• Insufficient funds or credit limit exceeded</li>
              <li>• Incorrect card details or expired card</li>
              <li>• Bank security restrictions</li>
              <li>• Network connectivity issues</li>
              <li>• Payment gateway temporary unavailability</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-3 pt-4'>
            <Button
              onClick={() => {
                if (orderDetails?.orderId) {
                  router.push(`/checkout/accounts?id=${orderDetails.orderId}`)
                } else {
                  router.push('/shop')
                }
              }}
              className='flex-1 bg-linear-to-b from-primary to-primary/80 hover:bg-primary/90'
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              Retry Payment
            </Button>
            <Button variant='outline' onClick={() => router.push('/shop')} className='flex-1'>
              <ArrowLeft className='w-4 h-4 mr-2' />
              Back to Shop
            </Button>
          </div>

          {/* Support Contact */}
          <div className='text-center pt-4 border-t border-muted-foreground'>
            <Typography variant='caption' className='text-muted-foreground'>
              Need help? Contact our{' '}
              <Link href='/contact' className='text-primary hover:underline'>
                support team
              </Link>
              {' '}or email{' '}
              <a href='mailto:support@uhqaccounts.com' className='text-primary hover:underline'>
                support@uhqaccounts.com
              </a>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}

