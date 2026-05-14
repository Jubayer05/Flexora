import { Prisma } from '@prisma/client'
import type { Response } from 'express'
import { z } from 'zod'
import db from '../../configs/db'
import { sendEmail } from '../../libs/email'
import { CouponService } from '../../services/coupon.services'
import { InvoiceService } from '../../services/invoice.service'
import { OrderService } from '../../services/order.services'
import rankService from '../../services/rank.service'
import { SubscriptionService } from '../../services/subscription.service'
import { UserService } from '../../services/user.services'
import type { AuthRequest } from '../../types/req-res'
import { decrypt } from '../../utils/encryption'
import { validateGuestSessionAccess } from '../../utils/guest-dashboard-auth'
import { getClientIP } from '../../utils/ip.utils'
import { isTelegramTransferProduct } from '../../utils/product-type'
import { CreateOrderSchema, OrderQuerySchema } from '../../validations/zod/order.schema'
import { cacheExpire as ordervalidity } from '../../configs/cache.config'

// Initialize services
const orderService = new OrderService()
const invoiceService = new InvoiceService()
const subscriptionService = new SubscriptionService()
const couponService = new CouponService()
const userService = new UserService()

const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

const getEffectiveMaxQuantity = (product: {
  stockCount: number
  maxQuantity?: number | null
  type?: string | null
}) => {
  if (PREMIUM_PRODUCT_TYPES.has(String(product.type))) return 1000

  const stockCount = Math.max(0, Number(product.stockCount ?? 0))
  const rawMaxQuantity = Number(product.maxQuantity ?? 0)

  if (rawMaxQuantity === 0) return stockCount

  const maxQuantity = rawMaxQuantity > 0 ? rawMaxQuantity : 1000
  return Math.min(maxQuantity, stockCount)
}

const normalizeDeliveryAccounts = (accounts: unknown) => {
  const rawAccounts = Array.isArray(accounts) ? accounts : accounts ? [accounts] : []

  return rawAccounts.map((entry: any, index: number) => {
    const credentials = entry?.credentials || entry || {}
    const password = entry?.password || entry?.meta?.password || credentials?.password || ''
    const phoneNumber =
      entry?.phoneNumber ||
      entry?.phone ||
      credentials?.phoneNumber ||
      credentials?.phone ||
      ''

    return {
      id: entry?.id || index + 1,
      socialId: entry?.socialId || credentials?.socialId || '',
      username: entry?.username || credentials?.username || '',
      email: entry?.email || credentials?.email || '',
      phone: entry?.phone || credentials?.phone || phoneNumber || '',
      phoneNumber,
      password,
      note: entry?.note || credentials?.note || '',
      recoveryEmail: entry?.recoveryEmail || credentials?.recoveryEmail || '',
      twoFactorSecret: entry?.twoFactorSecret || credentials?.twoFactorSecret || '',
      sessionData: entry?.sessionData || credentials?.sessionData || '',
      hasPremium: Boolean(entry?.hasPremium ?? credentials?.hasPremium),
      twoFactorEnabled: Boolean(entry?.twoFactorEnabled ?? credentials?.twoFactorEnabled),
      sessionExpiry: entry?.sessionExpiry || credentials?.sessionExpiry || null,
      sessionId: entry?.sessionId || credentials?.sessionId || null,
      backupCodes: entry?.backupCodes || credentials?.backupCodes || [],
      fileUrl: entry?.fileUrl || credentials?.fileUrl || entry?.meta?.fileUrl || '',
      fileName: entry?.fileName || credentials?.fileName || entry?.meta?.fileName || '',
      fileType: entry?.fileType || credentials?.fileType || entry?.meta?.fileType || '',
      credentials,
      meta: entry?.meta || credentials?.meta || {}
    }
  })
}

const buildOrderItems = (order: {
  id: number
  quantity: number
  unitPrice: Prisma.Decimal | number
  subtotal: Prisma.Decimal | number
  product: {
    id: number
    name: string
    sku: string | null
    thumbnail?: string | null
    platform?: string | null
    type?: string | null
  }
}) => [
  {
    id: order.id,
    orderId: order.id,
    productId: order.product.id,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalPrice: order.subtotal,
    product: {
      id: order.product.id,
      name: order.product.name,
      sku: order.product.sku,
      thumbnail: order.product.thumbnail || null,
      platform: order.product.platform || null,
      type: order.product.type || null
    }
  }
]

const getMultiItemOrderMeta = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null
  }

  const multiItemOrder = (meta as Record<string, any>).multiItemOrder
  return multiItemOrder && typeof multiItemOrder === 'object' && !Array.isArray(multiItemOrder)
    ? multiItemOrder
    : null
}

const isParentMultiItemOrder = (meta: unknown) => getMultiItemOrderMeta(meta)?.isParent === true

const getChildOrderIds = (meta: unknown): number[] => {
  const multiItemOrder = getMultiItemOrderMeta(meta)
  return Array.isArray(multiItemOrder?.childOrderIds)
    ? multiItemOrder.childOrderIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
    : []
}

const isHiddenChildOrder = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return false
  }

  const cartGroup = (meta as Record<string, any>).cartGroup
  return cartGroup?.hiddenFromCustomer === true
}

const buildMultiItemOrderItems = (order: {
  id: number
  meta: unknown
  product?: {
    id: number
    name: string
    sku?: string | null
    thumbnail?: string | null
    platform?: string | null
  }
  quantity: number
  unitPrice: Prisma.Decimal | number
  subtotal: Prisma.Decimal | number
}) => {
  const multiItemOrder = getMultiItemOrderMeta(order.meta)
  const items = Array.isArray(multiItemOrder?.items) ? multiItemOrder.items : []

  if (items.length === 0) {
    return buildOrderItems({
      id: order.id,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      subtotal: order.subtotal,
      product: {
        id: order.product?.id || 0,
        name: order.product?.name || 'Product',
        sku: order.product?.sku || null,
        thumbnail: order.product?.thumbnail || null,
        platform: order.product?.platform || null,
        type: order.product?.type || null
      }
    })
  }

  return items.map((item: any, index: number) => ({
    id: item.childOrderId || `${order.id}-${index + 1}`,
    orderId: order.id,
    productId: item.productId,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    totalPrice: Number(item.total || item.subtotal || 0),
    status: item.status || null,
    deliveryStatus: item.deliveryStatus || null,
    quantityDelivered: Number(item.quantityDelivered || 0),
    quantityPending: Number(item.quantityPending || 0),
    childOrderId: item.childOrderId || null,
    childOrderNumber: item.childOrderNumber || null,
    product: {
      id: item.productId,
      name: item.productName || `Product #${item.productId}`,
      sku: item.productSku || null,
      thumbnail: item.productThumbnail || null,
      platform: item.productPlatform || null,
      type: item.productType || null
    }
  }))
}

const attachChildOrderStateToItems = (
  items: any[],
  childOrders: Array<{
    id: number
    orderNumber: string
    status: string
    deliveryStatus: string
    quantityDelivered: number | null
    quantityPending: number | null
  }>
) => {
  const childOrderById = new Map(childOrders.map((childOrder) => [childOrder.id, childOrder]))

  return items.map((item) => {
    const childOrder = childOrderById.get(Number(item.childOrderId || item.id))
    if (!childOrder) return item

    return {
      ...item,
      childOrderId: childOrder.id,
      childOrderNumber: childOrder.orderNumber,
      status: childOrder.status,
      deliveryStatus: childOrder.deliveryStatus,
      quantityDelivered: Number(childOrder.quantityDelivered || 0),
      quantityPending: Number(childOrder.quantityPending || 0)
    }
  })
}

