import type { NextFunction, Request, Response } from 'express'
import db from '../../configs/db'
import { sendEmail } from '../../libs/email'
import { InvoiceService } from '../../services/invoice.service'
import { OrderService } from '../../services/order.services'
import type { AuthRequest } from '../../types/req-res'
import { TELEGRAM_TRANSFER_PRODUCT_TYPES, isTelegramTransferProduct } from '../../utils/product-type'
import { sendErrorResponse, sendSuccessResponse } from '../../utils'

function parseId(param?: string | undefined) {
  if (!param) return null
  const v = parseInt(param, 10)
  return isNaN(v) ? null : v
}

const orderService = new OrderService()
const invoiceService = new InvoiceService()

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { status, adminNotes } = req.body

    if (!orderId || !status) return sendErrorResponse(res, 'Order ID and status are required')

    const result = await orderService.updateStatus(orderId, status, adminNotes, {
      actorId: req.user?.userId,
      actorEmail: req.user?.email,
      source: status === 'COMPLETED' ? 'MANUAL_MARK_COMPLETED' : 'ADMIN_STATUS_UPDATE'
    })
    return sendSuccessResponse(res, result, 'Order status updated')
  } catch (error) {
    return next(error)
  }
}

export const updateOrderDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = parseId(req.params.id)
    const { deliveryStatus, note } = req.body
    if (!orderId || !deliveryStatus)
      return sendErrorResponse(res, 'Order ID and deliveryStatus are required')

    const result = await orderService.updateDeliveryStatus(orderId, deliveryStatus, {
      actorId: req.user?.userId,
      actorEmail: req.user?.email,
      note,
      source: deliveryStatus === 'DELIVERED' ? 'MANUAL_MARK_DELIVERED' : 'ADMIN_DELIVERY_STATUS_UPDATE'
    })
    return sendSuccessResponse(res, result, 'Order delivery status updated')
  } catch (error) {
    return next(error)
  }
}

export const manualAssignAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { quantity } = req.body

    if (!orderId || !quantity) return sendErrorResponse(res, 'Order ID and quantity are required')

    const accounts = await orderService.manualAssignAccounts(orderId, quantity)
    return sendSuccessResponse(res, accounts, 'Accounts assigned to order')
  } catch (error) {
    return next(error)
  }
}

export const forceDeliver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    const result = await orderService.forceDeliver(orderId)
    return sendSuccessResponse(res, result, 'Delivery attempted')
  } catch (error) {
    return next(error)
  }
}

export const refundOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { reason, refundTo } = req.body

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    // Validate refundTo if provided
    if (refundTo && !['BALANCE', 'GATEWAY'].includes(refundTo)) {
      return sendErrorResponse(res, 'Invalid refundTo value. Must be "BALANCE" or "GATEWAY"')
    }

    const result = await orderService.refundOrder(orderId, { reason, refundTo })
    return sendSuccessResponse(res, result, 'Order refunded')
  } catch (error) {
    return next(error)
  }
}

export const resendOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { reason, sendEmail = true, selectedOrderIds, resendAll } = req.body

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    const result = await orderService.resendOrder(orderId, reason, sendEmail, {
      selectedOrderIds,
      resendAll
    })
    return sendSuccessResponse(res, result, 'Order products resent successfully')
  } catch (error) {
    return next(error)
  }
}

export const replaceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { reason, replaceAll = true, accountIds } = req.body

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    const result = await orderService.replaceOrder(orderId, {
      reason,
      replaceAll,
      accountIds
    })
    return sendSuccessResponse(res, result, 'Order products replaced successfully')
  } catch (error) {
    return next(error)
  }
}

export const replaceProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)
    const { newProductId, quantity, reason } = req.body

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')
    if (!newProductId) return sendErrorResponse(res, 'New Product ID is required')

    const productId = parseId(newProductId)
    if (!productId) return sendErrorResponse(res, 'Invalid Product ID')

    // Quantity is optional - if not provided, use original order quantity
    const replacementQuantity = quantity ? parseInt(quantity) : undefined

    const result = await orderService.replaceProductForOrder(orderId, productId, reason, replacementQuantity)
    return sendSuccessResponse(res, result, 'Order product replaced successfully')
  } catch (error) {
    return next(error)
  }
}

export const getOrderDeliveryHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    const result = await orderService.getOrderDeliveryHistory(orderId)
    return sendSuccessResponse(res, result, 'Delivery history retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Delete order by ID (admin only).
 * Unlinks assigned accounts, then deletes order (cascades Payment, Delivery, etc.).
 */
export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    const result = await orderService.deleteOrder(orderId)
    return sendSuccessResponse(res, result, 'Order deleted successfully')
  } catch (error) {
    return next(error)
  }
}

