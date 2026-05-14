import { Router } from 'express'
import {
  closeTicket,
  createTicket,
  createTicketReply,
  getTicketByNumber,
  getTicketReplies,
  getUserTickets
} from '../../controllers/customer/ticket.controller'
import { uploadTicketImages } from '../../controllers/ticket-upload.controller'
import { authMiddleware, validateActiveSession } from '../../middlewares/auth'
import { ticketUpload } from '../../libs/multer'

const router = Router()

// Authentication required for all ticket operations
router.use(authMiddleware, validateActiveSession)

// ================================
// CUSTOMER TICKET MANAGEMENT
// ================================

/**
 * @route   GET /customer/tickets
 * @desc    Get current user's tickets
 * @access  Customer (authenticated)
 */
router.get('/', getUserTickets)

/**
 * @route   POST /customer/tickets/upload
 * @desc    Upload images for ticket (create/reply). Max 2MB per file, images only. Stored in supportTicket folder.
 * @access  Customer (authenticated)
 */
router.post('/upload', ticketUpload.any(), uploadTicketImages)

/**
 * @route   POST /customer/tickets
 * @desc    Create new ticket
 * @access  Customer (authenticated)
 */
router.post('/', createTicket)

// ================================
// TICKET REPLIES
// ================================

/**
 * @route   GET /customer/tickets/:ticketNumber/replies
 * @desc    Get all replies for user's ticket
 * @access  Customer (authenticated)
 */
router.get('/:ticketNumber/replies', getTicketReplies)

/**
 * @route   GET /customer/tickets/:ticketNumber
 * @desc    Get ticket by ticket number (only if user owns it)
 * @access  Customer (authenticated)
 */
router.get('/:ticketNumber', getTicketByNumber)

/**
 * @route   POST /customer/tickets/:ticketNumber/close
 * @desc    Close user's own ticket
 * @access  Customer (authenticated)
 */
router.post('/:ticketNumber/close', closeTicket)

/**
 * @route   POST /customer/tickets/:ticketNumber/replies
 * @desc    Add reply to user's ticket
 * @access  Customer (authenticated)
 */
router.post('/:ticketNumber/replies', createTicketReply)

export default router
