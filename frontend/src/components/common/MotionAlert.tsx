'use client'

import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'

const alertVariants = cva('flex items-start gap-3 p-4 border rounded-lg min-w-xs', {
  variants: {
    type: {
      error: 'bg-red-50 border-red-200 text-red-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    size: {
      sm: 'p-2 text-sm',
      md: 'p-4 text-base'
    }
  },
  defaultVariants: {
    type: 'info',
    size: 'md'
  }
})

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle
} as const

export type MotionAlertProps = React.PropsWithChildren<{
  type?: keyof typeof iconMap
  message?: React.ReactNode
  description?: React.ReactNode
  showIcon?: boolean
  closable?: boolean
  onClose?: () => void
  className?: string
  size?: VariantProps<typeof alertVariants>['size']
  // control visibility externally
  open?: boolean
  // auto close after ms (optional)
  duration?: number | null
}>

export default function MotionAlert({
  type = 'error',
  message,
  description,
  showIcon = true,
  closable = false,
  onClose,
  className,
  size = 'md',
  open = true,
  duration = null,
  children
}: MotionAlertProps) {
  const Icon = iconMap[type] ?? Info
  const [isOpen, setIsOpen] = React.useState(Boolean(open))

  React.useEffect(() => {
    setIsOpen(Boolean(open))
  }, [open])

  // Auto close if duration supplied
  React.useEffect(() => {
    if (!isOpen || !duration) return
    const t = setTimeout(() => {
      setIsOpen(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(t)
  }, [isOpen, duration, onClose])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
    onClose?.()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          role='alert'
          aria-live='assertive'
          className={cn(alertVariants({ type, size }), className)}
        >
          {showIcon && (
            <span className='shrink-0'>
              <Icon size={28} strokeWidth={1.2} aria-hidden />
            </span>
          )}

          <div className='flex-1 min-w-0'>
            {message ? <div className='font-medium truncate'>{message}</div> : null}
            {description || children ? (
              <div className='opacity-90 mt-1 text-sm'>{description ?? children}</div>
            ) : null}
          </div>

          {closable && (
            <button
              type='button'
              onClick={handleClose}
              aria-label='Close'
              className='inline-flex justify-center items-center hover:bg-accent ml-3 rounded-md w-7 h-7'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
