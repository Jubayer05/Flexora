import { Router } from 'express';
import * as withdrawalController from '../../controllers/customer/withdrawal.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/customer/withdrawals
 * @desc    Create withdrawal request
 * @access  Private (Customer)
 */
router.post('/', withdrawalController.createWithdrawal);

/**
 * @route   GET /api/v1/customer/withdrawals
 * @desc    Get customer's withdrawal requests
 * @access  Private (Customer)
 */
router.get('/', withdrawalController.getWithdrawals);

/**
 * @route   GET /api/v1/customer/withdrawals/:id
 * @desc    Get single withdrawal request
 * @access  Private (Customer)
 */
router.get('/:id', withdrawalController.getWithdrawalById);

export default router;
