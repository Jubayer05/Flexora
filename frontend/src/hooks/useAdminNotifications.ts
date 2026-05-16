'use client'

import { usePermissions } from '@/components/providers/PermissionProvider'
import { useMounted } from '@/hooks/useMounted'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { AdminNotification } from '@/types/notification'
import Cookies from 'js-cookie'
import { useCallback } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

interface NotificationResponse {
  success: boolean
  data: {
    notifications: AdminNotification[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
    unreadCount: number
  }
  message: string
}

const NOTIFICATION_SWR_KEY =
  '/admin/notifications?page=1&limit=10&role=ADMIN&isRead=false&sortBy=createdAt&sortOrder=desc'

export function useAdminNotifications() {
  const mounted = useMounted()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const canViewNotifications = hasPermission('notifications', 'index')
  const hasAdminToken = mounted && !!Cookies.get('adminToken')

  const fetcher = useCallback(async (url: string): Promise<NotificationResponse> => {
    return await requests.get<NotificationResponse>(url, { silentError: true } as Parameters<typeof requests.get>[1])
  }, [])

  // Only fetch when admin session + permission are ready
  const enabled =
    !permissionsLoading && canViewNotifications && hasAdminToken

  const { data, error, isLoading, mutate } = useSWR<NotificationResponse>(
    enabled ? NOTIFICATION_SWR_KEY : null,
    fetcher,
    {
      refreshInterval: enabled ? 10000 : 0, // Refresh every 10 seconds only when enabled
      revalidateIfStale: true,
      revalidateOnFocus: false,
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
        await requests.post('/admin/notifications/read', {
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
      await requests.post('/admin/notifications/read', {
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
