import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema'

const slugPattern = /^[A-Za-z0-9-]+$/

// Enums
export const PlatformType = z.enum([
  'INSTAGRAM',
  'FACEBOOK',
  'TWITTER',
  'TELEGRAM',
  'TIKTOK',
  'YOUTUBE',
  'OTHER'
])

// Base Product Schema
export const ProductBaseSchema = z.object({
  sku: z
    .string()
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must be less than 50 characters')
    .regex(
      /^[A-Z0-9-_]+$/,
      'SKU must contain only uppercase letters, numbers, hyphens, and underscores'
    ),
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .trim()
    .regex(slugPattern, 'Slug must contain only letters, numbers, and hyphens')
    .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
      message: 'Slug cannot start or end with a hyphen'
    }),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  type: z.string(),
  tags: z.string().optional(),
  telegramUrl: z.string().optional(),
  btnText: z.string().optional(),
  platform: PlatformType.optional(),
  price: z.number().min(0, 'Price cannot be negative').max(999999.99, 'Price is too high'),
  originalPrice: z
    .number()
    .min(0, 'Original price cannot be negative')
    .max(999999.99, 'Original price is too high')
    .optional(),
  costPrice: z
    .number()
    .min(0, 'Cost price cannot be negative')
    .max(999999.99, 'Cost price is too high')
    .optional(),
  stockCount: z.number().int().optional(),
  sortOrder: z.number().int().optional(), // Keep as integer, use large gaps (1000, 2000, 3000...)
  minQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
  maxQuantity: z
    .number()
    .int()
    .min(0, 'Maximum quantity cannot be negative')
    .max(10000, 'Maximum quantity is too high')
    .default(0),
  isActive: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
  privateUrl: z.string().optional(),
  isFeatured: z.boolean().default(false),
  images: z.array(z.string().min(2, 'Invalid image URL')).default([]),
  thumbnail: z.string().min(2, 'Invalid thumbnail URL').optional(),
  categoryId: z.number().int().positive('Category ID must be a positive integer'),
  productGroupId: z.number().int().positive('Product group ID must be a positive integer').optional(),
  stocks: z
    .array(
      z.object({
        id: z.string().optional(),
        email: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        phone: z.string().optional(),
        note: z.string().optional(),
        stockFormat: z.enum(['NEWLINE', 'CUSTOM_DELIMITER']).optional(),
        delimiter: z.string().optional(),
        batchId: z.string().optional()
      })
    )
    .optional(), // To handle stock updates in bulk
  meta: z.record(z.string(), z.any()).optional(),
  seo: z
    .object({
      title: z.string().max(255, 'SEO title must be less than 255 characters').optional(),
      description: z
        .string()
        .max(500, 'SEO description must be less than 500 characters')
        .optional(),
      keywords: z.string().optional(),
      canonicalUrl: z.url('Invalid canonical URL').optional()
    })
    .optional()
})

// Create Product Schema - sku is optional; service generates it once if not provided
export const CreateProductSchema = ProductBaseSchema.extend({
  sku: ProductBaseSchema.shape.sku.optional()
}).refine(
  (data) => {
    if (data.maxQuantity === 0) {
      return true
    }
    if (data.minQuantity > data.maxQuantity) {
      return false
    }
    return true
  },
  {
    message: 'Minimum quantity cannot be greater than maximum quantity',
    path: ['minQuantity']
  }
)

// Update Product Schema
export const UpdateProductSchema = ProductBaseSchema.partial()
  .extend({
    id: z.number().int().positive('Product ID must be a positive integer'),
    sku: z.string().optional() // SKU should be read-only in updates
  })
  .refine(
    (data) => {
      if (data.minQuantity == null || data.maxQuantity == null) return true
      if (data.maxQuantity === 0) return true
      return data.minQuantity <= data.maxQuantity
    },
    {
      message: 'Minimum quantity cannot be greater than maximum quantity',
      path: ['minQuantity']
    }
  )

// Product Query/Filter Schema
export const ProductQuerySchema = PaginationSchema.extend({
  ids: z.string().optional(),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  platform: PlatformType.optional(),
  type: z.string().optional(),
  isActive: BooleanSchemaString,
  isPrivate: BooleanSchemaString,
  isFeatured: BooleanSchemaString,
  groupId: z.string().optional(),
  minPrice: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Min price must be a valid number')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => !val || val >= 0, 'Min price cannot be negative'),
  maxPrice: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Max price must be a valid number')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => !val || val >= 0, 'Max price cannot be negative'),
  inStock: z.string().optional(),
  lowStock: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Low stock must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val >= 0, 'Low stock cannot be negative'),
  sortBy: z
    .enum(['name', 'price', 'stockCount', 'soldCount', 'createdAt', 'updatedAt', 'sortOrder'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeCategory: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  includeAccounts: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false))
})

