import type { Coupon, CouponUsage, Prisma } from '@prisma/client';
import { CouponScope, CouponStatus, CouponType } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../configs/cache.config';
import db from '../configs/db';
import type { Pagination } from '../types/req-res';
import type {
  ApplyCouponInput,
  BulkCouponDeleteInput,
  BulkCouponUpdateInput,
  CouponQueryInput,
  CouponStatsQueryInput,
  CouponUsageQueryInput,
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponInput,
} from '../validations/zod/coupon.schema';
import { CacheInvalidationService } from './cache-invalidation.service';
import { cacheService } from './cache.service';

export class CouponService {
  private cacheInvalidationService = new CacheInvalidationService();

  // ================================
  // HELPER METHODS
  // ================================

  private async invalidateCouponCache(couponId?: number): Promise<void> {
    try {
      await Promise.all([
        cacheService.del(CACHE_KEYS.COUPONS.LIST),
        cacheService.del(CACHE_KEYS.COUPONS.STATS),
        cacheService.del(CACHE_KEYS.COUPONS.USAGE),
        ...(couponId ? [cacheService.del(CACHE_KEYS.COUPONS.BY_ID(couponId))] : []),
      ]);
    } catch (error) {
      console.error('Error invalidating coupon cache:', error);
    }
  }

  private buildCouponWhereClause(params: CouponQueryInput): Prisma.CouponWhereInput {
    const where: Prisma.CouponWhereInput = {};

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.scope) {
      where.scope = params.scope;
    }

    if (!params.includeExpired) {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    }

