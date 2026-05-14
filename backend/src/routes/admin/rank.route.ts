import { Router } from 'express';
import {
  createRank,
  deleteRank,
  getAllRanks,
  getRankById,
  getRanks,
  updateRank,
} from '../../controllers/rank.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// Apply middlewares to all routes
router.use(adminAuthMiddleware);
router.use(requireAdminAuth);
router.use(validateAdminSession);

/**
 * @route   GET /api/admin/ranks/all
 * @desc    Get all ranks without pagination (for dropdowns)
 * @access  Admin/Moderator
 */
router.get('/all', getAllRanks);

/**
 * @route   GET /api/admin/ranks
 * @desc    Get all ranks with pagination
 * @access  Admin/Moderator
 */
router.get('/', getRanks);

/**
 * @route   GET /api/admin/ranks/:id
 * @desc    Get rank by ID
 * @access  Admin/Moderator
 */
router.get('/:id', getRankById);

/**
 * @route   POST /api/admin/ranks
 * @desc    Create a new rank
 * @access  Admin only
 */
router.post('/', createRank);

/**
 * @route   PUT /api/admin/ranks/:id
 * @desc    Update rank
 * @access  Admin only
 */
router.put('/:id', updateRank);

/**
 * @route   DELETE /api/admin/ranks/:id
 * @desc    Delete rank
 * @access  Admin only
 */
router.delete('/:id', deleteRank);

export default router;
