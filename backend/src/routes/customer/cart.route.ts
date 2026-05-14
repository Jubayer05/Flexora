import { Router } from 'express'
import * as cartController from '../../controllers/customer/cart.controller'
import { authMiddleware } from '../../middlewares/auth'

const router = Router()

// ================================
// CUSTOMER CART ROUTES (AUTH ONLY)
// ================================

router.get('/', authMiddleware, cartController.getMyCart)
router.post('/items', authMiddleware, cartController.addToCart)
router.patch('/items/:productId', authMiddleware, cartController.updateCartItem)
router.delete('/items/:productId', authMiddleware, cartController.removeCartItem)
router.delete('/', authMiddleware, cartController.clearCart)

export default router


