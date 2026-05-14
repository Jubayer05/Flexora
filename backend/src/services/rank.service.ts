import { Prisma } from '@prisma/client'
import db from '../configs/db'
import { transformDecimals } from '../utils'
import type { CreateRankData, RankQuery, UpdateRankData } from '../validations/zod/rank.schema'

class RankService {
  /**
   * Create a new rank
   */
  async create(data: CreateRankData) {
    // Check if rank name already exists
    const existingRank = await db.rank.findUnique({
      where: { name: data.name }
    })

    if (existingRank) {
      throw new Error(`Rank with name ${data.name} already exists`)
    }

    const rank = await db.rank.create({
      data: {
        name: data.name,
        displayOrder: data.displayOrder || 0,
        description: data.description,
        minSpending: data.minSpending,
        maxSpending: data.maxSpending,
        discount: data.discount || 0,
        bonusDevices: data.bonusDevices || 0,
        meta: data.meta as any,
        icon: data.icon
      }
    })

    return transformDecimals(rank)
  }

  /**
   * Get rank by ID
   */
  async findById(id: number) {
    const rank = await db.rank.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customer: true }
        }
      }
    })

    if (!rank) {
      throw new Error('Rank not found')
    }

    return transformDecimals(rank)
  }

  /**
   * Get rank by name
   */
  async findByName(name: string) {
    const rank = await db.rank.findUnique({
      where: { name }
    })

    return rank ? transformDecimals(rank) : null
  }

  /**
   * Get all ranks with pagination and filters
   */
  async findMany(query: RankQuery) {
    const { page = 1, limit = 10, search, sortBy = 'displayOrder', sortOrder = 'asc' } = query
    const skip = (page - 1) * limit

    const where: Prisma.RankWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [ranks, total] = await Promise.all([
      db.rank.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { customer: true }
          }
        }
      }),
      db.rank.count({ where })
    ])

    return {
      ranks: ranks.map((item) => transformDecimals(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get all ranks without pagination (for dropdowns)
   */
  async findAll() {
    const ranks = await db.rank.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        minSpending: true,
        maxSpending: true,
        discount: true,
        bonusDevices: true,
        icon: true,
        description: true
      }
    })

    return ranks.map((rank) => transformDecimals(rank))
  }

  /**
   * Update rank
   */
  async update(id: number, data: UpdateRankData) {
    // Check if rank exists
    const existingRank = await db.rank.findUnique({
      where: { id }
    })

    if (!existingRank) {
      throw new Error('Rank not found')
    }

    // If name is being updated, check for uniqueness
    if (data.name && data.name !== existingRank.name) {
      const nameExists = await db.rank.findUnique({
        where: { name: data.name }
      })

      if (nameExists) {
        throw new Error(`Rank with name ${data.name} already exists`)
      }
    }

    const updatedRank = await db.rank.update({
      where: { id },
      data: {
        name: data.name,
        displayOrder: data.displayOrder,
        icon: data.icon,
        description: data.description,
        minSpending: data.minSpending,
        maxSpending: data.maxSpending,
        discount: data.discount,
        bonusDevices: data.bonusDevices,
        meta: data.meta !== undefined ? data.meta : undefined
      }
    })

    return transformDecimals(updatedRank)
  }

  /**
   * Delete rank
   */
  async delete(id: number) {
    // Check if rank exists
    const existingRank = await db.rank.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customer: true }
        }
      }
    })

    if (!existingRank) {
      throw new Error('Rank not found')
    }

    // Prevent deletion if users are assigned to this rank
    if (existingRank._count.customer > 0) {
      throw new Error(
        `Cannot delete rank. ${existingRank._count.customer} user(s) are assigned to this rank`
      )
    }

    await db.rank.delete({
      where: { id }
    })

    return { message: 'Rank deleted successfully' }
  }

  /**
   * Get appropriate rank for a user based on their total spent
   */
  async getRankForUser(totalSpent: number) {
    const ranks = await db.rank.findMany({
      where: {
        minSpending: {
          lte: totalSpent
        },
        maxSpending: {
          gte: totalSpent
        }
      },
      orderBy: { minSpending: 'desc' },
      take: 1
    })

    return ranks[0] ? transformDecimals(ranks[0]) : null
  }

  /**
   * Get the next rank tier: the rank with the smallest minSpending greater than
   * the current tier's minSpending (so we get the next tier even when current
   * rank has a very large maxSpending).
   */
  async getNextRank(currentRankMinSpending: number) {
    const next = await db.rank.findFirst({
      where: { minSpending: { gt: currentRankMinSpending } },
      orderBy: { minSpending: 'asc' },
      select: { name: true, minSpending: true, discount: true, meta: true }
    })
    return next ? transformDecimals(next) : null
  }

  /**
   * Update user rank based on total spent
   */
  async updateUserRank(userId: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totalSpent: true, rankId: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const appropriateRank = await this.getRankForUser(Number(user.totalSpent))

    // Only update if rank changed
    if (appropriateRank && appropriateRank.id !== user.rankId) {
      await db.user.update({
        where: { id: userId },
        data: { rankId: appropriateRank.id }
      })

      return appropriateRank
    }

    return null // No rank change needed
  }

  /**
   * Get user's rank discount for order
   */
  async getUserRankDiscount(
    userId: number,
    orderAmount: number
  ): Promise<{
    discount: number
    discountedTotal: number
    discountPercent: number
    rankName: string | null
  }> {
    try {
      // Use the same spending-based rank resolution as the customer profile,
      // so checkout totals and saved orders always match.
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })

      if (!user) {
        return {
          discount: 0,
          discountedTotal: orderAmount,
          discountPercent: 0,
          rankName: null
        }
      }

      const orderTotals = await db.order.aggregate({
        where: {
          userId,
          status: { in: ['COMPLETED', 'PARTIAL'] }
        },
        _sum: { total: true }
      })

      const totalSpent = Number(orderTotals._sum.total?.toString() ?? 0)
      const applicableRank = await this.getRankForUser(totalSpent)

      if (!applicableRank) {
        return {
          discount: 0,
          discountedTotal: orderAmount,
          discountPercent: 0,
          rankName: null
        }
      }

      // Calculate discount
      const discountPercent = Number(applicableRank.discount || 0)
      const discountAmount = Math.round(((orderAmount * discountPercent) / 100) * 100) / 100 // Round to 2 decimal places

      return {
        discount: discountAmount,
        discountedTotal: orderAmount - discountAmount,
        discountPercent,
        rankName: applicableRank.name
      }
    } catch (error) {
      console.error('Error calculating rank discount:', error)
      // Return no discount on error to not block order creation
      return {
        discount: 0,
        discountedTotal: orderAmount,
        discountPercent: 0,
        rankName: null
      }
    }
  }
}

export default new RankService()
