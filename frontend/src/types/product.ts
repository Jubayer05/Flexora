export interface Product {
  id: number
  sku: string
  name: string
  slug: string
  description: string
  type:
    | 'SERIAL'
    | 'BULK'
    | 'ACCOUNT'
    | 'FILE'
    | 'SERVICE'
    | 'TELEGRAM_CHANNEL_GROUPS'
    | 'TELEGRAM_ACCOUNTS'
    | 'PREMIUM_1M'
    | 'PREMIUM_3M'
    | 'PREMIUM_6M'
    | 'PREMIUM_12M'
  platform: any | null
  telegramUrl: string | null
  price: string
  originalPrice: string | null
  costPrice: string | null
  stockCount: number
  soldCount: number
  minQuantity: number
  maxQuantity: number
  isActive: boolean
  isPrivate: boolean
  privateUrl: string | null
  isFeatured: boolean
  images: string[]
  thumbnail: string | null
  createdAt: string
  updatedAt: string
  meta: any | null
  seo: any | null
  categoryId: number
  productGroupId?: number | null
  category?: {
    id: number
    name: string
    slug: string
  } | null
  productGroup?: {
    id: number
    name: string
    slug?: string
  } | null
  tags?: string[]
  btnText?: string | null
  reviewStats?: {
    averageRating: number
    reviewCount: number
  }
  feedbacks?: Array<{
    id: number
    name: string
    feedback: string
    rating: number
    createdAt: string
  }>
  _count: {
    accounts: number
  }
  accounts?: Array<{
    id: number
    platform?: string
    meta?: Record<string, unknown> | null
    credentials?: Record<string, unknown> | null
  }>
}

export interface ProductFilters {
  name?: string
  categoryId?: number
  categoryName?: string
  platformId?: string
  platformName?: string
  type?: Product['type']
  minPrice?: number
  maxPrice?: number
  isActive?: boolean
  isFeatured?: boolean
  tags?: string[]
}

export interface ProductSortOptions {
  sortBy:
    | 'newest'
    | 'oldest'
    | 'price_low_to_high'
    | 'price_high_to_low'
    | 'popular'
    | 'rating'
    | 'name'
  order?: 'asc' | 'desc'
}

export interface ProductResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
  filters: ProductFilters
  sort: ProductSortOptions
}
