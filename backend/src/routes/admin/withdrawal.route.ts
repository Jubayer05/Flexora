import { Router } from 'express';
import * as withdrawalController from '../../controllers/admin/withdrawal.controller';
import { adminAuthMiddleware } from '../../middlewares/auth';

const router = Router();

// All routes require admin authentication
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/v1/admin/withdrawals
 * @desc    Get all withdrawal requests
 * @access  Private (Admin)
 */
router.get('/', withdrawalController.getWithdrawals);

/**
 * @route   GET /api/v1/admin/withdrawals/:id
 * @desc    Get single withdrawal request
 * @access  Private (Admin)
 */
router.get('/:id', withdrawalController.getWithdrawalById);

/**
 * @route   PUT /api/v1/admin/withdrawals/:id
 * @desc    Update withdrawal request (mark as DONE, edit details)
 * @access  Private (Admin)
 */
router.put('/:id', withdrawalController.updateWithdrawal);

/**
 * @route   DELETE /api/v1/admin/withdrawals/:id
 * @desc    Delete withdrawal request
 * @access  Private (Admin)
 */
router.delete('/:id', withdrawalController.deleteWithdrawal);

export default router;
