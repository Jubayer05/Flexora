import { Router } from 'express'
import { verifyGuestCode } from '../controllers/guestAccess.controller'
import { guestAuthMiddleware } from '../middlewares/guestAuth'
import db from '../configs/db'

const router = Router()

// POST /api/guest/verify
router.post('/verify', verifyGuestCode)

// GET /api/guest/order-details
router.get('/order-details', guestAuthMiddleware, async (req, res) => {
  const { cartGroup } = (req as any).guest
  // Only return allowed info
  const order = await db.order.findFirst({
    where: {
      OR: [
        { orderNumber: cartGroup },
        { meta: { path: ['cartGroup', 'groupNumber'], equals: cartGroup } }
      ]
    }
  })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  res.json({ order })
})

export default router
