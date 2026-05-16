import { subscriptionService } from '../services/subscription.service'

/**
 * Setup cron jobs for background tasks
 * Run this from index.ts on server startup
 */

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  // Run subscription expiration check daily at midnight
  startSubscriptionExpirationJob()

  // Run subscription notification check daily at 10 AM
  startSubscriptionNotificationJob()

  // Run scheduled feedback publisher every 5 minutes
  startScheduledFeedbackJob()
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCronJobs() {
  // Note: setInterval doesn't return a reference we can easily clear in this pattern
  // For production, consider using node-cron or similar library
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
}

/**
 * Execute subscription expiration job
 */
async function runSubscriptionExpirationJob() {
  try {
    await subscriptionService.expireSubscriptions()
  } catch (error) {
    // Subscription expiration job failed
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

}

/**
 * Execute subscription notification job
 */
async function runSubscriptionNotificationJob() {
  try {
    await subscriptionService.sendExpirationNotifications()
  } catch (error) {
    // Subscription notification job failed
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
}

/**
 * Execute scheduled feedback job
 */
async function runScheduledFeedbackJob() {
  try {
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

    return { published: result.count, namesMarked: namesUpdated.count }
  } catch (error) {
    return { published: 0, error: String(error) }
  }
}
