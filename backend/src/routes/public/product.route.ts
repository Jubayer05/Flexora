import { Router } from 'express'
import * as productController from '../../controllers/product.controller'

const router = Router();

// ================================
// PUBLIC PRODUCTS BROWSING
// ================================

/**
 * @route   GET /api/public/products
 * @desc    Get products with filters and pagination (public view)
 * @access  Public
 */
router.get('/', productController.getPublicProducts);

/**
 * @route   GET /api/public/products/sku/:sku
 * @desc    Get product by SKU (public view)
 * @access  Public
 */
router.get('/sku/:sku', productController.getProductBySku);

/**
 * @route   GET /api/public/products/slug/:slug
 * @desc    Get product by slug (public view)
 * @access  Public
 */
router.get('/slug/:slug', productController.getProductBySlug);

/**
 * @route   GET /api/public/products/private/:privateUrl
 * @desc    Access product by private URL
 * @access  Public (with private URL)
 * NOTE: This route MUST come before /:id to avoid route conflicts
 */
router.get('/private/:privateUrl', productController.getProductByPrivateUrl);

/**
 * @route   GET /api/public/products/:id
 * @desc    Get product by ID (public view)
 * @access  Public
 */
router.get('/:id', productController.getProduct);

export default router;