// Product ID Schema
export const ProductIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Product ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

// Product SKU Schema
export const ProductSkuSchema = z.object({
  sku: z.string().min(1, 'Product SKU is required')
})

// Product Slug Schema
export const ProductSlugSchema = z.object({
  slug: z.string().min(1, 'Product slug is required').regex(slugPattern, 'Slug must contain only letters, numbers, and hyphens')
})

// Product Filter Schema - for filtering by categories and groups
export const ProductFilterSchema = z.object({
  categoryIds: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined
      return val.split(',').map((id) => parseInt(id.trim(), 10))
    })
    .refine(
      (val) => !val || val.every((id) => !isNaN(id) && id > 0),
      'All category IDs must be valid positive numbers'
    ),
  groupIds: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined
      return val.split(',').map((id) => parseInt(id.trim(), 10))
    })
    .refine(
      (val) => !val || val.every((id) => !isNaN(id) && id > 0),
      'All group IDs must be valid positive numbers'
    )
})

// Bulk Product Operations
export const BulkProductUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one product ID is required'),
  updates: z.object({
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    policy: z.string().optional(),
    description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    thumbnail: z.string().min(2, 'Invalid thumbnail URL').optional(),
    moreInformation: z.string().max(5000, 'More information must be less than 5000 characters').optional(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    originalPrice: z.number().min(0, 'Original price cannot be negative').optional(),
    categoryId: z.number().int().positive('Category ID must be a positive integer').optional()
  })
})

export const BulkProductDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one product ID is required')
})

// Product Import Schema
export const ProductImportSchema = z.object({
  products: z
    .array(CreateProductSchema)
    .min(1, 'At least one product is required')
    .max(1000, 'Cannot import more than 1000 products at once'),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false)
})

// Product Export Schema
export const ProductExportSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  includeAccounts: z.boolean().default(false),
  categoryIds: z.array(z.number().int().positive()).optional(),
  platformTypes: z.array(PlatformType).optional(),
  onlyActive: z.boolean().default(true)
})

// Private URL Access Schema
export const PrivateUrlAccessSchema = z.object({
  privateUrl: z.string().min(1, 'Private URL is required'),
  accessCode: z.string().optional()
})

// Product Analytics Schema
export const ProductAnalyticsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .default(() => {
      const date = new Date()
      date.setDate(date.getDate() - 7)
      return date.toISOString()
    })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .default(() => new Date().toISOString())
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  metrics: z
    .array(z.enum(['sales', 'revenue', 'views', 'conversion']))
    .default(['sales', 'revenue'])
})

// Product Details Schema for individual product retrieval
export const ProductDetailsSchema = z.object({
  includeAccounts: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false)
})

// Export types
export type ProductBase = z.infer<typeof ProductBaseSchema>
export type CreateProduct = z.infer<typeof CreateProductSchema>
export type UpdateProduct = z.infer<typeof UpdateProductSchema>
export type ProductQuery = z.infer<typeof ProductQuerySchema>
export type ProductId = z.infer<typeof ProductIdSchema>
export type ProductSku = z.infer<typeof ProductSkuSchema>
export type ProductFilter = z.infer<typeof ProductFilterSchema>
export type BulkProductUpdate = z.infer<typeof BulkProductUpdateSchema>
export type BulkProductDelete = z.infer<typeof BulkProductDeleteSchema>
export type ProductImport = z.infer<typeof ProductImportSchema>
export type ProductExport = z.infer<typeof ProductExportSchema>
export type PrivateUrlAccess = z.infer<typeof PrivateUrlAccessSchema>
export type ProductAnalytics = z.infer<typeof ProductAnalyticsSchema>
export type ProductDetails = z.infer<typeof ProductDetailsSchema>

// Product Reorder Schema
export const ProductReorderSchema = z.object({
  prevSortOrder: z.number().int().nullable().optional(),
  nextSortOrder: z.number().int().nullable().optional()
})

export type ProductReorder = z.infer<typeof ProductReorderSchema>

export const TelegramProductSchema = ProductBaseSchema.extend({
  platform: z.literal('TELEGRAM'),
  type: z.string().min(1, 'Product type is required'),
  telegramUrl: z.string().optional(), // Required for transfers, optional for accounts
  meta: z
    .object({
      // For account products (type: FILE)
      description: z.string().optional()
      // For transfer products (type: SERVICE) - validated separately via TelegramOwnershipTransferProductMetaSchema
    })
    .optional()
})

export type TelegramProduct = z.infer<typeof TelegramProductSchema>
