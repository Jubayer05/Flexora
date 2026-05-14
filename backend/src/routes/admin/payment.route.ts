/**
 * Admin Payment Routes
 * Admin payment management endpoints
 */

import { Router } from 'express';
import * as paymentController from '../../controllers/admin/payment.controller';
import { adminAuthMiddleware, requireAdminAuth } from '../../middlewares/auth';

const router = Router();

// All routes require admin authentication
router.use(adminAuthMiddleware);
router.use(requireAdminAuth);

/**
 * @route   GET /api/v1/admin/payments/stats
 * @desc    Get payment statistics
 * @access  Admin
 */
router.get('/stats', paymentController.getPaymentStats);

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments (with pagination and filters)
 * @access  Admin
 */
router.get('/', paymentController.getAllPayments);

/**
 * @route   GET /api/v1/admin/payments/:id
 * @desc    Get payment details
 * @access  Admin
 */
router.get('/:id', paymentController.getPaymentDetails);

/**
 * @route   POST /api/v1/admin/payments/:id/refund
 * @desc    Process refund for a payment
 * @access  Admin
 */
router.post('/:id/refund', paymentController.processRefund);

export default router;
