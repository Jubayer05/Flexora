import { Router } from 'express'

import * as fakeNamesController from '../../controllers/admin/fake-names.controller'
import { adminAuthMiddleware } from '../../middlewares/auth'

const router = Router()

// All routes require admin authentication
router.use(adminAuthMiddleware)

/**
 * @route   GET /api/v1/admin/fake-names/stats
 * @desc    Get fake names statistics
 * @access  Private (Admin)
 */
router.get('/stats', fakeNamesController.getFakeNamesStats)

/**
 * @route   GET /api/v1/admin/fake-names
 * @desc    Get all fake names with pagination and filtering
 * @access  Private (Admin)
 */
router.get('/', fakeNamesController.getFakeNames)

/**
 * @route   GET /api/v1/admin/fake-names/:id
 * @desc    Get single fake name by ID
 * @access  Private (Admin)
 */
router.get('/:id', fakeNamesController.getFakeNameById)

/**
 * @route   POST /api/v1/admin/fake-names
 * @desc    Create new fake name
 * @access  Private (Admin)
 */
router.post('/', fakeNamesController.createFakeName)

/**
 * @route   POST /api/v1/admin/fake-names/bulk
 * @desc    Bulk create fake names
 * @access  Private (Admin)
 */
router.post('/bulk', fakeNamesController.bulkCreateFakeNames)

/**
 * @route   PUT /api/v1/admin/fake-names/:id
 * @desc    Update fake name
 * @access  Private (Admin)
 */
router.put('/:id', fakeNamesController.updateFakeName)

/**
 * @route   DELETE /api/v1/admin/fake-names/:id
 * @desc    Delete fake name
 * @access  Private (Admin)
 */
router.delete('/:id', fakeNamesController.deleteFakeName)

/**
 * @route   POST /api/v1/admin/fake-names/bulk-delete
 * @desc    Bulk delete fake names
 * @access  Private (Admin)
 */
router.post('/bulk-delete', fakeNamesController.bulkDeleteFakeNames)

export default router
