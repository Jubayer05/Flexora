import type { Prisma } from '@prisma/client'
import db from '../configs/db'
import type { Pagination } from '../types/req-res'
import type { NewsletterQueryInput } from '../validations/zod/newsletter.schema'

export class NewsletterService {
  // ================================
  // PUBLIC OPERATIONS
  // ================================

  async subscribe(email: string): Promise<{ id: number; email: string; createdAt: Date }> {
    // Check if email already subscribed
    const existing = await db.newsletterSubscriber.findFirst({
      where: { email }
    })

    if (existing) {
      throw new Error('This email is already subscribed to our newsletter')
    }

    // Create new subscriber
    const subscriber = await db.newsletterSubscriber.create({
      data: { email },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    })

    return subscriber
  }

  // ================================
  // ADMIN OPERATIONS
  // ================================

  async findAll(params: NewsletterQueryInput): Promise<{
    data: Array<{ id: number; email: string; createdAt: Date }>
    pagination: Pagination
  }> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = params

    // Build where clause
    const where: Prisma.NewsletterSubscriberWhereInput = {}

    if (search) {
      where.email = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Count total
    const total = await db.newsletterSubscriber.count({ where })

    // Fetch subscribers
    const subscribers = await db.newsletterSubscriber.findMany({
      where,
      select: {
        id: true,
        email: true,
        createdAt: true
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      data: subscribers,
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

  async delete(id: number): Promise<void> {
    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { id }
    })

    if (!subscriber) {
      throw new Error('Subscriber not found')
    }

    await db.newsletterSubscriber.delete({
      where: { id }
    })
  }
}

export const newsletterService = new NewsletterService()
