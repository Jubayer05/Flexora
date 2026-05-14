import type { Response } from 'express'
import type { AdminAuthRequest } from '../middlewares/auth'
import { TicketService } from '../services/ticket.services'
import type { AuthRequest } from '../types/req-res'
import { handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../utils'
import {
  CreateTicketSchema,
  TicketQuerySchema,
  TicketReplySchema,
  UpdateTicketReplySchema,
  UpdateTicketSchema
} from '../validations/zod/ticket.schema'

const ticketService = new TicketService()

// Helper function to check if user is admin/moderator
const isAdminOrModerator = (req: AuthRequest | AdminAuthRequest): boolean => {
  // Check if it's an AdminAuthRequest with admin property
  const adminReq = req as AdminAuthRequest
  if (adminReq.admin) {
    return ['ADMIN', 'MODERATOR'].includes(adminReq.admin.role)
  }

  // Check if regular user has admin/moderator role
  if (req.user) {
    return ['ADMIN', 'MODERATOR'].includes(req.user.role)
  }

  return false
}

// ================================
// TICKET MANAGEMENT
// ================================

export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    let ticketData

    if (isAdminOrModerator(req)) {
      // Admin can create tickets on behalf of users
      ticketData = {
        ...req.body,
        // If userId is provided in request body, use it; otherwise use admin's ID
        userId: req.body.userId || req.user!.userId
      }
    } else {
      // Regular users can only create tickets for themselves
      ticketData = {
        ...req.body,
        userId: req.user!.userId
      }
    }

    const validatedData = CreateTicketSchema.parse(ticketData)

    const ticket = await ticketService.createTicket(validatedData)

    return sendCreatedResponse(res, ticket, 'Ticket created successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create ticket')
  }
}

export const updateTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    const validatedData = UpdateTicketSchema.parse({ ...req.body, id: ticketId })

    const ticket = await ticketService.updateTicket(ticketId, validatedData)

    return sendSuccessResponse(res, ticket, 'Ticket updated successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update ticket')
  }
}

export const deleteTicket = async (req: AuthRequest, res: Response) => {
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

export const getTicketById = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id!)
    if (isNaN(ticketId)) {
      return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
    }

    const ticket = await ticketService.getTicketById(ticketId)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Skip ownership check for admin/moderator
    if (!isAdminOrModerator(req)) {
      // Check if user owns this ticket (only for regular customers)
      if (ticket.userId !== req.user!.userId) {
        return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
      }
    }

    return sendSuccessResponse(res, ticket, 'Ticket retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket')
  }
}

export const getTicketByNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketNumber } = req.params

    const ticket = await ticketService.getTicketByNumber(ticketNumber!)

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Skip ownership check for admin/moderator
    if (!isAdminOrModerator(req)) {
      // Check if user owns this ticket (only for regular customers)
      if (ticket.userId !== req.user!.userId) {
        return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
      }
    }

    return sendSuccessResponse(res, ticket, 'Ticket retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket')
  }
}

export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    const validatedQuery = TicketQuerySchema.parse(req.query)

    const result = await ticketService.getTickets(validatedQuery)

    return sendSuccessResponse(res, result, 'Tickets retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve tickets')
  }
}

export const getUserTickets = async (req: AuthRequest, res: Response) => {
  try {
    const validatedQuery = TicketQuerySchema.parse(req.query)
    const userId = req.user!.userId

    const result = await ticketService.getUserTickets(userId, validatedQuery)

    return sendSuccessResponse(res, result, 'User tickets retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve user tickets')
  }
}

// ================================
// TICKET REPLIES
// ================================

export const createTicketReply = async (req: AuthRequest, res: Response) => {
  try {
    // Support both ticketId (admin) and ticketNumber (customer)
    const ticketIdParam = req.params.ticketId
    const ticketNumberParam = req.params.ticketNumber

    let ticket

    if (ticketIdParam) {
      // Admin route - using ticketId
      const ticketId = parseInt(ticketIdParam)
      if (isNaN(ticketId)) {
        return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
      }
      ticket = await ticketService.getTicketById(ticketId)
    } else if (ticketNumberParam) {
      // Customer route - using ticketNumber
      ticket = await ticketService.getTicketByNumber(ticketNumberParam)
    } else {
      return handleControllerError(
        res,
        new Error('Ticket identifier required'),
        'Ticket identifier required'
      )
    }

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    const isAdmin = isAdminOrModerator(req)

    // Skip ownership check for admin/moderator
    if (!isAdmin) {
      // Check if user owns this ticket (only for regular customers)
      if (ticket.userId !== req.user!.userId) {
        console.log('data', {
          ticketUserId: ticket.userId,
          reqUserId: req.user!.userId
        })
        return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
      }
    }

    // Get the correct user ID and name
    let authorId: number
    let authorName: string

    if (isAdmin) {
      const adminReq = req as AdminAuthRequest
      authorId = adminReq.admin?.id || adminReq.user!.userId
      authorName = adminReq.admin?.email || adminReq.user!.email
    } else {
      authorId = req.user!.userId
      authorName = req.user!.email
    }

    const validatedData = TicketReplySchema.parse({
      ...req.body,
      ticketId: ticket.id
    })

    const reply = await ticketService.createTicketReply({
      ...validatedData,
      authorId,
      authorName,
      isStaff: isAdmin
    })

    return sendCreatedResponse(res, reply, 'Ticket reply created successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create ticket reply')
  }
}

export const updateTicketReply = async (req: AuthRequest, res: Response) => {
  try {
    const replyId = parseInt(req.params.replyId!)
    if (isNaN(replyId)) {
      return handleControllerError(res, new Error('Invalid reply ID'), 'Invalid reply ID')
    }

    const validatedData = UpdateTicketReplySchema.parse({ ...req.body, id: replyId })

    const reply = await ticketService.updateTicketReply(replyId, validatedData)

    return sendSuccessResponse(res, reply, 'Ticket reply updated successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update ticket reply')
  }
}

export const deleteTicketReply = async (req: AuthRequest, res: Response) => {
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

export const getTicketReplies = async (req: AuthRequest, res: Response) => {
  try {
    // Support both ticketId (admin) and ticketNumber (customer)
    const ticketIdParam = req.params.ticketId
    const ticketNumberParam = req.params.ticketNumber

    let ticket

    if (ticketIdParam) {
      // Admin route - using ticketId
      const ticketId = parseInt(ticketIdParam)
      if (isNaN(ticketId)) {
        return handleControllerError(res, new Error('Invalid ticket ID'), 'Invalid ticket ID')
      }
      ticket = await ticketService.getTicketById(ticketId)
    } else if (ticketNumberParam) {
      // Customer route - using ticketNumber
      ticket = await ticketService.getTicketByNumber(ticketNumberParam)
    } else {
      return handleControllerError(
        res,
        new Error('Ticket identifier required'),
        'Ticket identifier required'
      )
    }

    if (!ticket) {
      return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
    }

    // Skip ownership check for admin/moderator
    if (!isAdminOrModerator(req)) {
      // Check if user owns this ticket (only for regular customers)
      if (ticket.userId !== req.user!.userId) {
        return handleControllerError(res, new Error('Ticket not found'), 'Ticket not found')
      }
    }

    const replies = await ticketService.getTicketReplies(ticket.id!)

    return sendSuccessResponse(res, replies, 'Ticket replies retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket replies')
  }
}

// ================================
// STATISTICS
// ================================

export const getTicketStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await ticketService.getTicketStats()

    return sendSuccessResponse(res, stats, 'Ticket statistics retrieved successfully')
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve ticket statistics')
  }
}
