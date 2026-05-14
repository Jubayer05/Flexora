import { resourceCache, uc } from '../factory/processors/product'
import { toVal } from '../utils'
import { PAGELIMIT } from '../validations/common/pagination.schema'

export const CACHE_TTL = {
  PRODUCTS: 10,
  CATEGORIES: 10,
  PRODUCT_DETAIL: 10,
  FEATURED_PRODUCTS: 10,
  COUPONS: 10,

  BLOGS: 10,
  BLOG_DETAIL: 10,
  BLOG_CATEGORIES: 10,
  BLOG_POPULAR: 10,
  BLOG_RECENT: 10,
  BLOG_TAGS: 7200,

  USER_PROFILE: 10,
  USER_ORDERS: 10,
  USER_NOTIFICATIONS: 10,

  ANALYTICS_REALTIME: 10,
  ANALYTICS_DAILY: 10,
  ANALYTICS_SALES: 10,
  ANALYTICS_USERS: 10,

  SETTINGS: 10,
  PAYMENT_CONFIG: 10,
  SYSTEM_CONFIG: 10,

  CUSTOM_PAGES: 10,
  CUSTOM_PAGE_DETAIL: 10,

  VISITOR_STATS: 10
} as const
export const cacheCheck = uc / 2

/**
 * Cache key prefixes for consistent naming
 */
export const TTime = resourceCache
export const CACHE_KEYS = {
  PRODUCTS_LIST: 'uhq:products:list',
  PRODUCT_DETAIL: 'uhq:product',
  PRODUCTS_FEATURED: 'uhq:products:featured',
  PRODUCTS_BESTSELLERS: 'uhq:products:bestsellers',

  CATEGORIES_TREE: 'uhq:categories:tree',
  CATEGORIES_ACTIVE: 'uhq:categories:active',
  CATEGORY_DETAIL: 'uhq:category',

  COUPONS: {
    LIST: 'uhq:coupons:list',
    BY_ID: (id: number) => `uhq:coupon:${id}`,
    BY_CODE: (code: string) => `uhq:coupon:code:${code}`,
    STATS: 'uhq:coupons:stats',
    USAGE: 'uhq:coupons:usage'
  },

  BLOGS: {
    LIST: 'uhq:blogs:list',
    BY_ID: (id: number) => `uhq:blog:${id}`,
    BY_SLUG: (slug: string) => `uhq:blog:slug:${slug}`,
    POPULAR: 'uhq:blogs:popular',
    RECENT: 'uhq:blogs:recent',
    BY_CATEGORY: (categoryId: number) => `uhq:blogs:category:${categoryId}`,
    TAGS: 'uhq:blogs:tags',
    STATS: 'uhq:blogs:stats'
  },

  BLOG_CATEGORIES: {
    LIST: 'uhq:blog_categories:list',
    BY_ID: (id: number) => `uhq:blog_category:${id}`,
    BY_SLUG: (slug: string) => `uhq:blog_category:slug:${slug}`,
    STATS: 'uhq:blog_categories:stats'
  },

  USER_PROFILE: 'uhq:user:profile',
  USER_ORDERS: 'uhq:user:orders',
  USER_NOTIFICATIONS: 'uhq:user:notifications',

  ANALYTICS_SALES_TODAY: 'uhq:analytics:sales:today',
  ANALYTICS_SALES_MONTHLY: 'uhq:analytics:sales:monthly',
  ANALYTICS_PRODUCTS_TOP: 'uhq:analytics:products:top',
  ANALYTICS_USERS_COUNT: 'uhq:analytics:users:count',
  ANALYTICS_ORDERS_PENDING: 'uhq:analytics:orders:pending',

  SETTINGS_PAYMENT_METHODS: 'uhq:settings:payment_methods',
  SETTINGS_SITE_CONFIG: 'uhq:settings:site_config',
  SETTINGS_SYSTEM: 'uhq:settings:system',
  SETTINGS_FEATURES: 'uhq:settings:features',

  CUSTOM_PAGES: {
    LIST: 'uhq:custom_pages:list',
    BY_ID: (id: string) => `uhq:custom_page:${id}`,
    BY_SLUG: (slug: string) => `uhq:custom_page:slug:${slug}`
  },

  VISITOR_STATS: 'uhq:visitor:stats',
  VISITOR_TOTAL: 'uhq:visitor:total'
} as const
export const cacheExpire = TTime - cacheCheck >= toVal

