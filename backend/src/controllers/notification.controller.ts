import type { NotificationType, UserRole } from '@prisma/client'
import type { NextFunction, Response } from 'express'
import db from '../configs/db'
import { NotificationService } from '../services/notification.service'
import type { AuthRequest } from '../types/req-res'
import { handleControllerError, sendErrorResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import {
  CreateNotificationSchema,
  GroupNotificationPreviewSchema,
  NotificationQuerySchema,
  SendGroupNotificationSchema
} from '../validations/zod/notification.schema'

const notificationService = new NotificationService()

/**
 * Internal endpoint for external services to send notifications
 * Used by Python service, payment gateways, etc.
 */
export const receiveNotification = async (req: any, res: Response) => {
  try {
    const { customer_id, type, title, message, attachments } = req.body

    if (!customer_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_id, message'
      })
    }

    // Map the notification type to Prisma enum
    let notificationType: NotificationType = 'SYSTEM'
    let notificationTitle = title || 'Notification'

    switch (type) {
      case 'telegram_otp':
        notificationType = 'SYSTEM'
        notificationTitle = title || 'Telegram Login Code'
        break
      case 'payment_confirmed':
        notificationType = 'PAYMENT'
        notificationTitle = title || 'Payment Confirmed'
        break
      case 'order_completed':
        notificationType = 'ORDER'
        notificationTitle = title || 'Order Completed'
        break
      case 'product_restock':
        notificationType = 'RESTOCK'
        notificationTitle = title || 'Product Back in Stock'
        break
      case 'system_maintenance':
        notificationType = 'SYSTEM'
        notificationTitle = title || 'System Notification'
        break
      default:
        notificationType = 'OTHERS'
        notificationTitle = title || 'Notification'
    }

    // Create notification using the proper service
    const notification = await notificationService.create({
      userId: customer_id,
      type: notificationType,
      title: notificationTitle,
      message,
      attachments: attachments || [],
      meta: {
        notificationType: type,
        source: 'external_service',
        createdVia: 'api'
      }
    })

    console.log(
      `📢 Created notification ${notification.id} for customer ${customer_id}: ${message}`
    )

    return res.json({
      success: true,
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    })
  }
}

/**
 * Get notifications with optional filtering and pagination
 */
export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const currentUserId = req.user?.userId
    const userRole = req.user?.role

    if (!currentUserId || !userRole) {
      return sendErrorResponse(res, 'Authentication required to view notifications', 401)
    }

    // Validate and parse query parameters
    const validation = NotificationQuerySchema.safeParse(req.query)

    if (!validation.success) {
      return sendErrorResponse(res, 'Invalid query parameters', 400, validation.error.issues)
    }

    const { page, limit, type, role, isRead, sortBy, sortOrder, userId } = validation.data

    // Determine which user's notifications to fetch
    // Admin can view any user's notifications via userId query param
    // Regular users can only view their own
    const targetUserId =
      userRole === 'ADMIN' || userRole === 'MODERATOR' ? userId || currentUserId : currentUserId

    // Fetch target user to get their createdAt timestamp
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, createdAt: true }
    })

    if (!targetUser) {
      return sendErrorResponse(res, 'User not found', 404)
    }

    // Determine the role to use for broadcast filtering
    // If admin is viewing another user's notifications, use that user's actual role
    let targetUserRole = targetUser.role
    if (targetUserId === currentUserId) {
      targetUserRole = userRole
    }

    // Get notifications with pagination (includes personal + broadcast)
    const result = await notificationService.findByUserId({
      userId: targetUserId,
      userRole: targetUserRole,
      userCreatedAt: targetUser.createdAt,
      type,
      role,
      isRead,
      page,
      limit,
      sortBy,
      sortOrder
    })

    return sendSuccessResponse(
      res,
      {
        notifications: result.notifications,
        pagination: result.pagination,
        unreadCount: result.unreadCount
      },
      'Notifications retrieved successfully'
    )
  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error)
    return handleControllerError(res, error, 'Failed to fetch notifications')
  }
}

/**
 * Mark notifications as read (with user isolation)
 */
export const markNotificationsAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId
    const userRole = req.user?.role
    const { notificationId, notificationIds } = req.body

    if (!userId) {
      return sendErrorResponse(res, 'Authentication required', 401)
    }

    let result
    let message

    if (notificationId) {
      // Mark single notification as read (with user verification)
      result = await notificationService.markAsRead(notificationId, userId)
      message = 'Notification marked as read'
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark multiple notifications as read (with user verification)
      result = await notificationService.markMultipleAsRead(notificationIds, userId)
      message = `${result.count} notifications marked as read`
    } else {
      // Mark all notifications as read for this user (personal + broadcast)
      result = await notificationService.markAllAsRead(userId, userRole)
      message = `${result.count} notifications marked as read`
    }

    console.log(`📖 User ${userId}: ${message}`)

    return sendSuccessResponse(res, null, message)
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return next(error)
  }
}

