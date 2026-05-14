import type { Prisma } from '@prisma/client'
import { monitorCache } from '../../middlewares/cache-monitor'
import { nnSec } from '../../utils/data-type'
import type { ProductQuery } from '../../validations'

export const uc = nnSec * 4
const CATALOG_DELETED_SLUG_PREFIX = '__deleted__-'

export function buildProductQuery(query: ProductQuery) {
  const {
    page = 1,
    limit = 10,
    ids,
    search,
    categoryId,
    platform,
    type,
    isActive,
    isPrivate,
    isFeatured,
    minPrice,
    maxPrice,
    inStock,
    lowStock,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeCategory = false,
    includeAccounts = false,
    groupId
  } = query

  // Build stockCount filter: single object, no overlapping keys (avoids Prisma validation issues)
  let stockCountFilter: { gt?: number; lte?: number; equals?: number } | undefined
  if (inStock === 'true') {
    stockCountFilter = { gt: 0 }
    if (lowStock !== undefined && lowStock >= 0) {
      stockCountFilter.lte = lowStock
    }
  } else if (inStock === 'false') {
    stockCountFilter = { equals: 0 }
  } else if (lowStock !== undefined && lowStock >= 0) {
    stockCountFilter = { lte: lowStock }
  }

  const categoryIds = categoryId
    ? categoryId
        .split(',')
        .map((id) => Number(id))
        .filter((n) => !Number.isNaN(n))
    : []
  const categoryIdFilter = categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}

  const searchTerm = typeof search === 'string' ? search.trim() : ''
  const productIds = ids
    ? ids
        .split(',')
        .map((id) => Number(id))
        .filter((n) => !Number.isNaN(n))
    : []
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    NOT: {
      slug: {
        startsWith: CATALOG_DELETED_SLUG_PREFIX
      }
    },
    ...(isActive !== undefined && { isActive }),
    ...(isPrivate !== undefined && { isPrivate }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(productIds.length > 0 && { id: { in: productIds } }),
    ...(categoryIds.length > 0 && categoryIdFilter),
    ...(platform && { platform }),
    ...(type && { type }),
    ...(stockCountFilter && { stockCount: stockCountFilter }),
    ...(searchTerm.length > 0 && {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { slug: { contains: searchTerm, mode: 'insensitive' } } },
        { productGroup: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { productGroup: { slug: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    })
  }

  if (groupId) {
    const groupIdArray = groupId
      .split(',')
      .map((id) => Number(id))
      .filter((n) => !Number.isNaN(n))
    if (groupIdArray.length > 0) {
      where.productGroupId = { in: groupIdArray }
    }
  }

  // Add price filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice })
    }
  }

  return { where, page, limit, sortBy, sortOrder, includeCategory, includeAccounts }
}
export const resourceCache = monitorCache
