import { Router } from 'express';
import {
  createSubscriptionPackage,
  deleteSubscriptionPackage,
  getSubscriptionPackageById,
  getSubscriptionPackages,
  updateSubscriptionPackage,
} from '../../controllers/subscription-package.controller';
import {
  adminAuthMiddleware,
  requireAdminAuth,
  validateAdminSession,
} from '../../middlewares/auth';

const router = Router();

// Apply admin authentication middleware
router.use(adminAuthMiddleware);
router.use(requireAdminAuth);
router.use(validateAdminSession);

// ================================
// ROUTES
// ================================

// GET /api/admin/subscription-packages - Get paginated subscription packages
router.get('/', getSubscriptionPackages);

// GET /api/admin/subscription-packages/:id - Get single subscription package
router.get('/:id', getSubscriptionPackageById);

// POST /api/admin/subscription-packages - Create subscription package
router.post('/', createSubscriptionPackage);

// PUT /api/admin/subscription-packages/:id - Update subscription package
router.put('/:id', updateSubscriptionPackage);

// DELETE /api/admin/subscription-packages/:id - Delete subscription package
router.delete('/:id', deleteSubscriptionPackage);

export default router;
