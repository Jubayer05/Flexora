import type { Response } from 'express'
import db from '../../configs/db'
import { emitTicketNewReply } from '../../socket/ticket.socket'
import { TicketService } from '../../services/ticket.services'
import type { AuthRequest } from '../../types/req-res'
import { handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../../utils'
import {
  CreateTicketSchema,
  TicketQuerySchema,
  TicketReplySchema
} from '../../validations/zod/ticket.schema'
import { z } from 'zod'

const ticketService = new TicketService()

const CustomerCreateTicketSchema = z.object({
  orderNumber: z
    .string()
    .min(1, 'Order ID is required')
    .max(100, 'Order ID is too long')
    .transform((value) => value.trim().toUpperCase()),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters long')
    .max(255, 'Subject must be less than 255 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters long')
    .max(5000, 'Description must be less than 5000 characters'),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(10).default([])
})

// ================================
// CUSTOMER TICKET MANAGEMENT
// ================================

export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const validatedRequest = CustomerCreateTicketSchema.parse(req.body)

    const [user, order] = await Promise.all([
      db.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          phone: true
        }
      }),
      db.order.findFirst({
        where: {
          orderNumber: validatedRequest.orderNumber,
          userId: req.user!.userId
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliveryStatus: true,
          total: true,
          quantity: true,
          customerName: true,
          customerPhone: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
              platform: true
            }
          }
        }
      })
    ])

    if (!order) {
      return handleControllerError(
        res,
        new Error('Order not found for this account'),
        'Order not found for this account'
      )
    }

    const ticketData = {
      subject: validatedRequest.subject,
      description: validatedRequest.description,
      attachments: validatedRequest.attachments,
      userId: req.user!.userId,
      meta: {
        orderContext: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryStatus,
          quantity: order.quantity,
          total: Number(order.total.toString()),
          createdAt: order.createdAt.toISOString(),
          product: order.product,
          client: {
            email: user?.email || req.user!.email,
            name: user?.firstName || order.customerName || req.user!.email,
            phone: user?.phone || order.customerPhone || null
          }
        }
      }
    }

    const validatedData = CreateTicketSchema.parse(ticketData)
    const ticket = await ticketService.createTicket(validatedData)

    return sendCreatedResponse(res, ticket, 'Ticket created successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create ticket')
  }
}

export const closeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket || ticket.userId !== req.user!.userId) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const updatedTicket = await ticketService.updateTicket(ticket.id!, { status: 'CLOSED' })

    return sendSuccessResponse(res, updatedTicket, 'Ticket closed successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to close ticket')
  }
}

export const getUserTickets = async (req: AuthRequest, res: Response) => {
  console.log('req user', req.user)
  try {
    const query = TicketQuerySchema.parse({
      ...req.query,
      userId: req.user!.userId.toString() // Force filter by current user
    })

    const result = await ticketService.getTickets(query)

    return sendSuccessResponse(res, result, 'Tickets retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve tickets')
  }
}

export const getTicketByNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    if (!ticket.id) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const ticketId = ticket.id

    // Verify ownership - customer can only view their own tickets
    if (ticket.userId !== req.user!.userId) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    return sendSuccessResponse(res, ticket, 'Ticket retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket')
  }
}

// ================================
// CUSTOMER TICKET REPLIES
// ================================

export const createTicketReply = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    // Get ticket by ticket number
    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Verify ownership - customer can only reply to their own tickets
    if (ticket.userId !== req.user!.userId) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    if (!ticket.id) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const ticketId = ticket.id

    // Get customer info
    const authorId = req.user!.userId
    const authorName = req.user!.email

    const validatedData = TicketReplySchema.parse({
      ...req.body,
      ticketId
    })

    const reply = await ticketService.createTicketReply({
      ...validatedData,
      authorId,
      authorName,
      isStaff: false
    })

    // Notify other participants (e.g. admin viewing the ticket) in real time
    emitTicketNewReply(ticketId, {
      id: reply.id,
      ticketId,
      content: reply.content,
      createdAt: reply.createdAt,
      attachments: reply.attachments ?? [],
      authorName: reply.authorName ?? '',
      isStaff: reply.isStaff
    })

    return sendCreatedResponse(res, reply, 'Ticket reply created successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create ticket reply')
  }
}

export const getTicketReplies = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    // Get ticket by ticket number
    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Verify ownership - customer can only view replies to their own tickets
    if (ticket.userId !== req.user!.userId) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const replies = await ticketService.getTicketReplies(ticket.id!)

    return sendSuccessResponse(res, replies, 'Ticket replies retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket replies')
  }
}
