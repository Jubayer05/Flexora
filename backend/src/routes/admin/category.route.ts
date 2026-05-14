import { Router } from 'express';
import * as categoryController from '../../controllers/category.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN CATEGORIES MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories with pagination and filters (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_CATEGORY permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'INDEX'),
  categoryController.getCategories
);

/**
 * @route   GET /api/admin/categories/tree
 * @desc    Get category tree structure (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_CATEGORY permission
 */
router.get(
  '/tree',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'INDEX'),
  categoryController.getCategoryTree
);

/**
 * @route   GET /api/admin/categories/trash
 * @desc    Get soft-deleted categories + related deleted groups/products (for admin UI)
 * @access  Admin/Moderator with INDEX_CATEGORY permission
 */
router.get(
  '/trash',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'INDEX'),
  categoryController.getTrashedCatalogForCategoriesPage
);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get category by ID (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_CATEGORY permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'INDEX'),
  categoryController.getCategory
);

/**
 * @route   POST /api/admin/categories
 * @desc    Create new category (admin/moderator with permission)
 * @access  Admin/Moderator with CREATE_CATEGORY permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'CREATE'),
  categoryController.createCategory
);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update category by ID (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete category by ID (admin/moderator with permission)
 * @access  Admin/Moderator with DELETE_CATEGORY permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'DELETE'),
  categoryController.deleteCategory
);

/**
 * @route   POST /api/admin/categories/:id/restore
 * @desc    Restore a soft-deleted category
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.post(
  '/:id/restore',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.restoreCategory
);

/**
 * @route   DELETE /api/admin/categories/:id/permanent
 * @desc    Permanently delete category (cascade groups/products)
 * @access  Admin/Moderator with DELETE_CATEGORY permission
 */
router.delete(
  '/:id/permanent',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'DELETE'),
  categoryController.permanentDeleteCategory
);

/**
 * @route   POST /api/admin/categories/bulk-update
 * @desc    Bulk update categories (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.post(
  '/bulk-update',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.bulkUpdateCategories
);

/**
 * @route   POST /api/admin/categories/bulk-delete
 * @desc    Bulk delete categories (admin/moderator with permission)
 * @access  Admin/Moderator with DELETE_CATEGORY permission
 */
router.post(
  '/bulk-delete',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'DELETE'),
  categoryController.bulkDeleteCategories
);

/**
 * @route   POST /api/admin/categories/sort-order
 * @desc    Update category sort order (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.post(
  '/sort-order',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.updateCategorySortOrder
);

/**
 * @route   PATCH /api/admin/categories/:id/reorder
 * @desc    Reorder category by drag & drop (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.patch(
  '/:id/reorder',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.reorderCategory
);

/**
 * @route   POST /api/admin/categories/:id/move
 * @desc    Move category to different parent (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_CATEGORY permission
 */
router.post(
  '/:id/move',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('CATEGORIES', 'UPDATE'),
  categoryController.moveCategory
);

export default router;
