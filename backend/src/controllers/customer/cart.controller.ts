import type { Response } from 'express'
import db from '../../configs/db'
import type { AuthRequest } from '../../types/req-res'
import { AddToCartSchema, UpdateCartItemSchema } from '../../validations/zod/cart.schema'

const getEffectiveMaxQuantity = (product: {
  stockCount: number
  maxQuantity?: number | null
  type?: string | null
}) => {
  if (['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(String(product.type))) {
    return 1000
  }

  const stockCount = Math.max(0, Number(product.stockCount ?? 0))
  const rawMaxQuantity = Number(product.maxQuantity ?? 0)

  if (rawMaxQuantity === 0) return stockCount

  const maxQuantity = rawMaxQuantity > 0 ? rawMaxQuantity : 1000
  return Math.min(maxQuantity, stockCount)
}

// ================================
// CART MANAGEMENT (AUTHENTICATED USERS)
// ================================

export const getMyCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const cart = await db.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
                price: true,
                platform: true,
                type: true,
                sku: true,
                stockCount: true,
                minQuantity: true,
                maxQuantity: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    return res.json({ success: true, data: cart })
  } catch (error) {
    console.error('[Cart] getMyCart error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load cart' })
  }
}

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const { productId, quantity } = AddToCartSchema.parse(req.body)

    const product = await db.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        id: true,
        price: true,
        isActive: true,
        stockCount: true,
        minQuantity: true,
        maxQuantity: true
      }
    })

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not available' })
    }

    const minQuantity = product.minQuantity || 1
    const effectiveMax = getEffectiveMaxQuantity(product)

    if (effectiveMax <= 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' })
    }

    const cart = await db.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true }
    })

    const existingItem = await db.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
      select: { quantity: true }
    })

    const requestedQuantity = (existingItem?.quantity || 0) + quantity

    if (requestedQuantity < minQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum quantity for this product is ${minQuantity}`
      })
    }

    if (requestedQuantity > effectiveMax) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${effectiveMax}, Requested: ${requestedQuantity}`
      })
    }

    const item = await db.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: product.price
      },
      update: {
        quantity: { increment: quantity },
        // keep the original snapshot unitPrice unless it was missing
        unitPrice: product.price
      }
    })

    return res.status(201).json({ success: true, data: item, message: 'Added to cart' })
  } catch (error) {
    console.error('[Cart] addToCart error:', error)
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add to cart'
    })
  }
}

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const productId = Number(req.params.productId)
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid productId' })
    }

    const { quantity } = UpdateCartItemSchema.parse(req.body)

    const cart = await db.cart.findUnique({ where: { userId }, select: { id: true } })
    if (!cart) {
      return res.json({ success: true, data: null, message: 'Cart is empty' })
    }

    if (quantity <= 0) {
      await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } })
      return res.json({ success: true, data: null, message: 'Item removed' })
    }

    const product = await db.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        id: true,
        price: true,
        isActive: true,
        stockCount: true,
        minQuantity: true,
        maxQuantity: true
      }
    })
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not available' })
    }

    const minQuantity = product.minQuantity || 1
    const effectiveMax = getEffectiveMaxQuantity(product)

    if (effectiveMax <= 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' })
    }

    if (quantity < minQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum quantity for this product is ${minQuantity}`
      })
    }

    if (quantity > effectiveMax) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${effectiveMax}, Requested: ${quantity}`
      })
    }

    const item = await db.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: product.price
      },
      update: { quantity, unitPrice: product.price }
    })

    return res.json({ success: true, data: item, message: 'Quantity updated' })
  } catch (error) {
    console.error('[Cart] updateCartItem error:', error)
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update cart item'
    })
  }
}

export const removeCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const productId = Number(req.params.productId)
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid productId' })
    }

    const cart = await db.cart.findUnique({ where: { userId }, select: { id: true } })
    if (!cart) {
      return res.json({ success: true, data: null, message: 'Cart is empty' })
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } })
    return res.json({ success: true, data: null, message: 'Item removed' })
  } catch (error) {
    console.error('[Cart] removeCartItem error:', error)
    return res.status(500).json({ success: false, message: 'Failed to remove item' })
  }
}

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const cart = await db.cart.findUnique({ where: { userId }, select: { id: true } })
    if (!cart) {
      return res.json({ success: true, data: null, message: 'Cart already empty' })
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id } })
    return res.json({ success: true, data: null, message: 'Cart cleared' })
  } catch (error) {
    console.error('[Cart] clearCart error:', error)
    return res.status(500).json({ success: false, message: 'Failed to clear cart' })
  }
}


