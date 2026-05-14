import express from 'express'
import {
  checkRecentOtp,
  checkRecentOtpGet,
  startOtpMonitoring,
  testOtpDetection,
  fetchRecentMessages,
  testSessionConnection,
  sendBotMessage,
  sendBotMessageWithResponse
} from '../../controllers/telegram.controller'
import { adminAuthMiddleware } from '../../middlewares/auth'

const router = express.Router()

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware)

// ================================
// OTP DETECTION ENDPOINTS
// ================================

// Check for recent OTP messages (POST - primary)
router.post('/check-otp', checkRecentOtp)

// Check for recent OTP messages (GET - legacy)
router.get('/check-otp/:phone_number', checkRecentOtpGet)

// Start OTP monitoring (returns ready status)
router.post('/start-monitoring', startOtpMonitoring)

// ================================
// BOT MESSAGING ENDPOINTS
// ================================

// Send message to a Telegram bot
router.post('/send-bot-message', sendBotMessage)

// Send message to bot and get response
router.post('/send-bot-message-with-response', sendBotMessageWithResponse)

// ================================
// DEBUG ENDPOINTS
// ================================

// Test OTP detection logic
router.get('/debug/test-otp-detection', testOtpDetection)

// Fetch recent messages for debugging
router.get('/debug/messages/:phone_number', fetchRecentMessages)

// Test session connection
router.get('/debug/test-session/:phone_number', testSessionConnection)

export default router
