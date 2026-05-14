import { Router } from 'express';
import {
  bulkActionBlogs,
  createBlog,
  createBlogCategory,
  createBulkBlogs,
  deleteBlog,
  deleteBlogCategory,
  getBlogByIdAdmin,
  getBlogCategories,
  getBlogCategoryById,
  getBlogs,
  updateBlog,
  updateBlogCategory,
  uploadBlogImage,
} from '../../controllers/blog.controller';
import { blogImageUpload } from '../../libs/multer';
import { adminAuthMiddleware, requireAdminAuth } from '../../middlewares/auth';

const router = Router();

// ===============================
// BLOG CATEGORY ADMIN ROUTES
// ===============================

// Get all blog categories
router.get(
  '/categories',
  adminAuthMiddleware,
  requireAdminAuth,

  getBlogCategories
);

// Create blog category
router.post(
  '/categories',
  adminAuthMiddleware,
  requireAdminAuth,

  createBlogCategory
);

// Update blog category
router.put(
  '/categories/:id',
  adminAuthMiddleware,
  requireAdminAuth,

  updateBlogCategory
);

// Delete blog category
router.delete(
  '/categories/:id',
  adminAuthMiddleware,
  requireAdminAuth,

  deleteBlogCategory
);

// Get blog category by ID (put at the end to avoid conflicts)
router.get(
  '/categories/:id',
  adminAuthMiddleware,
  requireAdminAuth,

  getBlogCategoryById
);

// ===============================
// BLOG ADMIN ROUTES
// ===============================

// Get all blogs
router.get('/', adminAuthMiddleware, requireAdminAuth, getBlogs);

// Bulk actions on blogs
router.post(
  '/bulk-action',
  adminAuthMiddleware,
  requireAdminAuth,

  bulkActionBlogs
);

// Upload single image for blog (R2 blog folder) – must be before /:id
router.post(
  '/upload-image',
  adminAuthMiddleware,
  requireAdminAuth,
  blogImageUpload.single('file'),
  uploadBlogImage
);

// Bulk create blogs (auto-upload with scheduling)
router.post(
  '/bulk',
  adminAuthMiddleware,
  requireAdminAuth,
  createBulkBlogs
);

// Create blog
router.post('/', adminAuthMiddleware, requireAdminAuth, createBlog);

// Update blog
router.put('/:id', adminAuthMiddleware, requireAdminAuth, updateBlog);

// Delete blog
router.delete('/:id', adminAuthMiddleware, requireAdminAuth, deleteBlog);

// Get blog by ID (put at the end to avoid conflicts)
router.get('/:id', adminAuthMiddleware, requireAdminAuth, getBlogByIdAdmin);

export default router;
