'use client'

import { cn } from '@/lib/utils'

interface TransferStatusBadgeProps {
  status: TelegramTransferStatus | 'WAITING_PERIOD'
  className?: string
}

const statusConfig: Record<
  string,
  {
    label: string
    colors: string
  }
> = {
  PENDING: {
    label: 'Pending',
    colors:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30'
  },
  VERIFICATION_REQUIRED: {
    label: 'Pending Join',
    colors:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30'
  },
  CUSTOMER_JOINED: {
    label: 'Customer Joined',
    colors:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
  },
  TRANSFER_IN_PROGRESS: {
    label: 'Transferring',
    colors:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
  },
  COMPLETED: {
    label: 'Completed',
    colors:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30'
  },
  FAILED: {
    label: 'Failed',
    colors:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30'
  },
  WAITING_PERIOD: {
    label: 'Waiting Period',
    colors:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30'
  }
}

export function TransferStatusBadge({ status, className }: TransferStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.colors,
        className
      )}
    >
      {config.label}
    </span>
  )
}
