import express from 'express'
import {
  createTelegramSession,
  deleteSession,
  getSessionStatus,
  kickOtherSessions,
  listSessions,
  requestAccountOTP,
  submitSessionOTP
} from '../../controllers/admin/telegram-session.controller'
import { adminAuthMiddleware } from '../../middlewares/auth'

const router = express.Router()

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware)

// Telegram Session Management Routes
router.post('/create-session', createTelegramSession)
router.post('/submit-otp', submitSessionOTP)
router.post('/request-otp', requestAccountOTP)
router.post('/kick-other-sessions', kickOtherSessions)
router.get('/session-status/:phoneNumber', getSessionStatus)
router.delete('/delete-session/:phoneNumber', deleteSession)
router.get('/sessions', listSessions)

export default router
