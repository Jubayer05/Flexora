import { Router } from 'express';
import {
  banCustomer,
  bulkDeleteCustomers,
  bulkUpdateCustomers,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  getCustomerStats,
  setCustomerPassword,
  unbanCustomer,
  updateCustomer,
  updateCustomerRank,
  verifyCustomerEmail,
} from '../../controllers/customer.controller';

const router = Router();

// ================================
// CUSTOMER CRUD OPERATIONS
// ================================

/**
 * @route   GET /api/admin/customers
 * @desc    Get all customers with filtering and pagination
 * @access  Admin
 */
router.get('/', getCustomers);

/**
 * @route   GET /api/admin/customers/stats
 * @desc    Get customer statistics
 * @access  Admin
 */
router.get('/stats', getCustomerStats);

/**
 * @route   GET /api/admin/customers/:id
 * @desc    Get customer by ID
 * @access  Admin
 */
router.get('/:id', getCustomerById);

/**
 * @route   POST /api/admin/customers
 * @desc    Create new customer
 * @access  Admin
 */
router.post('/', createCustomer);

/**
 * @route   PUT /api/admin/customers/:id
 * @desc    Update customer by ID
 * @access  Admin
 */
router.put('/:id', updateCustomer);

/**
 * @route   DELETE /api/admin/customers/:id
 * @desc    Delete customer by ID
 * @access  Admin
 */
router.delete('/:id', deleteCustomer);

// ================================
// CUSTOMER MANAGEMENT OPERATIONS
// ================================

/**
 * @route   POST /api/admin/customers/ban/email
 * @desc    Ban customer by email
 * @access  Admin
 */
router.post('/ban/email', banCustomer); // Reuse same controller, will check body

/**
 * @route   POST /api/admin/customers/ban/ip
 * @desc    Ban all customers by IP address
 * @access  Admin
 */
router.post('/ban/ip', banCustomer); // Reuse same controller, will check body

/**
 * @route   POST /api/admin/customers/:id/ban
 * @desc    Ban customer by ID
 * @access  Admin
 */
router.post('/:id/ban', banCustomer);

/**
 * @route   POST /api/admin/customers/:id/unban
 * @desc    Unban customer
 * @access  Admin
 */
router.post('/:id/unban', unbanCustomer);

/**
 * @route   POST /api/admin/customers/:id/verify-email
 * @desc    Verify customer email
 * @access  Admin
 */
router.post('/:id/verify-email', verifyCustomerEmail);

/**
 * @route   POST /api/admin/customers/:id/update-rank
 * @desc    Update customer rank
 * @access  Admin
 */
router.post('/:id/update-rank', updateCustomerRank);

// ================================
// BULK OPERATIONS
// ================================

/**
 * @route   PUT /api/admin/customers/bulk/update
 * @desc    Bulk update customers
 * @access  Admin
 */
router.put('/bulk/update', bulkUpdateCustomers);

/**
 * @route   PUT /api/admin/customers/:id/password
 * @desc    Set customer password
 * @access  Admin
 */
router.put('/:id/password', setCustomerPassword);

/**
 * @route   DELETE /api/admin/customers/bulk/delete
 * @desc    Bulk delete customers
 * @access  Admin
 */
router.delete('/bulk/delete', bulkDeleteCustomers);

export default router;
