'use client'

import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Crown, HelpCircle, Home, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function SubscriptionPaymentCancelPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <div className='min-h-[80vh] flex items-center justify-center p-4'>
      <Card className='max-w-lg w-full p-8 text-center space-y-6'>
        <div className='flex justify-center'>
          <div className='relative'>
            <div className='h-20 w-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center'>
              <AlertCircle className='h-12 w-12 text-orange-600 dark:text-orange-500' />
            </div>
            <div className='absolute -top-2 -right-2'>
              <Crown className='h-8 w-8 text-gray-400' />
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Typography variant='h2' className='text-orange-600 dark:text-orange-500'>
            Payment Cancelled
          </Typography>
          <Typography variant='body1' className='text-muted-foreground'>
            Your subscription payment was not completed
          </Typography>
        </div>

        {reason && (
          <div className='bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4'>
            <Typography
              variant='caption'
              className='text-xs text-orange-800 dark:text-orange-200 font-medium'
            >
              Reason
            </Typography>
            <Typography variant='body2' className='text-orange-700 dark:text-orange-300 mt-1'>
              {reason}
            </Typography>
          </div>
        )}

        <div className='space-y-4 pt-4'>
          <div className='bg-muted/50 p-4 rounded-lg space-y-2 text-left'>
            <div className='flex items-start gap-3'>
              <HelpCircle className='h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5' />
              <div className='space-y-1'>
                <Typography variant='subtitle2' className='font-medium'>
                  Common reasons for payment cancellation:
                </Typography>
                <ul className='space-y-1 text-sm text-muted-foreground'>
                  <li>• Payment window closed or expired</li>
                  <li>• Insufficient funds in account</li>
                  <li>• Payment method declined</li>
                  <li>• User cancelled the transaction</li>
                </ul>
              </div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-3'>
            <Button asChild className='flex-1'>
              <CustomLink href='/user/subscription'>
                <RefreshCw className='h-4 w-4 mr-2' />
                Try Again
              </CustomLink>
            </Button>
            <Button asChild variant='outline' className='flex-1'>
              <CustomLink href='/subscription'>
                <ArrowLeft className='h-4 w-4 mr-2' />
                View Packages
              </CustomLink>
            </Button>
          </div>

          <Button asChild variant='ghost' size='sm' className='w-full'>
            <CustomLink href='/'>
              <Home className='h-4 w-4 mr-2' />
              Back to Home
            </CustomLink>
          </Button>
        </div>

        <div className='bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
          <Typography variant='body2' className='text-blue-800 dark:text-blue-200'>
            Need help? Contact our support team for assistance
          </Typography>
        </div>
      </Card>
    </div>
  )
}
