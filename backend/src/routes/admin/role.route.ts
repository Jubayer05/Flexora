import { Router } from 'express';
import * as roleController from '../../controllers/role.controller';
import {
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ROLE MANAGEMENT ROUTES (ADMIN ONLY)
// ================================

/**
 * @route   GET /api/admin/roles
 * @desc    Get all active roles with permissions
 * @access  Admin Only
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.getAllRoles
);

/**
 * @route   POST /api/admin/roles
 * @desc    Create new role with permissions
 * @access  Admin Only
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.createRole
);

/**
 * @route   PUT /api/admin/roles/:id
 * @desc    Update role and permissions
 * @access  Admin Only
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.updateRole
);

/**
 * @route   DELETE /api/admin/roles/:id
 * @desc    Delete role (soft delete)
 * @access  Admin Only
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.deleteRole
);

// ================================
// ROLE ASSIGNMENT ROUTES (ADMIN ONLY)
// ================================

/**
 * @route   POST /api/admin/roles/assign
 * @desc    Assign role to a moderator
 * @access  Admin Only
 */
router.post(
  '/assign',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.assignRoleToModerator
);

/**
 * @route   POST /api/admin/roles/remove
 * @desc    Remove role from moderator
 * @access  Admin Only
 */
router.post(
  '/remove',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.removeRoleFromModerator
);

/**
 * @route   GET /api/admin/roles/moderators
 * @desc    Get all moderators with their roles
 * @access  Admin Only
 */
router.get(
  '/moderators',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.getModeratorsWithRoles
);

/**
 * @route   GET /api/admin/roles/resources
 * @desc    Get all available resources for permissions
 * @access  Admin Only
 */
router.get(
  '/resources',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.getAllResources
);

/**
 * @route   GET /api/admin/roles/actions
 * @desc    Get all available actions for permissions
 * @access  Admin Only
 */
router.get(
  '/actions',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.getAllActions
);

/**
 * @route   GET /api/admin/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Admin Only
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminOnly,
  validateAdminSession,
  roleController.getRoleById
);

export default router;
