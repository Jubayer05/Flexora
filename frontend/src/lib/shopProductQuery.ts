import type { FilterOptions } from '@/hooks/useFilter'

const API_SORT_FIELDS = new Set([
  'name',
  'price',
  'stockCount',
  'soldCount',
  'createdAt',
  'updatedAt',
  'sortOrder'
])

/**
 * Map shop UI URL params to public GET /products sort query (backend ProductQuerySchema).
 * UI uses sortBy=newest|popular|price_low_to_high|… — not valid Prisma field names.
 */
export function getPublicProductsSortQuery(filters: FilterOptions): string {
  const raw = filters.sortBy
  const sortByUi = raw === undefined || raw === null ? 'all' : String(raw)
  const popularity =
    filters.popularity === undefined || filters.popularity === null
      ? ''
      : String(filters.popularity)

  if ((!sortByUi || sortByUi === 'all') && popularity && popularity !== 'all') {
    return `&sortBy=soldCount&sortOrder=${popularity === 'desc' ? 'desc' : 'asc'}`
  }

  switch (sortByUi) {
    case 'all':
      return ''
    case 'newest':
      return '&sortBy=createdAt&sortOrder=desc'
    case 'oldest':
      return '&sortBy=createdAt&sortOrder=asc'
    case 'price_low_to_high':
      return '&sortBy=price&sortOrder=asc'
    case 'price_high_to_low':
      return '&sortBy=price&sortOrder=desc'
    case 'popular':
      return '&sortBy=soldCount&sortOrder=desc'
    case 'ratings':
      return '&sortBy=soldCount&sortOrder=desc'
    default:
      if (API_SORT_FIELDS.has(sortByUi)) {
        const orderRaw = filters.sortOrder
        const order =
          orderRaw === undefined || orderRaw === null
            ? 'desc'
            : String(orderRaw) === 'asc'
              ? 'asc'
              : 'desc'
        return `&sortBy=${sortByUi}&sortOrder=${order}`
      }
      return ''
  }
}

export function getPublicProductsPriceQuery(filters: FilterOptions): string {
  let s = ''
  const { minPrice, maxPrice } = filters
  if (minPrice !== undefined && minPrice !== null && String(minPrice) !== '') {
    const v = typeof minPrice === 'number' ? minPrice : parseFloat(String(minPrice))
    if (!Number.isNaN(v)) s += `&minPrice=${v}`
  }
  if (maxPrice !== undefined && maxPrice !== null && String(maxPrice) !== '') {
    const v = typeof maxPrice === 'number' ? maxPrice : parseFloat(String(maxPrice))
    if (!Number.isNaN(v)) s += `&maxPrice=${v}`
  }
  return s
}
