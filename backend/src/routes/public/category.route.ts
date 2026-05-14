import { Router } from 'express';
import * as categoryController from '../../controllers/category.controller';

const router = Router();

// ================================
// PUBLIC CATEGORIES BROWSING
// ================================

/**
 * @route   GET /api/public/categories
 * @desc    Get categories with filters and pagination (public view)
 * @access  Public
 */
router.get('/', categoryController.getPublicCategories);

/**
 * @route   GET /api/public/categories/slug/:slug
 * @desc    Get category by slug (public view)
 * @access  Public
 */
router.get('/slug/:slug', categoryController.getCategoryBySlug);

/**
 * @route   GET /api/public/categories/tree
 * @desc    Get complete category tree (public view)
 * @access  Public
 */
router.get('/tree', categoryController.getCategoryTree);

/**
 * @route   GET /api/public/categories/root
 * @desc    Get root categories (public view)
 * @access  Public
 */
router.get('/root', categoryController.getRootCategories);

/**
 * @route   GET /api/public/categories/:parentId/children
 * @desc    Get child categories by parent ID (public view)
 * @access  Public
 */
router.get('/:parentId/children', categoryController.getChildCategories);

/**
 * @route   GET /api/public/categories/:id
 * @desc    Get category by ID (public view)
 * @access  Public
 */
router.get('/:id', categoryController.getCategory);

export default router;
