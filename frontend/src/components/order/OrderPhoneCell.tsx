'use client'

import useAsync from '@/hooks/useAsync'
import { Loader2 } from 'lucide-react'

interface OrderPhoneCellProps {
  orderId: number
  isTelegramAccount: boolean
  isDelivered: boolean
}

/**
 * Fetches and displays phone number for Telegram account orders.
 * Only fetches when order is a delivered Telegram account order.
 */
export function OrderPhoneCell({
  orderId,
  isTelegramAccount,
  isDelivered
}: OrderPhoneCellProps) {
  const { data, loading } = useAsync<{
    success: boolean
    accounts?: Array<{ phoneNumber?: string; phone?: string }>
  }>(
    () => {
      if (!isTelegramAccount || !isDelivered) return null
      return `/customer/orders/${orderId}/telegram-accounts`
    },
    false,
    false
  )

  if (!isTelegramAccount) {
    return <span className='text-card-foreground/60 text-sm'>—</span>
  }

  if (!isDelivered) {
    return <span className='text-card-foreground/60 text-sm'>Pending</span>
  }

  if (loading) {
    return (
      <span className='inline-flex items-center gap-1 text-card-foreground/60 text-sm'>
        <Loader2 className='h-3 w-3 animate-spin' /> Loading...
      </span>
    )
  }

  const accounts = data?.accounts || []
  const firstPhone =
    accounts[0]?.phoneNumber || accounts[0]?.phone

  if (!firstPhone) {
    return <span className='text-card-foreground/60 text-sm'>—</span>
  }

  const display =
    accounts.length > 1
      ? `${firstPhone} (+${accounts.length - 1} more)`
      : firstPhone

  return (
    <span className='font-mono text-sm text-card-foreground' title={display}>
      {display}
    </span>
  )
}
