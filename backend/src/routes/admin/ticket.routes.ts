import { Router } from 'express'
import {
  createTicket,
  createTicketReply,
  deleteTicket,
  deleteTicketReply,
  getTicketById,
  getTicketCustomerProfile,
  getTicketByNumber,
  getTicketReplies,
  getTickets,
  getTicketStats,
  updateTicket,
  updateTicketReply
} from '../../controllers/admin/ticket.controller'
import { uploadTicketImages } from '../../controllers/ticket-upload.controller'
import { adminAuthMiddleware } from '../../middlewares/auth'
import { ticketUpload } from '../../libs/multer'

const router = Router()

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware)

// ================================
// TICKET MANAGEMENT
// ================================

/**
 * @route   GET /admin/tickets
 * @desc    Get all tickets with filtering and pagination
 * @access  Admin
 */
router.get('/', getTickets)

/**
 * @route   GET /admin/tickets/stats
 * @desc    Get ticket statistics
 * @access  Admin
 */
router.get('/stats', getTicketStats)

/**
 * @route   GET /admin/tickets/number/:ticketNumber
 * @desc    Get ticket by ticket number
 * @access  Admin
 */
router.get('/number/:ticketNumber', getTicketByNumber)

/**
 * @route   GET /admin/tickets/:id/customer-profile
 * @desc    Get customer profile context for a ticket
 * @access  Admin
 */
router.get('/:id/customer-profile', getTicketCustomerProfile)

/**
 * @route   POST /admin/tickets/upload
 * @desc    Upload images for ticket reply. Max 2MB per file, images only. Stored in supportTicket folder.
 * @access  Admin
 */
router.post('/upload', ticketUpload.any(), uploadTicketImages)

/**
 * @route   POST /admin/tickets
 * @desc    Create new ticket (admin can create tickets on behalf of users)
 * @access  Admin
 */
router.post('/', createTicket)

/**
 * @route   PUT /admin/tickets/:id
 * @desc    Update ticket
 * @access  Admin
 */
router.put('/:id', updateTicket)

/**
 * @route   DELETE /admin/tickets/:id
 * @desc    Delete ticket
 * @access  Admin
 */
router.delete('/:id', deleteTicket)

// ================================
// TICKET REPLIES
// ================================

/**
 * @route   GET /admin/tickets/:ticketId/replies
 * @desc    Get all replies for a ticket
 * @access  Admin
 */
router.get('/:ticketId/replies', getTicketReplies)

/**
 * @route   GET /admin/tickets/:id
 * @desc    Get ticket by ID
 * @access  Admin
 */
router.get('/:id', getTicketById)

/**
 * @route   POST /admin/tickets/:ticketId/replies
 * @desc    Add reply to ticket
 * @access  Admin
 */
router.post('/:ticketId/replies', createTicketReply)

/**
 * @route   PUT /admin/tickets/:ticketId/replies/:replyId
 * @desc    Update ticket reply
 * @access  Admin
 */
router.put('/:ticketId/replies/:replyId', updateTicketReply)

/**
 * @route   DELETE /admin/tickets/:ticketId/replies/:replyId
 * @desc    Delete ticket reply
 * @access  Admin
 */
router.delete('/:ticketId/replies/:replyId', deleteTicketReply)

export default router
