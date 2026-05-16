import type { User, UserRole } from '@prisma/client'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { CACHE_KEYS, CACHE_TTL, buildCacheKey } from '../configs/cache.config'
import db from '../configs/db'
import type { UserWithLoginInfo } from '../types/req-res'
import type {
  BulkUserDeleteData,
  BulkUserUpdateData,
  ConvertGuestData,
  CreateUserData,
  PasswordChangeData,
  UpdateUserData,
  UserQueryParams
} from '../validations/zod/user.schema'
import { CacheInvalidationService } from './cache-invalidation.service'
import { cacheService } from './cache.service'
import rankService from './rank.service'
import { getCountryFromIP } from '../utils/geo'

export class UserService {
  private readonly SALT_ROUNDS = 12
  private readonly SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@flexora.com'
  private cacheInvalidationService = new CacheInvalidationService()

  // ================================
  // HELPER METHODS
  // ================================

  private isSuperAdmin(email: string): boolean {
    return email === this.SUPER_ADMIN_EMAIL
  }

  private isSuperAdminUser(user: any): boolean {
    return user?.email === this.SUPER_ADMIN_EMAIL
  }

  private excludeSuperAdminWhere(): UserWhereInput {
    return {
      email: { not: this.SUPER_ADMIN_EMAIL }
    }
  }

  // ================================
  // CORE CRUD OPERATIONS
  // ================================

  async create(
    data: CreateUserData & { isVerified?: boolean; referredById?: number }
  ): Promise<Omit<User, 'passwordHash' | 'guestToken'>> {
    const { password, isGuest = false, isVerified, referredById, ...userData } = data

    let passwordHash: string | null = null
    let guestToken: string | null = null

    if (isGuest) {
      guestToken = this.generateGuestToken()
    } else if (password) {
      passwordHash = await this.hashPassword(password)
    }

    // Every user gets a referral code (for their own referral link). Prefer username if valid and unique.
    let referralCode: string | null = null
    if (userData.username && userData.username.length >= 3) {
      const existing = await db.user.findUnique({ where: { referralCode: userData.username } })
      referralCode = existing ? null : userData.username
    }
    if (!referralCode) {
      referralCode = await this.generateUniqueReferralCode()
    }

    const user = await db.user.create({
      data: {
        ...userData,
        passwordHash,
        isGuest,
        guestToken,
        discountPercent: 0,
        totalSpent: 0,
        totalOrders: 0,
        referralCode,
        referredById: referredById ?? undefined,
        isVerified: typeof isVerified === 'boolean' ? isVerified : Boolean(passwordHash)
      },
      omit: { passwordHash: true, guestToken: true }
    })

    // Invalidate user-related caches (mainly for admin lists)
    await this.cacheInvalidationService.invalidateUser(user.id)

    return user
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const length = 8
    for (let i = 0; i < 20; i++) {
      const code = crypto.randomBytes(length / 2).toString('hex')
      const existing = await db.user.findUnique({ where: { referralCode: code } })
      if (!existing) return code
    }
    return crypto.randomBytes(6).toString('hex')
  }

