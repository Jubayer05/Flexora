'use client'

import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Crown, Home, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SubscriptionPaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)
  const [verifying, setVerifying] = useState(true)

  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    // Simulate verification (in real app, you might call an API to verify payment)
    const verifyTimer = setTimeout(() => {
      setVerifying(false)
    }, 2000)

    return () => clearTimeout(verifyTimer)
  }, [])

  useEffect(() => {
    if (!verifying && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    } else if (!verifying && countdown === 0) {
      router.push('/user/subscription')
    }
  }, [verifying, countdown, router])

  return (
    <div className='min-h-[80vh] flex items-center justify-center p-4'>
      <Card className='max-w-lg w-full p-8 text-center space-y-6'>
        {verifying ? (
          <>
            <div className='flex justify-center'>
              <div className='relative'>
                <Loader2 className='h-20 w-20 text-primary animate-spin' />
                <Crown className='h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' />
              </div>
            </div>
            <div className='space-y-2'>
              <Typography variant='h3'>Verifying Payment...</Typography>
              <Typography variant='body2' className='text-sm text-muted-foreground'>
                Please wait while we confirm your subscription payment
              </Typography>
            </div>
          </>
        ) : (
          <>
            <div className='flex justify-center'>
              <div className='relative'>
                <div className='h-20 w-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center'>
                  <CheckCircle2 className='h-12 w-12 text-green-600 dark:text-green-500' />
                </div>
                <div className='absolute -top-2 -right-2'>
                  <Crown className='h-8 w-8 text-yellow-500' />
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Typography variant='h2' className='text-green-600 dark:text-green-500'>
                Payment Successful!
              </Typography>
              <Typography variant='body1' className='text-muted-foreground'>
                Your subscription has been activated successfully
              </Typography>
            </div>

            {paymentId && (
              <div className='bg-muted/50 p-4 rounded-lg space-y-1'>
                <Typography variant='caption' className='text-xs text-muted-foreground'>
                  Payment Reference
                </Typography>
                <Typography
                  variant='body2'
                  className='font-mono text-sm break-all text-muted-foreground'
                >
                  {paymentId}
                </Typography>
              </div>
            )}

            <div className='space-y-3 pt-4'>
              <Typography variant='caption' className='text-muted-foreground'>
                Redirecting to your subscription dashboard in {countdown} seconds...
              </Typography>

              <div className='flex flex-col sm:flex-row gap-3'>
                <Button asChild className='flex-1'>
                  <CustomLink href='/user/subscription'>
                    <Crown className='h-4 w-4 mr-2' />
                    View Subscription
                  </CustomLink>
                </Button>
                <Button asChild variant='outline' className='flex-1'>
                  <CustomLink href='/products'>
                    <Home className='h-4 w-4 mr-2' />
                    Browse Products
                  </CustomLink>
                </Button>
              </div>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
              <Typography variant='body2' className='text-blue-800 dark:text-blue-200'>
                🎉 You can now enjoy exclusive discounts on all your orders!
              </Typography>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
