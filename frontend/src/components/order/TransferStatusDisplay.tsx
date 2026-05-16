'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TransferStatusDisplayProps {
  transfer: {
    id: number
    status: string
    failureReason?: string | null
  }
  productName?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground border-border'
  },
  VERIFICATION_REQUIRED: {
    label: 'Verification Required',
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400'
  },
  CUSTOMER_JOINED: {
    label: 'Customer Joined',
    className: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400'
  },
  TRANSFER_IN_PROGRESS: {
    label: 'Transfer In Progress',
    className: 'bg-primary/10 text-primary border-primary/30'
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/30'
  }
}

export default function TransferStatusDisplay({ transfer, productName }: TransferStatusDisplayProps) {
  const config = statusConfig[transfer.status] || statusConfig.PENDING

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <Badge variant='outline' className={cn('font-normal', config.className)}>
          {config.label}
        </Badge>
        <span className='text-xs text-muted-foreground'>Transfer #{transfer.id}</span>
      </div>

      {productName ? <p className='text-sm text-muted-foreground'>{productName}</p> : null}

      {transfer.failureReason ? (
        <div className='rounded-lg border border-destructive/30 bg-destructive/10 p-3'>
          <p className='text-xs text-destructive'>{transfer.failureReason}</p>
        </div>
      ) : null}
    </div>
  )
}