    return where;
  }

  private normalizeIdList(values: unknown): number[] {
    if (!Array.isArray(values)) return [];

    return [
      ...new Set(
        values
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      ),
    ];
  }

  private getCouponApplicableGroupIds(coupon: Coupon): number[] {
    const meta =
      coupon.meta && typeof coupon.meta === 'object' && !Array.isArray(coupon.meta)
        ? (coupon.meta as Record<string, unknown>)
        : {};

    return this.normalizeIdList(meta.applicableGroupIds);
  }

  private async calculateDiscountAmount(
    coupon: Coupon,
    orderAmount: number,
    productIds: number[]
  ): Promise<{ discountAmount: number; canApply: boolean; reason?: string }> {
    const normalizedProductIds = this.normalizeIdList(productIds);
    const applicableProductIds = this.normalizeIdList(coupon.applicableProductIds);
    const applicableCategoryIds = this.normalizeIdList(coupon.applicableCategoryIds);
    const applicableGroupIds = this.getCouponApplicableGroupIds(coupon);

    // Check if coupon is applicable to the products
    if (coupon.scope === CouponScope.SPECIFIC_PRODUCTS) {
      const hasApplicableProduct = normalizedProductIds.some((id) =>
        applicableProductIds.includes(id)
      );
      if (!hasApplicableProduct) {
        return {
          discountAmount: 0,
          canApply: false,
          reason: 'Coupon not applicable to selected products',
        };
      }
    }

    if (coupon.scope === CouponScope.SPECIFIC_CATEGORIES || applicableGroupIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: normalizedProductIds } },
        select: {
          categoryId: true,
          productGroupId: true,
          productGroup: {
            select: {
              categoryId: true,
            },
          },
        },
      });

      if (applicableGroupIds.length > 0) {
        const hasApplicableGroup = products.some(
          (product) =>
            product.productGroupId !== null && applicableGroupIds.includes(product.productGroupId)
        );

        if (!hasApplicableGroup) {
          return {
            discountAmount: 0,
            canApply: false,
            reason: 'Coupon not applicable to selected product groups',
          };
        }
      }

      if (coupon.scope === CouponScope.SPECIFIC_CATEGORIES) {
        const productCategoryIds = new Set(
          products.flatMap((product) =>
            [product.categoryId, product.productGroup?.categoryId]
              .map((id) => Number(id))
              .filter((id) => Number.isInteger(id) && id > 0)
          )
        );
        const hasApplicableCategory = applicableCategoryIds.some((id) =>
          productCategoryIds.has(id)
        );

        if (!hasApplicableCategory) {
          return {
            discountAmount: 0,
            canApply: false,
            reason: 'Coupon not applicable to selected product categories',
          };
        }
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      return {
        discountAmount: 0,
        canApply: false,
        reason: `Minimum order amount of $${coupon.minOrderAmount} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;

      // Apply maximum discount limit for percentage coupons
      if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else {
      // Fixed amount discount
      discountAmount = Math.min(Number(coupon.discountValue), orderAmount);
    }

    return { discountAmount, canApply: true };
  }

  // ================================
  // CORE CRUD OPERATIONS
  // ================================

  async create(data: CreateCouponInput): Promise<Coupon> {
    // Check if coupon code already exists
    const existingCoupon = await db.coupon.findUnique({
      where: { code: data.code },
    });

    if (existingCoupon) {
      throw new Error('Coupon code already exists');
    }

    // Create coupon
    const coupon = await db.coupon.create({
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await this.invalidateCouponCache();
    return coupon;
  }

  async findById(id: number): Promise<Coupon | null> {
    const cacheKey = CACHE_KEYS.COUPONS.BY_ID(id);

    const cached = await cacheService.get<Coupon>(cacheKey);
    if (cached) return cached;

    const coupon = await db.coupon.findUnique({
      where: { id },
    });

    if (coupon) {
      await cacheService.set(cacheKey, coupon, CACHE_TTL.COUPONS);
    }

    return coupon;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  async findMany(params: CouponQueryInput): Promise<{
    data: Coupon[];
    pagination: Pagination;
  }> {
    const where = this.buildCouponWhereClause(params);
    const { page, limit, sortBy, sortOrder } = params;

    const [data, total] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.coupon.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: number, data: UpdateCouponInput): Promise<Coupon> {
    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    if (data.code && data.code !== existingCoupon.code) {
      const couponWithCode = await db.coupon.findUnique({
        where: { code: data.code },
        select: { id: true },
      });

      if (couponWithCode && couponWithCode.id !== id) {
        throw new Error('Coupon code already exists');
      }
    }

    const { id: _id, ...updateData } = data;

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...updateData,
        startsAt: updateData.startsAt ? new Date(updateData.startsAt) : undefined,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
      },
    });

    await this.invalidateCouponCache(id);
    return coupon;
  }

  async delete(id: number): Promise<void> {
    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    await db.coupon.delete({
      where: { id },
    });

    await this.invalidateCouponCache(id);
  }

  // ================================
  // BULK OPERATIONS
  // ================================

  async bulkUpdate(params: BulkCouponUpdateInput): Promise<number> {
    const { ids, data } = params;

    const updateData: Prisma.CouponUpdateManyArgs['data'] = {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      updatedAt: new Date(),
    };

    const result = await db.coupon.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    await this.invalidateCouponCache();
    return result.count;
  }

  async bulkDelete(params: BulkCouponDeleteInput): Promise<number> {
    const { ids } = params;

    const result = await db.coupon.deleteMany({
      where: { id: { in: ids } },
    });

    await this.invalidateCouponCache();
    return result.count;
  }

  // ================================
  // COUPON VALIDATION & APPLICATION
  // ================================

  async validateCoupon(params: ValidateCouponInput): Promise<{
    isValid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    reason?: string;
    canApply: boolean;
  }> {
    const { code, productIds, orderAmount = 0 } = params;

    // Find coupon by code
    const coupon = await this.findByCode(code);
    if (!coupon) {
      return { isValid: false, reason: 'Coupon not found', canApply: false };
    }

    // Check if coupon is active
    if (coupon.status !== CouponStatus.ACTIVE) {
      return { isValid: false, coupon, reason: 'Coupon is not active', canApply: false };
    }

    // Check if coupon has started
    if (coupon.startsAt && new Date() < coupon.startsAt) {
      return { isValid: false, coupon, reason: 'Coupon is not yet valid', canApply: false };
    }

    // Check if coupon has expired
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return { isValid: false, coupon, reason: 'Coupon has expired', canApply: false };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { isValid: false, coupon, reason: 'Coupon usage limit reached', canApply: false };
    }

    // Calculate discount if order amount is provided
    if (orderAmount > 0) {
      const discountResult = await this.calculateDiscountAmount(coupon, orderAmount, productIds);
      return {
        isValid: true,
        coupon,
        discountAmount: discountResult.discountAmount,
        reason: discountResult.reason,
        canApply: discountResult.canApply,
      };
    }

    return { isValid: true, coupon, canApply: true };
  }

  async applyCoupon(params: ApplyCouponInput): Promise<{
    success: boolean;
    discountAmount: number;
    coupon?: Coupon;
    reason?: string;
  }> {
    const { code, orderAmount, productIds, userId, guestEmail } = params;

    // Validate coupon
    const validation = await this.validateCoupon({ code, productIds, orderAmount });
    if (!validation.isValid || !validation.canApply) {
      return {
        success: false,
        discountAmount: 0,
        coupon: validation.coupon,
        reason: validation.reason,
      };
    }

    const coupon = validation.coupon!;

    // Check user-specific usage limit
    if (coupon.userUsageLimit) {
      const userUsageCount = await db.couponUsage.count({
        where: {
          couponId: coupon.id,
          ...(userId ? { userId } : { guestEmail }),
        },
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return {
          success: false,
          discountAmount: 0,
          coupon,
          reason: 'User usage limit reached for this coupon',
        };
      }
    }

    return {
      success: true,
      discountAmount: validation.discountAmount || 0,
      coupon,
    };
  }

  // ================================
  // COUPON USAGE TRACKING
  // ================================

  async recordUsage(
    couponId: number,
    orderId: number,
    userId: number | null,
    guestEmail: string | null,
    discountAmount: number,
    orderAmount: number
  ): Promise<CouponUsage> {
    const usage = await db.couponUsage.create({
      data: {
        couponId,
        orderId,
        userId,
        guestEmail,
        discountAmount,
        orderAmount,
      },
    });

    // Increment coupon usage count
    await db.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });

    await this.invalidateCouponCache(couponId);
    return usage;
  }

  async getUsageHistory(params: CouponUsageQueryInput): Promise<{
    data: (CouponUsage & { coupon: { code: string; name: string | null } })[];
    pagination: Pagination;
  }> {
    const { page, limit, sortBy, sortOrder, ...filters } = params;

    const where: Prisma.CouponUsageWhereInput = {};
    if (filters.couponId) where.couponId = filters.couponId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.guestEmail) where.guestEmail = filters.guestEmail;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      db.couponUsage.findMany({
        where,
        include: {
          coupon: {
            select: { code: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.couponUsage.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  async getStats(params: CouponStatsQueryInput): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    totalUsage: number;
    totalDiscountGiven: number;
    averageDiscountPerOrder: number;
    topCoupons: Array<{
      id: number;
      code: string;
      usageCount: number;
      totalDiscount: number;
    }>;
    usageByDate: Array<{
      date: string;
      usage: number;
      discount: number;
    }>;
  }> {
    const { startDate, endDate, groupBy } = params;

    // Date filters
    const dateFilter: Prisma.CouponUsageWhereInput = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const [totalCoupons, activeCoupons, expiredCoupons, usageStats, topCoupons, usageByDate] =
      await Promise.all([
        // Total coupons
        db.coupon.count(),

        // Active coupons
        db.coupon.count({
          where: {
            status: CouponStatus.ACTIVE,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        }),

        // Expired coupons
        db.coupon.count({
          where: {
            OR: [{ status: { not: CouponStatus.ACTIVE } }, { expiresAt: { lte: new Date() } }],
          },
        }),

        // Usage statistics
        db.couponUsage.aggregate({
          where: dateFilter,
          _count: { id: true },
          _sum: { discountAmount: true },
        }),

        // Top coupons by usage
        db.couponUsage.groupBy({
          by: ['couponId'],
          where: dateFilter,
          _count: { id: true },
          _sum: { discountAmount: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),

        // Usage by date
        db.$queryRaw`
        SELECT 
          DATE_TRUNC(${groupBy}, created_at) as date,
          COUNT(*)::int as usage,
          SUM(discount_amount)::float as discount
        FROM coupon_usage 
        WHERE created_at >= ${startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND created_at <= ${endDate ? new Date(endDate) : new Date()}
        GROUP BY DATE_TRUNC(${groupBy}, created_at)
        ORDER BY date ASC
      ` as unknown as Promise<Array<{ date: Date; usage: number; discount: number }>>,
      ]);

    // Get coupon details for top coupons
    const topCouponIds = topCoupons.map((t) => t.couponId);
    const couponDetails = await db.coupon.findMany({
      where: { id: { in: topCouponIds } },
      select: { id: true, code: true },
    });

    const topCouponsWithDetails = topCoupons.map((t) => {
      const coupon = couponDetails.find((c) => c.id === t.couponId);
      return {
        id: t.couponId,
        code: coupon?.code || '',
        usageCount: t._count.id,
        totalDiscount: Number(t._sum.discountAmount || 0),
      };
    });

    const totalUsage = usageStats._count.id || 0;
    const totalDiscountGiven = Number(usageStats._sum.discountAmount || 0);

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
      totalDiscountGiven,
      averageDiscountPerOrder: totalUsage > 0 ? totalDiscountGiven / totalUsage : 0,
      topCoupons: topCouponsWithDetails,
      usageByDate: usageByDate.map((u) => ({
        date: u.date?.toISOString().split('T')[0] || '',
        usage: u.usage,
        discount: u.discount,
      })),
    };
  }
}

export const couponService = new CouponService();
