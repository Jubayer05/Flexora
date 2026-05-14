import { Router } from 'express';
import {
  createCustomPage,
  deleteCustomPage,
  getCustomPageById,
  getCustomPageBySlug,
  getCustomPages,
  getCustomPagesInfo,
  updateCustomPage,
} from '../../controllers/custom-page.controller';
import { adminAuthMiddleware, requireAdminAuth } from '../../middlewares/auth';

const router = Router();

// ===============================
// CUSTOM PAGE ADMIN ROUTES
// ===============================

// Get all custom pages
router.get('/', adminAuthMiddleware, requireAdminAuth, getCustomPages);
router.get('/info', adminAuthMiddleware, requireAdminAuth, getCustomPagesInfo);

// Create custom page
router.post('/', adminAuthMiddleware, requireAdminAuth, createCustomPage);

// Update custom page
router.put('/:id', adminAuthMiddleware, requireAdminAuth, updateCustomPage);

// Delete custom page
router.delete('/:id', adminAuthMiddleware, requireAdminAuth, deleteCustomPage);

// Get custom page by slug (specific route before generic :id)
router.get('/slug/:slug', adminAuthMiddleware, requireAdminAuth, getCustomPageBySlug);

// Get custom page by ID (put at the end to avoid conflicts)
router.get('/:id', adminAuthMiddleware, requireAdminAuth, getCustomPageById);

export default router;