const buildOrderDisplayProduct = <T extends {
  meta?: unknown
  product?: {
    id: number
    name: string
    platform?: string | null
    sku?: string | null
    type?: string | null
    thumbnail?: string | null
  } | null
}>(order: T) => {
  const multiItemItems = buildMultiItemOrderItems({
    id: 0,
    meta: order.meta,
    product: order.product || undefined,
    quantity: 0,
    unitPrice: 0,
    subtotal: 0
  })

  if (multiItemItems.length <= 1) {
    return order.product
  }

  const firstProduct = multiItemItems[0]?.product
  return {
    id: firstProduct?.id || order.product?.id || 0,
    name: `${firstProduct?.name || order.product?.name || 'Order'} + ${multiItemItems.length - 1} more`,
    platform: firstProduct?.platform || order.product?.platform || null,
    sku: firstProduct?.sku || order.product?.sku || null,
    type: order.product?.type || null,
    thumbnail: firstProduct?.thumbnail || order.product?.thumbnail || null
  }
}

const decryptAssignedAccounts = async (orderId: number) => {
  const assignedAccounts = await db.account.findMany({
    where: { usedByOrderId: orderId },
    select: {
      id: true,
      encryptedData: true,
      platform: true,
      hasPremium: true,
      meta: true
    }
  })

  return assignedAccounts.map((account) => {
    try {
      const decrypted = JSON.parse(decrypt(account.encryptedData))
      return {
        id: account.id,
        platform: account.platform,
        hasPremium: account.hasPremium,
        ...decrypted,
        meta: {
          ...(typeof decrypted?.meta === 'object' && decrypted?.meta ? decrypted.meta : {}),
          ...(typeof account.meta === 'object' && account.meta ? (account.meta as Record<string, any>) : {})
        }
      }
    } catch (error) {
      console.error(`[order.controller] Failed to decrypt account ${account.id}:`, error)
      return {
        id: account.id,
        platform: account.platform,
        hasPremium: account.hasPremium,
        meta: account.meta || {}
      }
    }
  })
}

const mapDeliveries = (deliveries: Array<{ id: number; status: string; accounts: unknown; createdAt: Date; deliveredAt: Date | null; downloadCount: number; format: string | null; fileUrl: string | null; meta: unknown }>) =>
  deliveries.map((delivery) => ({
    ...delivery,
    accounts: normalizeDeliveryAccounts(delivery.accounts)
  }))

const getAdminPurchasedItemDetail = async (order: any, item?: any) => {
  const deliveries = mapDeliveries(order.deliveries || [])
  const latestDelivery = deliveries[0]
  const decryptedAccounts = await decryptAssignedAccounts(order.id)
  const deliveryAccounts =
    latestDelivery && Array.isArray(latestDelivery.accounts) && latestDelivery.accounts.length > 0
      ? latestDelivery.accounts
      : normalizeDeliveryAccounts(decryptedAccounts)

  const product = item?.product || order.product || {}
  const meta = order.meta && typeof order.meta === 'object' ? (order.meta as Record<string, any>) : {}

  return {
    id: item?.id || order.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    productId: item?.productId || product.id || order.productId || null,
    quantity: Number(item?.quantity ?? order.quantity ?? 0),
    unitPrice: Number(item?.unitPrice ?? order.unitPrice ?? 0),
    totalPrice: Number(item?.totalPrice ?? item?.total ?? order.subtotal ?? order.total ?? 0),
    status: item?.status || order.status || null,
    deliveryStatus: item?.deliveryStatus || order.deliveryStatus || null,
    quantityDelivered: Number(item?.quantityDelivered ?? order.quantityDelivered ?? 0),
    quantityPending: Number(item?.quantityPending ?? order.quantityPending ?? 0),
    childOrderId: item?.childOrderId || null,
    childOrderNumber: item?.childOrderNumber || null,
    product: {
      id: product.id || item?.productId || 0,
      name: product.name || item?.product?.name || `Product #${item?.productId || order.productId || order.id}`,
      sku: product.sku || item?.product?.sku || null,
      thumbnail: product.thumbnail || item?.product?.thumbnail || null,
      platform: product.platform || item?.product?.platform || null,
      type: product.type || item?.product?.type || null
    },
    deliveries,
    deliveryAccounts,
    telegramTransfer: order.telegramTransfer || null,
    premiumSubscription: meta.premiumSubscription || meta.premium || null,
    clientInput: meta.clientInput || null,
    serviceNotes: meta.serviceFulfillment?.fulfillmentNotes || meta.notes || null,
    fulfillmentHistory: meta.fulfillmentHistory || []
  }
}

const ORDER_NUMBER_PREFIX = 'ORD'
const ORDER_NUMBER_RETRY_LIMIT = 5

const formatOrderNumber = (year: number, sequence: number) =>
  `${ORDER_NUMBER_PREFIX}-${year}-${sequence.toString().padStart(6, '0')}`

const getNextOrderSequence = async (year: number) => {
  const latestOrder = await db.order.findFirst({
    where: {
      orderNumber: {
        startsWith: `${ORDER_NUMBER_PREFIX}-${year}-`
      }
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true }
  })

  if (!latestOrder?.orderNumber) {
    return 1
  }

  const parsed = Number.parseInt(latestOrder.orderNumber.split('-').at(-1) || '', 10)
  return Number.isFinite(parsed) ? parsed + 1 : 1
}

const isOrderNumberConflict = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map((target) => String(target))
    : [String(error.meta?.target || '')]

  return targets.some((target) => target.includes('orderNumber'))
}

const createOrderWithUniqueNumber = async ({
  data,
  include,
  initialSequence
}: {
  data: Omit<Prisma.OrderUncheckedCreateInput, 'orderNumber'>
  include?: Prisma.OrderInclude
  initialSequence?: number
}) => {
  const year = new Date().getFullYear()
  let sequence = initialSequence ?? (await getNextOrderSequence(year))

  for (let attempt = 0; attempt < ORDER_NUMBER_RETRY_LIMIT; attempt++) {
    try {
      return await db.order.create({
        data: {
          ...data,
          orderNumber: formatOrderNumber(year, sequence)
        },
        ...(include ? { include } : {})
      })
    } catch (error) {
      if (!isOrderNumberConflict(error) || attempt === ORDER_NUMBER_RETRY_LIMIT - 1) {
        throw error
      }

      sequence = await getNextOrderSequence(year)
    }
  }

  throw new Error('Failed to generate a unique order number')
}

const getCartGroupNumber = (meta: unknown): string | null => {
  if (!meta || typeof meta !== 'object') {
    return null
  }

  const cartGroup = (meta as Record<string, any>).cartGroup
  return typeof cartGroup?.groupNumber === 'string' ? cartGroup.groupNumber : null
}

