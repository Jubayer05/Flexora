import { Router } from 'express'
import * as newsletterController from '../../controllers/newsletter.controller'

const router = Router()

// ================================
// PUBLIC NEWSLETTER ROUTES
// ================================

/**
 * @route   POST /api/v1/public/newsletter/subscribe
 * @desc    Subscribe to newsletter with email
 * @access  Public
 */
router.post('/subscribe', newsletterController.subscribe)

export default router
