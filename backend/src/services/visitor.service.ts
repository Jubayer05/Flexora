import { CACHE_KEYS, CACHE_TTL } from '../configs/cache.config'
import prisma from '../configs/db'
import { cacheService } from './cache.service'

const db = prisma

export class VisitorService {
  /**
   * Increment visitor count for a specific date
   * Uses atomic upsert for concurrent safety
   */
  async incrementVisitorCount(date: Date) {
    const visitor = await db.visitor.upsert({
      where: { date },
      update: {
        count: {
          increment: 1
        }
      },
      create: {
        date,
        count: 1
      }
    })

    await this.invalidateCache()
    // Cache will auto-expire after 5 minutes (CACHE_TTL.VISITOR_STATS)
    // No need to invalidate on every visitor - too expensive

    return visitor
  }

  /**
   * Get visitor stats for last N days
   * Returns data in format: [{date, visitors}]
   */
  async getStats(days: number = 90) {
    const cacheKey = `${CACHE_KEYS.VISITOR_STATS}:${days}`

    const stats = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const visitors = await db.visitor.findMany({
          where: {
            date: {
              gte: startDate
            }
          },
          orderBy: {
            date: 'asc'
          },
          select: {
            date: true,
            count: true
          }
        })

        // Transform to chart format
        return visitors.map((v) => ({
          date: v.date.toISOString().split('T')[0], // YYYY-MM-DD
          visitors: v.count
        }))
      },
      CACHE_TTL.VISITOR_STATS
    )

    return stats
  }

  /**
   * Get total visitors count
   */
  async getTotalCount() {
    const cacheKey = CACHE_KEYS.VISITOR_TOTAL

    const total = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const result = await db.visitor.aggregate({
          _sum: {
            count: true
          }
        })

        return result._sum.count || 0
      },
      CACHE_TTL.VISITOR_STATS
    )

    return total
  }

  /**
   * Manually invalidate visitor cache (for admin operations if needed)
   */
  async invalidateCache() {
    const keys = [`${CACHE_KEYS.VISITOR_STATS}:*`, CACHE_KEYS.VISITOR_TOTAL]

    for (const key of keys) {
      await cacheService.del(key)
    }
  }
}

export const visitorService = new VisitorService()