const getGroupedOrders = async ({
  currentOrderId,
  meta,
  userId,
  guestEmail
}: {
  currentOrderId: number
  meta: unknown
  userId?: number
  guestEmail?: string
}) => {
  if (isParentMultiItemOrder(meta)) {
    return {
      cartGroupNumber: null,
      groupedOrders: []
    }
  }

  const cartGroupNumber = getCartGroupNumber(meta)
  if (!cartGroupNumber || (!userId && !guestEmail)) {
    return {
      cartGroupNumber,
      groupedOrders: []
    }
  }

  const groupedOrders = await db.order.findMany({
    where: {
      meta: {
        path: ['cartGroup', 'groupNumber'],
        equals: cartGroupNumber
      },
      ...(userId ? { userId } : { guestEmail: guestEmail || undefined })
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryStatus: true,
      total: true,
      createdAt: true,
      quantity: true,
      quantityDelivered: true,
      product: {
        select: {
          id: true,
          name: true,
          platform: true,
          type: true
        }
      }
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  })

  return {
    cartGroupNumber,
    groupedOrders: groupedOrders.map((groupedOrder) => ({
      ...groupedOrder,
      isCurrentOrder: groupedOrder.id === currentOrderId
    }))
  }
}

// ================================
// ORDER MANAGEMENT
// ================================

/**
 * Create new order - production version with payment integration
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const rawGuestEmail = req.body.guestEmail

    // Validate user authentication or guest email
    if (!userId && !rawGuestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    // Validate request body
    const validatedData = CreateOrderSchema.parse({
      ...req.body,
      userId: userId || undefined,
      guestEmail: rawGuestEmail || undefined
    })

    let effectiveOrderUserId = userId || undefined
    let guestEmail = validatedData.guestEmail?.trim().toLowerCase() || undefined

    if (!userId && guestEmail) {
      const guestUser = await userService.ensureGuestCheckoutUser({
        email: guestEmail,
        firstName: validatedData.customerName || null,
        phone: validatedData.customerPhone || null,
        ipAddress: getClientIP(req)
      })

      guestEmail = guestUser.guestEmail
      effectiveOrderUserId = guestUser.userId || undefined
    }

    if (!validatedData || !validatedData.productId) {
      throw new Error('Invalid product ID')
    }

    // Get product details
    const product = await db.product.findFirst({
      where: { id: validatedData.productId, deletedAt: null },
      select: {
        id: true,
        name: true,
        price: true,
        stockCount: true,
        isActive: true,
        platform: true,
        type: true,
        minQuantity: true,
        maxQuantity: true
      }
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${validatedData.productId} not found`
      })
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is not available`
      })
    }

    // Validate quantity against product limits
    const minQuantity = product.minQuantity || 1
    const maxQuantity = getEffectiveMaxQuantity(product)
    
    if (validatedData.quantity < minQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum quantity for "${product.name}" is ${minQuantity}. You ordered ${validatedData.quantity}.`
      })
    }

    if (validatedData.quantity > maxQuantity) {
      return res.status(400).json({
        success: false,
        message: `Maximum quantity per order for "${product.name}" is ${maxQuantity}. You ordered ${validatedData.quantity}.`
      })
    }

    // Validate stock before allowing order creation
    // For non-transfer products, check stock availability
    if (
      !PREMIUM_PRODUCT_TYPES.has(String(product.type)) &&
      !isTelegramTransferProduct(product)
    ) {
      if (product.stockCount < validatedData.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stockCount}, Requested: ${validatedData.quantity}`,
        })
      }
    }

    // Check if this is a transfer product
    let hasTransferProducts = false
    if (isTelegramTransferProduct(product)) {
      hasTransferProducts = true

      // Validate customerTelegram is provided for transfer products
      if (!validatedData.customerTelegram) {
        return res.status(400).json({
          success: false,
          message: `Telegram phone number is required for transfer product "${product.name}"`
        })
      }
    }

    // Calculate order totals
    const unitPrice = Number(product.price)
    const subtotal = unitPrice * validatedData.quantity
    let discount = 0 // Don't accept discount from user input - calculate from subscriptions/coupons/rank
    let total = Math.max(0, subtotal - discount)

    // Apply subscription discount if user has active subscription
    let subscriptionDiscount = 0
    let subscriptionInfo = null
    if (userId) {
      try {
        const subscriptionResult = await subscriptionService.applySubscriptionDiscount(
          userId,
          subtotal
        )
        if (subscriptionResult.discount > 0) {
          subscriptionDiscount = subscriptionResult.discount
          subscriptionInfo = {
            packageName: subscriptionResult.packageName,
            discountPercent: subscriptionResult.discountPercent,
            discountAmount: subscriptionDiscount
          }
          // Add subscription discount to total discount
          discount += subscriptionDiscount
          total = Math.max(0, subtotal - discount)
        }
      } catch (error) {
        // If subscription check fails, continue without subscription discount
        console.error('Failed to check subscription discount:', error)
      }
    }

    // Apply rank discount if user has a rank
    let rankDiscount = 0
    let rankInfo = null
    if (userId) {
      try {
        const rankResult = await rankService.getUserRankDiscount(userId, subtotal)
        if (rankResult.discount > 0) {
          rankDiscount = rankResult.discount
          rankInfo = {
            rankName: rankResult.rankName,
            discountPercent: rankResult.discountPercent,
            discountAmount: rankDiscount
          }
          // Add rank discount to total discount
          discount += rankDiscount
          total = Math.max(0, subtotal - discount)
        }
      } catch (error) {
        // If rank check fails, continue without rank discount
        console.error('Failed to check rank discount:', error)
      }
    }

    // Apply coupon discount if coupon code provided
    let couponDiscount = 0
    let couponInfo = null
    let appliedCoupon = null
    if (validatedData.couponCode && (userId || guestEmail)) {
      try {
        const couponResult = await couponService.applyCoupon({
          code: validatedData.couponCode,
          orderAmount: subtotal,
          productIds: [validatedData.productId],
          userId: effectiveOrderUserId,
          guestEmail
        })

        if (couponResult.success && couponResult.discountAmount > 0) {
          couponDiscount = couponResult.discountAmount
          appliedCoupon = couponResult.coupon
          couponInfo = {
            code: validatedData.couponCode,
            discountAmount: couponDiscount,
            discountPercent:
              appliedCoupon?.type === 'PERCENTAGE' ? Number(appliedCoupon.discountValue) : undefined
          }
          // Add coupon discount to total discount
          discount += couponDiscount
          total = Math.max(0, subtotal - discount)
        } else if (!couponResult.success) {
          // Return error if coupon validation fails
          return res.status(400).json({
            success: false,
            message: couponResult.reason || 'Invalid coupon code'
          })
        }
      } catch (error) {
        // If coupon check fails, return error
        console.error('Failed to apply coupon:', error)
        return res.status(400).json({
          success: false,
          message: 'Failed to apply coupon. Please try again or proceed without coupon.'
        })
      }
    }

    // Create order - DO NOT update stock yet (wait for payment)
    const order: any = await createOrderWithUniqueNumber({
      data: {
        userId: effectiveOrderUserId,
        guestEmail: guestEmail || undefined,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        productId: validatedData.productId,
        quantity: validatedData.quantity,
        unitPrice,
        subtotal,
        discount,
        total,
        status: 'PENDING', // Wait for payment
        deliveryStatus: 'PENDING',
        // Initialize backorder tracking fields
        quantityOrdered: validatedData.quantity,
        quantityDelivered: 0,
        quantityPending: validatedData.quantity, // All pending initially
        meta: {
          ...validatedData.meta,
          notes: validatedData.notes,
          // Store customerTelegram for transfer products
          ...(hasTransferProducts && validatedData.customerTelegram
            ? { customerTelegram: validatedData.customerTelegram }
            : {}),
          // Store subscription discount info if applied
          ...(subscriptionInfo ? { subscription: subscriptionInfo } : {}),
          // Store rank discount info if applied
          ...(rankInfo ? { rank: rankInfo } : {}),
          // Store coupon discount info if applied
          ...(couponInfo ? { coupon: couponInfo } : {})
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            type: true,
            sku: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true
          }
        }
      }
    })

    // Create coupon usage record if coupon was applied
    if (appliedCoupon && couponDiscount > 0 && (userId || guestEmail)) {
      try {
        await db.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            orderId: order.id,
            userId: effectiveOrderUserId,
            guestEmail: guestEmail || undefined,
            discountAmount: couponDiscount,
            orderAmount: Number(subtotal)
          }
        })
      } catch (error) {
        // Don't fail order creation if coupon usage record fails
        console.error('Failed to create coupon usage record:', error)
      }
    }

    // Return order details with instructions to initiate payment
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully. Please proceed to payment.'
    })
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create order'
    })
  }
}

// ================================
// CART CHECKOUT (MULTI-ITEM)
// ================================

const CartCheckoutSchema = z.object({
  guestEmail: z.string().email().optional(),
  couponCode: z.string().optional(),
  customerName: z.string().max(255).optional(),
  customerPhone: z.string().optional(),
  notes: z.string().max(1000).optional(),
  meta: z.record(z.string(), z.any()).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(10000),
        customerTelegram: z.string().optional(),
        clientInput: z.string().optional(),
        telegramUsername: z.string().optional(), // For premium orders
        premiumTargets: z.array(z.string().min(1)).optional()
      })
    )
    .min(1, 'Cart must contain at least 1 item')
})

/**
 * Create multiple orders from cart items (one order per item)
 * Links them via `meta.cartGroup.groupNumber` for tracking/mixed orders.
 */
export const createCartOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const rawGuestEmail = req.body.guestEmail

    if (!userId && !rawGuestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    const validated = CartCheckoutSchema.parse({
      ...req.body,
      guestEmail: rawGuestEmail || undefined
    })

    let effectiveOrderUserId = userId || undefined
    let guestEmail = validated.guestEmail?.trim().toLowerCase() || undefined

    if (!userId && guestEmail) {
      const guestUser = await userService.ensureGuestCheckoutUser({
        email: guestEmail,
        firstName: validated.customerName || null,
        phone: validated.customerPhone || null,
        ipAddress: getClientIP(req)
      })

      guestEmail = guestUser.guestEmail
      effectiveOrderUserId = guestUser.userId || undefined
    }

    // Fetch all products once
    const productIds = validated.items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
        platform: true,
        type: true,
        sku: true,
        meta: true,
        stockCount: true,
        minQuantity: true,
        maxQuantity: true,
        thumbnail: true
      }
    })

    const productById = new Map(products.map((p) => [p.id, p]))

    // Validate products, stock, and transfer-required fields
    for (const item of validated.items) {
      const product = productById.get(item.productId)
      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: `Product not available: ${item.productId}`
        })
      }

      const minQuantity = product.minQuantity || 1
      const maxQuantity = getEffectiveMaxQuantity(product)

      if (item.quantity < minQuantity) {
        return res.status(400).json({
          success: false,
          message: `Minimum quantity for "${product.name}" is ${minQuantity}. You ordered ${item.quantity}.`
        })
      }

      if (item.quantity > maxQuantity) {
        return res.status(400).json({
          success: false,
          message: `Maximum quantity per order for "${product.name}" is ${maxQuantity}. You ordered ${item.quantity}.`
        })
      }

      // Validate stock before allowing order creation
      // For non-transfer products, check stock availability
      if (
        !PREMIUM_PRODUCT_TYPES.has(String(product.type)) &&
        !isTelegramTransferProduct(product)
      ) {
        if (product.stockCount < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.name}". Available: ${product.stockCount}, Requested: ${item.quantity}`
          })
        }
      }

      if (product.type === 'SERVICE' || isTelegramTransferProduct(product)) {
        if (isTelegramTransferProduct(product)) {
          if (!item.customerTelegram) {
            return res.status(400).json({
              success: false,
              message: `Telegram phone number is required for transfer product "${product.name}"`
            })
          }
        } else {
          // Generic SERVICE products require clientInput
          if (!item.clientInput) {
            const meta = (product.meta as any) || {}
            const label = meta?.clientInputLabel || 'client input'
            return res.status(400).json({
              success: false,
              message: `${label} is required for service product "${product.name}"`
            })
          }
        }
      }
    }

    const cartGroupNumber = `CART-${new Date().getFullYear()}-${Date.now()}`

    // Totals (pre-discount) for coupon allocation
    const itemSubtotals = validated.items.map((item) => {
      const product = productById.get(item.productId)!
      const unitPrice = Number(product.price)
      const subtotal = unitPrice * item.quantity
      return { productId: item.productId, unitPrice, subtotal }
    })

    const totalSubtotal = itemSubtotals.reduce((sum, i) => sum + i.subtotal, 0)

    // Resolve coupon ONCE across the whole cart (user or guest)
    let totalCouponDiscount = 0
    let appliedCoupon: any = null
    if (validated.couponCode && (userId || guestEmail)) {
      const couponResult = await couponService.applyCoupon({
        code: validated.couponCode,
        orderAmount: totalSubtotal,
        productIds,
        userId: effectiveOrderUserId,
        guestEmail
      })

      if (!couponResult.success) {
        return res.status(400).json({
          success: false,
          message: couponResult.reason || 'Invalid coupon code'
        })
      }

      totalCouponDiscount = couponResult.discountAmount || 0
      appliedCoupon = couponResult.coupon || null
    }

    // Allocate coupon discount across items proportionally (ensure sum matches by fixing last item)
    const couponShares = validated.items.map((item, idx) => {
      if (!totalCouponDiscount || totalSubtotal <= 0) return 0
      const itemSubtotal = itemSubtotals[idx]?.subtotal || 0
      const base = itemSubtotal / totalSubtotal
      // round to 2 decimals
      return Math.round(totalCouponDiscount * base * 100) / 100
    })
    if (totalCouponDiscount > 0 && couponShares.length > 0) {
      const sumShares = couponShares.reduce((sum, v) => sum + v, 0)
      const diff = Math.round((totalCouponDiscount - sumShares) * 100) / 100
      const lastIndex = couponShares.length - 1
      couponShares[lastIndex] = Math.round(((couponShares[lastIndex] || 0) + diff) * 100) / 100
    }

    const initialOrderSequence = await getNextOrderSequence(new Date().getFullYear())

    const createdOrders: any[] = []
    let aggregatedDiscount = 0

    for (let idx = 0; idx < validated.items.length; idx++) {
      const item = validated.items[idx]!
      const product = productById.get(item.productId)!

      const unitPrice = Number(product.price)
      const subtotal = unitPrice * item.quantity
      let discount = 0

      // Subscription discount (per-item, same as existing single-order logic)
      let subscriptionInfo = null
      if (userId) {
        try {
          const subscriptionResult = await subscriptionService.applySubscriptionDiscount(userId, subtotal)
          if (subscriptionResult.discount > 0) {
            discount += subscriptionResult.discount
            subscriptionInfo = {
              packageName: subscriptionResult.packageName,
              discountPercent: subscriptionResult.discountPercent,
              discountAmount: subscriptionResult.discount
            }
          }
        } catch (error) {
          console.error('[CartCheckout] subscription discount failed:', error)
        }
      }

      // Rank discount (per-item, same as existing single-order logic)
      let rankInfo = null
      if (userId) {
        try {
          const rankResult = await rankService.getUserRankDiscount(userId, subtotal)
          if (rankResult.discount > 0) {
            discount += rankResult.discount
            rankInfo = {
              rankName: rankResult.rankName,
              discountPercent: rankResult.discountPercent,
              discountAmount: rankResult.discount
            }
          }
        } catch (error) {
          console.error('[CartCheckout] rank discount failed:', error)
        }
      }

      // Coupon share (allocated)
      const couponShare = couponShares[idx] || 0
      if (couponShare > 0) {
        discount += couponShare
      }

      const total = Math.max(0, subtotal - discount)

      const meta: any = {
        ...validated.meta,
        notes: validated.notes,
        cartGroup: {
          groupNumber: cartGroupNumber,
          isPrimary: false,
          index: idx,
          count: validated.items.length,
          hiddenFromCustomer: true
        },
        ...(isTelegramTransferProduct(product) && item.customerTelegram
          ? { customerTelegram: item.customerTelegram }
          : {}),
        ...(product.type === 'SERVICE' && product.platform !== 'TELEGRAM' && item.clientInput
          ? { clientInput: item.clientInput }
          : {}),
        // Add Telegram username for premium orders
        ...(item.telegramUsername
          ? { telegramUsername: item.telegramUsername }
          : {}),
        ...(item.premiumTargets?.length
          ? {
              premiumTargets: item.premiumTargets
                .map((value) => value.trim())
                .filter(Boolean)
            }
          : {}),
        ...(subscriptionInfo ? { subscription: subscriptionInfo } : {}),
        ...(rankInfo ? { rank: rankInfo } : {})
      }

      const order = await createOrderWithUniqueNumber({
        data: {
          userId: effectiveOrderUserId,
          guestEmail: guestEmail || undefined,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          discount,
          total,
          status: 'PENDING',
          deliveryStatus: 'PENDING',
          quantityOrdered: item.quantity,
          quantityDelivered: 0,
          quantityPending: item.quantity,
          meta
        },
        include: {
          product: {
            select: { id: true, name: true, platform: true, type: true, sku: true, price: true }
          }
        },
        initialSequence: initialOrderSequence + idx
      })

      createdOrders.push(order)
      aggregatedDiscount += discount
    }

    const summaryItems = validated.items.map((item, idx) => {
      const product = productById.get(item.productId)!
      const childOrder = createdOrders[idx]!
      const itemSubtotal = itemSubtotals[idx]
      return {
        productId: item.productId,
        productName: product.name,
        productPlatform: product.platform,
        productType: product.type,
        productSku: product.sku,
        productThumbnail: product.thumbnail || null,
        quantity: item.quantity,
        unitPrice: itemSubtotal?.unitPrice || Number(product.price),
        subtotal: itemSubtotal?.subtotal || Number(product.price) * item.quantity,
        discount: Number(childOrder.discount),
        total: Number(childOrder.total),
        childOrderId: childOrder.id,
        childOrderNumber: childOrder.orderNumber
      }
    })

    const totalQuantity = validated.items.reduce((sum, item) => sum + item.quantity, 0)
    const parentOrder: any = await createOrderWithUniqueNumber({
      data: {
        userId: effectiveOrderUserId,
        guestEmail: guestEmail || undefined,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        productId: validated.items[0]!.productId,
        quantity: totalQuantity,
        unitPrice: totalSubtotal,
        subtotal: totalSubtotal,
        discount: aggregatedDiscount,
        total: totalSubtotal - aggregatedDiscount,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        quantityOrdered: totalQuantity,
        quantityDelivered: 0,
        quantityPending: totalQuantity,
        meta: {
          ...validated.meta,
          notes: validated.notes,
          cartGroup: {
            groupNumber: cartGroupNumber,
            isPrimary: true,
            count: validated.items.length
          },
          multiItemOrder: {
            isParent: true,
            childOrderIds: createdOrders.map((order: any) => order.id),
            items: summaryItems
          },
          ...(appliedCoupon && totalCouponDiscount > 0 && validated.couponCode
            ? {
                coupon: {
                  code: validated.couponCode,
                  discountAmount: totalCouponDiscount,
                  discountPercent:
                    appliedCoupon?.type === 'PERCENTAGE'
                      ? Number(appliedCoupon.discountValue)
                      : undefined
                }
              }
            : {})
        }
      },
      include: {
        product: {
          select: { id: true, name: true, platform: true, type: true, sku: true, price: true }
        }
      },
      initialSequence: initialOrderSequence + createdOrders.length
    })

    await Promise.all(
      createdOrders.map((order: any) =>
        db.order.update({
          where: { id: order.id },
          data: {
            meta: {
              ...((order.meta as any) || {}),
              cartGroup: {
                ...(((order.meta as any)?.cartGroup as any) || {}),
                parentOrderId: parentOrder.id,
                parentOrderNumber: parentOrder.orderNumber
              }
            }
          }
        })
      )
    )

    // Record coupon usage ONCE (primary order)
    if (appliedCoupon && totalCouponDiscount > 0 && (userId || guestEmail)) {
      try {
        await db.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            orderId: parentOrder.id,
            userId: effectiveOrderUserId,
            guestEmail: guestEmail || undefined,
            discountAmount: totalCouponDiscount,
            orderAmount: Number(totalSubtotal)
          }
        })
      } catch (error) {
        console.error('[CartCheckout] Failed to record coupon usage:', error)
      }
    }

    // Clear authenticated user's cart after converting to orders (guest cart stays local)
    if (userId) {
      try {
        const cart = await db.cart.findUnique({ where: { userId }, select: { id: true } })
        if (cart) {
          await db.cartItem.deleteMany({ where: { cartId: cart.id } })
        }
      } catch (error) {
        console.error('[CartCheckout] Failed to clear cart:', error)
      }
    }

    // Guest access code logic
    if (guestEmail) {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry
      const guestAccessOrderNumber = parentOrder.orderNumber
      // Store in GuestAccess
      await db.guestAccess.create({
        data: {
          email: guestEmail,
          cartGroup: guestAccessOrderNumber,
          code,
          expiresAt
        }
      });
      // Send email
      await sendEmail(
        guestEmail,
        `Your Order Access Code`,
        `Hello,\n\nYour access code for viewing your order is: ${code}\n\nThis code will expire in 15 minutes.\n\nOrder Number: ${guestAccessOrderNumber}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nYour Company Team`
      );
    }

    const customerEmailForNotifications =
      guestEmail ||
      (effectiveOrderUserId
        ? (await db.user.findUnique({
            where: { id: effectiveOrderUserId },
            select: { email: true }
          }))?.email
        : undefined)


    return res.status(201).json({
      success: true,
      data: {
        cartGroupNumber,
        order: { id: parentOrder.id, orderNumber: parentOrder.orderNumber, total: parentOrder.total },
        orders: createdOrders.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber, total: o.total }))
      },
      message: 'Checkout order created successfully. Please proceed to payment.'
    })
  } catch (error) {
    console.error('[CartCheckout] createCartOrders error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create cart orders'
    })
  }
}