export const downloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseId(req.params.id)

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')

    // Get order number for filename
    const order = await orderService.findById(orderId)

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`)

    // Generate PDF invoice and pipe to response
    const pdfDoc = await invoiceService.generateInvoicePDF(orderId)

    // Pipe the PDF document to the response
    pdfDoc.pipe(res)

    // End the PDF document (this will trigger the pipe to complete)
    pdfDoc.end()
  } catch (error) {
    return next(error)
  }
}

/**
 * Get service orders (manual fulfillment orders)
 */
export const getServiceOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1')
    const limit = parseInt((req.query.limit as string) || '10')
    const status = req.query.status as string | undefined
    const serviceType = req.query.serviceType as string | undefined
    const search = req.query.search as string | undefined

    const skip = (page - 1) * limit

    // Build base product filter for service orders
    const productFilter: any = {
      OR: [
        { type: 'SERVICE' },
        {
          platform: 'TELEGRAM',
          type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) }
        }
      ]
    }

    // Filter by service type
    if (serviceType && serviceType !== 'ALL') {
      if (serviceType === 'MANUAL_PREMIUM') {
        // Manual Premium Orders (Telegram Premium subscriptions)
        productFilter.platform = 'TELEGRAM'
      } else if (serviceType === 'SERVICE_PRODUCTS') {
        // Service Products (Canva, Gmail, etc.) - non-Telegram services
        productFilter.platform = { not: 'TELEGRAM' }
      } else if (serviceType === 'TELEGRAM_MANUAL') {
        // Manual Telegram Premium (non-auto accounts)
        productFilter.platform = 'TELEGRAM'
      }
    }

    // Build where clause for service orders
    const where: any = {
      product: productFilter
    }

    // Filter by service order status (using order status)
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Search filter - combine with AND to ensure product filter is still applied
    if (search) {
      const searchConditions = {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { guestEmail: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Combine product filter and search with AND
      where.AND = [
        { product: productFilter },
        searchConditions
      ]
      // Remove the standalone product filter since it's now in AND
      delete where.product
    }

    // Debug logging (remove in production)
    console.log('[getServiceOrders] Query params:', { page, limit, status, serviceType, search })
    console.log('[getServiceOrders] Where clause:', JSON.stringify(where, null, 2))

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              platform: true,
              type: true,
              sku: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              username: true
            }
          },
          payment: {
            select: {
              status: true
            }
          }
        }
      }),
      db.order.count({ where })
    ])

    // Debug logging
    console.log('[getServiceOrders] Results:', { ordersCount: orders.length, total })

    // Return in same format as getOrdersAdmin for consistency
    return res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      message: 'Service orders retrieved successfully'
    })
  } catch (error) {
    console.error('[getServiceOrders] Error:', error)
    return next(error)
  }
}

/**
 * Update service order fulfillment status
 */
export const updateServiceOrderFulfillment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = parseId(req.params.id)
    const { status, fulfillmentNotes, notifyCustomer } = req.body

    if (!orderId) return sendErrorResponse(res, 'Order ID is required')
    if (!status) return sendErrorResponse(res, 'Status is required')

    // Validate status
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return sendErrorResponse(res, 'Invalid status. Must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED')
    }

    const order = await orderService.findById(orderId)

    // Verify it's a service order
    if (!(order.product?.type === 'SERVICE' || isTelegramTransferProduct(order.product))) {
      return sendErrorResponse(res, 'This order is not a service order')
    }

    // Update order status
    const updateData: any = {
      status: status === 'COMPLETED' ? 'COMPLETED' : status === 'CANCELLED' ? 'CANCELLED' : order.status,
      meta: {
        ...((order.meta as any) || {}),
        serviceFulfillment: {
          status,
          fulfillmentNotes: fulfillmentNotes || null,
          updatedAt: new Date().toISOString(),
          ...(status === 'COMPLETED' && { completedAt: new Date().toISOString() }),
          ...(status === 'CANCELLED' && { cancelledAt: new Date().toISOString() })
        },
        fulfillmentHistory: [
          ...(((order.meta as any)?.fulfillmentHistory as any[]) || []),
          {
            status,
            notes: fulfillmentNotes || null,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin' // Could be enhanced to track admin user
          }
        ]
      }
    }

    // Update delivery status if completed
    if (status === 'COMPLETED') {
      updateData.deliveryStatus = 'DELIVERED'
      updateData.deliveredAt = new Date()
    }

    await db.order.update({
      where: { id: orderId },
      data: updateData
    })

    // Send notification to customer if requested
    if (notifyCustomer && (status === 'COMPLETED' || status === 'CANCELLED')) {
      try {
        const userEmail = order.user?.email || order.guestEmail
        if (userEmail) {
          const emailSubject =
            status === 'COMPLETED'
              ? `Your Service Order ${order.orderNumber} Has Been Completed`
              : `Your Service Order ${order.orderNumber} Has Been Cancelled`

          const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

Your service order ${order.orderNumber} has been ${status.toLowerCase()}.

${status === 'COMPLETED' ? '✅ Your service has been fulfilled and delivered.' : '❌ Your service order has been cancelled.'}

${fulfillmentNotes ? `\nAdmin Notes:\n${fulfillmentNotes}\n` : ''}

Order Details:
- Product: ${order.product.name}
- Order Number: ${order.orderNumber}
- Status: ${status}

${status === 'COMPLETED' ? 'Thank you for your purchase!' : 'If you have any questions, please contact support.'}

Best regards,
UHQ Accounts Team
          `.trim()

          await sendEmail(userEmail, emailText, emailSubject)
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
        // Don't fail the request if email fails
      }
    }

    const updatedOrder = await orderService.findById(orderId)

    return sendSuccessResponse(res, updatedOrder, 'Service order fulfillment status updated successfully')
  } catch (error) {
    return next(error)
  }
}
