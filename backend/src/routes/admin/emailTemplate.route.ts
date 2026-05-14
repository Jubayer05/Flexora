import { Router } from 'express';
import * as emailTemplateController from '../../controllers/emailTemplate.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  requirePermission,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// ================================
// ADMIN EMAIL TEMPLATE MANAGEMENT
// ================================

/**
 * @route   GET /api/admin/email-templates
 * @desc    Get all email templates with pagination and filters
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.getEmailTemplates
);

/**
 * @route   GET /api/admin/email-templates/types
 * @desc    Get all email template types
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/types',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.getEmailTemplateTypes
);

/**
 * @route   GET /api/admin/email-templates/:id
 * @desc    Get email template by ID
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.getEmailTemplate
);

/**
 * @route   GET /api/admin/email-templates/type/:type
 * @desc    Get email template by type
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/type/:type',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.getEmailTemplateByType
);

/**
 * @route   POST /api/admin/email-templates
 * @desc    Create new email template
 * @access  Admin/Moderator with CREATE permission
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'CREATE'),
  emailTemplateController.createEmailTemplate
);

/**
 * @route   PUT /api/admin/email-templates/:id
 * @desc    Update email template by ID
 * @access  Admin/Moderator with UPDATE permission
 */
router.put(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'UPDATE'),
  emailTemplateController.updateEmailTemplate
);

/**
 * @route   DELETE /api/admin/email-templates/:id
 * @desc    Delete email template by ID
 * @access  Admin/Moderator with DELETE permission
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'DELETE'),
  emailTemplateController.deleteEmailTemplate
);

/**
 * @route   POST /api/admin/email-templates/:type/preview
 * @desc    Preview email template with sample data
 * @access  Admin/Moderator with INDEX permission
 */
router.post(
  '/:type/preview',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.previewEmailTemplate
);

/**
 * @route   POST /api/admin/email-templates/test
 * @desc    Send test email with template
 * @access  Admin/Moderator with CREATE permission
 */
router.post(
  '/test',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'CREATE'),
  emailTemplateController.testEmailTemplate
);

/**
 * @route   GET /api/admin/email-templates/:type/variables
 * @desc    Get available variables for a template type
 * @access  Admin/Moderator with INDEX permission
 */
router.get(
  '/:type/variables',
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
  requirePermission('EMAIL_TEMPLATES', 'INDEX'),
  emailTemplateController.getTemplateVariables
);

export default router;
