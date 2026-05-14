import type { Request, Response } from 'express'
import db from '../../configs/db'

/**
 * Get admin dashboard statistics
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    // Get today's date range (start and end of today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Fetch all statistics in parallel
    const [
      totalPendingOrders,
      totalCompletedOrders,
      totalPartialOrders,
      totalCancelledOrders,
      totalProducts,
      totalCustomers,
      totalBlogs,
      newCustomersToday
    ] = await Promise.all([
      // Total pending orders
      db.order.count({
        where: { status: 'PENDING' }
      }),

      // Total completed orders
      db.order.count({
        where: { status: 'COMPLETED' }
      }),

      // Total partial orders
      db.order.count({
        where: { status: 'PARTIAL' }
      }),

      // Total cancelled orders
      db.order.count({
        where: { status: 'CANCELLED' }
      }),

      // Total products
      db.product.count(),

      // Total customers (exclude guests and admins)
      db.user.count({
        where: {
          role: 'CUSTOMER',
          isGuest: false
        }
      }),

      // Total blogs
      db.blog.count(),

      // New customers today
      db.user.count({
        where: {
          role: 'CUSTOMER',
          isGuest: false,
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      })
    ])

    res.json({
      success: true,
      data: {
        orders: {
          pending: totalPendingOrders,
          completed: totalCompletedOrders,
          partial: totalPartialOrders,
          cancelled: totalCancelledOrders,
          total:
            totalPendingOrders + totalCompletedOrders + totalPartialOrders + totalCancelledOrders
        },
        products: {
          total: totalProducts
        },
        customers: {
          total: totalCustomers,
          newToday: newCustomersToday
        },
        blogs: {
          total: totalBlogs
        }
      },
      message: 'Statistics retrieved successfully'
    })
  } catch (error) {
    console.error('Get statistics error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve statistics'
    })
  }
}
