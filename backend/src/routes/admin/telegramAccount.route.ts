import { Router } from 'express'
import * as telegramAccountController from '../../controllers/telegramAccount.controller'
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession
} from '../../middlewares/auth'

const router = Router()

// ================================
// ADMIN TELEGRAM ACCOUNTS MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/telegram-accounts
 * @desc    Get all Telegram accounts with pagination and filters
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getTelegramAccounts
)

/**
 * @route   POST /api/admin/telegram-accounts
 * @desc    Create new Telegram account
 * @access  Admin/Moderator with CREATE_ACCOUNT permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  telegramAccountController.createTelegramAccount
)

/**
 * @route   PUT /api/admin/telegram-accounts/:id
 * @desc    Update Telegram account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.updateTelegramAccount
)

/**
 * @route   DELETE /api/admin/telegram-accounts/:id
 * @desc    Delete Telegram account
 * @access  Admin/Moderator with DELETE_ACCOUNT permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'DELETE'),
  telegramAccountController.deleteTelegramAccount
)

// ================================
// PRODUCT-SPECIFIC OPERATIONS
// ================================

/**
 * @route   GET /api/admin/telegram-accounts/product/:productId
 * @desc    Get Telegram accounts for specific product
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/product/:productId',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getTelegramAccountsByProduct
)

/**
 * @route   GET /api/admin/telegram-accounts/:id/credentials
 * @desc    Get account credentials (for order delivery or admin access)
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/:id/credentials',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getAccountCredentials
)

// ================================
// ACCOUNT MANAGEMENT
// ================================

/**
 * @route   PUT /api/admin/telegram-accounts/:id/used
 * @desc    Mark account as used (for order fulfillment)
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id/used',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.markAccountAsUsed
)

/**
 * @route   PUT /api/admin/telegram-accounts/:id/validate
 * @desc    Validate/invalidate account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/:id/validate',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.validateTelegramAccount
)

// ================================
// BULK OPERATIONS
// ================================

/**
 * @route   POST /api/admin/telegram-accounts/bulk/import
 * @desc    Bulk import Telegram accounts
 * @access  Admin/Moderator with CREATE_ACCOUNT permission
 */
router.post(
  '/bulk/import',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'CREATE'),
  telegramAccountController.bulkImportTelegramAccounts
)

/**
 * @route   PUT /api/admin/telegram-accounts/bulk/validate
 * @desc    Bulk validate/invalidate accounts
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/bulk/validate',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.bulkValidateTelegramAccounts
)

/**
 * @route   PUT /api/admin/telegram-accounts/bulk/assign
 * @desc    Bulk assign accounts to product
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/bulk/assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.bulkAssignAccountsToProduct
)

/**
 * @route   PUT /api/admin/telegram-accounts/bulk/proxy
 * @desc    Bulk change proxy for accounts
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.put(
  '/bulk/proxy',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.bulkChangeProxy
)

/**
 * @route   POST /api/admin/telegram-accounts/bulk/test-sessions
 * @desc    Bulk test sessions for accounts
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.post(
  '/bulk/test-sessions',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.bulkTestSessions
)

// ================================
// ORDER & ASSIGNMENT OPERATIONS
// ================================

/**
 * @route   POST /api/admin/telegram-accounts/assign
 * @desc    Assign accounts to order (for fulfillment)
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.post(
  '/assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.assignAccountsToOrder
)

// ================================
// STATISTICS & ANALYTICS
// ================================

/**
 * @route   GET /api/admin/telegram-accounts/stats
 * @desc    Get Telegram account statistics
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/stats',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getTelegramAccountStats
)

/**
 * @route   POST /api/admin/telegram-accounts/stats/bulk
 * @desc    Get bulk statistics for multiple products
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.post(
  '/stats/bulk',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getBulkTelegramStats
)

/**
 * @route   PATCH /api/admin/telegram-accounts/:id/proxy
 * @desc    Update proxy configuration for Telegram account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.patch(
  '/:id/proxy',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.updateAccountProxy
)

/**
 * @route   DELETE /api/admin/telegram-accounts/:id/proxy
 * @desc    Remove proxy configuration from Telegram account
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.delete(
  '/:id/proxy',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.removeAccountProxy
)

/**
 * @route   POST /api/admin/telegram-accounts/:id/proxy/auto-assign
 * @desc    Auto-assign fresh proxy from global IP Royal configuration
 * @access  Admin/Moderator with UPDATE_ACCOUNT permission
 */
router.post(
  '/:id/proxy/auto-assign',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'UPDATE'),
  telegramAccountController.autoAssignProxy
)

/**
 * @route   GET /api/admin/telegram-accounts/:id/groups-channels
 * @desc    Get groups and channels owned by a Transfer Only account
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/:id/groups-channels',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getAccountGroupsChannels
)

/**
 * @route   GET /api/admin/telegram-accounts/:id
 * @desc    Get Telegram account by ID (with credentials for admin)
 * @access  Admin/Moderator with INDEX_ACCOUNT permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('ACCOUNTS', 'INDEX'),
  telegramAccountController.getTelegramAccount
)

export default router