/**
 * Get orders for admin
 */
export const getOrdersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const validatedQuery = OrderQuerySchema.parse(req.query)

    const where: Prisma.OrderWhereInput = {}

    // Apply filters
    if (validatedQuery.status) {
      where.status = validatedQuery.status
    }

    if (validatedQuery.userId) {
      where.userId = validatedQuery.userId
    }

    if (validatedQuery.guestEmail) {
      where.guestEmail = {
        contains: validatedQuery.guestEmail,
        mode: 'insensitive'
      }
    }

    if (validatedQuery.userBanStatus) {
      where.user = {
        is: {
          isBanned: validatedQuery.userBanStatus === 'BANNED'
        }
      }
    }

    if (validatedQuery.deliveryStatus) {
      where.deliveryStatus = validatedQuery.deliveryStatus
    }

    if (validatedQuery.startDate || validatedQuery.endDate) {
      where.createdAt = {}
      if (validatedQuery.startDate) {
        where.createdAt.gte = new Date(validatedQuery.startDate)
      }
      if (validatedQuery.endDate) {
        where.createdAt.lte = new Date(validatedQuery.endDate)
      }
    }

    if (validatedQuery.search) {
      where.OR = [
        { orderNumber: { contains: validatedQuery.search, mode: 'insensitive' } },
        { customerName: { contains: validatedQuery.search, mode: 'insensitive' } },
        { guestEmail: { contains: validatedQuery.search, mode: 'insensitive' } },
        { user: { is: { email: { contains: validatedQuery.search, mode: 'insensitive' } } } },
        { user: { is: { firstName: { contains: validatedQuery.search, mode: 'insensitive' } } } },
        { user: { is: { username: { contains: validatedQuery.search, mode: 'insensitive' } } } }
      ]
    }

    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliveryStatus: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
          discount: true,
          total: true,
          createdAt: true,
          deliveredAt: true,
          quantityOrdered: true,
          quantityDelivered: true,
          quantityPending: true,
          guestEmail: true,
          customerName: true,
          customerPhone: true,
          payment: {
            select: {
              status: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              username: true,
              telegramUsername: true,
              isBanned: true,
              banReason: true
            }
          },
          product: {
            select: {
              id: true,
              thumbnail: true,
              name: true,
              platform: true,
              sku: true
            }
          }
        },
        orderBy: {
          [validatedQuery.sortBy]: validatedQuery.sortOrder
        },
        ...(validatedQuery.userId
          ? {}
          : {
              skip: (validatedQuery.page - 1) * validatedQuery.limit,
              take: validatedQuery.limit
            })
      }),
      db.order.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / validatedQuery.limit)

    res.json({
      success: true,
      orders,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: totalCount,
        totalPages,
        hasNext: validatedQuery.page < totalPages,
        hasPrev: validatedQuery.page > 1
      },
      message: 'Orders retrieved successfully'
    })
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve orders'
    })
  }
}
/**
 * Get customer's orders
 */
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    const validatedQuery = OrderQuerySchema.parse(req.query)

    const where: any = {
      OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(Boolean)
    }

    // Apply filters
    if (validatedQuery.status) {
      where.status = validatedQuery.status
    }

    if (validatedQuery.deliveryStatus) {
      where.deliveryStatus = validatedQuery.deliveryStatus
    }

    if (validatedQuery.startDate || validatedQuery.endDate) {
      where.createdAt = {}
      if (validatedQuery.startDate) {
        where.createdAt.gte = new Date(validatedQuery.startDate)
      }
      if (validatedQuery.endDate) {
        where.createdAt.lte = new Date(validatedQuery.endDate)
      }
    }

    if (validatedQuery.search) {
      where.OR = [
        { orderNumber: { contains: validatedQuery.search, mode: 'insensitive' } },
        { customerName: { contains: validatedQuery.search, mode: 'insensitive' } }
      ]
    }

    if (validatedQuery.productType) {
      where.product = where.product || {}
      if (validatedQuery.productType === 'TELEGRAM_ACCOUNTS') {
        where.product.OR = [
          { type: 'TELEGRAM_ACCOUNTS' },
          { platform: 'TELEGRAM', type: 'ACCOUNT' }
        ]
      } else {
        where.product.type = validatedQuery.productType
      }
    }

    const allOrders = await db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        subtotal: true,
        discount: true,
        total: true,
        createdAt: true,
        deliveredAt: true,
        quantity: true,
        quantityOrdered: true,
        quantityDelivered: true,
        quantityPending: true,
        meta: true,
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            sku: true,
            type: true,
            thumbnail: true
          }
        },
        telegramTransfer: {
          select: {
            id: true,
            status: true,
            targetUrl: true,
            customerTelegram: true,
            joinVerified: true,
            transferCompletedAt: true,
            transferStartedAt: true,
            joinVerifiedAt: true,
            failureReason: true,
            transferProofUrl: true,
            createdAt: true,
            updatedAt: true,
            meta: true
          }
        }
      },
      orderBy: {
        [validatedQuery.sortBy]: validatedQuery.sortOrder
      }
    })

    const visibleOrders = allOrders.filter((order) => !isHiddenChildOrder(order.meta))
    const totalCount = visibleOrders.length
    const paginatedOrders = visibleOrders.slice(
      (validatedQuery.page - 1) * validatedQuery.limit,
      validatedQuery.page * validatedQuery.limit
    )
    const totalPages = Math.ceil(totalCount / validatedQuery.limit)

      res.json({
        success: true,
        orders: paginatedOrders.map((order) => {
          const items = buildMultiItemOrderItems(order as any)
          const isGroupedOrder = isParentMultiItemOrder(order.meta) || items.length > 1
          const displayProduct = buildOrderDisplayProduct(order as any)
          const canRequestOtp =
            !isGroupedOrder &&
            displayProduct?.platform === 'TELEGRAM' &&
            (displayProduct?.type === 'ACCOUNT' || displayProduct?.type === 'TELEGRAM_ACCOUNTS')

          return {
            ...order,
            items,
            product: displayProduct,
            isGroupedOrder,
            canRequestOtp
          }
        }),
        pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: totalCount,
        totalPages,
        hasNext: validatedQuery.page < totalPages,
        hasPrev: validatedQuery.page > 1
      },
      message: 'Orders retrieved successfully'
    })
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve orders'
    })
  }
}

