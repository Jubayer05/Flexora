'use client'

import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'
import { motion } from 'motion/react'

const loaderVariants = cva('flex justify-center items-center', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    },
    variant: {
      spinner: '',
      dots: 'gap-1',
      bars: 'gap-0.5'
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'spinner'
  }
})

type MotionLoaderProps = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'bars'
  className?: string
}

export default function MotionLoader({ size, variant, className }: MotionLoaderProps) {
  if (variant === 'dots') {
    return (
      <div className={cn(loaderVariants({ size, variant }), className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className={cn('bg-primary/80 rounded-full', {
              'h-2 w-2': size === 'sm',
              'h-3 w-3': size === 'md',
              'h-4 w-4': size === 'lg'
            })}
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'bars') {
    return (
      <div className={cn(loaderVariants({ size, variant }), className)}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className='bg-primary/80 rounded w-1'
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
            style={{
              height: size === 'sm' ? '8px' : size === 'md' ? '16px' : '24px'
            }}
          />
        ))}
      </div>
    )
  }

  // default spinner
  return (
    <motion.div
      className={cn(
        loaderVariants({ size, variant }),
        className,
        'rounded-full border-2 border-primary border-t-transparent'
      )}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
    />
  )
}
