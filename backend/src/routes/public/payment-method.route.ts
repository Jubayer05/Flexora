/**
 * Public Payment Method Routes
 * Allows guests and customers to view active payment methods
 */

import { Router } from 'express'
import { getAllPaymentMethods } from '../../controllers/payment-method.controller'

const router = Router();

/**
 * @route   GET /api/v1/public/payment-methods
 * @desc    Get all active payment methods (for checkout)
 * @access  Public
 */
router.get('/', getAllPaymentMethods);

export default router;
