import { Router } from 'express';
import {
  cleanupNotifications,
  getNotifications,
  markNotificationsAsRead,
} from '../../controllers/notification.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

/**
 * @description Customer notification routes
 * @path /api/v1/customer/notifications
 */

// ================================
// NOTIFICATION ROUTES
// ================================

/**
 * @route GET /notifications
 * @description Get all notifications for authenticated user with filtering and pagination
 * @access Customer (authenticated only)
 * @middleware authMiddleware - requires authentication
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query type - Filter by notification type (ORDER, PAYMENT, RESTOCK, SYSTEM, PROMOTION, OTHERS)
 * @query role - Filter by role (ADMIN, CUSTOMER, GUEST, MODERATOR)
 * @query isRead - Filter by read status (true/false)
 * @query sortBy - Sort field (createdAt, updatedAt, type) - default: createdAt
 * @query sortOrder - Sort order (asc, desc) - default: desc
 */
router.get('/', authMiddleware, getNotifications);

// Mark notifications as read
router.post('/read', authMiddleware, markNotificationsAsRead);

// Cleanup old notifications
router.delete('/cleanup', authMiddleware, cleanupNotifications);

export default router;
