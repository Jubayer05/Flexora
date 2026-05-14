'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Loader2, Shield } from 'lucide-react'

interface PermissionLoadingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function PermissionLoading({
  className,
  size = 'md',
  message = 'Checking permissions...'
}: PermissionLoadingProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }

  const iconSizes = {
    sm: { main: 'w-8 h-8', spinner: 'w-5 h-5' },
    md: { main: 'w-12 h-12', spinner: 'w-6 h-6' },
    lg: { main: 'w-16 h-16', spinner: 'w-8 h-8' }
  }

  return (
    <div className={cn('flex justify-center items-center p-4', className)}>
      <Card className={cn('bg-card border-border w-full', sizeClasses[size])}>
        <CardContent className='flex flex-col justify-center items-center py-8 text-center'>
          <div className='relative mb-4'>
            <div
              className={cn(
                'flex justify-center items-center bg-primary/10 shadow-sm rounded-full',
                iconSizes[size].main
              )}
            >
              <Shield className={cn('text-primary', iconSizes[size].spinner)} />
            </div>
            <div className='-top-1 -right-1 absolute'>
              <Loader2 className={cn('text-primary animate-spin', iconSizes[size].spinner)} />
            </div>
          </div>

          <p
            className={cn(
              'font-medium text-card-foreground',
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
            )}
          >
            {message}
          </p>

          <div className='flex items-center gap-1 mt-2'>
            <div className='bg-primary/60 rounded-full w-2 h-2 animate-bounce [animation-delay:-0.3s]'></div>
            <div className='bg-primary/80 rounded-full w-2 h-2 animate-bounce [animation-delay:-0.15s]'></div>
            <div className='bg-primary rounded-full w-2 h-2 animate-bounce'></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