  /**
   * Ensure the user has a referral code (for affiliate links). Generates and saves one if missing.
   * Returns the referral code (existing or newly generated).
   */
  async ensureReferralCode(userId: number): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, username: true }
    })
    if (!user) throw new Error('User not found')
    if (user.referralCode) return user.referralCode
    if (user.username && user.username.length >= 3) {
      const existing = await db.user.findUnique({ where: { referralCode: user.username } })
      if (!existing) {
        await db.user.update({
          where: { id: userId },
          data: { referralCode: user.username }
        })
        return user.username
      }
    }
    const code = await this.generateUniqueReferralCode()
    await db.user.update({
      where: { id: userId },
      data: { referralCode: code }
    })
    return code
  }

  async findById(id: number): Promise<UserWithLoginInfo | null> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}:${id}`

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const user = await db.user.findUnique({
          where: { id },
          include: {
            rank: {
              select: { name: true, discount: true }
            },
            orders: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                total: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            loginSessions: {
              select: {
                ipAddress: true,
                userAgent: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          omit: {
            passwordHash: true,
            guestToken: true
          }
        })

        if (!user) return null

        // Compute order statistics from orders table (source of truth)
        const [orderCount, orderSum] = await Promise.all([
          db.order.count({
            where: {
              userId: id,
              status: { in: ['COMPLETED', 'PARTIAL'] }
            }
          }),
          db.order.aggregate({
            where: {
              userId: id,
              status: { in: ['COMPLETED', 'PARTIAL'] }
            },
            _sum: { total: true }
          })
        ])
        const totalOrdersNum = orderCount
        const totalSpentNum = Number(orderSum._sum.total?.toString() ?? 0)

        // Resolve rank from actual order total (not User.totalSpent) so profile shows correct rank
        const appropriateRank = await rankService.getRankForUser(totalSpentNum)
        const rankName = appropriateRank?.name ?? null
        const discountPercentNum = Number(appropriateRank?.discount ?? user.discountPercent ?? 0)
        const rankMinSpending = appropriateRank
          ? Number(appropriateRank.minSpending ?? 0)
          : 0
        const rankMaxSpending = appropriateRank
          ? Number(appropriateRank.maxSpending ?? 0)
          : 0
        const rankBenefits: string[] = Array.isArray((appropriateRank as any)?.meta?.features)
          ? ((appropriateRank as any).meta.features as string[])
          : []
        const nextRank = await rankService.getNextRank(rankMinSpending)
        const nextRankName = nextRank?.name ?? null
        const nextRankMinSpending = nextRank ? Number(nextRank.minSpending ?? 0) : 0
        const nextRankDiscount = nextRank ? Number(nextRank.discount ?? 0) : 0
        const nextRankBenefits: string[] = Array.isArray((nextRank as any)?.meta?.features)
          ? ((nextRank as any).meta.features as string[])
          : []
        const rankIcon =
          appropriateRank && (appropriateRank as any).icon
            ? String((appropriateRank as any).icon)
            : null

        // Sync user.rankId if it differs from computed rank (keeps DB consistent)
        if (appropriateRank && appropriateRank.id !== user.rankId) {
          await db.user.update({
            where: { id },
            data: { rankId: appropriateRank.id }
          }).catch(() => { /* ignore update errors for profile read */ })
        }

        // Format user data to include last login details and order statistics for profile
        const lastLoginSession = user.loginSessions[0]
        const { loginSessions, rank, ...userWithoutSessionsAndRank } = user

        return {
          ...userWithoutSessionsAndRank,
          lastLoginIp: lastLoginSession?.ipAddress || null,
          lastLoginDevice: lastLoginSession?.userAgent || null,
          lastLoginAt: lastLoginSession?.createdAt || null,
          // Order statistics (ensure numbers and rank name for frontend)
          totalOrders: totalOrdersNum,
          totalSpent: totalSpentNum,
          discountPercent: discountPercentNum,
          rank: rankName,
          // Rank dashboard: benefits and progress to next rank
          rankBenefits,
          rankMinSpending,
          rankMaxSpending,
          nextRankName,
          nextRankMinSpending,
          nextRankDiscount,
          nextRankBenefits,
          rankIcon,
          // Affiliate: code for referral link, earnings (withdrawable)
          referral: {
            code: user.referralCode || user.username || '',
            earnings: Number(user.referralEarnings ?? 0)
          }
        } as UserWithLoginInfo
      },
      CACHE_TTL.USER_PROFILE
    )
  }

  async findByIdWithSensitiveData(id: number): Promise<User | null> {
    return await db.user.findUnique({
      where: { id }
    })
  }

  async findByEmail(email: string, options?: { bypassCache?: boolean }): Promise<User | null> {
    if (options?.bypassCache) {
      return await db.user.findUnique({
        where: { email }
      })
    }

    const cacheKey = buildCacheKey.userProfileByEmail(email)

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        return await db.user.findUnique({
          where: { email }
        })
      },
      CACHE_TTL.USER_PROFILE
    )
  }

  async findByUsername(username: string): Promise<User | null> {
    return await db.user.findUnique({
      where: { username }
    })
  }

  async findByGuestToken(guestToken: string): Promise<User | null> {
    return await db.user.findUnique({
      where: { guestToken }
    })
  }

  /** Find user by referral code or username (for ref= link resolution) */
  async findByReferralCodeOrUsername(codeOrUsername: string): Promise<User | null> {
    const trimmed = codeOrUsername.trim()
    const orConditions: Array<{ referralCode: string } | { username: string }> = [
      { referralCode: trimmed },
      { username: trimmed }
    ]
    if (!trimmed.startsWith('ref_')) {
      orConditions.push({ referralCode: `ref_${trimmed}` })
    }
    const user = await db.user.findFirst({
      where: { OR: orConditions, isActive: true }
    })
    return user
  }

  async findMany(params: Partial<UserQueryParams> = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      isVerified,
      isBanned,
      isGuest,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      country
    } = params

    const skip = (page - 1) * limit

    // Build where clause - Always exclude super admin
    const where: UserWhereInput = {
      ...this.excludeSuperAdminWhere()
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role !== undefined) where.role = role
    if (isActive !== undefined) where.isActive = isActive
    if (isVerified !== undefined) where.isVerified = isVerified
    if (isBanned !== undefined) where.isBanned = isBanned
    if (isGuest !== undefined) where.isGuest = isGuest
    if (country !== undefined) where.country = { contains: country, mode: 'insensitive' }

    // Execute query with count
    const [users, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          photoUrl: true,
          role: true,
          rank: true,
          isActive: true,
          totalSpent: true,
          phone: true,
          isGuest: true,
          note: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          country: true,
          loginSessions: {
            select: {
              ipAddress: true,
              userAgent: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          balance: true
        }
      }),
      db.user.count({ where })
    ])

    // Format users data to include last login details
    const formattedUsers = users.map((user) => {
      const lastLoginSession = user.loginSessions[0]
      const { loginSessions, ...userWithoutSessions } = user
      return {
        ...userWithoutSessions,
        lastLoginIp: lastLoginSession?.ipAddress || null,
        lastLoginDevice: lastLoginSession?.userAgent || null
      }
    })

    return {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    }
  }

  async findManyCustomerList(params: Partial<UserQueryParams> = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isVerified,
      isBanned,
      isGuest,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      country
    } = params

    const skip = (page - 1) * limit

    const where: UserWhereInput = {
      ...this.excludeSuperAdminWhere(),
      role: {
        in: ['CUSTOMER', 'GUEST']
      }
    }

    const includeRealUsers = true
    const includeGuestBuyers = isGuest !== false

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (isActive !== undefined) where.isActive = isActive
    if (isVerified !== undefined) where.isVerified = isVerified
    if (isBanned !== undefined) where.isBanned = isBanned
    if (isGuest !== undefined) where.isGuest = isGuest
    if (country !== undefined) where.country = { contains: country, mode: 'insensitive' }

    const usersPromise = includeRealUsers
      ? db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            photoUrl: true,
            role: true,
            rank: true,
            isActive: true,
            totalSpent: true,
            totalOrders: true,
            phone: true,
            isGuest: true,
            note: true,
            isBanned: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            country: true,
            loginSessions: {
              select: {
                ipAddress: true,
                userAgent: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            balance: true
          }
        })
      : Promise.resolve([])

    const guestOrdersPromise = includeGuestBuyers
      ? db.order.findMany({
          where: {
            userId: null,
            guestEmail: { not: null },
            ...(search
              ? {
                  OR: [
                    { guestEmail: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } }
                  ]
                }
              : {}),
            ...(country !== undefined ? { user: { country: { contains: country, mode: 'insensitive' } } } : {})
          },
          select: {
            id: true,
            guestEmail: true,
            customerName: true,
            customerPhone: true,
            total: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        })
      : Promise.resolve([])

    const [users, guestOrders] = await Promise.all([usersPromise, guestOrdersPromise])

    const formattedUsers = users.map((user) => {
      const lastLoginSession = user.loginSessions[0]
      const { loginSessions, ...userWithoutSessions } = user
      return {
        ...userWithoutSessions,
        customerListSource: 'user',
        lastLoginIp: lastLoginSession?.ipAddress || null,
        lastLoginDevice: lastLoginSession?.userAgent || null
      }
    })
    const existingCustomerEmails = new Set(
      formattedUsers.map((user: any) => String(user.email || '').trim().toLowerCase()).filter(Boolean)
    )

    const guestBuyerMap = new Map<
      string,
      {
        id: number
        email: string
        username: null
        firstName: string | null
        photoUrl: null
        role: UserRole
        rank: null
        isActive: boolean
        totalSpent: number
        totalOrders: number
        phone: string | null
        telegramUsername: null
        isGuest: boolean
        note: string | null
        isBanned: boolean
        createdAt: Date
        updatedAt: Date
        lastLoginAt: Date | null
        country: null
        balance: number
        customerListSource: string
        lastLoginIp: null
        lastLoginDevice: null
      }
    >()

    for (const order of guestOrders) {
      const email = (order.guestEmail || '').trim().toLowerCase()
      if (!email) continue
      if (existingCustomerEmails.has(email)) continue

      const existing = guestBuyerMap.get(email)
      const orderTotal = Number(order.total || 0)
      const displayName = (order.customerName || '').trim() || email.split('@')[0] || 'Guest'

      if (!existing) {
        const syntheticId = -Math.abs(
          email.split('').reduce((hash, char) => ((hash * 31 + char.charCodeAt(0)) | 0), 7)
        )

        guestBuyerMap.set(email, {
          id: syntheticId,
          email,
          username: null,
          firstName: displayName,
          photoUrl: null,
          role: 'GUEST',
          rank: null,
          isActive: true,
          totalSpent: orderTotal,
          totalOrders: 1,
          phone: order.customerPhone || null,
          telegramUsername: null,
          isGuest: true,
          note: null,
          isBanned: false,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          lastLoginAt: null,
          country: null,
          balance: 0,
          customerListSource: 'guest-order',
          lastLoginIp: null,
          lastLoginDevice: null
        })
        continue
      }

      existing.totalSpent += orderTotal
      existing.totalOrders += 1
      if (!existing.phone && order.customerPhone) {
        existing.phone = order.customerPhone
      }
      if (order.createdAt < existing.createdAt) {
        existing.createdAt = order.createdAt
      }
      if (order.updatedAt > existing.updatedAt) {
        existing.updatedAt = order.updatedAt
      }
    }

    let combinedUsers = [...formattedUsers, ...Array.from(guestBuyerMap.values())]

    const compareDirection = sortOrder === 'asc' ? 1 : -1
    combinedUsers.sort((left: any, right: any) => {
      const leftValue =
        sortBy === 'totalSpent'
          ? Number(left.totalSpent || 0)
          : sortBy === 'totalOrders'
            ? Number(left.totalOrders || 0)
            : sortBy === 'lastLoginAt'
              ? new Date(left.lastLoginAt || 0).getTime()
              : new Date(left[sortBy] || 0).getTime()
      const rightValue =
        sortBy === 'totalSpent'
          ? Number(right.totalSpent || 0)
          : sortBy === 'totalOrders'
            ? Number(right.totalOrders || 0)
            : sortBy === 'lastLoginAt'
              ? new Date(right.lastLoginAt || 0).getTime()
              : new Date(right[sortBy] || 0).getTime()

      if (leftValue === rightValue) {
        return String(left.email || '').localeCompare(String(right.email || '')) * compareDirection
      }

      return (leftValue > rightValue ? 1 : -1) * compareDirection
    })

    const totalCount = combinedUsers.length
    combinedUsers = combinedUsers.slice(skip, skip + limit)

    return {
      users: combinedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    }
  }

  async update(
    id: number,
    data: UpdateUserData
  ): Promise<Omit<User, 'passwordHash' | 'guestToken'>> {
    const user = await db.user.update({
      where: { id },
      data,
      omit: { passwordHash: true, guestToken: true }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)

    return user
  }

  async delete(id: number): Promise<User> {
    const user = await db.user.delete({
      where: { id }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)

    return user
  }

  // ================================
  // AUTHENTICATION HELPERS
  // ================================

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS)
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  generateGuestToken(): string {
    return `guest_${crypto.randomBytes(32).toString('hex')}`
  }

  // ================================
  // USER MANAGEMENT OPERATIONS
  // ================================

  async changePassword(id: number, data: PasswordChangeData): Promise<void> {
    const user = await db.user.findUnique({
      where: { id },
      select: { passwordHash: true }
    })

    if (!user) throw new Error('User not found')

    if (!data.currentPassword && !user.passwordHash) {
      const newPasswordHash = await this.hashPassword(data.newPassword)

      await db.user.update({
        where: { id },
        data: { passwordHash: newPasswordHash, isVerified: true }
      })

      // Invalidate user-related caches
      await this.cacheInvalidationService.invalidateUser(id)
      return
    }

    const isCurrentPasswordValid = await this.verifyPassword(
      data.currentPassword!,
      user.passwordHash!
    )

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    const newPasswordHash = await this.hashPassword(data.newPassword)

    await db.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash, isVerified: true }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  async setPassword(
    id: number,
    password: string,
    options?: { markEmailVerified?: boolean }
  ): Promise<void> {
    const passwordHash = await this.hashPassword(password)

    await db.user.update({
      where: { id },
      data: {
        passwordHash,
        ...(options?.markEmailVerified ? { isVerified: true } : {})
      }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  async banUser(id: number, reason: string): Promise<void> {
    await db.user.update({
      where: { id },
      data: {
        isBanned: true,
        banReason: reason,
        isActive: false
      }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  async banByIp(
    ipAddress: string,
    reason: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    // Find all login sessions with this IP
    const sessions = await db.loginSession.findMany({
      where: { ipAddress },
      select: {
        userId: true,
        user: { select: { id: true, email: true, isBanned: true, role: true } }
      },
      distinct: ['userId']
    })

    if (sessions.length === 0) {
      return { success: false, message: 'No users found with this IP address' }
    }

    // Filter customers who are not banned yet
    const customersToban = sessions
      .filter((s) => s.user.role === 'CUSTOMER' && !s.user.isBanned)
      .map((s) => s.userId)

    if (customersToban.length === 0) {
      return {
        success: false,
        message: 'No customers found with this IP or all are already banned'
      }
    }

    // Ban all customers
    await db.user.updateMany({
      where: { id: { in: customersToban } },
      data: {
        isBanned: true,
        banReason: reason,
        isActive: false
      }
    })

    // Invalidate caches for all banned users
    for (const userId of customersToban) {
      await this.cacheInvalidationService.invalidateUser(userId)
    }

    const bannedCustomers = sessions
      .filter((s) => customersToban.includes(s.userId))
      .map((s) => ({ id: s.user.id, email: s.user.email }))

    return {
      success: true,
      message: `${customersToban.length} customer(s) banned successfully`,
      data: { bannedCount: customersToban.length, customers: bannedCustomers }
    }
  }

  async unbanUser(id: number): Promise<void> {
    await db.user.update({
      where: { id },
      data: {
        isBanned: false,
        banReason: null,
        isActive: true
      }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  async verifyEmail(id: number): Promise<void> {
    await db.user.update({
      where: { id },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  async updateLastLogin(id: number): Promise<void> {
    await db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    })

    // Invalidate user-related caches
    await this.cacheInvalidationService.invalidateUser(id)
  }

  // ================================
  // RANK MANAGEMENT
  // ================================

  async updateUserRank(userId: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totalSpent: true, rankId: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get appropriate rank based on totalSpent
    const appropriateRank = await db.rank.findFirst({
      where: {
        minSpending: {
          lte: Number(user.totalSpent)
        },
        maxSpending: {
          gte: Number(user.totalSpent)
        }
      },
      orderBy: { minSpending: 'desc' }
    })

    // Only update if rank changed
    if (appropriateRank && appropriateRank.id !== user.rankId) {
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { rankId: appropriateRank.id },
        include: {
          rank: true
        }
      })

      // Invalidate user cache
      await this.cacheInvalidationService.invalidateUser(userId)

      return updatedUser
    }

    // Return user with current rank if no update needed
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      include: { rank: true }
    })

    return currentUser
  }

  // ================================
  // GUEST USER OPERATIONS
  // ================================

  async convertGuestToRegistered(guestToken: string, userData: ConvertGuestData): Promise<User> {
    const passwordHash = await this.hashPassword(userData.password)

    const user = await db.user.update({
      where: { guestToken },
      data: {
        ...userData,
        passwordHash,
        isGuest: false,
        guestToken: null,
        role: 'CUSTOMER'
      }
    })

    // Link any guest orders placed with this email before registration
    await this.linkGuestOrders(user.id, user.email)

    // Invalidate user-related caches after guest conversion
    await this.cacheInvalidationService.invalidateUser(user.id)

    return user
  }

  /**
   * Claim all orders placed with `guestEmail` that have no userId yet.
   * Idempotent — safe to call multiple times (only updates unlinked orders).
   * Also aggregates guest spending into the user's totalSpent/totalOrders.
   */
  async linkGuestOrders(userId: number, email: string): Promise<{ linked: number }> {
    const unlinkedOrders = await db.order.findMany({
      where: {
        guestEmail: email,
        userId: null,
        status: { in: ['COMPLETED', 'PARTIAL'] }
      },
      select: { id: true, total: true }
    })

    if (unlinkedOrders.length === 0) return { linked: 0 }

    await db.order.updateMany({
      where: {
        id: { in: unlinkedOrders.map((o) => o.id) }
      },
      data: { userId }
    })

    // Also link any PENDING orders so they show in the user's dashboard
    await db.order.updateMany({
      where: {
        guestEmail: email,
        userId: null,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      data: { userId }
    })

    const spentTotal = unlinkedOrders.reduce((sum, o) => sum + Number(o.total), 0)

    if (spentTotal > 0 || unlinkedOrders.length > 0) {
      await db.user.update({
        where: { id: userId },
        data: {
          totalSpent: { increment: spentTotal },
          totalOrders: { increment: unlinkedOrders.length }
        }
      })
    }

    console.log(`[UserService] Linked ${unlinkedOrders.length} guest orders to user ${userId} (${email})`)
    return { linked: unlinkedOrders.length }
  }

  async ensureGuestCheckoutUser(params: {
    email: string
    firstName?: string | null
    phone?: string | null
    country?: string | null
    ipAddress?: string | null
  }): Promise<{
    userId: number | null
    guestEmail: string
    source: 'created' | 'existing-guest' | 'registered-email'
  }> {
    const normalizedEmail = params.email.trim().toLowerCase()
    if (!normalizedEmail) {
      throw new Error('Guest email is required')
    }

    const existingUser = await this.findByEmail(normalizedEmail, { bypassCache: true })

    if (existingUser && !existingUser.isGuest) {
      return {
        userId: null,
        guestEmail: normalizedEmail,
        source: 'registered-email'
      }
    }

    const resolvedCountry =
      params.country || (params.ipAddress ? await getCountryFromIP(params.ipAddress) : null)
    const updateData: UserUpdateInput = {}

    if (params.firstName && !existingUser?.firstName) {
      updateData.firstName = params.firstName
    }
    if (params.phone && !existingUser?.phone) {
      updateData.phone = params.phone
    }
    if (resolvedCountry && !existingUser?.country) {
      updateData.country = resolvedCountry
    }
    if (existingUser && existingUser.role !== 'GUEST') {
      updateData.role = 'GUEST'
    }
    if (existingUser && !existingUser.isGuest) {
      updateData.isGuest = true
    }

    if (existingUser) {
      if (Object.keys(updateData).length > 0) {
        await db.user.update({
          where: { id: existingUser.id },
          data: updateData
        })
        await this.cacheInvalidationService.invalidateUser(existingUser.id)
      }

      await this.linkGuestOrders(existingUser.id, normalizedEmail)

      return {
        userId: existingUser.id,
        guestEmail: normalizedEmail,
        source: 'existing-guest'
      }
    }

    try {
      const createdUser = await this.create({
        email: normalizedEmail,
        firstName: params.firstName || undefined,
        phone: params.phone || undefined,
        country: resolvedCountry || undefined,
        isGuest: true,
        role: 'GUEST'
      })

      await this.linkGuestOrders(createdUser.id, normalizedEmail)

      return {
        userId: createdUser.id,
        guestEmail: normalizedEmail,
        source: 'created'
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentUser = await this.findByEmail(normalizedEmail, { bypassCache: true })
        if (concurrentUser?.isGuest) {
          await this.linkGuestOrders(concurrentUser.id, normalizedEmail)
          return {
            userId: concurrentUser.id,
            guestEmail: normalizedEmail,
            source: 'existing-guest'
          }
        }
      }

      throw error
    }
  }

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  async getUserStats() {
    const excludeSuperAdmin = this.excludeSuperAdminWhere()

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      guestUsers,
      bannedUsers,
      rankDistribution,
      recentRegistrations
    ] = await Promise.all([
      db.user.count({ where: excludeSuperAdmin }),
      db.user.count({ where: { ...excludeSuperAdmin, isActive: true } }),
      db.user.count({ where: { ...excludeSuperAdmin, isVerified: true } }),
      db.user.count({ where: { ...excludeSuperAdmin, isGuest: true } }),
      db.user.count({ where: { ...excludeSuperAdmin, isBanned: true } }),
      db.user.groupBy({
        by: ['rankId'],
        _count: { rankId: true },
        where: excludeSuperAdmin
      }),
      db.user.count({
        where: {
          ...excludeSuperAdmin,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ])

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      guestUsers,
      bannedUsers,
      rankDistribution,
      recentRegistrations
    }
  }

  // ================================
  // BULK OPERATIONS
  // ================================

  async bulkUpdate(data: BulkUserUpdateData): Promise<{ count: number }> {
    // Prevent updating super admin
    const nonSuperAdminUserIds = await this.filterOutSuperAdminIds(data.userIds)

    const result = await db.user.updateMany({
      where: { id: { in: nonSuperAdminUserIds } },
      data: data.data
    })

    // Invalidate caches for all updated users
    for (const userId of nonSuperAdminUserIds) {
      await this.cacheInvalidationService.invalidateUser(userId)
    }

    return { count: result.count }
  }

  async bulkDelete(data: BulkUserDeleteData): Promise<{ count: number }> {
    // Prevent deleting super admin
    const nonSuperAdminUserIds = await this.filterOutSuperAdminIds(data.userIds)

    const result = await db.user.deleteMany({
      where: { id: { in: nonSuperAdminUserIds } }
    })

    // Invalidate caches for all deleted users
    for (const userId of nonSuperAdminUserIds) {
      await this.cacheInvalidationService.invalidateUser(userId)
    }

    return { count: result.count }
  }

  private async filterOutSuperAdminIds(userIds: number[]): Promise<number[]> {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    })

    return users.filter((user) => !this.isSuperAdminUser(user)).map((user) => user.id)
  }
}