/**
 * Get single order by ID for Admin
 */
export const getOrderByIdAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    const order = await db.order.findFirst({
      where: {
        id: orderId
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        quantity: true,
        unitPrice: true,
        subtotal: true,
        discount: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        deliveredAt: true,
        userId: true,
        quantityOrdered: true,
        quantityDelivered: true,
        quantityPending: true,
        guestEmail: true,
        customerName: true,
        customerPhone: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            username: true,
            phone: true,
            country: true,
            isGuest: true,
            telegramUsername: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            sku: true,
            type: true,
            thumbnail: true
          }
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAmount: true,
            gateway: true,
            createdAt: true,
            paidAt: true,
            method: {
              select: {
                name: true,
                gateway: true
              }
            }
          }
        },
        deliveries: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            accounts: true,
            createdAt: true,
            deliveredAt: true,
            downloadCount: true,
            format: true,
            fileUrl: true,
            meta: true
          }
        },
        telegramTransfer: {
          select: {
            id: true,
            status: true,
            targetUrl: true,
            customerTelegram: true,
            joinVerified: true,
            transferCompletedAt: true,
            transferProofUrl: true,
            failureReason: true,
            createdAt: true,
            updatedAt: true
          }
        },
        meta: true
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    const decryptedAccounts = await decryptAssignedAccounts(order.id)
    const deliveries = mapDeliveries(order.deliveries)
    const latestDelivery = deliveries[0]
    const latestDeliveryAccounts =
      latestDelivery && Array.isArray(latestDelivery.accounts) && latestDelivery.accounts.length > 0
        ? latestDelivery.accounts
        : normalizeDeliveryAccounts(decryptedAccounts)
    let orderItems = buildMultiItemOrderItems(order as any)
    let itemDetails = await Promise.all(
      orderItems.map((item: any) => getAdminPurchasedItemDetail(order, item))
    )

    // Calculate user statistics if user exists
    let userStats = null
    if (order.userId) {
      const [totalOrders, totalSpentResult] = await Promise.all([
        db.order.count({
          where: {
            userId: order.userId,
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        }),
        db.order.aggregate({
          where: {
            userId: order.userId,
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          },
          _sum: {
            total: true
          }
        })
      ])

      userStats = {
        totalOrders,
        totalSpent: Number(totalSpentResult._sum.total?.toString() || 0)
      }
    }

    if (isParentMultiItemOrder(order.meta)) {
      const childOrderIds = getChildOrderIds(order.meta)

      if (childOrderIds.length > 0) {
        const childOrders = await db.order.findMany({
          where: {
            id: { in: childOrderIds }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveryStatus: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            total: true,
            quantityDelivered: true,
            quantityPending: true,
            meta: true,
            product: {
              select: {
                id: true,
                name: true,
                platform: true,
                sku: true,
                type: true,
                thumbnail: true
              }
            },
            deliveries: {
              orderBy: {
                createdAt: 'desc'
              },
              select: {
                id: true,
                status: true,
                accounts: true,
                createdAt: true,
                deliveredAt: true,
                downloadCount: true,
                format: true,
                fileUrl: true,
                meta: true
              }
            },
            telegramTransfer: {
              select: {
                id: true,
                status: true,
                targetUrl: true,
                customerTelegram: true,
                joinVerified: true,
                transferCompletedAt: true,
                transferProofUrl: true,
                failureReason: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        })

        orderItems = attachChildOrderStateToItems(orderItems, childOrders)
        const childOrderById = new Map(childOrders.map((childOrder) => [childOrder.id, childOrder]))
        itemDetails = await Promise.all(
          orderItems.map((item: any) =>
            getAdminPurchasedItemDetail(
              childOrderById.get(Number(item.childOrderId || item.id)) || order,
              item
            )
          )
        )
      }
    }

    res.json({
      success: true,
      data: {
        ...order,
        items: orderItems,
        itemDetails,
        deliveries,
        telegramAccounts: latestDeliveryAccounts,
        clientInput: (order.meta as any)?.clientInput || null,
        serviceNotes:
          (order.meta as any)?.serviceFulfillment?.fulfillmentNotes ||
          (order.meta as any)?.notes ||
          null,
        fulfillmentHistory: (order.meta as any)?.fulfillmentHistory || [],
        user: order.user
          ? {
              ...order.user,
              ...userStats
            }
          : null,
        payment: order.payment
          ? {
              ...order.payment,
              method: order.payment.method?.name || order.payment.gateway
            }
          : null
      },
      message: 'Order retrieved successfully'
    })
  } catch (error) {
    console.error('Get order by ID error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve order'
    })
  }
}
/**
 * Get single order by ID
 */
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        quantity: true,
        unitPrice: true,
        subtotal: true,
        discount: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        deliveredAt: true,
        guestEmail: true,
        customerName: true,
        customerPhone: true,
        quantityOrdered: true,
        quantityDelivered: true,
        quantityPending: true,
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            sku: true,
            type: true,
            thumbnail: true
          }
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAmount: true,
            gateway: true,
            gatewayTxnId: true,
            gatewayStatus: true,
            binanceOrderId: true,
            binanceStatus: true,
            meta: true,
            createdAt: true,
            paidAt: true,
            method: {
              select: {
                name: true,
                gateway: true
              }
            }
          }
        },
        deliveries: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            accounts: true,
            createdAt: true,
            deliveredAt: true,
            downloadCount: true,
            format: true,
            fileUrl: true,
            meta: true
          }
        },
        telegramTransfer: {
          select: {
            id: true,
            status: true,
            targetUrl: true,
            customerTelegram: true,
            joinVerified: true,
            transferCompletedAt: true,
            failureReason: true,
            transferProofUrl: true,
            createdAt: true,
            updatedAt: true,
            meta: true
          }
        },
        meta: true
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    let deliveries = mapDeliveries(order.deliveries)
    let fallbackAccounts =
      deliveries[0]?.accounts && deliveries[0].accounts.length > 0
        ? deliveries[0].accounts
        : normalizeDeliveryAccounts(await decryptAssignedAccounts(order.id))
    let orderItems = buildMultiItemOrderItems(order as any)
    let responseProduct = buildOrderDisplayProduct(order as any)
    let responseOrder = order

    if (isParentMultiItemOrder(order.meta)) {
      const childOrderIds = getChildOrderIds(order.meta)

      if (childOrderIds.length > 0) {
        const childOrders = await db.order.findMany({
          where: {
            id: { in: childOrderIds }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveryStatus: true,
            quantityOrdered: true,
            quantityDelivered: true,
            quantityPending: true,
            deliveredAt: true,
            deliveries: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                accounts: true,
                createdAt: true,
                deliveredAt: true,
                downloadCount: true,
                format: true,
                fileUrl: true,
                meta: true
              }
            }
          }
        })

        const aggregatedDeliveries = childOrders.flatMap((childOrder) => mapDeliveries(childOrder.deliveries))
        deliveries = aggregatedDeliveries.length > 0 ? aggregatedDeliveries : deliveries
        fallbackAccounts =
          deliveries[0]?.accounts && deliveries[0].accounts.length > 0
            ? deliveries[0].accounts
            : fallbackAccounts
        orderItems = attachChildOrderStateToItems(orderItems, childOrders)

        const quantityDelivered = childOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityDelivered || 0),
          0
        )
        const quantityPending = childOrders.reduce(
          (sum, childOrder) => sum + Number(childOrder.quantityPending || 0),
          0
        )
        const deliveryStatuses = new Set(childOrders.map((childOrder) => childOrder.deliveryStatus))

        responseOrder = {
          ...order,
          quantityDelivered,
          quantityPending,
          deliveryStatus: deliveryStatuses.has('PARTIAL')
            ? 'PARTIAL'
            : deliveryStatuses.has('PROCESSING')
              ? 'PROCESSING'
              : deliveryStatuses.has('DELIVERED')
                ? 'DELIVERED'
                : order.deliveryStatus,
          deliveredAt:
            childOrders
              .map((childOrder) => childOrder.deliveredAt)
              .filter(Boolean)
              .sort((left, right) => (right!.getTime() - left!.getTime()))[0] || order.deliveredAt
        } as typeof order
      }
    }

    const { cartGroupNumber, groupedOrders } = await getGroupedOrders({
      currentOrderId: order.id,
      meta: order.meta,
      userId,
      guestEmail
    })
    const { meta: _meta, ...orderData } = order

    res.json({
      success: true,
      data: {
        ...orderData,
        ...responseOrder,
        product: responseProduct,
        items: orderItems,
        deliveries,
        deliveryAccounts: fallbackAccounts,
        telegramAccounts: fallbackAccounts,
        clientInput: (order.meta as any)?.clientInput || null,
        serviceNotes:
          (order.meta as any)?.serviceFulfillment?.fulfillmentNotes ||
          (order.meta as any)?.notes ||
          null,
        fulfillmentHistory: (order.meta as any)?.fulfillmentHistory || [],
        cartGroupNumber,
        groupedOrders,
        payment: order.payment
          ? {
              ...order.payment,
              method: order.payment.method?.name || order.payment.gateway
            }
          : null
      },
      message: 'Order retrieved successfully'
    })
  } catch (error) {
    console.error('Get order by ID error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve order'
    })
  }
}

