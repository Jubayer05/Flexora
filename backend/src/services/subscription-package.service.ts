import { Prisma } from '@prisma/client'
import db from '../configs/db'
import type {
  CreateSubscriptionPackageInput,
  SubscriptionPackageQueryInput,
  UpdateSubscriptionPackageInput
} from '../validations/zod/subscription-package.schema'
import { cacheService } from './cache.service'

export class SubscriptionPackageService {
  private readonly CACHE_PREFIX = 'uhq:subscription-package:'
  private readonly CACHE_TTL = 3600 // 1 hour

  // ================================
  // CREATE
  // ================================
  async create(data: CreateSubscriptionPackageInput) {
    // Check if package with same name already exists
    const existing = await db.subscriptionPackage.findUnique({
      where: { name: data.name }
    })

    if (existing) {
      throw new Error('Subscription package with this name already exists')
    }

    const subscriptionPackage = await db.subscriptionPackage.create({
      data: {
        name: data.name,
        description: data.description,
        discount: data.discount,
        price: data.price,
        duration: data.duration,
        isActive: data.isActive,
        meta: data.meta
      }
    })

    // Invalidate cache
    await this.invalidateCache()

    return subscriptionPackage
  }

  // ================================
  // READ
  // ================================
  async findById(id: number) {
    const cacheKey = `${this.CACHE_PREFIX}${id}`

    // Try to get from cache
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    const subscriptionPackage = await db.subscriptionPackage.findUnique({
      where: { id }
    })

    if (!subscriptionPackage) {
      throw new Error('Subscription package not found')
    }

    // Cache the result
    await cacheService.set(cacheKey, subscriptionPackage, this.CACHE_TTL)

    return subscriptionPackage
  }

  async findMany(query: SubscriptionPackageQueryInput) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query

    // Build where clause
    const where: Prisma.SubscriptionPackageWhereInput = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    // Count total records
    const total = await db.subscriptionPackage.count({ where })

    // Fetch paginated data
    const subscriptionPackages = await db.subscriptionPackage.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      data: subscriptionPackages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }

  // ================================
  // UPDATE
  // ================================
  async update(id: number, data: UpdateSubscriptionPackageInput) {
    // Check if package exists
    const existing = await db.subscriptionPackage.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('Subscription package not found')
    }

    // Check if name is being updated and if it already exists
    if (data.name && data.name !== existing.name) {
      const duplicate = await db.subscriptionPackage.findUnique({
        where: { name: data.name }
      })

      if (duplicate) {
        throw new Error('Subscription package with this name already exists')
      }
    }

    const subscriptionPackage = await db.subscriptionPackage.update({
      where: { id },
      data
    })

    // Invalidate cache
    await this.invalidateCache()

    return subscriptionPackage
  }

  // ================================
  // DELETE
  // ================================
  async delete(id: number) {
    // Check if package exists
    const existing = await db.subscriptionPackage.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new Error('Subscription package not found')
    }

    await db.subscriptionPackage.delete({
      where: { id }
    })

    // Invalidate cache
    await this.invalidateCache()

    return { message: 'Subscription package deleted successfully' }
  }

  // ================================
  // HELPER METHODS
  // ================================
  private async invalidateCache() {
    await cacheService.clearPattern(`${this.CACHE_PREFIX}*`)
  }
}
