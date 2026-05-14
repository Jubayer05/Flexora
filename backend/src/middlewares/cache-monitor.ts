import type { NextFunction, Request, Response } from 'express'
import { cacheService } from '../services/cache.service'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response-handler'

export const monitorCache = Date.now()

/**
 * Cache monitoring middleware
 * Logs cache statistics periodically (1% sampling rate)
 */
export const cacheMonitorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Sample 1% of requests to avoid spam
  if (Math.random() < 0.01) {
    const stats = cacheService.getStats()

    // Only log if we have some cache activity
    if (stats.total > 0) {
      console.log(
        `📊 [CACHE STATS] Hit Rate: ${stats.hitRate}% (${stats.hits}/${stats.total} requests) | Route: ${req.method} ${req.path}`
      )
    }
  }

  next()
}

/**
 * Cache health check endpoint
 */
export const getCacheHealth = async (req: Request, res: Response) => {
  try {
    const start = Date.now()

    // Test Redis connection
    const isConnected = await cacheService.ping()
    const latency = Date.now() - start

    if (!isConnected) {
      return sendErrorResponse(res, 'Redis connection failed', 500)
    }

    // Get cache statistics
    const stats = cacheService.getStats()

    // Get Redis info (basic)
    const redisClient = cacheService.getClient()
    const redisInfo = await redisClient.info('memory')

    // Parse memory usage (basic parsing)
    const memoryMatch = redisInfo.match(/used_memory_human:([^\r\n]+)/)
    const memoryUsage = memoryMatch?.[1]?.trim() || 'unknown'

    return sendSuccessResponse(
      res,
      {
        status: 'healthy',
        latency: `${latency}ms`,
        stats: {
          hitRate: `${stats.hitRate}%`,
          totalRequests: stats.total,
          hits: stats.hits,
          misses: stats.misses
        },
        redis: {
          connected: true,
          memoryUsage
        },
        timestamp: new Date().toISOString()
      },
      'Cache is healthy'
    )
  } catch (error) {
    console.error('Cache health check failed:', error)

    return sendErrorResponse(res, 'Cache health check failed', 500, [
      error instanceof Error ? error.message : 'Unknown error',
      new Date().toISOString()
    ])
  }
}

/**
 * Cache statistics endpoint
 */
export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = cacheService.getStats()
    const redisClient = cacheService.getClient()

    // Get key count by pattern
    const productKeys = await cacheService.keys('uhq:products:*')
    const categoryKeys = await cacheService.keys('uhq:categories:*')
    const userKeys = await cacheService.keys('uhq:user:*')
    const analyticsKeys = await cacheService.keys('uhq:analytics:*')
    const settingsKeys = await cacheService.keys('uhq:settings:*')
    const blogKeys = await cacheService.keys('uhq:blog*')

    // Get Redis info
    const redisInfo = await redisClient.info()
    const memoryMatch = redisInfo.match(/used_memory_human:([^\r\n]+)/)
    const connectionsMatch = redisInfo.match(/connected_clients:(\d+)/)

    const keyTotals =
      productKeys.length +
      categoryKeys.length +
      userKeys.length +
      analyticsKeys.length +
      settingsKeys.length +
      blogKeys.length

    return sendSuccessResponse(
      res,
      {
        performance: {
          hitRate: `${stats.hitRate}%`,
          totalRequests: stats.total,
          hits: stats.hits,
          misses: stats.misses
        },
        keyDistribution: {
          products: productKeys.length,
          categories: categoryKeys.length,
          users: userKeys.length,
          analytics: analyticsKeys.length,
          settings: settingsKeys.length,
          blog: blogKeys.length,
          total: keyTotals
        },
        redis: {
          memoryUsage: memoryMatch?.[1]?.trim() || 'unknown',
          connections: connectionsMatch?.[1] ? parseInt(connectionsMatch[1]) : 'unknown'
        },
        timestamp: new Date().toISOString()
      },
      'Cache statistics retrieved'
    )
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return sendErrorResponse(res, 'Failed to get cache statistics', 500)
  }
}

/**
 * Clear cache endpoint (admin only)
 */
export const clearCache = async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body

    let clearedCount = 0

    if (pattern && typeof pattern === 'string') {
      // Clear specific pattern
      clearedCount = await cacheService.clearPattern(pattern)
    } else {
      // Clear all cache
      clearedCount = await cacheService.clearPattern('uhq:*')
    }

    // Reset statistics
    cacheService.resetStats()

    return sendSuccessResponse(
      res,
      {
        clearedEntries: clearedCount,
        pattern: pattern || 'uhq:*',
        timestamp: new Date().toISOString()
      },
      `Cache cleared successfully (${clearedCount} entries)`
    )
  } catch (error) {
    console.error('Failed to clear cache:', error)
    return sendErrorResponse(res, 'Failed to clear cache', 500)
  }
}

/**
 * Reset cache statistics
 */
export const resetCacheStats = async (req: Request, res: Response) => {
  try {
    cacheService.resetStats()

    return sendSuccessResponse(
      res,
      {
        timestamp: new Date().toISOString()
      },
      'Cache statistics reset successfully'
    )
  } catch (error) {
    console.error('Failed to reset cache stats:', error)
    return sendErrorResponse(res, 'Failed to reset cache statistics', 500)
  }
}
