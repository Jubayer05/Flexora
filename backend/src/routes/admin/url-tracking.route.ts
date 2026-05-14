import { Router } from 'express'
import {
  listUrlTrackings,
  getUrlTrackingById,
  createUrlTracking,
  updateUrlTracking,
  deleteUrlTracking,
  getAnalytics
} from '../../controllers/url-tracking.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession
} from '../../middlewares/auth'

const router = Router()

/**
 * @description Admin URL tracking routes
 * @path /api/v1/admin/url-tracking
 */

router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  listUrlTrackings
)

router.get(
  '/analytics/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  getAnalytics
)

router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'INDEX'),
  getUrlTrackingById
)

router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'CREATE'),
  createUrlTracking
)

router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'UPDATE'),
  updateUrlTracking
)

router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('NOTIFICATIONS', 'DELETE'),
  deleteUrlTracking
)

export default router
