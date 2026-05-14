import { Router } from 'express'
import * as analyticsController from '../../controllers/admin/analytics.controller'
import { adminAuthMiddleware, requireAdminAuth, validateAdminSession } from '../../middlewares/auth'

const router = Router()

router.use(adminAuthMiddleware, requireAdminAuth, validateAdminSession)

router.get('/traffic', analyticsController.getTrafficAnalytics)
router.get('/sales', analyticsController.getSalesAnalytics)
router.get('/products', analyticsController.getProductPerformanceAnalytics)

export default router
