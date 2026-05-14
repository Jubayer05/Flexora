import { Router } from 'express'
import * as accountController from '../../controllers/account.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession
} from '../../middlewares/auth'

const router = Router()

// ================================
// ADMIN ACCOUNTS MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/accounts
 * @desc    Get all accounts with pagination and filters
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getAccounts
)

/**
 * @route   POST /api/admin/accounts
 * @desc    Create new account
 * @access  Admin/Moderator with CREATE_ACCOUNT permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  accountController.createAccount
)
router.post(
  '/multiple',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  accountController.createMultipleAccounts
)

/**
 * @route   GET /api/admin/accounts/stats
 * @desc    Get account statistics
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getAccountStats
)

/**
 * @route   POST /api/admin/accounts/stats/bulk
 * @desc    Get bulk statistics for multiple products
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.post(
  '/stats/bulk',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getBulkAccountStats
)

/**
 * @route   GET /api/admin/accounts/product/:productId
 * @desc    Get accounts for specific product
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/product/:productId',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getAccountsByProduct
)

/**
 * @route   POST /api/admin/accounts/bulk/import
 * @desc    Bulk import accounts
 * @access  Admin/Moderator with CREATE_ACCOUNT permission
 */
router.post(
  '/bulk/import',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  accountController.bulkImportAccounts
)

/**
 * @route   PUT /api/admin/accounts/bulk/update
 * @desc    Bulk update accounts
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/bulk/update',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.bulkUpdateAccounts
)

/**
 * @route   PUT /api/admin/accounts/bulk/validate
 * @desc    Bulk validate/invalidate accounts
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/bulk/validate',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.bulkValidateAccounts
)

/**
 * @route   DELETE /api/admin/accounts/bulk/delete
 * @desc    Bulk delete accounts
 * @access  Admin/Moderator with DELETE_ACCOUNT permission
 */
router.delete(
  '/bulk/delete',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'DELETE'),
  accountController.bulkDeleteAccounts
)

/**
 * @route   POST /api/admin/accounts/assign
 * @desc    Assign accounts to order (for fulfillment)
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.post(
  '/assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.assignAccountsToOrder
)

/**
 * @route   GET /api/admin/accounts/:id
 * @desc    Get account by ID
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getAccount
)

/**
 * @route   PUT /api/admin/accounts/:id
 * @desc    Update account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.updateAccount
)

/**
 * @route   DELETE /api/admin/accounts/:id
 * @desc    Delete account
 * @access  Admin/Moderator with DELETE_ACCOUNT permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'DELETE'),
  accountController.deleteAccount
)

/**
 * @route   GET /api/admin/accounts/:id/credentials
 * @desc    Get account credentials (for order delivery or admin access)
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/:id/credentials',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  accountController.getAccountCredentials
)

/**
 * @route   PUT /api/admin/accounts/:id/used
 * @desc    Mark account as used (for order fulfillment)
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id/used',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.markAccountAsUsed
)

/**
 * @route   PUT /api/admin/accounts/:id/validate
 * @desc    Validate/invalidate account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id/validate',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.validateAccount
)

/**
 * @route   POST /api/admin/accounts/bulk-update
 * @desc    Bulk update account properties (isValid, etc.)
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.post(
  '/bulk-update',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  accountController.bulkUpdateAccounts
)

/**
 * @route   POST /api/admin/accounts/serial/bulk
 * @desc    Create serial/credential accounts in bulk (from SerialStock component)
 * @access  Admin/Moderator with CREATE_ACCOUNT permission
 */
router.post(
  '/serial/bulk',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  accountController.createSerialAccounts
)

export default router
