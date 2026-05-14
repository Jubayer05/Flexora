import type { Prisma } from '@prisma/client'
import { CACHE_KEYS, CACHE_TTL } from '../configs/cache.config'
import db from '../configs/db'
import { buildProductQuery } from '../factory/processors/product'
import { decrypt, encrypt } from '../utils/encryption'
import type {
  BulkProductDelete,
  BulkProductUpdate,
  CreateProduct,
  ProductImport,
  ProductQuery,
  TelegramProduct,
  UpdateProduct
} from '../validations/zod/product.schema'
import { TransferProductMetaSchema } from '../validations/zod/transfer-product.schema'
import { CacheInvalidationService } from './cache-invalidation.service'
import { cacheService } from './cache.service'
import { isTelegramTransferProduct, TELEGRAM_ACCOUNT_PRODUCT_TYPES, TELEGRAM_TRANSFER_PRODUCT_TYPES } from '../utils/product-type'

const CATALOG_DELETED_SLUG_PREFIX = '__deleted__-'

export class ProductService {
  private cacheInvalidationService = new CacheInvalidationService()
  private static readonly SKU_CREATE_MAX_ATTEMPTS = 10
  private static readonly PREMIUM_PRODUCT_TYPES = new Set([
    'PREMIUM_1M',
    'PREMIUM_3M',
    'PREMIUM_6M',
    'PREMIUM_12M'
  ])
  private normalizeTelegramPlatform<T extends { type?: unknown; platform?: unknown }>(data: T): T {
    const productType = String(data.type ?? '')

    if (
      (TELEGRAM_ACCOUNT_PRODUCT_TYPES.has(productType) ||
        TELEGRAM_TRANSFER_PRODUCT_TYPES.has(productType)) &&
      data.platform !== 'TELEGRAM'
    ) {
      return {
        ...data,
        platform: 'TELEGRAM'
      }
    }

    return data
  }

  private buildEncryptedStockData(
    stock: Record<string, any>,
    productId: number,
    platform: string | undefined | null
  ): Prisma.AccountUncheckedCreateInput {
    const adminNote =
      typeof stock.note === 'string' && stock.note.trim().length > 0 ? stock.note.trim() : undefined
    const stockFormat =
      stock.stockFormat === 'CUSTOM_DELIMITER' || stock.stockFormat === 'NEWLINE'
        ? stock.stockFormat
        : undefined
    const delimiter =
      typeof stock.delimiter === 'string' && stock.delimiter.trim().length > 0
        ? stock.delimiter.trim()
        : undefined
    const batchId =
      typeof stock.batchId === 'string' && stock.batchId.trim().length > 0
        ? stock.batchId.trim()
        : undefined
    const { note: _note, stockFormat: _stockFormat, delimiter: _delimiter, batchId: _batchId, ...credentials } = stock
    const meta = {
      ...(adminNote ? { adminNote } : {}),
      ...(stockFormat ? { stockFormat } : {}),
      ...(delimiter ? { delimiter } : {}),
      ...(batchId ? { batchId } : {})
    }

    return {
      encryptedData: encrypt(JSON.stringify(credentials)),
      productId,
      platform: ((platform as Prisma.AccountUncheckedCreateInput['platform'] | undefined) || 'OTHER'),
      meta: Object.keys(meta).length > 0 ? meta : undefined
    }
  }

  private async getReviewStatsMap(productIds: number[]) {
    const normalizedIds = [...new Set(productIds.filter((id) => Number.isFinite(id)))]

    if (normalizedIds.length === 0) {
      return new Map<number, { averageRating: number; reviewCount: number }>()
    }

    const feedbackStats = await db.feedback.groupBy({
      by: ['productId'],
      where: {
        published: true,
        productId: { in: normalizedIds }
      },
      _count: { _all: true },
      _avg: { rating: true }
    })

    return new Map(
      feedbackStats
        .filter((item) => item.productId !== null)
        .map((item) => [
          item.productId as number,
          {
            averageRating: Number(item._avg.rating || 0),
            reviewCount: item._count._all
          }
        ])
    )
  }

  private attachReviewStats<T extends { id: number }>(
    records: T[],
    reviewStatsMap: Map<number, { averageRating: number; reviewCount: number }>
  ) {
    return records.map((record) => ({
      ...record,
      reviewStats: reviewStatsMap.get(record.id) || {
        averageRating: 0,
        reviewCount: 0
      }
    }))
  }

  private normalizeFilePaths(filePath: unknown): string[] {
    if (Array.isArray(filePath)) {
      return filePath
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (typeof filePath === 'string') {
      const normalized = filePath.trim()
      return normalized ? [normalized] : []
    }

    return []
  }

  private applyTypeInventoryRules(data: Record<string, any>) {
    if (ProductService.PREMIUM_PRODUCT_TYPES.has(String(data.type))) {
      return {
        ...data,
        stockCount: 1,
        minQuantity: 1,
        maxQuantity: 1
      }
    }

    if (data.type !== 'FILE') {
      return data
    }

    const meta =
      data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta)
        ? { ...(data.meta as Record<string, any>) }
        : {}

    const normalizedFiles = this.normalizeFilePaths(meta.filePath)
    const licenseType = meta.licenseType === 'ONE_TIME' ? 'ONE_TIME' : 'ULTIMATE'

    return {
      ...data,
      stockCount: normalizedFiles.length,
      maxQuantity: licenseType === 'ULTIMATE' ? 1 : data.maxQuantity,
      meta: {
        ...meta,
        licenseType,
        filePath: normalizedFiles.length > 0 ? normalizedFiles : undefined
      }
    }
  }

