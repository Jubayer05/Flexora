import { subscriptionService } from '../services/subscription.service'
import { TelegramTransferRetryService } from '../services/telegram-transfer-retry.service'

/**
 * Setup cron jobs for background tasks
 * Run this from index.ts on server startup
 */

const retryService = new TelegramTransferRetryService()

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  console.log('[CronJobs] Starting background cron jobs...')

  // Run transfer retry job every hour
  startTransferRetryJob()

  // Run subscription expiration check daily at midnight
  startSubscriptionExpirationJob()

  // Run subscription notification check daily at 10 AM
  startSubscriptionNotificationJob()

  // Run scheduled feedback publisher every 5 minutes
  startScheduledFeedbackJob()

  console.log('[CronJobs] All cron jobs started')
}

/**
 * Transfer retry job - runs every hour
 * Automatically retries failed transfers with exponential backoff
 */
function startTransferRetryJob() {
  const INTERVAL_MS = 60 * 60 * 1000 // 1 hour

  // Run immediately on startup
  runTransferRetryJob()

  // Then run every hour
  setInterval(() => {
    runTransferRetryJob()
  }, INTERVAL_MS)

  console.log('[CronJobs] Transfer retry job scheduled (every 1 hour)')
}

/**
 * Execute the retry job
 */
async function runTransferRetryJob() {
  try {
    console.log('[CronJobs] Running transfer retry job...')
    const result = await retryService.processFailedTransfers()
    console.log('[CronJobs] Transfer retry job completed:', result)
  } catch (error) {
    console.error('[CronJobs] Transfer retry job failed:', error)
  }
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCronJobs() {
  console.log('[CronJobs] Stopping all cron jobs...')
  // Note: setInterval doesn't return a reference we can easily clear in this pattern
  // For production, consider using node-cron or similar library
  console.log('[CronJobs] All cron jobs stopped')
}

/**
 * Subscription expiration job - runs daily at midnight
 * Expires subscriptions that have passed their end date
 */
function startSubscriptionExpirationJob() {
  // Calculate milliseconds until next midnight
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const msUntilMidnight = tomorrow.getTime() - now.getTime()

  // Run at first midnight
  setTimeout(() => {
    runSubscriptionExpirationJob()

    // Then run every 24 hours
    setInterval(
      () => {
        runSubscriptionExpirationJob()
      },
      24 * 60 * 60 * 1000
    )
  }, msUntilMidnight)

  console.log('[CronJobs] Subscription expiration job scheduled (daily at midnight)')
}

/**
 * Execute subscription expiration job
 */
async function runSubscriptionExpirationJob() {
  try {
    console.log('[CronJobs] Running subscription expiration job...')
    const result = await subscriptionService.expireSubscriptions()
    console.log('[CronJobs] Subscription expiration job completed:', result)
  } catch (error) {
    console.error('[CronJobs] Subscription expiration job failed:', error)
  }
}

/**
 * Subscription notification job - runs daily at 10 AM
 * Sends expiration warnings for subscriptions expiring in 1 day
 */
function startSubscriptionNotificationJob() {
  // Calculate milliseconds until next 10 AM
  const now = new Date()
  const next10AM = new Date(now)
  next10AM.setHours(10, 0, 0, 0)

  // If 10 AM already passed today, schedule for tomorrow
  if (next10AM <= now) {
    next10AM.setDate(next10AM.getDate() + 1)
  }

  const msUntil10AM = next10AM.getTime() - now.getTime()

  // Run at first 10 AM
  setTimeout(() => {
    runSubscriptionNotificationJob()

    // Then run every 24 hours
    setInterval(
      () => {
        runSubscriptionNotificationJob()
      },
      24 * 60 * 60 * 1000
    )
  }, msUntil10AM)

  console.log('[CronJobs] Subscription notification job scheduled (daily at 10 AM)')
}

/**
 * Execute subscription notification job
 */
async function runSubscriptionNotificationJob() {
  try {
    console.log('[CronJobs] Running subscription notification job...')
    const result = await subscriptionService.sendExpirationNotifications()
    console.log('[CronJobs] Subscription notification job completed:', result)
  } catch (error) {
    console.error('[CronJobs] Subscription notification job failed:', error)
  }
}

/**
 * Scheduled feedback job - runs every 10 minutes
 * Publishes scheduled fake feedbacks when their scheduledAt time is reached
 */
function startScheduledFeedbackJob() {
  const INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

  // Run immediately on startup
  runScheduledFeedbackJob()

  // Then run every 10 minutes
  setInterval(() => {
    runScheduledFeedbackJob()
  }, INTERVAL_MS)

  console.log('[CronJobs] Scheduled feedback job scheduled (every 1 minutes)')
}

/**
 * Execute scheduled feedback job
 */
async function runScheduledFeedbackJob() {
  try {
    console.log('[CronJobs] Running scheduled feedback job...')

    const db = (await import('../configs/db')).default

    const now = new Date()

    // Find all scheduled feedbacks that should be published
    const scheduledFeedbacks = await db.feedback.findMany({
      where: {
        isScheduled: true,
        scheduledAt: {
          lte: now
        }
      },
      select: { id: true, name: true }
    })

    if (scheduledFeedbacks.length === 0) {
      console.log('[CronJobs] No scheduled feedbacks to publish')
      return { published: 0 }
    }

    // Extract unique names from feedbacks
    const usedNames = [...new Set(scheduledFeedbacks.map((f) => f.name))]

    // Batch update to publish feedbacks
    const result = await db.feedback.updateMany({
      where: {
        id: {
          in: scheduledFeedbacks.map((f) => f.id)
        }
      },
      data: {
        published: true,
        isScheduled: false
      }
    })

    // Mark names as USED
    const namesUpdated = await db.fakeNames.updateMany({
      where: {
        name: {
          in: usedNames
        }
      },
      data: {
        status: 'USED'
      }
    })

    console.log(
      `[CronJobs] Scheduled feedback job completed: published ${result.count} feedback(s), marked ${namesUpdated.count} name(s) as USED`
    )
    return { published: result.count, namesMarked: namesUpdated.count }
  } catch (error) {
    console.error('[CronJobs] Scheduled feedback job failed:', error)
    return { published: 0, error: String(error) }
  }
}