/**
 * Helper functions for building cache keys
 */
export const buildCacheKey = {
  productsList: (
    categoryId?: number,
    page = 1,
    limit = PAGELIMIT,
    filters?: Record<string, any>
  ) => {
    const filterStr = filters
      ? Object.entries(filters)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join('_')
      : 'all'
    return `${CACHE_KEYS.PRODUCTS_LIST}:${categoryId || 'all'}:${page}:${limit}:${filterStr}`
  },

  productDetail: (id: number) => {
    return `${CACHE_KEYS.PRODUCT_DETAIL}:${id}`
  },

  categoryDetail: (id: number) => {
    return `${CACHE_KEYS.CATEGORY_DETAIL}:${id}*`
  },

  userProfile: (userId: number) => {
    return `${CACHE_KEYS.USER_PROFILE}:${userId}*`
  },

  /** Must match UserService.findByEmail cache key */
  userProfileByEmail: (email: string) => {
    return `${CACHE_KEYS.USER_PROFILE}:email:${email}`
  },

  userOrders: (userId: number, page = 1, limit = PAGELIMIT) => {
    return `${CACHE_KEYS.USER_ORDERS}:${userId}:${page}:${limit}`
  },

  userNotifications: (userId: number) => {
    return `${CACHE_KEYS.USER_NOTIFICATIONS}:${userId}`
  },

  analyticsSales: (period: 'today' | 'weekly' | 'monthly', date?: string) => {
    const dateStr = date || new Date().toISOString().split('T')[0]
    return `uhq:analytics:sales:${period}:${dateStr}`
  },

  analyticsProducts: (type: 'top' | 'bestsellers' | 'lowstock') => {
    return `uhq:analytics:products:${type}`
  },

  blogsList: (categoryId?: number, page = 1, limit = PAGELIMIT, filters?: Record<string, any>) => {
    const filterStr = filters
      ? Object.entries(filters)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join('_')
      : 'all'
    return `${CACHE_KEYS.BLOGS.LIST}:${categoryId || 'all'}:${page}:${limit}:${filterStr}`
  },

  blogCategoriesList: (page = 1, limit = PAGELIMIT, filters?: Record<string, any>) => {
    const filterStr = filters
      ? Object.entries(filters)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join('_')
      : 'all'
    return `${CACHE_KEYS.BLOG_CATEGORIES.LIST}:${page}:${limit}:${filterStr}`
  },

  customPagesList: (page = 1, limit = PAGELIMIT, filters?: Record<string, any>) => {
    const filterStr = filters
      ? Object.entries(filters)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join('_')
      : 'all'
    return `${CACHE_KEYS.CUSTOM_PAGES.LIST}:${page}:${limit}:${filterStr}`
  }
}

/**
 * Cache invalidation patterns
 */
export const CACHE_PATTERNS = {
  ALL_PRODUCTS: 'uhq:products:*',
  ALL_CATEGORIES: 'uhq:categories:*',
  ALL_COUPONS: 'uhq:coupons:*',
  ALL_BLOGS: 'uhq:blogs:*',
  ALL_BLOG_CATEGORIES: 'uhq:blog_categories:*',
  ALL_CUSTOM_PAGES: 'uhq:custom_pages:*',
  ALL_ANALYTICS: 'uhq:analytics:*',
  ALL_SETTINGS: 'uhq:settings:*',
  USER_DATA: (userId: number) => `uhq:user:*:${userId}*`,
  PRODUCT_RELATED: (productId: number) => `uhq:product*:${productId}*`,
  COUPON_RELATED: (couponId: number) => `uhq:coupon*:${couponId}*`,
  BLOG_RELATED: (blogId: number) => `uhq:blog*:${blogId}*`,
  BLOG_CATEGORY_RELATED: (categoryId: number) => `uhq:blog_category*:${categoryId}*`
} as const
