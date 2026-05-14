import { Router } from 'express';
import * as productController from '../../controllers/product.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN PRODUCTS MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/products/generate-sku
 * @desc    Generate a unique SKU for new product
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.get(
  '/generate-sku',
  adminAuthMiddleware,
  requireAdminAuth,
  productController.generateUniqueSku
);

/**
 * @route   GET /api/admin/products/filter
 * @desc    Get products by categories and/or groups (no pagination)
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/filter',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productController.getProductsByFilter
);

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with pagination and filters (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productController.getProducts
);

/**
 * @route   GET /api/admin/products/trash
 * @desc    Get soft-deleted products
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/trash',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productController.getTrashedProducts
);

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get product by ID (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productController.getProduct
);

/**
 * @route   POST /api/admin/products
 * @desc    Create new product (admin/moderator with permission)
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  productController.createProduct
);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update product by ID (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productController.updateProduct
);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete product by ID (admin/moderator with permission)
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  productController.deleteProduct
);

/**
 * @route   POST /api/admin/products/:id/restore
 * @desc    Restore a soft-deleted product
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.post(
  '/:id/restore',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productController.restoreProduct
);

/**
 * @route   DELETE /api/admin/products/:id/permanent
 * @desc    Permanently delete a product (or remove from catalog if ordered)
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.delete(
  '/:id/permanent',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  productController.permanentDeleteProduct
);

/**
 * @route   POST /api/admin/products/import
 * @desc    Import products (admin/moderator with permission)
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/import',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  productController.importProducts
);

/**
 * @route   POST /api/admin/products/bulk-update
 * @desc    Bulk update products (admin/moderator with permission)
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.post(
  '/bulk-update',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productController.bulkUpdateProducts
);

/**
 * @route   POST /api/admin/products/bulk-delete
 * @desc    Bulk delete products (admin/moderator with permission)
 * @access  Admin/Moderator with DELETE_PRODUCT permission
 */
router.post(
  '/bulk-delete',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'DELETE'),
  productController.bulkDeleteProducts
);

/**
 * @route   GET /api/admin/products/:id/analytics
 * @desc    Get product analytics (admin/moderator with permission)
 * @access  Admin/Moderator with INDEX_PRODUCT permission
 */
router.get(
  '/:id/analytics',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'INDEX'),
  productController.getProductAnalytics
);

/**
 * @route   POST /api/admin/products/:id/clone
 * @desc    Clone a product with all its details (admin/moderator with permission)
 * @access  Admin/Moderator with CREATE_PRODUCT permission
 */
router.post(
  '/:id/clone',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'CREATE'),
  productController.cloneProduct
);

/**
 * @route   PATCH /api/admin/products/:id/reorder
 * @desc    Update product sort order for drag & drop reordering
 * @access  Admin/Moderator with UPDATE_PRODUCT permission
 */
router.patch(
  '/:id/reorder',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('PRODUCTS', 'UPDATE'),
  productController.reorderProduct
);

export default router;
