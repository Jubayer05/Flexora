import express from 'express'
import {
  getAllDeliveryTemplates,
  getDefaultDeliveryTemplate,
  createDeliveryTemplate,
  updateDeliveryTemplate,
  deleteDeliveryTemplate,
  getAllAuthTemplates,
  getAuthTemplate,
  createAuthTemplate,
  updateAuthTemplate,
  deleteAuthTemplate
} from '../../controllers/delivery-template.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession, requirePermission } from '../../middlewares/auth'

const router = express.Router()

// ==============================
// DELIVERY TEMPLATES ROUTES
// ==============================

/**
 * @route   GET /api/admin/delivery-templates
 * @desc    Get all delivery templates
 * @access  Admin
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'READ'),
  getAllDeliveryTemplates
)

/**
 * @route   GET /api/admin/delivery-templates/default
 * @desc    Get default delivery template
 * @access  Admin
 */
router.get(
  '/default',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'READ'),
  getDefaultDeliveryTemplate
)

/**
 * @route   POST /api/admin/delivery-templates
 * @desc    Create new delivery template
 * @access  Admin
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  createDeliveryTemplate
)

/**
 * @route   PUT /api/admin/delivery-templates/:id
 * @desc    Update delivery template
 * @access  Admin
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'UPDATE'),
  updateDeliveryTemplate
)

/**
 * @route   DELETE /api/admin/delivery-templates/:id
 * @desc    Delete delivery template
 * @access  Admin
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'DELETE'),
  deleteDeliveryTemplate
)

// ==============================
// AUTH EMAIL TEMPLATES ROUTES
// ==============================

/**
 * @route   GET /api/admin/auth-templates
 * @desc    Get all auth email templates
 * @access  Admin
 */
router.get(
  '/auth',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'READ'),
  getAllAuthTemplates
)

/**
 * @route   GET /api/admin/auth-templates/:type
 * @desc    Get specific auth email template
 * @access  Admin
 */
router.get(
  '/auth/:type',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'READ'),
  getAuthTemplate
)

/**
 * @route   POST /api/admin/auth-templates
 * @desc    Create new auth email template
 * @access  Admin
 */
router.post(
  '/auth',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'CREATE'),
  createAuthTemplate
)

/**
 * @route   PUT /api/admin/auth-templates/:type
 * @desc    Update auth email template
 * @access  Admin
 */
router.put(
  '/auth/:type',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'UPDATE'),
  updateAuthTemplate
)

/**
 * @route   DELETE /api/admin/auth-templates/:type
 * @desc    Delete auth email template
 * @access  Admin
 */
router.delete(
  '/auth/:type',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('SETTINGS', 'DELETE'),
  deleteAuthTemplate
)

export default router