  // ================================
  // SLUG GENERATION
  // ================================

  /**
   * Generate a URL-friendly slug from product name
   */
  private generateSlug(name: string): string {
    return name
      .trim()
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }

  /**
   * Ensure slug is unique by appending a number if necessary
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug
    let counter = 1
    const maxAttempts = 100 // Safety limit to prevent infinite loop

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const existing = await db.product.findFirst({
          where: {
            slug,
            deletedAt: null,
            ...(excludeId && { id: { not: excludeId } })
          }
        })

        if (!existing) {
          return slug
        }

        slug = `${baseSlug}${counter}`
        counter++
      }
    } catch (error: any) {
      // If slug column doesn't exist yet, just return the base slug
      // This allows the code to work before migration is run
      if (error?.message?.includes('slug') || error?.code === 'P2021') {
        console.warn(
          'Slug column not found in database. Migration needed. Using base slug:',
          baseSlug
        )
        return baseSlug
      }
      throw error
    }

    // If we reach max attempts, throw an error
    throw new Error(
      `Unable to generate unique slug for "${baseSlug}" after ${maxAttempts} attempts`
    )
  }

  /**
   * Generate clone slugs as Base1, Base2, Base3, etc.
   * Avoid `#` because it is treated as a URL fragment in browser paths.
   */
  private async ensureUniqueCloneSlug(baseSlug: string): Promise<string> {
    const normalizedBase = baseSlug.trim() || `Product${Date.now()}`
    const maxAttempts = 100

    try {
      for (let counter = 1; counter <= maxAttempts; counter++) {
        const slug = `${normalizedBase}${counter}`
        const existing = await db.product.findFirst({
          where: { slug, deletedAt: null },
          select: { id: true }
        })

        if (!existing) {
          return slug
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('slug') || error?.code === 'P2021') {
        console.warn(
          'Slug column not found in database. Migration needed. Using clone slug:',
          `${normalizedBase}1`
        )
        return `${normalizedBase}1`
      }
      throw error
    }

    throw new Error(
      `Unable to generate unique clone slug for "${normalizedBase}" after ${maxAttempts} attempts`
    )
  }

  // ================================
  // CRUD OPERATIONS
  // ================================

  private async updateProductStockCount(productId: number) {
    const stockCount = await db.account.count({
      where: {
        productId,
        isUsed: false,
        isValid: true,
        archived: false // Exclude archived accounts from stock count
      }
    })

    await db.product.update({
      where: { id: productId },
      data: { stockCount }
    })
  }

  private buildCatalogDeletedSlug(productId: number) {
    return `${CATALOG_DELETED_SLUG_PREFIX}${productId}-${Date.now()}`
  }

  private async removeProductFromCatalog(productId: number) {
    const deletedSlug = this.buildCatalogDeletedSlug(productId)

    await db.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: { productId }
      })

      await tx.account.deleteMany({
        where: {
          productId,
          usedByOrderId: null
        }
      })

