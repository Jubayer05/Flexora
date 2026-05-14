import { Router } from 'express';
import * as productGroupController from '../../controllers/product-group.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// PRODUCT GROUPS MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/product-groups/all
 * @desc    Get all product groups (simple list for dropdowns)
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/all',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productGroupController.getAllProductGroups
);

/**
 * @route   GET /api/admin/product-groups
 * @desc    Get all product groups with pagination and filters
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productGroupController.getProductGroups
);

/**
 * @route   GET /api/admin/product-groups/trash
 * @desc    Get soft-deleted product groups
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/trash',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productGroupController.getTrashedProductGroups
);

/**
 * @route   GET /api/admin/product-groups/:id
 * @desc    Get product group by ID
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productGroupController.getProductGroup
);

/**
 * @route   POST /api/admin/product-groups
 * @desc    Create new product group
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  productGroupController.createProductGroup
);

/**
 * @route   PUT /api/admin/product-groups/:id
 * @desc    Update product group by ID
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productGroupController.updateProductGroup
);

/**
 * @route   PATCH /api/admin/product-groups/:id/reorder
 * @desc    Reorder product group (drag & drop)
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.patch(
  '/:id/reorder',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productGroupController.reorderProductGroup
);

/**
 * @route   DELETE /api/admin/product-groups/:id
 * @desc    Delete product group by ID
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  productGroupController.deleteProductGroup
);

/**
 * @route   POST /api/admin/product-groups/:id/restore
 * @desc    Restore a soft-deleted product group
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.post(
  '/:id/restore',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productGroupController.restoreProductGroup
);

/**
 * @route   DELETE /api/admin/product-groups/:id/permanent
 * @desc    Permanently delete a product group (cascade products)
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.delete(
  '/:id/permanent',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  productGroupController.permanentDeleteProductGroup
);

export default router;
