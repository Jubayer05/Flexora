'use client'

import { useCallback, useState } from 'react'

export interface Notification {
  id: number
  title: string
  message: string
  time: string
  unread: boolean
  type?: 'info' | 'success' | 'warning' | 'error'
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'New user registration',
      message: 'John Doe has registered as a new user',
      time: '2 min ago',
      unread: true,
      type: 'info'
    },
    {
      id: 2,
      title: 'System update completed',
      message: 'The system has been successfully updated to version 2.1.0',
      time: '1 hour ago',
      unread: true,
      type: 'success'
    },
    {
      id: 3,
      title: 'Payment received',
      message: 'Payment of $299.99 has been received from client ABC Corp',
      time: '3 hours ago',
      unread: false,
      type: 'success'
    },
    {
      id: 4,
      title: 'Server maintenance',
      message: 'Scheduled maintenance will begin at 2:00 AM UTC',
      time: '5 hours ago',
      unread: false,
      type: 'warning'
    }
  ])

  const unreadCount = notifications.filter((n) => n.unread).length

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })))
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now() // Simple ID generation
    }
    setNotifications((prev) => [newNotification, ...prev])
  }, [])

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  }
}