/**
 * Get order by order number
 */
export const getOrderByNumber = async (req: AuthRequest, res: Response) => {
  try {
    const orderNumber = req.params.orderNumber
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    const order = await db.order.findFirst({
      where: {
        orderNumber,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            sku: true
          }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.json({
      success: true,
      data: order,
      message: 'Order retrieved successfully'
    })
  } catch (error) {
    console.error('Get order by number error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve order'
    })
  }
}

/**
 * Get delivery status for an order
 */
export const getOrderDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    // Verify order belongs to customer
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    const deliveryStatus = await orderService.getDeliveryStatus(orderId)

    res.json({
      success: true,
      data: deliveryStatus,
      message: 'Delivery status retrieved successfully'
    })
  } catch (error) {
    console.error('Get order delivery status error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get delivery status'
    })
  }
}

/**
 * Get customer's accessible accounts
 */
export const getAccessibleAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const guestEmail = req.query.guestEmail as string

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    const accounts = userId ? await orderService.getCustomerAccounts(userId) : [] // For guest users, return empty array or handle differently

    res.json({
      success: true,
      data: accounts,
      message: 'Accessible accounts retrieved successfully'
    })
  } catch (error) {
    console.error('Get accessible accounts error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve accessible accounts'
    })
  }
}

/**
 * Send OTP to customer email for order verification
 */
