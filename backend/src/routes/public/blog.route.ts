import { Router } from 'express'
import {
    getBlogByIdPublic,
    getBlogBySlugPublic,
    getBlogCategoriesPublic,
    getBlogsByCategory,
    getBlogsPublic,
    getBlogTags,
    getPopularBlogs,
    getRecentBlogs
} from '../../controllers/blog.controller'

const router = Router();

// ===============================
// PUBLIC BLOG ROUTES
// ===============================

// Get all published blogs
router.get('/', getBlogsPublic);

// Get popular blogs
router.get('/popular', getPopularBlogs);

// Get recent blogs
router.get('/recent', getRecentBlogs);

// Get all blog tags
router.get('/tags', getBlogTags);

// Get all blog categories
router.get('/categories', getBlogCategoriesPublic);

// Get blogs by category
router.get('/categories/:id/blogs', getBlogsByCategory);

// Get blog by slug (for SEO-friendly URLs)
router.get('/slug/:slug', getBlogBySlugPublic);

// Get blog by ID (put at the end to avoid conflicts)
router.get('/:id', getBlogByIdPublic);

export default router;