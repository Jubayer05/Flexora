import { Router } from 'express';
import * as settingController from '../../controllers/setting.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN SETTINGS MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/settings
 * @desc    Get all settings with pagination and search
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  settingController.getSettings
);

/**
 * @route   GET /api/admin/settings/key/:key
 * @desc    Get setting by key
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/key/:key',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  settingController.getSettingByKey
);

/**
 * @route   GET /api/admin/settings/keys/:keys
 * @desc    Get multiple settings by comma-separated keys
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/keys/:keys',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'INDEX'),
  settingController.getMultipleSettings
);

/**
 * @route   POST /api/admin/settings/bulk-items/:key
 * @desc    Add bulk items to array-type setting
 * @access  Admin/Moderator with CREATE permission
 */
router.post(
  '/bulk-items/:key',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  settingController.addBulkItems
);

/**
 * @route   POST /api/admin/settings/fake-feedbacks
 * @desc    Generate fake feedbacks using system names and reviews
 * @access  Admin only
 */
router.post(
  '/fake-feedbacks',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  settingController.createFakeFeedbacks
);

/**
 * @route   POST /api/admin/settings/bulk-restore
 * @desc    Bulk restore settings from backup array
 * @access  Admin/Moderator with CREATE permission
 */
router.post(
  '/bulk-restore',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  settingController.bulkRestoreSettings
);

/**
 * @route   POST /api/admin/settings/:key
 * @desc    Create or update setting by key (upsert)
 * @access  Admin/Moderator with CREATE/UPDATE permission
 */
router.post(
  '/:key',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  settingController.upsertSetting
);

/**
 * @route   DELETE /api/admin/settings/:key
 * @desc    Delete setting by key
 * @access  Admin/Moderator with DELETE permission
 */
router.delete(
  '/:key',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'DELETE'),
  settingController.deleteSetting
);

export default router;