export const sendOrderOTP = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const userEmail = req.user?.email

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Check if user already created an OTP in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const recentOTP = await db.oTP.findFirst({
      where: {
        type: 'order_verification',
        email: userEmail,
        createdAt: {
          gte: twoMinutesAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (recentOTP) {
      const waitTimeSeconds = Math.ceil(
        (recentOTP.createdAt.getTime() + 2 * 60 * 1000 - Date.now()) / 1000
      )
      const waitTimeMinutes = Math.ceil(waitTimeSeconds / 60)
      const message =
        waitTimeSeconds >= 60
          ? `Please wait ${waitTimeMinutes} minute${waitTimeMinutes > 1 ? 's' : ''} before requesting a new OTP`
          : `Please wait ${waitTimeSeconds} seconds before requesting a new OTP`

      return res.status(429).json({
        success: false,
        message
      })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in database with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await db.oTP.create({
      data: {
        type: 'order_verification',
        otp,
        email: userEmail,
        expiresAt
      }
    })

    // Send OTP via email
    const emailSubject = 'Your Order Verification OTP - UHQ Accounts'
    const emailText = `
Hello,

Your OTP for order verification is: ${otp}

This OTP will expire in 10 minutes.
Please do not share this code with anyone.

Best regards,
UHQ Accounts Team
    `.trim()

    await sendEmail(userEmail, emailText, emailSubject)

    res.json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        expiresAt
      }
    })
  } catch (error) {
    console.error('Send order OTP error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send OTP'
    })
  }
}

