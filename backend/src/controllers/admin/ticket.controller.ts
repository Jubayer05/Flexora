import type { Response } from 'express'
import type { AdminAuthRequest } from '../../middlewares/auth'
import { emitTicketNewReply } from '../../socket/ticket.socket'
import { TicketService } from '../../services/ticket.services'
import { handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../../utils'
import {
  CreateTicketSchema,
  TicketQuerySchema,
  TicketReplySchema,
  UpdateTicketReplySchema,
  UpdateTicketSchema
} from '../../validations/zod/ticket.schema'

const ticketService = new TicketService()

// ================================
// ADMIN TICKET MANAGEMENT
// ================================

export const createTicket = async (req: AdminAuthRequest, res: Response) => {
  try {
    // Admin can create tickets on behalf of users
    const ticketData = {
      ...req.body,
      // If userId is provided in request body, use it; otherwise use admin's ID
      userId: req.body.userId || req.admin!.id
    }

    const validatedData = CreateTicketSchema.parse(ticketData)
    const ticket = await ticketService.createTicket(validatedData)

    return sendCreatedResponse(res, ticket, 'Ticket created successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create ticket')
  }
}

export const getTickets = async (req: AdminAuthRequest, res: Response) => {
  try {
    const query = TicketQuerySchema.parse(req.query)
    const result = await ticketService.getTickets(query)

    return sendSuccessResponse(res, result, 'Tickets retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve tickets')
  }
}

export const getTicketById = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    const ticket = await ticketService.getTicketById(ticketId)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    return sendSuccessResponse(res, ticket, 'Ticket retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket')
  }
}

export const getTicketCustomerProfile = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    const profile = await ticketService.getTicketCustomerProfile(ticketId)

    return sendSuccessResponse(res, profile, 'Ticket customer profile retrieved successfully')
  } catch (error: any) {
    return handleControllerError(
      res,
      error,
      'Failed to retrieve ticket customer profile'
    )
  }
}

export const getTicketByNumber = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    return sendSuccessResponse(res, ticket, 'Ticket retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket')
  }
}

export const updateTicket = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    const validatedData = UpdateTicketSchema.parse(req.body)
    const ticket = await ticketService.updateTicket(ticketId, validatedData)

    return sendSuccessResponse(res, ticket, 'Ticket updated successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update ticket')
  }
}

export const deleteTicket = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    await ticketService.deleteTicket(ticketId)

    return sendSuccessResponse(res, null, 'Ticket deleted successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete ticket')
  }
}

// ================================
// TICKET REPLIES (ADMIN)
// ================================

export const createTicketReply = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    // Verify the ticket exists
    const ticket = await ticketService.getTicketById(ticketId)
    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Get admin info
    const authorId = req.admin!.id
    const authorName = req.admin!.email

    const validatedData = TicketReplySchema.parse({
      ...req.body,
      ticketId
    })

    const reply = await ticketService.createTicketReply({
      ...validatedData,
      authorId,
      authorName,
      isStaff: true
    })

    // update ticket to IN_PROGRESS
    await ticketService.updateTicket(ticketId, { status: 'IN_PROGRESS' })

    // Notify other participants in real time
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

export const getTicketReplies = async (req: AdminAuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    // Verify the ticket exists
    const ticket = await ticketService.getTicketById(ticketId)
    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const replies = await ticketService.getTicketReplies(ticketId)

    return sendSuccessResponse(res, replies, 'Ticket replies retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket replies')
  }
}

export const updateTicketReply = async (req: AdminAuthRequest, res: Response) => {
  try {
    const replyId = parseInt(req.params.replyId!)
    if (isNaN(replyId)) {
      return handleControllerError(res, new Error('Invalid reply ID'), 'Invalid reply ID')
    }

    const validatedData = UpdateTicketReplySchema.parse(req.body)
    const reply = await ticketService.updateTicketReply(replyId, validatedData)

    return sendSuccessResponse(res, reply, 'Ticket reply updated successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update ticket reply')
  }
}

export const deleteTicketReply = async (req: AdminAuthRequest, res: Response) => {
  try {
    const replyId = parseInt(req.params.replyId!)
    if (isNaN(replyId)) {
      return handleControllerError(res, new Error('Invalid reply ID'), 'Invalid reply ID')
    }

    await ticketService.deleteTicketReply(replyId)

    return sendSuccessResponse(res, null, 'Ticket reply deleted successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete ticket reply')
  }
}

// ================================
// STATISTICS
// ================================

export const getTicketStats = async (req: AdminAuthRequest, res: Response) => {
  try {
    const stats = await ticketService.getTicketStats()

    return sendSuccessResponse(res, stats, 'Ticket statistics retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket statistics')
  }
}
