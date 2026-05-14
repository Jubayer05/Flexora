'use client'

import useAsync from '@/hooks/useAsync'
import type { ActiveSubscription } from '@/types/subscription'
import Cookies from 'js-cookie'
import { useMemo } from 'react'

type ActiveSubscriptionResponse = {
  success: boolean
  data: ActiveSubscription | null
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function formatSubscriptionTimeRemaining(endDate?: string | null) {
  if (!endDate) return ''

  const remainingMs = new Date(endDate).getTime() - Date.now()
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Expired'

  const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days <= 0) return `${hours}h remaining`
  if (hours === 0) return `${days}d remaining`
  return `${days}d ${hours}h remaining`
}

export function useActiveSubscriptionDiscount(subtotal: number) {
  const isLoggedIn = typeof window !== 'undefined' && Boolean(Cookies.get('token'))

  const { data, loading, mutate } = useAsync<ActiveSubscriptionResponse>(
    isLoggedIn ? () => '/customer/subscriptions/active' : null
  )

  const activeSubscription = data?.data || null
  const subscriptionDiscountPercent = Number(activeSubscription?.package?.discount || 0)
  const subscriptionDiscountAmount = useMemo(
    () =>
      activeSubscription && subscriptionDiscountPercent > 0 && subtotal > 0
        ? roundMoney((subtotal * subscriptionDiscountPercent) / 100)
        : 0,
    [activeSubscription, subtotal, subscriptionDiscountPercent]
  )

  return {
    activeSubscription,
    loading,
    mutate,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays: Number(activeSubscription?.package?.duration || 30),
    subscriptionRemainingLabel: formatSubscriptionTimeRemaining(activeSubscription?.endDate)
  }
}