/**
 * Verify OTP for order verification
 */
export const verifyOrderOTP = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const userEmail = req.user?.email
    const { otp } = req.body

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      })
    }

    // Find valid OTP
    const otpRecord = await db.oTP.findFirst({
      where: {
        type: 'order_verification',
        otp: otp.trim(),
        email: userEmail,
        expiresAt: {
          gte: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      })
    }

    // Delete the used OTP
    await db.oTP.delete({
      where: {
        id: otpRecord.id
      }
    })

    res.json({
      success: true,
      message: 'OTP verified successfully'
    })
  } catch (error) {
    console.error('Verify order OTP error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify OTP'
    })
  }
}

/**
 * Download invoice for customer's order
 */
export const getMyInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    // Verify order belongs to customer
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Generate PDF invoice
    const pdfDoc = await invoiceService.generateInvoicePDF(orderId)

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`)

    // Pipe the PDF document to the response
    pdfDoc.pipe(res)

    // End the PDF document (this will trigger the pipe to complete)
    pdfDoc.end()
  } catch (error) {
    console.error('Get invoice error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate invoice'
    })
  }
}

/**
 * View invoice in browser (HTML view)
 */
export const viewInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    // Verify order belongs to customer
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Generate HTML invoice
    const htmlInvoice = await invoiceService.generateInvoiceHTML(orderId)

    // Set response headers for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(htmlInvoice)
  } catch (error) {
    console.error('View invoice error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate invoice'
    })
  }
}

/**
 * Send invoice via email
 */
export const sendInvoiceEmail = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    // Verify order belongs to customer
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Send invoice email
    await invoiceService.sendInvoiceEmail(orderId)

    return res.json({
      success: true,
      message: 'Invoice sent successfully to your email'
    })
  } catch (error) {
    console.error('Send invoice email error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send invoice email'
    })
  }
}

/**
 * Get Telegram account details for a specific order
 * Retrieves phone number, password, and other account metadata
 */
export const getTelegramAccountDetails = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId!)
    const userId = req.user?.userId
    let guestEmail = req.query.guestEmail as string

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      })
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided'
      })
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail)
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message
        })
      }
      guestEmail = guestAccess.email
    }

    // Verify order belongs to customer and is a Telegram order
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        product: {
          platform: 'TELEGRAM',
          OR: [{ type: 'ACCOUNT' }, { type: 'TELEGRAM_ACCOUNTS' }]
        },
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        )
      },
      select: {
        deliveryStatus: true,
        product: true,
        deliveries: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            accounts: true
          }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Telegram account order not found'
      })
    }

    // Check if order is delivered
    if (order.deliveryStatus !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Order is not yet delivered'
      })
    }

    const accounts = normalizeDeliveryAccounts(order.deliveries[0]?.accounts)

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account details found for this order'
      })
    }

    res.json({
      success: true,
      accounts,
      message: 'Telegram account details retrieved successfully'
    })
  } catch (error) {
    console.error('Get Telegram account details error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get account details'
    })
  }
}
