import { Router } from 'express'
import {
  createBlogAuthor,
  deleteBlogAuthor,
  getBlogAuthorById,
  getBlogAuthors,
  getRandomBlogAuthor,
  updateBlogAuthor
} from '../../controllers/blog-author.controller'
import { adminAuthMiddleware, requireAdminAuth } from '../../middlewares/auth'

const router = Router()

router.get('/', adminAuthMiddleware, requireAdminAuth, getBlogAuthors)
router.post('/', adminAuthMiddleware, requireAdminAuth, createBlogAuthor)
router.get('/random', adminAuthMiddleware, requireAdminAuth, getRandomBlogAuthor)
router.get('/:id', adminAuthMiddleware, requireAdminAuth, getBlogAuthorById)
router.put('/:id', adminAuthMiddleware, requireAdminAuth, updateBlogAuthor)
router.delete('/:id', adminAuthMiddleware, requireAdminAuth, deleteBlogAuthor)

export default router
