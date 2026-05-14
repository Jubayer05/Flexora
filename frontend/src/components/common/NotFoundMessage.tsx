'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Frown, Info, SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import * as React from 'react'
import { Typography } from './typography'

// Icon per variant
const ICONS = {
  formal: Info,
  short: SearchX,
  friendly: Frown
} as const

const wrapperVariants = cva('mx-auto rounded-2xl w-full max-w-2xl', {
  variants: {
    tone: {
      formal: 'bg-background/40 border border-border/60 backdrop-blur-sm p-6',
      short: 'bg-transparent p-4',
      friendly: 'bg-muted/40 border border-border/60 backdrop-blur-sm shadow-sm p-6'
    },
    align: {
      center: 'flex items-center justify-center',
      left: ''
    }
  },
  defaultVariants: {
    tone: 'formal',
    align: 'center'
  }
})

type NotFoundMessageProps = {
  variant?: 'formal' | 'short' | 'friendly'
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  ctaLabel?: string
  retryHref?: string
  onRetry?: () => void
  actions?: React.ReactNode
  className?: string
} & VariantProps<typeof wrapperVariants>

export function NotFoundMessage({
  variant = 'formal',
  title,
  description,
  icon,
  ctaLabel,
  retryHref,
  onRetry,
  actions,
  className,
  align,
  ...rest
}: NotFoundMessageProps) {
  // const t = useTranslations('NotFound')
  const Icon = ICONS[variant] ?? Info

  // Localized defaults
  const defaults = {
    title: title,
    desc: description,
    cta: ctaLabel
  }

  const resolvedTitle = title ?? defaults.title
  const resolvedDesc = description ?? defaults.desc
  const resolvedCta = ctaLabel ?? defaults.cta

  return (
    <div className={cn(wrapperVariants({ tone: variant, align }), className)} {...rest}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className='flex flex-col items-center gap-4 text-center'>
          {icon ?? <Icon size={44} strokeWidth={1.2} aria-hidden className='text-destructive' />}
          <Typography variant='h5'>{resolvedTitle}</Typography>

          {resolvedDesc && (
            <Typography className='text-muted-foreground text-sm text-center leading-relaxed'>
              {resolvedDesc}
            </Typography>
          )}

          <div className='flex flex-wrap items-center gap-2 mt-4'>
            {retryHref ? (
              <Button asChild>
                <Link href={retryHref}>{resolvedCta}</Link>
              </Button>
            ) : onRetry ? (
              <Button onClick={onRetry}>{resolvedCta}</Button>
            ) : null}
            {actions}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
