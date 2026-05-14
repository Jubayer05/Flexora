import { Router } from 'express'
import { trackClick, trackPageView } from '../../controllers/url-tracking.controller'

const router = Router()

/**
 * @description Public URL tracking - track click by slug (no auth)
 * @path /api/v1/url-tracking/track
 */
router.post('/track', trackClick)
router.post('/track-page', trackPageView)

export default router
