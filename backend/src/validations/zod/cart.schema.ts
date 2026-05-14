import { z } from 'zod'

export const CartItemInputSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity too large')
})

export const AddToCartSchema = CartItemInputSchema

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater').max(10000, 'Quantity too large')
})


