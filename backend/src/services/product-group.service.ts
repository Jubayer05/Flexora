import { Prisma } from '@prisma/client'
import db from '../configs/db'
import type {
  CreateProductGroup,
  ProductGroupQuery,
  UpdateProductGroup
} from '../validations/zod/product-group.schema'
import { CacheInvalidationService } from './cache-invalidation.service'
import { ProductService } from './product.services'

export class ProductGroupService {
  private cacheInvalidationService = new CacheInvalidationService()
  private productService = new ProductService()
  
  /**
   * SEO storage strategy:
   * - Do NOT rely on a dedicated `product_groups.seo` column (it may not exist in DB).
   * - Store SEO data under `product_groups.meta.seo` (Json) instead.
   * - Still expose a top-level `seo` field in API responses for frontend compatibility.
   */
  private attachSeoFromMeta<T extends { meta?: any }>(group: T): T & { seo: any } {
    const meta = (group as any)?.meta
    const seo =
      meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as any).seo : undefined
    return { ...(group as any), seo: seo ?? null }
  }

  private mergeSeoIntoMeta(existingMeta: any, incomingSeo: any): any {
    // If no SEO update is provided, preserve meta as-is (including null/undefined)
    if (incomingSeo === undefined || incomingSeo === null) {
      return existingMeta
    }

    const baseMeta =
      existingMeta && typeof existingMeta === 'object' && !Array.isArray(existingMeta)
        ? existingMeta
        : {}

    const existingSeo =
      (baseMeta as any).seo && typeof (baseMeta as any).seo === 'object' && !Array.isArray((baseMeta as any).seo)
        ? (baseMeta as any).seo
        : {}

    // Merge incoming SEO data, allowing empty strings to clear fields
    // Only filter out null/undefined, but preserve empty strings and empty arrays
    const cleanedSeo =
      incomingSeo && typeof incomingSeo === 'object' && !Array.isArray(incomingSeo)
        ? Object.fromEntries(
            Object.entries(incomingSeo).filter(([_, v]) => {
              // Preserve arrays (including empty arrays), strings (including empty strings), numbers, booleans
              // Only filter out null and undefined
              return v !== null && v !== undefined
            })
          )
        : {}

    return {
      ...baseMeta,
      seo: {
        ...existingSeo,
        ...cleanedSeo
      }
    }
  }
  
  // ================================
  // SLUG GENERATION
  // ================================
  
  /**
   * Generate a URL-friendly slug from group name
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

    while (true) {
      const existing = await db.productGroup.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true }
      })

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug
      }

      slug = `${baseSlug}${counter}`
      counter++
    }
  }

  // ================================
  // CRUD OPERATIONS
  // ================================

  /**
   * Create a new product group
   */
  async create(data: CreateProductGroup) {
    // Check if name already exists
    const existing = await db.productGroup.findFirst({
      where: { name: data.name, deletedAt: null },
      // Avoid selecting non-existent columns like `seo`
      select: { id: true }
    })

    if (existing) {
      throw new Error(`Product group with name "${data.name}" already exists`)
    }

    // Generate and ensure unique slug
    let slug = data.slug?.trim()
    if (!slug) {
      slug = this.generateSlug(data.name)
    }
    slug = await this.ensureUniqueSlug(slug)

    // Validate product IDs if provided
    if (data.productIds && data.productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: data.productIds } },
        select: { id: true }
      })

      if (products.length !== data.productIds.length) {
        throw new Error('One or more product IDs are invalid')
      }
    }

    const metaWithSeo = this.mergeSeoIntoMeta(data.meta, (data as any).seo)

    const productGroup = await db.productGroup.create({
      data: {
        name: data.name,
        slug,
        meta:
          metaWithSeo && typeof metaWithSeo === 'object' && !Array.isArray(metaWithSeo) && Object.keys(metaWithSeo).length > 0
            ? metaWithSeo
            : data.meta || undefined,
        category: { connect: { id: data.categoryId } },
        products:
          data.productIds && data.productIds.length > 0
            ? {
                connect: data.productIds.map((id) => ({ id }))
              }
            : undefined
      },
      // Avoid selecting non-existent columns like `seo`
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        meta: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (data.productIds && data.productIds.length > 0) {
      // Invalidate cache for affected products
      data.productIds.forEach(async (productId) => {
        await this.cacheInvalidationService.invalidateProduct(productId)
      })
    }

    return this.attachSeoFromMeta(productGroup)
  }

  /**
   * Get product group by ID with products
   */
  async findById(id: number, includeProducts = false) {
    const productGroup = await db.productGroup.findUnique({
      where: { id },
      // Avoid selecting non-existent columns like `seo`
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        deletedAt: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
        products: includeProducts
          ? {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                stockCount: true,
                isActive: true,
                platform: true,
                thumbnail: true
              }
            }
          : false,
        _count: { select: { products: true } }
      }
    })

    if (!productGroup) {
      throw new Error('Product group not found')
    }

    if ((productGroup as any).deletedAt) {
      throw new Error('Product group not found')
    }

    return this.attachSeoFromMeta(productGroup)
  }

  /**
   * Get product group by slug with products
   * Falls back to finding by name if slug doesn't exist (for backward compatibility)
   */
  async findBySlug(slug: string, includeProducts = false) {
    // First try to find by slug
    let productGroup = await db.productGroup.findFirst({
      where: { slug, deletedAt: null },
      // Avoid selecting non-existent columns like `seo`
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        deletedAt: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
        products: includeProducts
          ? {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                stockCount: true,
                isActive: true,
                platform: true,
                thumbnail: true
              }
            }
          : false,
        _count: { select: { products: true } }
      }
    })

    // If not found by slug, try to find by name (case-insensitive)
    // This allows groups without slugs to still be accessible
    if (!productGroup) {
      // Convert slug to potential name formats
      // "mobile" -> "Mobile"
      const capitalizedSlug = slug.charAt(0).toUpperCase() + slug.slice(1)
      // "mobile" -> "Mobile" (if single word)
      const nameSlug = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      // "TelegramGroups" -> "Telegram Groups"
      const spacedPascalSlug = slug.replace(/([a-z])([A-Z])/g, '$1 $2').trim()
      
      productGroup = await db.productGroup.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { name: { equals: nameSlug, mode: 'insensitive' } },
            { name: { equals: slug, mode: 'insensitive' } },
            { name: { equals: capitalizedSlug, mode: 'insensitive' } },
            ...(spacedPascalSlug && spacedPascalSlug !== slug
              ? [{ name: { equals: spacedPascalSlug, mode: 'insensitive' as const } }]
              : []),
            { name: { contains: slug, mode: 'insensitive' } }
          ]
        },
        // Avoid selecting non-existent columns like `seo`
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          deletedAt: true,
          meta: true,
          createdAt: true,
          updatedAt: true,
          products: includeProducts
            ? {
                where: { isActive: true, deletedAt: null },
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  price: true,
                  stockCount: true,
                  isActive: true,
                  platform: true,
                  thumbnail: true
                }
              }
            : false,
          _count: { select: { products: true } }
        }
      })

      // If found by name but doesn't have a slug, generate one
      if (productGroup && !productGroup.slug) {
        const generatedSlug = await this.ensureUniqueSlug(this.generateSlug(productGroup.name), productGroup.id)
        await db.productGroup.update({
          where: { id: productGroup.id },
          data: { slug: generatedSlug },
          select: { id: true }
        })
        productGroup.slug = generatedSlug
      }
    }

    if (!productGroup) {
      throw new Error('Product group not found')
    }

    if ((productGroup as any).deletedAt) {
      throw new Error('Product group not found')
    }

    return this.attachSeoFromMeta(productGroup)
  }

  /**
   * Get all product groups with pagination and filters
   */
  async findMany(query: ProductGroupQuery) {
    const {
      page = 1,
      categoryId,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ProductGroupWhereInput = { deletedAt: null }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    if (categoryId) {
      const categoryIds = categoryId.split(',').map(Number)
      where.categoryId = categoryIds.length === 1 ? categoryIds[0] : { in: categoryIds }
    }

    const selectWithSort = {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      sortOrder: true,
      meta: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true
        }
      },
      products: { select: { id: true, name: true, thumbnail: true } }
    }

    const orderByClause =
      sortBy === 'sortOrder'
        ? ([{ sortOrder: sortOrder }, { id: 'asc' }] as any)
        : { [sortBy]: sortOrder }

    let productGroups: any[]
    let total: number

    try {
      ;[productGroups, total] = await Promise.all([
        db.productGroup.findMany({
          where,
          skip,
          take: limit,
          select: selectWithSort,
          orderBy: orderByClause
        }),
        db.productGroup.count({ where })
      ])
    } catch (err) {
      if (err instanceof Prisma.PrismaClientValidationError) {
        // DB may not have sortOrder column yet; fallback to ordering by createdAt
        const selectWithoutSort = { ...selectWithSort }
        delete (selectWithoutSort as any).sortOrder
        ;[productGroups, total] = await Promise.all([
          db.productGroup.findMany({
            where,
            skip,
            take: limit,
            select: selectWithoutSort,
            orderBy: { [sortBy === 'sortOrder' ? 'createdAt' : sortBy]: sortOrder }
          }),
          db.productGroup.count({ where })
        ])
        productGroups = productGroups.map((g) => ({ ...g, sortOrder: null }))
      } else {
        throw err
      }
    }

    return {
      productGroups: productGroups.map((g) => this.attachSeoFromMeta(g)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get all product groups (simple list for dropdowns)
   */
  async findAll(query: ProductGroupQuery) {
    const { categoryId, search, limit = 100, page = 1 } = query
    const where: Prisma.ProductGroupWhereInput = { deletedAt: null }

    if (categoryId) {
      const categoryIds = categoryId.split(',').map(Number)
      where.categoryId = categoryIds.length === 1 ? categoryIds[0] : { in: categoryIds }
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    const skip = (page - 1) * limit
    const sortBy = query.sortBy ?? 'sortOrder'
    const sortOrderDir = query.sortOrder ?? 'asc'

    const baseSelect = {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { products: true } }
    }

    const runFindMany = (useSortOrder: boolean) => {
      const orderBySortOrder = useSortOrder && sortBy === 'sortOrder'
      return db.productGroup.findMany({
        where,
        skip,
        take: limit,
        select: useSortOrder ? { ...baseSelect, sortOrder: true } : baseSelect,
        orderBy: orderBySortOrder
          ? ([{ sortOrder: sortOrderDir }, { id: 'asc' }] as any)
          : { name: sortOrderDir }
      })
    }

    let productGroups: any[]
    let total: number
    try {
      const [groups, count] = await Promise.all([
        runFindMany(true),
        db.productGroup.count({ where })
      ])
      productGroups = groups
      total = count
    } catch (err) {
      if (err instanceof Prisma.PrismaClientValidationError) {
        const [groups, count] = await Promise.all([
          runFindMany(false),
          db.productGroup.count({ where })
        ])
        productGroups = groups.map((g) => ({ ...g, sortOrder: null }))
        total = count
      } else {
        throw err
      }
    }

    return {
      productGroups: productGroups.map((g) => this.attachSeoFromMeta(g)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  async listTrashed(params?: { page?: number; limit?: number }) {
    const page = params?.page && params.page > 0 ? params.page : 1
    const limit = params?.limit && params.limit > 0 ? params.limit : 20
    const skip = (page - 1) * limit

    const [productGroups, total] = await Promise.all([
      db.productGroup.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          sortOrder: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          _count: { select: { products: true } }
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit
      }),
      db.productGroup.count({ where: { deletedAt: { not: null } } })
    ])

    return {
      productGroups: productGroups.map((g) => this.attachSeoFromMeta(g as any)),
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

  /**
   * Update product group
   */
  async update(id: number, data: UpdateProductGroup) {
    // Check if product group exists
    const existing = await db.productGroup.findUnique({
      where: { id },
      // Avoid selecting non-existent columns like `seo`
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        meta: true,
        products: {
          select: { id: true }
        }
      }
    }) as any // Type assertion needed because Prisma types may not include seo field yet

    if (!existing) {
      throw new Error('Product group not found')
    }

    if (existing.deletedAt) {
      throw new Error('Product group not found')
    }

    // Check if new name already exists (if name is being changed)
    if (data.name && data.name !== existing.name) {
      const nameExists = await db.productGroup.findFirst({
        where: { name: data.name, deletedAt: null },
        // Avoid selecting non-existent columns like `seo`
        select: { id: true }
      })

      if (nameExists) {
        throw new Error(`Product group with name "${data.name}" already exists`)
      }
    }

    // Validate category if provided
    if (data.categoryId !== undefined) {
      const category = await db.category.findFirst({
        where: { id: data.categoryId, deletedAt: null },
        select: { id: true }
      })

      if (!category) {
        throw new Error('Category not found')
      }
    }

    // Validate product IDs if provided
    if (data.productIds !== undefined) {
      if (data.productIds.length > 0) {
        const products = await db.product.findMany({
          where: { id: { in: data.productIds } },
          select: { id: true }
        })

        if (products.length !== data.productIds.length) {
          throw new Error('One or more product IDs are invalid')
        }
      }

      // Generate slug if name changed or if slug doesn't exist
      let slug = data.slug?.trim() || existing.slug
      if (data.slug?.trim() && data.slug.trim() !== existing.slug) {
        slug = await this.ensureUniqueSlug(data.slug.trim(), id)
      } else if (!slug || (data.name && data.name !== existing.name && !data.slug?.trim())) {
        const nameToUse = data.name || existing.name
        slug = await this.ensureUniqueSlug(this.generateSlug(nameToUse), id)
      }

      // Merge SEO data if provided (preserve existing SEO fields that aren't being updated)
      const metaWithSeo = this.mergeSeoIntoMeta(
        data.meta !== undefined ? (data.meta as any) : (existing.meta as any),
        (data as any).seo
      )

      // Disconnect all existing products and connect new ones
      const productGroup = await db.productGroup.update({
        where: { id },
        data: {
          name: data.name || existing.name,
          slug: slug,
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          meta: metaWithSeo,
          products: {
            set: [], // Disconnect all
            connect: data.productIds.map((productId) => ({ id: productId }))
          }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          meta: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Cache will be invalidated by Next.js revalidation (5 minutes)
      // No explicit cache invalidation needed

      return this.attachSeoFromMeta(productGroup)
    }

    // Generate slug if name changed or if slug doesn't exist
    let slug = data.slug?.trim() || existing.slug
    if (data.slug?.trim() && data.slug.trim() !== existing.slug) {
      slug = await this.ensureUniqueSlug(data.slug.trim(), id)
    } else if (!slug || (data.name && data.name !== existing.name && !data.slug?.trim())) {
      const nameToUse = data.name || existing.name
      slug = await this.ensureUniqueSlug(this.generateSlug(nameToUse), id)
    }

    // Merge SEO data if provided (preserve existing SEO fields that aren't being updated)
    const metaWithSeo = this.mergeSeoIntoMeta(
      data.meta !== undefined ? (data.meta as any) : (existing.meta as any),
      (data as any).seo
    )

    // Update without changing products
    const productGroup = await db.productGroup.update({
      where: { id },
      data: {
        name: data.name || existing.name,
        slug: slug,
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        meta: metaWithSeo
      },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        meta: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Cache will be invalidated by Next.js revalidation (5 minutes)
    // No need for explicit cache invalidation here

    return this.attachSeoFromMeta(productGroup)
  }

  /**
   * Update product group sort order (for drag & drop reordering)
   */
  async updateSortOrder(id: number, sortOrder: number): Promise<{ id: number; sortOrder: number | null }> {
    const updated = await db.productGroup.update({
      where: { id },
      data: { sortOrder } as any,
      select: { id: true, sortOrder: true }
    })
    const row = updated as { id: number; sortOrder: number | null }
    return { id: row.id, sortOrder: row.sortOrder ?? null }
  }

  /**
   * Delete product group
   */
  async delete(id: number) {
    const productGroup = await db.productGroup.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        products: {
          select: {
            id: true
          }
        }
      }
    })

    if (!productGroup) {
      throw new Error('Product group not found')
    }

    const affectedProductIds = productGroup.products.map((product) => product.id)

    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { productGroupId: id, deletedAt: null },
        data: {
          deletedAt: now,
          isActive: false,
          isFeatured: false,
          isPrivate: false,
          privateUrl: null
        }
      })

      await tx.productGroup.update({
        where: { id },
        data: { deletedAt: now }
      })
    })

    await Promise.all(
      affectedProductIds.map((productId) =>
        this.cacheInvalidationService.invalidateProduct(productId)
      )
    )

    return {
      success: true,
      mode: 'soft_delete',
      message: `Moved "${productGroup.name}" to trash. ${affectedProductIds.length} product(s) were also moved to trash.`
    }
  }

  async restore(id: number) {
    const productGroup = await db.productGroup.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, name: true }
    })

    if (!productGroup) {
      throw new Error('Deleted product group not found')
    }

    await db.productGroup.update({
      where: { id },
      data: { deletedAt: null }
    })

    // Restore products that were soft-deleted via group delete.
    await db.product.updateMany({
      where: { productGroupId: id, deletedAt: { not: null } },
      data: { deletedAt: null }
    })

    await this.cacheInvalidationService.invalidateCategory()

    return {
      success: true,
      message: `Restored "${productGroup.name}".`
    }
  }

  async permanentDelete(id: number) {
    const productGroup = await db.productGroup.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!productGroup) {
      throw new Error('Product group not found')
    }

    const productIds = await db.product.findMany({
      where: { productGroupId: id },
      select: { id: true }
    })

    let removedFromCatalogCount = 0
    let permanentlyDeletedCount = 0

    for (const { id: productId } of productIds) {
      const result = await this.productService.permanentDelete(productId, {
        cascadeOrders: true
      })
      if (result.mode === 'catalog_delete') removedFromCatalogCount++
      if (result.mode === 'hard_delete') permanentlyDeletedCount++
    }

    await db.productGroup.delete({
      where: { id }
    })

    await this.cacheInvalidationService.invalidateCategory()

    return {
      success: true,
      removedFromCatalogCount,
      permanentlyDeletedCount,
      message: `Deleted "${productGroup.name}" permanently. ${permanentlyDeletedCount} product(s) were hard-deleted (including related orders).${removedFromCatalogCount > 0 ? ` ${removedFromCatalogCount} product(s) were only removed from catalog.` : ''}`
    }
  }
}