/**
 * Create a new notification (for admin use or manual testing)
 */
export const createNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId

    // Validate request body
    const validation = CreateNotificationSchema.safeParse(req.body)

    if (!validation.success) {
      return sendErrorResponse(res, 'Invalid notification data', 400, validation.error.issues)
    }

    const { type, title, message, attachments, role, userId: targetUserId } = validation.data

    const notificationType: NotificationType = type
    const targetRole: UserRole = role

    // Determine if this is a broadcast or personal notification
    // If targetUserId is provided and admin, send to specific user
    // Otherwise, send as broadcast (userId = null)
    let notificationUserId: number | null = null
    let isBroadcast = true

    if (targetUserId && (req.user?.role === 'ADMIN' || req.user?.role === 'MODERATOR')) {
      notificationUserId = targetUserId
      isBroadcast = false
    }

    const notification = await notificationService.create({
      userId: notificationUserId,
      type: notificationType,
      title,
      message,
      attachments: attachments || [],
      role: targetRole
    })

    return sendSuccessResponse(
      res,
      {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        role: notification.role,
        isBroadcast,
        createdAt: notification.createdAt
      },
      `Notification ${isBroadcast ? 'broadcast' : 'sent'} successfully`
    )
  } catch (error) {
    console.error('Error creating notification:', error)
    return next(error)
  }
}

export const getGroupNotificationStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const stats = await notificationService.getGroupNotificationStats()

    return sendSuccessResponse(res, stats, 'Group notification stats retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const previewGroupNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validation = GroupNotificationPreviewSchema.safeParse(req.body)

    if (!validation.success) {
      return sendErrorResponse(res, 'Invalid group notification filters', 400, validation.error.issues)
    }

    const preview = await notificationService.previewGroupNotificationRecipients(
      validation.data.targetUsers,
      validation.data.customFilters
    )

    return sendSuccessResponse(res, preview, 'Group notification preview retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const sendGroupNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validation = SendGroupNotificationSchema.safeParse(req.body)

    if (!validation.success) {
      return sendErrorResponse(res, 'Invalid group notification data', 400, validation.error.issues)
    }

    const result = await notificationService.sendGroupNotification(validation.data)

    return sendSuccessResponse(
      res,
      result,
      `Group notification sent successfully to ${result.dashboardCreated} dashboard user(s).`
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Delete a single notification
 */
export const deleteNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId
    const userRole = req.user?.role
    const notificationId = parseInt(req.params.id || '')

    if (!userId) {
      return sendErrorResponse(res, 'Authentication required', 401)
    }

    if (!notificationId || isNaN(notificationId)) {
      return sendErrorResponse(res, 'Invalid notification ID', 400)
    }

    // Admin can delete any notification, regular users can only delete their own
    await notificationService.deleteById(
      notificationId,
      userRole === 'ADMIN' || userRole === 'MODERATOR' ? undefined : userId
    )

    console.log(`🗑️ Notification ${notificationId} deleted by user ${userId}`)

    return sendSuccessResponse(res, { id: notificationId }, 'Notification deleted successfully')
  } catch (error) {
    console.error('Error deleting notification:', error)
    return next(error)
  }
}

/**
 * Delete old notifications (cleanup endpoint with user isolation)
 */
export const cleanupNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = req.user?.userId
    const olderThanDays = Math.min(parseInt(req.query.days as string) || 30, 365) // Max 365 days

    if (!userId) {
      return sendErrorResponse(res, 'Authentication required', 401)
    }

    // For user cleanup, only clean their own notifications
    // Admin could cleanup system-wide in the future
    const result = await notificationService.cleanupOldNotifications(olderThanDays)

    console.log(`🧹 User ${userId} cleaned up ${result.deleted} old notifications`)

    return sendSuccessResponse(
      res,
      {
        deleted: result.deleted,
        cutoffDate: result.cutoffDate,
        olderThanDays
      },
      `Cleaned up ${result.deleted} old notifications`
    )
  } catch (error) {
    console.error(`Error cleaning up notifications for user ${req.user?.userId}:`, error)
    return next(error)
  }
}
