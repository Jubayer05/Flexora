'use client'

import { cn } from '@/lib/utils'

type TransferStatus = string

interface TransferStatusBadgeProps {
  status: TransferStatus
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-surface-container text-on-surface-variant border-outline-variant'
  },
  VERIFICATION_REQUIRED: {
    label: 'Verification Required',
    className: 'bg-secondary-container text-on-secondary-container border-secondary'
  },
  CUSTOMER_JOINED: {
    label: 'Customer Joined',
    className: 'bg-tertiary-container text-on-tertiary-container border-tertiary'
  },
  TRANSFER_IN_PROGRESS: {
    label: 'Transfer In Progress',
    className: 'bg-primary-container text-on-primary-container border-primary'
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-tertiary-container text-on-tertiary-container border-tertiary'
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-error-container text-on-error border-error'
  },
  WAITING_PERIOD: {
    label: 'Waiting Period',
    className: 'bg-secondary-container text-on-secondary-container border-secondary'
  }
}

interface TransferStatusBadgeProps {
  status: string
  className?: string
}

export function TransferStatusBadge({ status, className }: TransferStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-surface-container text-on-surface-variant border-outline-variant'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border-l-2',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}