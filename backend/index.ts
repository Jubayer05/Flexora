import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import http from 'http'
import path from 'path'
import db from './src/configs/db'
import { globalErrorHandler, notFoundHandler } from './src/middlewares'

// Import tenant routers directly from their index files
import adminRouter from './src/routes/admin'
import customerRouter from './src/routes/customer'
import notificationRouter from './src/routes/notification.route'
import paymentRouter from './src/routes/payment.route'
import publicRouter from './src/routes/public'
import webhookRouter from './src/routes/webhook.route'

const app = express()
const PORT = process.env.PORT || 5000

// ================================
// MIDDLEWARE SETUP
// ================================

// Trust proxy to get real IP address (important for Nginx/reverse proxy)
// Set to 1 to trust only the first proxy (more secure than true)
// This prevents IP spoofing while still working with reverse proxies
app.set('trust proxy', 1)

// CORS configuration
const allowedOriginsFromEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Allow your production frontends even if env is misconfigured.
// Allow your production frontends even if env is misconfigured.
// You can still override/extend via FRONTEND_URL="https://www.flexora.com,https://flexora.com"
const defaultAllowedOrigins = ['https://www.flexora.com', 'https://flexora.com','https://flexora-frontend.vercel.app','http://109.199.119']
const allowedOrigins = [...new Set([...allowedOriginsFromEnv, ...defaultAllowedOrigins])]

// Check if we're in development mode (allow IP addresses for local/VPS testing)
const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.ALLOW_IP_ORIGINS === 'true'

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl/postman) that don't send Origin
    if (!origin) return callback(null, true)

    // Exact-match allowlist
    if (allowedOrigins.includes(origin)) return callback(null, true)

    // Allow any subdomain of flexora.com (e.g. https://admin.flexora.com)
    if (/^https:\/\/([a-z0-9-]+\.)*flexora\.com$/i.test(origin)) {
      return callback(null, true)
    }

    // In development or when ALLOW_IP_ORIGINS=true, allow IP addresses and localhost
    if (isDevelopment) {
      // Allow localhost with any port
      if (/^https?:\/\/localhost(:\d+)?$/i.test(origin)) {
        return callback(null, true)
      }
      // Allow IP addresses (IPv4) with any port
      if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) {
        return callback(null, true)
      }
      // Allow 127.0.0.1 with any port
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
        return callback(null, true)
      }
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-guest-access-token'],
  optionsSuccessStatus: 204
}

app.use(cors(corsOptions))

// ⚠️ IMPORTANT: Webhook routes MUST be registered BEFORE body parsers
// Stripe and other gateways require raw body for signature verification
app.use('/api/v1/webhooks', webhookRouter)

// Body parsers (for all other routes) - optimized for performance
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Add response compression for faster transfers (if needed)
// Compression middleware can be added here if required

// Static file serving for uploaded files
app.use('/files', express.static(path.resolve(process.cwd(), 'files')))

// ================================
// HEALTH CHECK
// ================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UHQ Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// ================================
// API ROUTES - CLEAN TENANT-BASED ORGANIZATION
// ================================

// Public routes (no authentication required)
app.use('/api/v1', publicRouter)

// Payment routes (customer payments)
app.use('/api/v1/payments', paymentRouter)

// Customer routes (user authenticated users)
app.use('/api/v1/customer', customerRouter)

// Admin routes (admin/moderator access)
app.use('/api/v1/admin', adminRouter)

// Notification routes (includes internal endpoints for Python service)
app.use('/api/v1', notificationRouter)

// ================================
// ERROR HANDLING MIDDLEWARE
// ================================

// 404 handler - must be after all routes
app.use((req, res, next) => {
  notFoundHandler(req, res)
})

// Global error handler - must be last middleware
app.use(globalErrorHandler)

// ================================
// SERVER STARTUP
// ================================

const startServer = async () => {
  try {
    // Test database connection
    await db.$connect()

    // Seed database if empty (optional - only in development)
    if (process.env.NODE_ENV === 'development') {
      try {
        const settingsCount = await db.settings.count()
        const pagesCount = await db.customPage.count()

        if (settingsCount === 0 || pagesCount === 0) {
          const { execSync } = await import('child_process')
          execSync('npm run db:seed', { stdio: 'inherit' })
        }
      } catch (error) {
        // Seeding skipped
      }
    }

    // Create HTTP server and attach Socket.io for real-time ticket chat
    const httpServer = http.createServer(app)
    const { initTicketSocket } = await import('./src/socket/ticket.socket')
    initTicketSocket(httpServer)

    httpServer.listen(PORT, () => {
      // Server ready
    })

    // Start background cron jobs (non-blocking)
    try {
      const { startCronJobs } = await import('./src/utils/cron-jobs')
      startCronJobs()
    } catch (error) {
      // Cron jobs unavailable
    }
  } catch (error) {
    process.exit(1)
  }
}

startServer()

export default app
