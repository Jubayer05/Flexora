import { Router } from 'express'
import {
  generateCode,
  getCodes,
  getReferrals,
  getStats,
  transferToBalance
} from '../../controllers/customer/affiliate.controller'
import { authMiddleware, validateActiveSession } from '../../middlewares/auth'

const router = Router()

router.use(authMiddleware, validateActiveSession)

router.get('/referrals', getReferrals)
router.get('/stats', getStats)
router.get('/codes', getCodes)
router.post('/codes/generate', generateCode)
router.post('/transfer-to-balance', transferToBalance)

export default router
