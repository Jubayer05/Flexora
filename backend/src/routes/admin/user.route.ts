import { Router } from 'express'
import * as userController from '../../controllers/user.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requireAdminOnly,
  validateAdminSession
} from '../../middlewares/auth'
import { UserService } from '../../services/user.services'

const router = Router()

const userService = new UserService()

// ================================
// ADMIN USER CRUD OPERATIONS
// ================================

/**
 * @route   POST /api/admin/users
 * @desc    Create new user (admin only)
 * @access  Admin Only
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.createUser
)

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user by ID (admin only)
 * @access  Admin Only
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.updateUser
)

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user by ID (admin only)
 * @access  Admin Only
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.deleteUser
)

// ================================
// ADMIN BULK OPERATIONS
// ================================

/**
 * @route   POST /api/admin/users/bulk-update
 * @desc    Bulk update users (admin only)
 * @access  Admin Only
 */
router.post(
  '/bulk-update',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.bulkUpdateUsers
)

/**
 * @route   POST /api/admin/users/bulk-delete
 * @desc    Bulk delete users (admin only)
 * @access  Admin Only
 */
router.post(
  '/bulk-delete',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.bulkDeleteUsers
)

// ================================
// ADMIN USER MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters (admin only)
 * @access  Admin Only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  userController.getUsers
)

router.post('/update-user', async (req, res) => {
  // try {
  //   const result = await userService.findMany({ limit: 1000 });
  //   for (const user of result.users) {
  //     const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  //     await userService.update(user.id, { lastName: undefined });
  //   }
  //   res.json({ success: true, message: 'User names updated successfully' });
  // } catch (error) {
  //   console.error('Error updating user names:', error);
  //   res.status(500).json({ success: false, message: 'Internal server error' });
  // }
})

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Admin Only
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  userController.getUser
)

/**
 * @route   POST /api/admin/users/:id/ban
 * @desc    Ban user by ID (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/ban',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.banUser
)

/**
 * @route   POST /api/admin/users/:id/unban
 * @desc    Unban user by ID (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/unban',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.unbanUser
)

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user analytics and statistics (admin only)
 * @access  Admin Only
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  userController.getUserStats
)

/**
 * @route   POST /api/admin/users/:id/verify-email
 * @desc    Verify user email (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/verify-email',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.verifyUserEmail
)

/**
 * @route   POST /api/admin/users/:id/set-password
 * @desc    Set user password (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/set-password',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.setUserPassword
)

/**
 * @route   POST /api/admin/users/:id/update-rank
 * @desc    Update user rank (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/update-rank',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  userController.updateUserRank
)

/**
 * @route   POST /api/admin/users/:id/send-email
 * @desc    Send email to customer (admin only)
 * @access  Admin Only
 */
router.post(
  '/:id/send-email',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  userController.sendEmailToCustomer
)

export default router
