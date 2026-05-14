import { Router } from 'express';
import * as userController from '../../controllers/user.controller';
import { profileImageUpload } from '../../libs/multer';
import {
  authMiddleware,
  requireOwnershipOrAdmin,
  validateActiveSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// CUSTOMER PROFILE OPERATIONS
// ================================

/**
 * @route   GET /api/customer/profile
 * @desc    Get current user profile
 * @access  Customer Authentication Required
 */
router.get('/profile', authMiddleware, validateActiveSession, userController.getProfile);

/**
 * @route   PUT /api/customer/profile
 * @desc    Update current user profile
 * @access  Customer Authentication Required
 */
router.put('/profile', authMiddleware, validateActiveSession, userController.updateProfile);

/**
 * @route   POST /api/customer/profile/upload-image
 * @desc    Upload profile image to R2 (profileImage folder). Returns public URL.
 * @access  Customer Authentication Required
 */
router.post(
  '/profile/upload-image',
  authMiddleware,
  validateActiveSession,
  profileImageUpload.single('file'),
  userController.uploadProfileImage
);

/**
 * @route   POST /api/customer/users/change-password
 * @desc    Change user password
 * @access  Customer Authentication Required
 */
router.post(
  '/change-password',
  authMiddleware,
  validateActiveSession,
  userController.changePassword
);

/**
 * @route   POST /api/customer/users/convert-guest
 * @desc    Convert guest account to registered account
 * @access  Customer Authentication Required (Guest users only)
 */
router.post(
  '/convert-guest',
  authMiddleware,
  validateActiveSession,
  userController.convertGuestToRegistered
);

/**
 * @route   GET /api/customer/users/:id
 * @desc    Get user by ID (ownership or admin required)
 * @access  Customer Authentication Required (own data or admin)
 */
router.get(
  '/:id',
  authMiddleware,
  validateActiveSession,
  requireOwnershipOrAdmin(),
  userController.getUser
);

export default router;
