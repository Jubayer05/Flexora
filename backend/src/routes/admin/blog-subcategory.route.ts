import { Router } from 'express'
import {
  createBlogSubCategory,
  deleteBlogSubCategory,
  getBlogSubCategories,
  getBlogSubCategoryById,
  updateBlogSubCategory
} from '../../controllers/blog-subcategory.controller'
import { adminAuthMiddleware, requireAdminAuth } from '../../middlewares/auth'

const router = Router()

router.get('/', adminAuthMiddleware, requireAdminAuth, getBlogSubCategories)
router.post('/', adminAuthMiddleware, requireAdminAuth, createBlogSubCategory)
router.get('/:id', adminAuthMiddleware, requireAdminAuth, getBlogSubCategoryById)
router.put('/:id', adminAuthMiddleware, requireAdminAuth, updateBlogSubCategory)
router.delete('/:id', adminAuthMiddleware, requireAdminAuth, deleteBlogSubCategory)

export default router
