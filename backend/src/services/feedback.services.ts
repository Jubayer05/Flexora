import { FeedbackSource, Prisma } from '@prisma/client'
import prisma from '../configs/db'
import type {
  BulkAssignFeedbackData,
  BulkFeedbackAction,
  CreateFeedbackData,
  CustomerCreateFeedbackData,
  FeedbackQuery,
  UpdateFeedbackData
} from '../validations/zod/feedback.schema'

const db = prisma

export class FeedbackService {
  private async getPurchasedProductsForUser(userId: number) {
    const orders = await db.order.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'PARTIAL'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      quantity: order.quantity,
      total: order.total,
      productId: order.productId,
      product: order.product
    }))
  }

  private getUniquePurchasedProducts(
    orders: Awaited<ReturnType<FeedbackService['getPurchasedProductsForUser']>>
  ) {
    const uniqueProducts = new Map<number, (typeof orders)[number]>()

    for (const order of orders) {
      if (uniqueProducts.has(order.productId)) continue
      uniqueProducts.set(order.productId, order)
    }

    return Array.from(uniqueProducts.values())
  }

  // ================================
  // CRUD OPERATIONS
  // ================================

  async create(data: CreateFeedbackData) {
    // Validate user exists if userId provided
    if (data.userId) {
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (!user) {
        throw new Error('User not found')
      }
    }

    // Validate product exists if productId provided
    if (data.productId) {
      const product = await db.product.findUnique({ where: { id: data.productId } })
      if (!product) {
        throw new Error('Product not found')
      }
    }

    const feedback = await db.feedback.create({
      data: {
        ...data,
        rating: new Prisma.Decimal(data.rating)
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    })

    return feedback
  }

  async findById(id: number) {
    const feedback = await db.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    })

    if (!feedback) {
      throw new Error('Feedback not found')
    }

    return feedback
  }

  async findMany(query: FeedbackQuery) {
    const {
      page,
      limit,
      userId,
      productId,
      published,
      rating,
      search,
      sortBy,
      sortOrder,
      source,
      schedule
    } = query
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.FeedbackWhereInput = {}

    if (userId !== undefined) {
      where.userId = userId
    }

    if (productId !== undefined) {
      where.productId = productId
    }

    if (published !== undefined) {
      where.published = published
    }

    if (source !== undefined) {
      where.source = source

      // "Customer" should mean feedback created by a real authenticated user
      // (i.e. has a userId), not just the default enum value.
      if (source === 'CUSTOMER' && userId === undefined) {
        where.userId = { not: null }
      }
    }

    if (rating !== undefined) {
      where.rating = new Prisma.Decimal(rating)
    }

    const now = new Date()
    const andParts: Prisma.FeedbackWhereInput[] = []

    if (schedule === 'current') {
      andParts.push({
        OR: [
          { published: true },
          { isScheduled: true, scheduledAt: { lte: now } }
        ]
      })
    } else if (schedule === 'future') {
      andParts.push({ isScheduled: true, scheduledAt: { gt: now } })
    }

    if (search) {
      andParts.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { feedback: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    if (andParts.length > 0) {
      where.AND = andParts
    }

    // Build orderBy
    const orderBy: Prisma.FeedbackOrderByWithRelationInput = {}
    if (sortBy === 'rating') {
      orderBy.rating = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              email: true,
              username: true,
              firstName: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      db.feedback.count({ where })
    ])

    return {
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }

  async update(id: number, data: UpdateFeedbackData) {
    // Check if feedback exists
    await this.findById(id)

    // Validate user exists if userId provided
    if (data.userId !== undefined && data.userId !== null) {
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (!user) {
        throw new Error('User not found')
      }
    }

    // Validate product exists if productId provided
    if (data.productId !== undefined && data.productId !== null) {
      const product = await db.product.findUnique({ where: { id: data.productId } })
      if (!product) {
        throw new Error('Product not found')
      }
    }

    const updateData: any = { ...data }
    if (data.rating !== undefined) {
      updateData.rating = new Prisma.Decimal(data.rating)
    }

    const feedback = await db.feedback.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    })

    return feedback
  }

  async delete(id: number) {
    // Check if feedback exists
    await this.findById(id)

    await db.feedback.delete({
      where: { id }
    })

    return { success: true, message: 'Feedback deleted successfully' }
  }

  // ================================
  // BULK OPERATIONS
  // ================================

  async bulkAction(action: BulkFeedbackAction) {
    const { ids, action: actionType } = action

    // Validate all feedbacks exist
    const feedbacks = await db.feedback.findMany({
      where: { id: { in: ids } },
      select: { id: true }
    })

    if (feedbacks.length !== ids.length) {
      throw new Error('One or more feedbacks not found')
    }

    let result

    switch (actionType) {
      case 'publish':
        result = await db.feedback.updateMany({
          where: { id: { in: ids } },
          data: { published: true }
        })
        break

      case 'unpublish':
        result = await db.feedback.updateMany({
          where: { id: { in: ids } },
          data: { published: false }
        })
        break

      case 'delete':
        result = await db.feedback.deleteMany({
          where: { id: { in: ids } }
        })
        break

      default:
        throw new Error('Invalid action type')
    }

    return {
      success: true,
      message: `${result.count} feedback(s) ${actionType}d successfully`,
      count: result.count
    }
  }

  // ================================
  // STATISTICS
  // ================================

  async getStatistics(productId?: number) {
    const where: Prisma.FeedbackWhereInput = { published: true }
    if (productId) {
      where.productId = productId
    }

    const [total, averageRating, ratingDistribution] = await Promise.all([
      db.feedback.count({ where }),
      db.feedback.aggregate({
        where,
        _avg: { rating: true }
      }),
      db.feedback.groupBy({
        by: ['rating'],
        where,
        _count: true
      })
    ])

    return {
      total,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.map((item) => ({
        rating: item.rating,
        count: item._count
      }))
    }
  }

  // ================================
  // PUBLIC QUERIES
  // ================================

  async getPublishedFeedbacks(query: FeedbackQuery) {
    return this.findMany({ ...query, published: true })
  }

  async getProductFeedbacks(productId: number, query: FeedbackQuery) {
    return this.findMany({ ...query, productId, published: true })
  }

  // ================================
  // CUSTOMER OPERATIONS
  // ================================

  async createCustomerFeedback(userId: number, data: CustomerCreateFeedbackData) {
    // Validate product exists
    const product = await db.product.findUnique({ where: { id: data.productId } })
    if (!product) {
      throw new Error('Product not found')
    }

    // Get user info for name
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, username: true, email: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Use firstName or username or email as display name
    const name = user.firstName || user.username || user.email.split('@')[0] || 'Anonymous'

    // Check if user already reviewed this product
    const existingFeedback = await db.feedback.findFirst({
      where: {
        userId,
        productId: data.productId
      }
    })

    if (existingFeedback) {
      throw new Error('You have already reviewed this product')
    }

    const purchasedOrder = await db.order.findFirst({
      where: {
        userId,
        productId: data.productId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'PARTIAL'] }
      },
      select: {
        id: true,
        orderNumber: true
      }
    })

    if (!purchasedOrder) {
      throw new Error('You can only review products you have purchased')
    }

    const feedback = await db.feedback.create({
      data: {
        userId,
        productId: data.productId,
        name,
        feedback: data.feedback,
        rating: new Prisma.Decimal(data.rating),
        published: false, // Requires admin approval
        source: FeedbackSource.CUSTOMER,
        scheduledAt: null,
        isScheduled: false
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    })

    return feedback
  }

  async getCustomerFeedbacks(userId: number, query: FeedbackQuery) {
    return this.findMany({ ...query, userId })
  }

  async getCustomerReviewSummary(userId: number) {
    const [purchasedOrders, existingFeedbacks] = await Promise.all([
      this.getPurchasedProductsForUser(userId),
      db.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
    ])

    const feedbackByProductId = new Map<number, (typeof existingFeedbacks)[number]>()
    const purchasedProducts = this.getUniquePurchasedProducts(purchasedOrders)

    for (const feedback of existingFeedbacks) {
      if (feedback.productId && !feedbackByProductId.has(feedback.productId)) {
        feedbackByProductId.set(feedback.productId, feedback)
      }
    }

    const pendingReviews = purchasedProducts
      .filter((purchase) => purchase.productId && !feedbackByProductId.has(purchase.productId))
      .map((purchase) => ({
        productId: purchase.productId,
        orderId: purchase.id,
        orderNumber: purchase.orderNumber,
        purchasedAt: purchase.createdAt,
        quantity: purchase.quantity,
        total: purchase.total,
        product: purchase.product
      }))

    return {
      totalPurchasedProducts: purchasedProducts.length,
      pendingReviewsCount: pendingReviews.length,
      submittedReviewsCount: existingFeedbacks.length,
      pendingReviews,
      submittedReviews: existingFeedbacks
    }
  }

  async bulkAssignFeedbacks(data: BulkAssignFeedbackData) {
    const products = await db.product.findMany({
      where: { id: { in: data.productIds } },
      select: { id: true, name: true, slug: true }
    })

    if (products.length !== data.productIds.length) {
      throw new Error('One or more selected products were not found')
    }

    const productIds = products.map((product) => product.id)
    const now = new Date()

    const feedbacksToCreate = data.entries.map((entry, index) => {
      const productId = productIds[index % productIds.length]
      const createdAt = entry.createdAt ?? now
      const isFuture = createdAt.getTime() > now.getTime()

      return {
        productId,
        name: entry.name,
        feedback: entry.feedback,
        rating: new Prisma.Decimal(entry.rating),
        source: FeedbackSource.BULK_GENERATED,
        published: !isFuture,
        isScheduled: isFuture,
        scheduledAt: isFuture ? createdAt : null,
        createdAt
      }
    })

    const result = await db.feedback.createMany({
      data: feedbacksToCreate
    })

    const distribution = productIds.map((productId) => ({
      productId,
      count: feedbacksToCreate.filter((feedback) => feedback.productId === productId).length
    }))

    return {
      success: true,
      count: result.count,
      distribution
    }
  }
}
