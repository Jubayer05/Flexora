import { Router } from 'express';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getAllPaymentMethods,
  getPaymentMethodById,
  getPaymentMethods,
  updatePaymentMethod,
  testNOWPaymentsConnection,
} from '../../controllers/payment-method.controller';
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

// POST /api/admin/payment-methods - Create new payment method
router.post('/', createPaymentMethod);

// GET /api/admin/payment-methods - Get paginated payment methods
router.get('/', getPaymentMethods);

// GET /api/admin/payment-methods/all - Get all active payment methods (for dropdowns)
router.get('/all', getAllPaymentMethods);

// POST /api/admin/payment-methods - Create new payment method
router.post('/', createPaymentMethod);

// GET /api/admin/payment-methods/:id - Get single payment method
router.get('/:id', getPaymentMethodById);

// PUT /api/admin/payment-methods/:id - Update payment method
router.put('/:id', updatePaymentMethod);

// POST /api/admin/payment-methods/:id/test-nowpayments - Test NOWPayments configuration
router.post('/:id/test-nowpayments', testNOWPaymentsConnection);

// DELETE /api/admin/payment-methods/:id - Delete payment method
router.delete('/:id', deletePaymentMethod);

export default router;
