import { Router } from 'express';
import {
  cleanupNotifications,
  createNotification,
  deleteNotification,
  getGroupNotificationStats,
  getNotifications,
  markNotificationsAsRead,
  previewGroupNotifications,
  sendGroupNotifications,
} from '../../controllers/notification.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

/**
 * @description Admin notification routes
 * @path /api/admin/notifications
 */

// ================================
// NOTIFICATION MANAGEMENT ROUTES
// ================================

/**
 * @route GET /api/admin/notifications
 * @description Get all notifications with filtering and pagination
 * @access Admin/Moderator with INDEX permission
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query userId - Filter by user ID
 * @query type - Filter by notification type (ORDER, PAYMENT, RESTOCK, SYSTEM, PROMOTION, OTHERS)
 * @query role - Filter by role (ADMIN, CUSTOMER, GUEST, MODERATOR)
 * @query isRead - Filter by read status (true/false)
 * @query sortBy - Sort field (createdAt, updatedAt, type) - default: createdAt
 * @query sortOrder - Sort order (asc, desc) - default: desc
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  getNotifications
);

/**
 * @route POST /api/admin/notifications
 * @description Create a new notification (manual/broadcast)
 * @access Admin/Moderator with CREATE permission
 * @body targetUserId - Target user ID (optional, current user if not specified)
 * @body type - Notification type (ORDER, PAYMENT, RESTOCK, SYSTEM, PROMOTION, OTHERS)
 * @body title - Notification title
 * @body message - Notification message
 * @body attachments - Array of attachment URLs (optional)
 * @body role - Target role (ADMIN, CUSTOMER, GUEST, MODERATOR)
 * @body meta - Additional metadata (optional)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'CREATE'),
  createNotification
);

router.get(
  '/group-stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  getGroupNotificationStats
);

router.post(
  '/group-preview',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  previewGroupNotifications
);

router.post(
  '/send-group',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'CREATE'),
  sendGroupNotifications
);

/**
 * @route POST /api/admin/notifications/read
 * @description Mark notifications as read
 * @access Admin/Moderator with UPDATE permission
 * @body notificationId - Single notification ID to mark as read (optional)
 * @body notificationIds - Array of notification IDs to mark as read (optional)
 * @note If neither provided, marks all user's notifications as read
 */
router.post(
  '/read',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'UPDATE'),
  markNotificationsAsRead
);

/**
 * @route DELETE /api/admin/notifications/:id
 * @description Delete a single notification
 * @access Admin/Moderator with DELETE permission
 * @param id - Notification ID
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'DELETE'),
  deleteNotification
);

/**
 * @route DELETE /api/admin/notifications/cleanup
 * @description Clean up old read notifications
 * @access Admin/Moderator with DELETE permission
 * @query days - Number of days old to delete (default: 30, max: 365)
 */
router.delete(
  '/cleanup',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'DELETE'),
  cleanupNotifications
);

export default router;
