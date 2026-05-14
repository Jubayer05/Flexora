'use client'

import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { CustomerNotification } from '@/types/notification'
import { useCallback } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import Cookies from 'js-cookie'

interface NotificationResponse {
  success: boolean
  data: {
    notifications: CustomerNotification[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    unreadCount: number
  }
  message: string
}

const NOTIFICATIONS_URL =
  '/customer/notifications?page=1&limit=10&isRead=false&sortBy=createdAt&sortOrder=desc'

export function useCustomerNotifications() {
  const token = Cookies.get('token')

  const fetcher = useCallback(async (url: string): Promise<NotificationResponse> => {
    return await requests.get<NotificationResponse>(url)
  }, [])

  // Only fetch when user is logged in (has token). Avoids 401 and console errors for guests.
  const { data, error, isLoading, mutate } = useSWR<NotificationResponse>(
    token ? NOTIFICATIONS_URL : null,
    fetcher,
    {
      refreshInterval: token ? 15000 : 0, // Refresh every 15s only when logged in
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false
    }
  )

  const notifications = data?.data?.notifications || []
  const unreadCount = data?.data?.unreadCount || 0

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        await requests.post('/customer/notifications/read', {
          notificationId
        })
        mutate() // Refresh the list
      } catch (error) {
        showError(error)
      }
    },
    [mutate]
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await requests.post('/customer/notifications/read', {
        // Empty body marks all as read
      })
      toast.success('All notifications marked as read')
      mutate() // Refresh the list
    } catch (error) {
      showError(error)
    }
  }, [mutate])

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: mutate
  }
}
