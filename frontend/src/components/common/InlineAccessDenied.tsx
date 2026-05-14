'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowLeft, Home, Lock, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface InlineAccessDeniedProps {
  title?: string
  message?: string
  showBackButton?: boolean
  showHomeButton?: boolean
  redirectPath?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function InlineAccessDenied({
  title = 'Access Denied',
  message = 'You don&apos;t have permission to access this resource.',
  showBackButton = true,
  showHomeButton = true,
  redirectPath = '/admin/dashboard',
  className,
  size = 'md'
}: InlineAccessDeniedProps) {
  const router = useRouter()

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(redirectPath)
    }
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }

  const iconSizes = {
    sm: { main: 'w-8 h-8', lock: 'w-4 h-4', alert: 'w-4 h-4' },
    md: { main: 'w-12 h-12', lock: 'w-6 h-6', alert: 'w-5 h-5' },
    lg: { main: 'w-16 h-16', lock: 'w-8 h-8', alert: 'w-6 h-6' }
  }

  return (
    <div className={cn('flex justify-center items-center p-4', className)}>
      <Card className={cn('bg-destructive/5 border-destructive/30 w-full', sizeClasses[size])}>
        <CardHeader className='pb-4 text-center'>
          <div className='mx-auto mb-4'>
            <div
              className={cn(
                'flex justify-center items-center bg-destructive/10 shadow-sm rounded-full',
                iconSizes[size].main
              )}
            >
              <Lock className={cn('text-destructive', iconSizes[size].lock)} />
            </div>
          </div>

          <CardTitle
            className={cn(
              'flex justify-center items-center gap-2 font-semibold text-card-foreground',
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
            )}
          >
            <AlertTriangle className={cn('text-destructive', iconSizes[size].alert)} />
            {title}
          </CardTitle>

          <CardDescription
            className={cn('mt-2 text-muted-foreground', size === 'sm' ? 'text-sm' : 'text-base')}
          >
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* Permission notice */}
          <div className='bg-muted/50 p-3 border border-border rounded-lg'>
            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 bg-primary/10 p-1 rounded-full'>
                <Shield className='w-4 h-4 text-primary' />
              </div>
              <div className='text-card-foreground'>
                <p className={cn('mb-1 font-medium', size === 'sm' ? 'text-sm' : 'text-base')}>
                  Permission Required
                </p>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  Contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex sm:flex-row flex-col gap-2 pt-2'>
            {showBackButton && (
              <Button
                variant='outline'
                size={size === 'sm' ? 'sm' : 'default'}
                onClick={handleGoBack}
                className='group flex-1'
              >
                <ArrowLeft className='mr-2 w-4 h-4 transition-transform group-hover:-translate-x-1' />
                Go Back
              </Button>
            )}

            {showHomeButton && (
              <Link href={redirectPath} className='flex-1'>
                <Button size={size === 'sm' ? 'sm' : 'default'} className='group w-full'>
                  <Home className='mr-2 w-4 h-4 group-hover:scale-110 transition-transform' />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