      await tx.product.update({
        where: { id: productId },
        data: {
          isActive: false,
          isFeatured: false,
          isPrivate: false,
          privateUrl: null,
          stockCount: 0,
          slug: deletedSlug,
          deletedAt: new Date()
        }
      })
    })
  }

  async create(data: CreateProduct) {
    data = this.normalizeTelegramPlatform(data)

    // Generate and ensure unique slug if not provided
    let slug = data.slug?.trim()
    if (!slug) {
      slug = this.generateSlug(data.name)
    }

    try {
      slug = await this.ensureUniqueSlug(slug)

      // Check if slug already exists (in case provided slug conflicts)
      const existingSlug = await db.product.findFirst({
        where: { slug, deletedAt: null },
        select: { slug: true }
      })

      if (existingSlug) {
        slug = await this.ensureUniqueSlug(slug)
      }
    } catch (error: any) {
      // If slug column doesn't exist, use a fallback (product ID will be used in URL)
      if (error?.message?.includes('slug') || error?.code === 'P2021') {
        console.warn(
          'Slug column not found. Product will be accessible by ID until migration is run.'
        )
        slug = `product-${Date.now()}` // Temporary slug
      } else {
        throw error
      }
    }

    if (!data.platform) throw new Error('Platform is required')

    // Handle Telegram Transfer Products (use same SKU resolved above)
    if (isTelegramTransferProduct(data)) {
      return this.createTelegramTransferProduct({ ...data, slug })
    }

    // Regular product creation
    const tags = data.tags ? data.tags.split(',').map((tag) => tag.trim().toLowerCase()) : []
    const { stocks, ...rest } = data

    const baseProductData: any = this.applyTypeInventoryRules({
      ...rest,
      tags,
      privateUrl: data.privateUrl ? data.privateUrl : undefined,
      stockCount: 0 // Will be calculated from accounts
    })

    // Try to add slug, but handle gracefully if column doesn't exist yet
    try {
      if (slug) {
        baseProductData.slug = slug
      }
    } catch (error) {
      // Slug column may not exist yet - will be added after migration
      console.warn('Slug field skipped - migration may be needed')
    }

    const product = await this.createProductRecordWithUniqueSku(baseProductData)

    const stocksToBeCreated: Prisma.AccountUncheckedCreateInput[] = []

    // create stocks
    if (stocks && Array.isArray(stocks)) {
      for (const stock of stocks) {
        const rawStock =
          stock && typeof stock === 'object' && !Array.isArray(stock)
            ? (stock as Record<string, any>)
            : {}
        stocksToBeCreated.push(this.buildEncryptedStockData(rawStock, product.id, data.platform))
      }
    }

    if (stocksToBeCreated.length > 0) {
      await db.account.createMany({
        data: stocksToBeCreated
      })
    }

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(product.id)
    await this.updateProductStockCount(product.id)

    return product
  }

  /**
   * Create Telegram Transfer Product (Group/Channel Ownership)
   * - Validates transfer meta schema
   * - Checks for duplicate telegramUrl
   * - Sets transfer-specific defaults
   */
  private async createTelegramTransferProduct(data: CreateProduct & { sku?: string }) {
    const rawMeta =
      data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta)
        ? ({ ...(data.meta as Record<string, any>) } as Record<string, any>)
        : {}

    const isChannelsGroupsCatalogProduct = String(data.type) === 'TELEGRAM_CHANNEL_GROUPS'
    const hasFullTransferSetup =
      typeof data.telegramUrl === 'string' &&
      data.telegramUrl.trim().length > 0 &&
      typeof rawMeta.adminPhone === 'string' &&
      rawMeta.adminPhone.trim().length > 0 &&
      typeof rawMeta.originalOwner === 'string' &&
      rawMeta.originalOwner.trim().length > 0

    // Keep generic product-create flow lightweight for the new channels/groups type.
    // Full transfer details can be completed later from Management Channels/groups via the "+" action.
    let transferMeta: Record<string, any> = {
      ...rawMeta,
      transferType:
        rawMeta.transferType === 'channel' || rawMeta.transferType === 'group'
          ? rawMeta.transferType
          : 'group',
      botAdded: typeof rawMeta.botAdded === 'boolean' ? rawMeta.botAdded : false
    }

    if (!isChannelsGroupsCatalogProduct) {
      if (!data.meta) {
        throw new Error(
          'Transfer products require meta data with transferType, botAdded, adminPhone, originalOwner, etc.'
        )
      }

      transferMeta = TransferProductMetaSchema.parse(transferMeta)
    } else if (hasFullTransferSetup) {
      transferMeta = TransferProductMetaSchema.parse({
        ...transferMeta,
        adminPhone: String(rawMeta.adminPhone).trim(),
        originalOwner: String(rawMeta.originalOwner).trim()
      })
    }

    // Validate / de-duplicate telegram URL only when one is provided.
    if (data.telegramUrl && data.telegramUrl.trim().length > 0) {
      const existing = await db.product.findFirst({
        where: {
          platform: 'TELEGRAM',
          type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
          telegramUrl: data.telegramUrl,
          isActive: true,
          deletedAt: null
        }
      })

      if (existing) {
        throw new Error(
          `A transfer product for ${data.telegramUrl} already exists (SKU: ${existing.sku})`
        )
      }
    }

    // 4. Set transfer-specific defaults
    const tags = data.tags ? data.tags.split(',').map((tag) => tag.trim().toLowerCase()) : []
    const { stocks, ...rest } = data

    // Ensure unique slug
    let slug = data.slug?.trim()
    if (!slug) {
      slug = this.generateSlug(data.name)
    }
    slug = await this.ensureUniqueSlug(slug)

    const product = await this.createProductRecordWithUniqueSku({
        ...rest,
        slug,
        tags,
        type: String(data.type), // Preserve requested Telegram channels/groups type
        platform: 'TELEGRAM',
        telegramUrl: data.telegramUrl?.trim() || null,
        stockCount: 1, // Only 1 transfer available per group/channel
        minQuantity: 1,
        maxQuantity: 1, // Customer can only buy 1 transfer
        meta: transferMeta,
        privateUrl: data.privateUrl ? data.privateUrl : undefined
      })

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(product.id)

    return product
  }

  async findById(id: number, includeAccounts = false) {
    const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}:${id}:${includeAccounts ? 'with_accounts' : 'basic'}`

    const product = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const product = await db.product.findFirst({
          where: { id, deletedAt: null },
          include: {
            category: true,
            accounts: includeAccounts
              ? {
                  where: { isUsed: false, isValid: true },
                  select: {
                    id: true,
                    platform: true,
                    requiresOtp: true,
                    hasPremium: true,
                    encryptedData: true,
                    meta: true
                  }
                }
              : false,
            _count: {
              select: {
                accounts: {
                  where: { isUsed: false, isValid: true }
                }
              }
            }
          }
        })

        if (!product) {
          throw new Error('Product not found')
        }

        if (!includeAccounts || !product.accounts) {
          const reviewStatsMap = await this.getReviewStatsMap([product.id])
          return {
            ...product,
            reviewStats: reviewStatsMap.get(product.id) || {
              averageRating: 0,
              reviewCount: 0
            }
          }
        }

        const accounts = product.accounts.map((account: any) => {
          let credentials: Record<string, any> = {}

          try {
            credentials = JSON.parse(decrypt(account.encryptedData))
          } catch (error) {
            console.error('Failed to decrypt product account credentials:', error)
          }

          return {
            id: account.id,
            platform: account.platform,
            requiresOtp: account.requiresOtp,
            hasPremium: account.hasPremium,
            meta: account.meta,
            credentials
          }
        })

        const reviewStatsMap = await this.getReviewStatsMap([product.id])

        return {
          ...product,
          accounts,
          reviewStats: reviewStatsMap.get(product.id) || {
            averageRating: 0,
            reviewCount: 0
          }
        }
      },
      CACHE_TTL.PRODUCT_DETAIL
    )

    return product
  }

  async findBySku(sku: string) {
    const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}:sku:${sku}`

    const product = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const product = await db.product.findFirst({
          where: { sku, deletedAt: null },
          include: {
            category: true,
            _count: {
              select: {
                accounts: {
                  where: { isUsed: false, isValid: true }
                }
              }
            }
          }
        })

        if (!product) {
          throw new Error('Product not found')
        }

        const reviewStatsMap = await this.getReviewStatsMap([product.id])

        return {
          ...product,
          reviewStats: reviewStatsMap.get(product.id) || {
            averageRating: 0,
            reviewCount: 0
          }
        }
      },
      CACHE_TTL.PRODUCT_DETAIL
    )

    return product
  }

  async findBySlug(slug: string, includeAccounts = false) {
    try {
      const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}:slug:${slug}:${includeAccounts ? 'with_accounts' : 'basic'}`

      const product = await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const product = await db.product.findFirst({
            where: { slug, deletedAt: null },
            include: {
              category: true,
              // Avoid selecting non-existent columns like `product_groups.seo` in DB
              productGroup: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  meta: true,
                  categoryId: true,
                  createdAt: true,
                  updatedAt: true
                }
              },
              accounts: includeAccounts
                ? {
                    where: { isUsed: false, isValid: true },
                    select: { id: true, platform: true, requiresOtp: true, hasPremium: true }
                  }
                : false,
              _count: {
                select: {
                  accounts: {
                    where: { isUsed: false, isValid: true }
                  }
                }
              }
            }
          })

          if (!product) {
            throw new Error('Product not found')
          }

          const reviewStatsMap = await this.getReviewStatsMap([product.id])

          return {
            ...product,
            reviewStats: reviewStatsMap.get(product.id) || {
              averageRating: 0,
              reviewCount: 0
            }
          }
        },
        CACHE_TTL.PRODUCT_DETAIL
      )

      return product
    } catch (error: any) {
      // If slug column doesn't exist, fallback to finding by ID if slug is numeric
      if (error?.message?.includes('slug') || error?.code === 'P2021') {
        const productId = parseInt(slug)
        if (!isNaN(productId)) {
          return this.findById(productId, includeAccounts)
        }
      }
      throw error
    }
  }

  /**
   * Find products by category IDs and/or group IDs (no pagination)
   */
  async findByFilter(filter: { categoryIds?: number[]; groupIds?: number[] }) {
    const { categoryIds, groupIds } = filter

    // Build where clause
    const where: any = {
      isActive: true,
      deletedAt: null,
      NOT: {
        slug: {
          startsWith: CATALOG_DELETED_SLUG_PREFIX
        }
      }
    }

    // Apply filters
    const conditions: any[] = []

    if (categoryIds && categoryIds.length > 0) {
      conditions.push({
        OR: [
          { categoryId: { in: categoryIds } },
          { productGroup: { categoryId: { in: categoryIds } } }
        ]
      })
    }

    if (groupIds && groupIds.length > 0) {
      conditions.push({
        productGroupId: { in: groupIds }
      })
    }

    // If both filters are provided, use OR logic
    if (conditions.length > 0) {
      where.OR = conditions
    }

    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        type: true,
        platform: true,
        price: true,
        originalPrice: true,
        stockCount: true,
        soldCount: true,
        thumbnail: true,
        images: true,
        isActive: true,
        isFeatured: true,
        tags: true,
        categoryId: true,
        productGroupId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        productGroup: {
          select: {
            id: true,
            name: true,
            categoryId: true
          }
        },
        _count: {
          select: {
            accounts: {
              where: { isUsed: false, isValid: true }
            }
          }
        }
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    })

    const reviewStatsMap = await this.getReviewStatsMap(products.map((product) => product.id))

    return this.attachReviewStats(products, reviewStatsMap)
  }

  async findMany(query: ProductQuery) {
    const { page, limit, where, sortBy, sortOrder, includeAccounts, includeCategory } =
      buildProductQuery(query)

    const skip = (page - 1) * limit

    const accountFilter = { isUsed: false, isValid: true }

    const include: Prisma.ProductInclude = {
      productGroup: {
        select: {
          id: true,
          name: true,
          slug: true,
          meta: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      _count: {
        select: {
          accounts: { where: accountFilter }
        }
      }
    }
    if (includeCategory) {
      include.category = true
    }
    if (includeAccounts) {
      include.accounts = {
        where: accountFilter,
        select: { id: true, platform: true, requiresOtp: true, hasPremium: true }
      }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] =
      sortBy === 'sortOrder'
        ? [{ sortOrder }, { id: 'asc' }]
        : { [sortBy]: sortOrder }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include
      }),
      db.product.count({ where })
    ])

    const reviewStatsMap = await this.getReviewStatsMap(products.map((product) => product.id))
    const formattedProducts = this.attachReviewStats(products, reviewStatsMap)

    return {
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  }

  async update(id: number, data: Partial<UpdateProduct>) {
    // Check if product exists
    const existingProduct = await this.findById(id)
    data = this.normalizeTelegramPlatform(data)
    const tags = data.tags ? data.tags.split(',').map((tag) => tag.trim().toLowerCase()) : []

    // SKU is immutable after creation - never allow it to be updated
    const { sku: _sku, stocks, ...updateData } = data as Partial<UpdateProduct> & {
      sku?: string
      stocks?: Array<Record<string, any>>
    }

    // Handle slug update
    let slug = updateData.slug?.trim() || undefined
    if (slug && slug !== existingProduct.slug) {
      // If slug is being changed, ensure it's unique
      slug = await this.ensureUniqueSlug(slug, id)
    } else if (updateData.name && !slug && updateData.name !== existingProduct.name) {
      // If name changed but slug not provided, generate new slug
      slug = this.generateSlug(updateData.name)
      slug = await this.ensureUniqueSlug(slug, id)
    } else {
      // Keep existing slug
      slug = existingProduct.slug ?? undefined
    }

    const finalMinQuantity = updateData.minQuantity ?? existingProduct.minQuantity ?? 1
    const finalMaxQuantity = updateData.maxQuantity ?? existingProduct.maxQuantity ?? 0
    if (finalMaxQuantity !== 0 && finalMinQuantity > finalMaxQuantity) {
      throw new Error('Minimum quantity cannot be greater than maximum quantity')
    }

    const normalizedPrivateUrl =
      updateData.isPrivate === false
        ? null
        : typeof updateData.privateUrl === 'string'
          ? updateData.privateUrl.trim() || null
          : undefined

    const normalizedUpdateData = this.applyTypeInventoryRules({
      ...updateData,
      slug,
      privateUrl: normalizedPrivateUrl,
      tags
    })

    const product = await db.product.update({
      where: { id },
      data: normalizedUpdateData
    })

    const finalType = String((normalizedUpdateData as any).type || existingProduct.type)
    if (finalType === 'SERIAL' && Array.isArray(stocks)) {
      await db.account.deleteMany({
        where: {
          productId: id,
          isUsed: false,
          isValid: true
        }
      })

      if (stocks.length > 0) {
        await db.account.createMany({
          data: stocks.map((stock) =>
            this.buildEncryptedStockData(
              stock && typeof stock === 'object' && !Array.isArray(stock)
                ? (stock as Record<string, any>)
                : {},
              id,
              (normalizedUpdateData as any).platform || existingProduct.platform
            )
          )
        })
      }

      await this.updateProductStockCount(id)
    }

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(id)

    return product
  }

  async updateSortOrder(id: number, sortOrder: number) {
    // Check if product exists
    await this.findById(id)

    const product = await db.product.update({
      where: { id },
      data: { sortOrder },
      select: { id: true, sortOrder: true, name: true }
    })

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(id)

    return product
  }

  /**
   * Soft-delete: hides product everywhere; row stays in DB for restore.
   */
  async delete(id: number) {
    const product = await db.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    await db.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isFeatured: false,
        isPrivate: false,
        privateUrl: null
      }
    })

    await this.cacheInvalidationService.invalidateProduct(id)

    return {
      success: true,
      mode: 'soft_delete',
      message: `Moved "${product.name}" to trash.`
    }
  }

  /**
   * Permanent removal (must already be soft-deleted unless caller passes force path elsewhere).
   * @param cascadeOrders When true (e.g. category/group permanent delete), deletes related orders instead of catalog-only removal.
   */
  async permanentDelete(id: number, options?: { cascadeOrders?: boolean }) {
    const cascadeOrders = options?.cascadeOrders === true
    const product = await db.product.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const orderCount = await db.order.count({
      where: { productId: id }
    })

    if (orderCount > 0 && !cascadeOrders) {
      await this.removeProductFromCatalog(id)
      await this.cacheInvalidationService.invalidateProduct(id)

      return {
        success: true,
        mode: 'catalog_delete',
        message: `Removed "${product.name}" from the active catalog. Historical orders and customer downloads were preserved.`
      }
    }

    await db.$transaction(async (tx) => {
      await tx.feedback.deleteMany({
        where: { productId: id }
      })

      await tx.cartItem.deleteMany({
        where: { productId: id }
      })

      await tx.order.deleteMany({
        where: { productId: id }
      })

      await tx.product.delete({
        where: { id }
      })
    })

    await this.cacheInvalidationService.invalidateProduct(id)

    return {
      success: true,
      mode: 'hard_delete',
      message: `Deleted "${product.name}" permanently.`
    }
  }

  async restore(id: number) {
    const product = await db.product.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, name: true }
    })

    if (!product) {
      throw new Error('Deleted product not found')
    }

    await db.product.update({
      where: { id },
      data: { deletedAt: null }
    })

    await this.cacheInvalidationService.invalidateProduct(id)

    return {
      success: true,
      message: `Restored "${product.name}".`
    }
  }

  async listTrashed(params?: { page?: number; limit?: number }) {
    const page = params?.page && params.page > 0 ? params.page : 1
    const limit = params?.limit && params.limit > 0 ? params.limit : 20
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      db.product.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          price: true,
          thumbnail: true,
          categoryId: true,
          productGroupId: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          productGroup: { select: { id: true, name: true } }
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit
      }),
      db.product.count({ where: { deletedAt: { not: null } } })
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  }

  // ================================
  // BULK OPERATIONS
  // ================================

  async bulkUpdate(data: BulkProductUpdate) {
    const { ids } = data
    const {
      isActive,
      isFeatured,
      isPrivate,
      policy,
      description,
      thumbnail,
      moreInformation,
      price,
      originalPrice,
      categoryId
    } = data.updates || {}

    console.log('🔍 [BULK UPDATE SERVICE] Processing bulk update:')
    console.log('📌 IDs:', ids)
    console.log('📌 Raw data.updates:', JSON.stringify(data.updates, null, 2))
    console.log('📝 Policy:', policy, 'type:', typeof policy)
    console.log('📝 Description:', description?.substring(0, 50))
    console.log('🖼️ Thumbnail:', thumbnail)
    console.log('📋 MoreInformation:', moreInformation?.substring(0, 50))

    // Policy and moreInformation are stored in meta for storefront rendering,
    // so these updates must merge into each product's existing meta JSON.
    if (policy !== undefined || moreInformation !== undefined) {
      let updatedCount = 0

      for (const id of ids) {
        // Get current product to access existing meta
        const currentProduct = await db.product.findUnique({
          where: { id },
          select: { meta: true }
        })

        if (currentProduct) {
          const currentMeta =
            currentProduct.meta &&
            typeof currentProduct.meta === 'object' &&
            !Array.isArray(currentProduct.meta)
              ? (currentProduct.meta as Record<string, unknown>)
              : {}
          const updatedMeta = {
            ...currentMeta,
            ...(policy !== undefined && { policy: policy || undefined }),
            ...(moreInformation !== undefined && { moreInformation: moreInformation || undefined })
          }

          await db.product.update({
            where: { id },
            data: {
              ...(isActive !== undefined && { isActive }),
              ...(isFeatured !== undefined && { isFeatured }),
              ...(isPrivate !== undefined && { isPrivate }),
              ...(policy !== undefined && { policy }),
              ...(description !== undefined && { description }),
              ...(thumbnail !== undefined && { thumbnail }),
              ...(price !== undefined && { price }),
              ...(originalPrice !== undefined && { originalPrice }),
              ...(categoryId && { categoryId }),
              meta: updatedMeta
            }
          })

          updatedCount++
        }
      }

      // Invalidate caches
      for (const id of ids) {
        await this.cacheInvalidationService.invalidateProduct(id)
      }

      return {
        success: true,
        updatedCount,
        message: `Updated ${updatedCount} products`
      }
    }

    // If no meta-backed fields are being updated, use the efficient updateMany
    console.log('📋 [BULK UPDATE] Building updateMany data object...')
    const updateData = {
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isPrivate !== undefined && { isPrivate }),
      ...(policy !== undefined && { policy }),
      ...(description !== undefined && { description }),
      ...(thumbnail !== undefined && { thumbnail }),
      ...(price !== undefined && { price }),
      ...(originalPrice !== undefined && { originalPrice }),
      ...(categoryId && { categoryId })
    }
    
    console.log('📋 [BULK UPDATE] Update data object:', JSON.stringify(updateData, null, 2))
    console.log('📋 [BULK UPDATE] Update data keys:', Object.keys(updateData))
    console.log('📋 [BULK UPDATE] Updating products with IDs:', ids)

    // Check if there's actually something to update
    if (Object.keys(updateData).length === 0) {
      console.warn('⚠️ [BULK UPDATE] No fields to update! updateData is empty')
      return {
        success: true,
        updatedCount: 0,
        message: 'No changes to apply'
      }
    }

    const products = await db.product.updateMany({
      where: { id: { in: ids } },
      data: updateData
    })

    console.log('✅ [BULK UPDATE] UpdateMany result:', JSON.stringify(products, null, 2))
    console.log('✅ [BULK UPDATE] Products updated count:', products.count)

    // Verify the update by fetching the updated products
    const updatedProducts = await db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, policy: true, description: true, thumbnail: true }
    })
    console.log('✅ [BULK UPDATE] Verification - Updated products from DB:', JSON.stringify(updatedProducts, null, 2))

    // Invalidate related caches for each product
    for (const id of ids) {
      await this.cacheInvalidationService.invalidateProduct(id)
    }

    return {
      success: true,
      updatedCount: products.count,
      message: `Updated ${products.count} products`
    }
  }

  async bulkDelete(data: BulkProductDelete) {
    const { ids } = data
    const deletedIds: number[] = []

    for (const id of ids) {
      await this.delete(id)
      deletedIds.push(id)
    }

    const deletedCount = deletedIds.length

    return {
      success: true,
      deletedCount,
      permanentlyDeletedCount: 0,
      removedFromCatalogCount: 0,
      deletedIds,
      historicalIds: [] as number[],
      message: `Moved ${deletedCount} product(s) to trash.`
    }
  }

  async importProducts(data: ProductImport) {
    const { products, skipDuplicates = true, updateExisting = false } = data

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const productData of products) {
      try {
        // Generate SKU if not provided in import data
        const sku = productData.sku || (await this.generateUniqueSku())

        // Check for existing product by name and category
        const existing = await db.product.findFirst({
          where: {
            name: productData.name,
            categoryId: productData.categoryId,
            deletedAt: null
          }
        })

        if (existing) {
          if (updateExisting) {
            // Preserve existing SKU - never overwrite on update
            const { sku: _importSku, ...updatePayload } = productData
            await db.product.update({
              where: { id: existing.id },
              data: { ...updatePayload, tags: [] }
            })
            results.updated++
          } else if (skipDuplicates) {
            results.skipped++
          } else {
            throw new Error(`Product "${productData.name}" already exists`)
          }
        } else {
          await db.product.create({
            data: {
              ...productData,
              sku: sku.toUpperCase(),
              tags: [],
              stockCount: 0
            }
          })
          results.created++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Failed to import "${productData.name}": ${errorMessage}`)
      }
    }

    return results
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Generate a unique SKU for product creation
   */
  async generateUniqueSku(): Promise<string> {
    let sku: string
    let isUnique = false

    while (!isUnique) {
      // Generate SKU: A + 5 random digits
      sku = 'A' + Math.floor(10000 + Math.random() * 90000).toString()

      const existing = await db.product.findFirst({
        where: { sku, deletedAt: null },
        select: { sku: true }
      })

      isUnique = !existing
    }

    return sku!
  }

  private async createProductRecordWithUniqueSku(
    data: Omit<Prisma.ProductUncheckedCreateInput, 'sku'>
  ) {
    for (let attempt = 0; attempt < ProductService.SKU_CREATE_MAX_ATTEMPTS; attempt++) {
      const sku = (await this.generateUniqueSku()).toUpperCase()

      try {
        return await db.product.create({
          data: {
            ...data,
            sku
          }
        })
      } catch (err: any) {
        if (err?.code === 'P2002') {
          const target = Array.isArray(err?.meta?.target) ? err.meta.target : []
          if (target.includes('sku')) {
            continue
          }
          const field = target?.[0] ?? 'field'
          throw new Error(`A product with this ${field} already exists.`)
        }
        throw err
      }
    }

    throw new Error('Could not generate a unique SKU. Please try again.')
  }

  // ================================
  // PRIVATE URL ACCESS
  // ================================

  async findByPrivateUrl(privateUrl: string) {
    const product = await db.product.findFirst({
      where: {
        privateUrl,
        isPrivate: true,
        deletedAt: null,
        NOT: {
          slug: {
            startsWith: CATALOG_DELETED_SLUG_PREFIX
          }
        }
        // Note: Removed isActive check to allow accessing inactive private products
      },
      include: {
        category: true,
        productGroup: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            accounts: {
              where: { isUsed: false, isValid: true }
            }
          }
        }
      }
    })

    if (!product) {
      return null // Return null instead of throwing error
    }

    return product
  }

  // ================================
  // ANALYTICS
  // ================================

  async getAnalytics(productId: number, startDate: Date, endDate: Date) {
    const [product, orderStats, revenueStats] = await Promise.all([
      this.findById(productId),
      db.order.aggregate({
        where: {
          productId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: { in: ['COMPLETED', 'PARTIAL'] }
        },
        _sum: { quantity: true },
        _count: true
      }),
      db.order.aggregate({
        where: {
          productId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: { in: ['COMPLETED', 'PARTIAL'] }
        },
        _sum: { total: true }
      })
    ])

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      period: { startDate, endDate },
      metrics: {
        totalSales: orderStats._sum.quantity || 0,
        totalOrders: orderStats._count || 0,
        totalRevenue: Number(revenueStats._sum.total || 0),
        averageOrderValue:
          orderStats._count > 0 ? Number(revenueStats._sum.total || 0) / orderStats._count : 0
      }
    }
  }

  // ================================
  // TELEGRAM-SPECIFIC METHODS
  // ================================

  async createTelegramProduct(data: TelegramProduct) {
    // Check if SKU already exists
    const existingSku = await db.product.findFirst({
      where: { sku: data.sku, deletedAt: null },
      select: { sku: true }
    })

    if (existingSku) {
      throw new Error(`Product with SKU "${data.sku}" already exists`)
    }

    const tags = data.tags ? data.tags.split(',').map((tag) => tag.trim().toLowerCase()) : []

    const product = await db.product.create({
      data: {
        ...data,
        sku: data.sku.toUpperCase(), // Use provided SKU
        tags,
        platform: 'TELEGRAM',
        stockCount: 0 // Will be calculated from accounts
      }
    })

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(product.id)

    return product
  }

  async getTelegramProducts(query?: Partial<ProductQuery>) {
    const telegramQuery = {
      page: 1,
      limit: 20,
      ...query,
      platform: 'TELEGRAM' as const,
      minPrice: query?.minPrice ?? undefined,
      maxPrice: query?.maxPrice ?? undefined,
      sortBy: query?.sortBy ?? undefined,
      sortOrder: query?.sortOrder ?? undefined,
      search: query?.search ?? undefined,
      type: query?.type ?? undefined
    }

    const result = await this.findMany(telegramQuery as ProductQuery)

    // Enhance products with Telegram-specific data
    const enhancedProducts = result.products.map((product: any) => ({
      ...product,
      telegramMeta: product.meta as { description?: string } | null,
      availableAccounts: product._count.accounts,
      requiresOTP: true
    }))

    return {
      products: enhancedProducts,
      pagination: result.pagination
    }
  }

  async getTelegramProductById(id: number) {
    const product = await this.findById(id)

    if (product.platform !== 'TELEGRAM') {
      throw new Error('Product is not a Telegram product')
    }

    return {
      ...product,
      telegramMeta: product.meta as { description?: string } | null,
      availableAccounts: product._count.accounts,
      requiresOTP: true,
      platform: 'TELEGRAM' as const
    }
  }

  async updateTelegramProduct(id: number, data: Partial<TelegramProduct>) {
    const product = await this.findById(id)

    if (product.platform !== 'TELEGRAM') {
      throw new Error('Product is not a Telegram product')
    }

    return this.update(id, {
      ...data,
      platform: 'TELEGRAM'
    })
  }

  async getTelegramProductStats(id: number) {
    const product = await this.getTelegramProductById(id)

    const [accountStats, orderStats] = await Promise.all([
      db.account.groupBy({
        by: ['isUsed', 'isValid', 'hasPremium'],
        where: {
          productId: id,
          archived: false // Exclude archived accounts from stats
        },
        _count: true
      }),
      db.order.aggregate({
        where: {
          productId: id,
          status: { in: ['COMPLETED', 'PARTIAL'] }
        },
        _sum: { quantity: true, total: true },
        _count: true
      })
    ])

    type AccountStat = { _count: number; isUsed: boolean; isValid: boolean; hasPremium: boolean }

    const totalAccounts = accountStats.reduce(
      (sum: number, stat: AccountStat) => sum + stat._count,
      0
    )
    const availableAccounts = accountStats
      .filter((stat: AccountStat) => !stat.isUsed && stat.isValid)
      .reduce((sum: number, stat: AccountStat) => sum + stat._count, 0)
    const premiumAccounts = accountStats
      .filter((stat: AccountStat) => stat.hasPremium && !stat.isUsed && stat.isValid)
      .reduce((sum: number, stat: AccountStat) => sum + stat._count, 0)

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      accounts: {
        total: totalAccounts,
        available: availableAccounts,
        premium: premiumAccounts,
        used: totalAccounts - availableAccounts
      },
      sales: {
        totalSold: orderStats._sum.quantity || 0,
        totalOrders: orderStats._count || 0,
        totalRevenue: Number(orderStats._sum.total || 0)
      }
    }
  }

  /**
   * Clone a product with all specified fields
   * Creates a new product with "(Copy)" appended to the name
   * Generates a new unique SKU
   * Generates a new unique slug by appending a number to the original slug/name
   * Does NOT clone accounts/stock
   */
  async cloneProduct(id: number) {
    // Fetch the product to clone
    const originalProduct = await db.product.findFirst({
      where: { id, deletedAt: null },
      select: {
        name: true,
        slug: true,
        description: true,
        type: true,
        platform: true,
        telegramUrl: true,
        tags: true,
        policy: true,
        sortOrder: true,
        price: true,
        originalPrice: true,
        discount: true,
        btnText: true,
        costPrice: true,
        minQuantity: true,
        maxQuantity: true,
        isActive: true,
        isPrivate: true,
        privateUrl: true,
        isFeatured: true,
        images: true,
        thumbnail: true,
        categoryId: true,
        productGroupId: true,
        meta: true,
        seo: true
      }
    })

    if (!originalProduct) {
      throw new Error('Product not found')
    }

    // Generate new unique SKU
    const newSku = await this.generateUniqueSku()
    const baseSlug =
      originalProduct.slug?.trim() || this.generateSlug(originalProduct.name) || `Product${id}`
    const newSlug = await this.ensureUniqueCloneSlug(baseSlug)

    // Create cloned product with modified name
    const clonedProduct = await db.product.create({
      data: {
        name: `${originalProduct.name} (Copy)`,
        sku: newSku.toUpperCase(),
        slug: newSlug,
        description: originalProduct.description,
        type: originalProduct.type,
        platform: originalProduct.platform,
        telegramUrl: originalProduct.telegramUrl,
        tags: originalProduct.tags,
        policy: originalProduct.policy,
        sortOrder: originalProduct.sortOrder,
        price: originalProduct.price,
        originalPrice: originalProduct.originalPrice,
        discount: originalProduct.discount,
        btnText: originalProduct.btnText,
        costPrice: originalProduct.costPrice,
        minQuantity: originalProduct.minQuantity,
        maxQuantity: originalProduct.maxQuantity,
        isActive: originalProduct.isActive,
        isPrivate: originalProduct.isPrivate,
        privateUrl: null, // Clear private URL to avoid duplicates
        isFeatured: originalProduct.isFeatured,
        images: originalProduct.images,
        thumbnail: originalProduct.thumbnail,
        categoryId: originalProduct.categoryId,
        productGroupId: originalProduct.productGroupId,
        stockCount: 0, // Start with 0 stock
        soldCount: 0, // Reset sold count
        meta: originalProduct.meta as any,
        seo: originalProduct.seo as any
      },
      include: {
        category: true
      }
    })

    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(clonedProduct.id)

    return clonedProduct
  }
}
