// src/lib/validations/schemas/product.ts
import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from './common'

// ------------ Enums -------------

export const PlatformType = z.enum(['TELEGRAM', 'OTHER'])
export type PlatformTypeValue = z.infer<typeof PlatformType>

// ------------ CORE SCHEMA (NO .refine HERE) -------------

const ProductCoreSchema = z.object({
  name: z
    .string({ message: 'Product name is required' })
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),

  slug: z
    .string({ message: 'Slug is required' })
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .trim()
    .regex(/^[A-Za-z0-9-]+$/, 'Slug must contain only letters, numbers, and hyphens')
    .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
      message: 'Slug cannot start or end with a hyphen'
    }),

  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),

  type: z.string().min(1, 'Product type is required'),

  telegramUrl: z.string().optional(),
  platform: PlatformType.optional(),
  tags: z.string().optional(),

  originalPrice: z
    .number({ message: 'Price is required' })
    .min(0, 'Original price cannot be negative')
    .max(999999.99, 'Original price is too high'),

  btnText: z
    .string()
    .max(50, 'Button text must be less than 50 characters')
    .optional(),

  minQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1'),

  maxQuantity: z
    .number()
    .int()
    .min(0, 'Maximum quantity cannot be negative')
    .max(10000, 'Maximum quantity is too high'),
  
  stockCount: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      if (typeof val === 'string') return Number(val)
      return val
    },
    z
      .number({ message: 'Stock count is required' })
      .int('Stock count must be an integer')
      .min(0, 'Stock count cannot be negative')
      .optional()
  ),
    
  isActive: z.boolean(),
  isPrivate: z.boolean(),

  privateUrl: z.string('Invalid URL').optional(),

  isFeatured: z.boolean(),

  images: z.array(z.string().min(2, 'Invalid image URL')).optional(),

  thumbnail: z.union([
    z.string().min(2, 'Thumbnail must be at least 2 characters'),
    z.literal('')
  ]).optional(),

  categoryId: z
    .number({ message: 'Category ID is required' })
    .int('Category ID is required')
    .positive('Category ID is required'),

  productGroupId: z.number().int().positive('Product group is required').optional(),

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
    .optional(),

  meta: z
    .object({
      policy: z
        .string()
        .max(1000, 'Policy must be less than 1000 characters')
        .optional(),
      filePath: z.preprocess(
        (val) => {
          // Normalize BEFORE validation - this is critical
          if (val === undefined || val === null) return undefined
          if (Array.isArray(val)) {
            return val.length === 0 ? undefined : val
          }
          if (typeof val === 'string') {
            const trimmed = val.trim()
            return trimmed === '' ? undefined : trimmed
          }
          return val
        },
        z.union([
          z.array(z.string().min(1)).min(1),
          z.string().min(1)
        ]).optional()
      ),
      licenseType: z.enum(['ULTIMATE', 'ONE_TIME']).optional(),
      clientInputLabel: z.string().max(100, 'Client input label must be less than 100 characters').optional(),
      moreInformation: z.string().max(5000, 'More information must be less than 5000 characters').optional()
    })
    .optional(),

  seo: z
    .object({
      title: z
        .string()
        .max(255, 'SEO title must be less than 255 characters')
        .optional(),
      description: z
        .string()
        .max(500, 'SEO description must be less than 500 characters')
        .optional(),
      keywords: z.string().optional(),
      canonicalUrl: z.url('Invalid canonical URL').optional()
    })
    .optional()
})

// ------------ COMMON REFINEMENT HELPERS -------------

type RefinementConfig = {
  message: string
  path: (string | number)[]
}

// Generic helpers taake multiple schemas pe reuse ho saken
const privateUrlRefinement = <T extends { isPrivate?: boolean; privateUrl?: string | null }>(
  data: T
) => {
  if (data.isPrivate) {
    return !!data.privateUrl && data.privateUrl.trim() !== ''
  }
  return true
}

const privateUrlRefinementConfig: RefinementConfig = {
  message: 'Private URL is required when product is private',
  path: ['privateUrl']
}

const minMaxRefinement = <T extends { minQuantity?: number | null; maxQuantity?: number | null }>(
  data: T
) => {
  if (data.minQuantity == null || data.maxQuantity == null) return true
  if (data.maxQuantity === 0) return true
  return data.minQuantity <= data.maxQuantity
}

const minMaxRefinementConfig: RefinementConfig = {
  message: 'Minimum quantity cannot be greater than maximum quantity',
  path: ['minQuantity']
}

// ------------ BASE / CREATE / UPDATE SCHEMAS -------------

// Base Product Schema (private URL rule)
export const ProductBaseSchema = ProductCoreSchema.refine(
  privateUrlRefinement,
  privateUrlRefinementConfig
)

// Create Product Schema
export const CreateProductSchema = ProductCoreSchema
  .refine(privateUrlRefinement, privateUrlRefinementConfig)
  .refine(minMaxRefinement, minMaxRefinementConfig)

// Update Product Schema – uses partial on core, then refinements
export const UpdateProductSchema = ProductCoreSchema
  .partial()
  .extend({
    id: z.number().int().positive('Product ID must be a positive integer'),
    sku: z.string().optional()
  })
  .refine(minMaxRefinement, minMaxRefinementConfig)
  .refine(privateUrlRefinement, privateUrlRefinementConfig)

// ------------ QUERY / FILTER SCHEMAS -------------

export const ProductQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),

  categoryId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Category ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'Category ID must be positive'),

  platform: PlatformType.optional(),
  type: z.string().optional(),

  isActive: BooleanSchemaString,
  isPrivate: BooleanSchemaString,
  isFeatured: BooleanSchemaString,

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

  inStock: BooleanSchemaString,

  lowStock: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'Low stock must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val >= 0, 'Low stock cannot be negative'),

  sortBy: z
    .enum(['name', 'price', 'stockCount', 'soldCount', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),

  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  includeCategory: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  includeAccounts: z
    .string()
    .optional()
    .transform((val) => val === 'true')
})

export const ProductIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Product ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

export const ProductDetailsSchema = z.object({
  includeAccounts: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false)
})

// ------------ TRANSFER PRODUCT SCHEMAS -------------

export const TransferProductMetaSchema = z.object({
  transferType: z.enum(['group', 'channel'], {
    message: 'Transfer type is required'
  }),
  botAdded: z.boolean({ message: 'Bot added status is required' }),
  adminPhone: z.string().min(1, 'Admin phone is required'),
  members: z.number().int().positive().optional(),
  originalOwner: z.string().min(1, 'Original owner is required'),
  yearCreated: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional(),
  assignedGroupsChannels: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]).optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        type: z.enum(['group', 'channel']),
        members: z.number().int().optional(),
        isPublic: z.boolean().optional(),
        description: z.string().optional(),
        url: z.string().min(1, 'Channel/Group URL is required'),
        accountId: z.union([z.number(), z.string()]).optional()
      })
    )
    .optional(),
  soldGroupsChannels: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]).optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        type: z.enum(['group', 'channel']),
        members: z.number().int().optional(),
        isPublic: z.boolean().optional(),
        description: z.string().optional(),
        url: z.string().min(1, 'Channel/Group URL is required'),
        accountId: z.union([z.number(), z.string()]).optional()
      })
    )
    .optional()
})

export const CreateTransferProductSchema = ProductCoreSchema.omit({
  type: true,
  platform: true,
  meta: true,
  telegramUrl: true,
  slug: true
})
  .extend({
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(255, 'Slug must be less than 255 characters')
      .trim()
      .regex(/^[A-Za-z0-9-]+$/, 'Slug must contain only letters, numbers, and hyphens')
      .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
        message: 'Slug cannot start or end with a hyphen'
      }),
    type: z.enum(['SERVICE', 'TELEGRAM_CHANNEL_GROUPS']),
    platform: z.literal('TELEGRAM'),
    telegramUrl: z
      .string()
      .min(1, 'Telegram URL is required')
      .regex(
        /^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
        'Invalid Telegram URL. Example: https://t.me/groupname'
      ),
    meta: TransferProductMetaSchema
  })
  .refine(privateUrlRefinement, privateUrlRefinementConfig)
  .refine(minMaxRefinement, minMaxRefinementConfig)

export const UpdateTransferProductSchema = ProductCoreSchema.omit({
  type: true,
  platform: true,
  meta: true,
  telegramUrl: true
})
  .partial()
  .extend({
    id: z.number().int().positive('Product ID must be a positive integer').optional(),
    sku: z.string().optional(),
    type: z.enum(['SERVICE', 'TELEGRAM_CHANNEL_GROUPS']).optional(),
    platform: z.literal('TELEGRAM').optional(),
    telegramUrl: z
      .string()
      .min(1, 'Telegram URL is required')
      .regex(
        /^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
        'Invalid Telegram URL. Example: https://t.me/groupname'
      )
      .optional(),
    meta: TransferProductMetaSchema.optional()
  })
  .refine(minMaxRefinement, minMaxRefinementConfig)
  .refine(privateUrlRefinement, privateUrlRefinementConfig)

// ------------ BULK UPDATE SCHEMA (Frontend - only validates updates, IDs are in React state)-------------

export const BulkUpdateProductSchema = z.object({
  updates: z
    .object({
      policy: z.string().optional(),
      description: z.string().optional(),
      thumbnail: z.string().optional(),
      moreInformation: z.string().max(5000, 'More information must be less than 5000 characters').optional()
    })
    .optional()
})

// ------------ EXPORTED TYPES -------------

export type ProductBase = z.infer<typeof ProductBaseSchema>
export type CreateProduct = z.infer<typeof CreateProductSchema>
export type UpdateProduct = z.infer<typeof UpdateProductSchema>
export type ProductQuery = z.infer<typeof ProductQuerySchema>
export type ProductId = z.infer<typeof ProductIdSchema>
export type ProductDetails = z.infer<typeof ProductDetailsSchema>
export type TransferProductMeta = z.infer<typeof TransferProductMetaSchema>
export type CreateTransferProduct = z.infer<typeof CreateTransferProductSchema>
export type UpdateTransferProduct = z.infer<typeof UpdateTransferProductSchema>
export type BulkUpdateProduct = z.infer<typeof BulkUpdateProductSchema>

// import { z } from 'zod'
// import { BooleanSchemaString, PaginationSchema } from './common'

// export const PlatformType = z.enum(['TELEGRAM', 'OTHER'])

// // Base Product Schema
// export const ProductBaseSchema = z
//   .object({
//     name: z
//       .string('Product name is required')
//       .min(1, 'Product name is required')
//       .max(255, 'Product name must be less than 255 characters'),
//     description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
//     type: z.string().min(1, 'Product type is required'),
//     telegramUrl: z.string().optional(),
//     platform: PlatformType.optional(),
//     tags: z.string().optional(),
//     originalPrice: z
//       .number('Price is required')
//       .min(0, 'Original price cannot be negative')
//       .max(999999.99, 'Original price is too high'),
//     minQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1'),
//     maxQuantity: z
//       .number()
//       .int()
//       .min(1, 'Maximum quantity must be at least 1')
//       .max(10000, 'Maximum quantity is too high'),
//     isActive: z.boolean(),
//     isPrivate: z.boolean(),
//     privateUrl: z.string('Invalid URL').optional(),
//     isFeatured: z.boolean(),
//     images: z.array(z.string().min(2, 'Invalid image URL')).optional(),
//     thumbnail: z.string().min(2, 'Thumbnail is required').optional(),
//     categoryId: z
//       .number('Category ID is required')
//       .int('Category ID is required')
//       .positive('Category ID is required'),
//     meta: z
//       .object({
//         policy: z.string().max(1000, 'Policy must be less than 1000 characters').optional(),
//         filePath: z.string().optional()
//       })
//       .optional(),
//     seo: z
//       .object({
//         title: z.string().max(255, 'SEO title must be less than 255 characters').optional(),
//         description: z
//           .string()
//           .max(500, 'SEO description must be less than 500 characters')
//           .optional(),
//         keywords: z.string().optional(),
//         canonicalUrl: z.url('Invalid canonical URL').optional()
//       })
//       .optional()
//   })
//   .refine(
//     (data) => {
//       // If product is private, privateUrl must be provided and be a valid URL
//       if (data.isPrivate) {
//         if (!data.privateUrl || data.privateUrl.trim() === '') {
//           return false
//         }
//       }
//       return true
//     },
//     {
//       message: 'Private URL is required  when product is private',
//       path: ['privateUrl']
//     }
//   )

// // Create Product Schema
// export const CreateProductSchema = ProductBaseSchema.refine(
//   (data) => {
//     if (data.minQuantity > data.maxQuantity) {
//       return false
//     }
//     return true
//   },
//   {
//     message: 'Minimum quantity cannot be greater than maximum quantity',
//     path: ['minQuantity']
//   }
// )

// // Update Product Schema
// export const UpdateProductSchema = ProductBaseSchema.partial()
//   .extend({
//     id: z.number().int().positive('Product ID must be a positive integer'),
//     sku: z.string().optional() // SKU should be read-only in updates
//   })
//   .refine(
//     (data) => {
//       if (data.minQuantity && data.maxQuantity && data.minQuantity > data.maxQuantity) {
//         return false
//       }
//       return true
//     },
//     {
//       message: 'Minimum quantity cannot be greater than maximum quantity',
//       path: ['minQuantity']
//     }
//   )

// // Product Query/Filter Schema
// export const ProductQuerySchema = PaginationSchema.extend({
//   search: z.string().optional(),
//   categoryId: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^\d+$/.test(val), 'Category ID must be a valid number')
//     .transform((val) => (val ? parseInt(val, 10) : undefined))
//     .refine((val) => !val || val > 0, 'Category ID must be positive'),
//   platform: PlatformType.optional(),
//   type: z.string().optional(),
//   isActive: BooleanSchemaString,
//   isPrivate: BooleanSchemaString,
//   isFeatured: BooleanSchemaString,
//   minPrice: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Min price must be a valid number')
//     .transform((val) => (val ? parseFloat(val) : undefined))
//     .refine((val) => !val || val >= 0, 'Min price cannot be negative'),
//   maxPrice: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), 'Max price must be a valid number')
//     .transform((val) => (val ? parseFloat(val) : undefined))
//     .refine((val) => !val || val >= 0, 'Max price cannot be negative'),
//   inStock: BooleanSchemaString,
//   lowStock: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^\d+$/.test(val), 'Low stock must be a valid number')
//     .transform((val) => (val ? parseInt(val, 10) : undefined))
//     .refine((val) => !val || val >= 0, 'Low stock cannot be negative'),
//   sortBy: z
//     .enum(['name', 'price', 'stockCount', 'soldCount', 'createdAt', 'updatedAt'])
//     .optional()
//     .default('createdAt'),
//   sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
//   includeCategory: z
//     .string()
//     .optional()
//     .transform((val) => (val === 'true' ? true : false)),
//   includeAccounts: z
//     .string()
//     .optional()
//     .transform((val) => (val === 'true' ? true : false))
// })

// // Product ID Schema
// export const ProductIdSchema = z.object({
//   id: z
//     .string()
//     .regex(/^\d+$/, 'Product ID must be a valid number')
//     .transform((val) => parseInt(val, 10))
// })

// // Product Details Schema for individual product retrieval
// export const ProductDetailsSchema = z.object({
//   includeAccounts: z
//     .string()
//     .optional()
//     .transform((val) => val === 'true')
//     .default(false)
// })

// // Transfer Product Schema (extends CreateProductSchema with fixed values and custom meta)
// export const TransferProductMetaSchema = z.object({
//   transferType: z.enum(['group', 'channel'], { message: 'Transfer type is required' }),
//   botAdded: z.boolean({ message: 'Bot added status is required' }),
//   adminPhone: z.string().min(1, 'Admin phone is required'),
//   members: z.number().int().positive().optional(),
//   originalOwner: z.string().min(1, 'Original owner is required'),
//   yearCreated: z.number().int().min(1900).max(new Date().getFullYear()).optional()
// })

// export const CreateTransferProductSchema = ProductBaseSchema.omit({
//   type: true,
//   platform: true,
//   meta: true,
//   telegramUrl: true
// })
//   .extend({
//     type: z.literal('SERVICE'),
//     platform: z.literal('TELEGRAM'),
//     telegramUrl: z.string().min(1, 'Telegram URL is required').url('Invalid Telegram URL'),
//     meta: TransferProductMetaSchema
//   })
//   .refine(
//     (data) => {
//       if (data.minQuantity > data.maxQuantity) {
//         return false
//       }
//       return true
//     },
//     {
//       message: 'Minimum quantity cannot be greater than maximum quantity',
//       path: ['minQuantity']
//     }
//   )

// // Update Transfer Product Schema
// export const UpdateTransferProductSchema = CreateTransferProductSchema.omit({
//   type: true,
//   platform: true
// })
//   .partial()
//   .extend({
//     id: z.number().int().positive('Product ID must be a positive integer').optional(),
//     sku: z.string().optional(),
//     type: z.literal('SERVICE').optional(),
//     platform: z.literal('TELEGRAM').optional()
//   })
//   .refine(
//     (data) => {
//       if (data.minQuantity && data.maxQuantity && data.minQuantity > data.maxQuantity) {
//         return false
//       }
//       return true
//     },
//     {
//       message: 'Minimum quantity cannot be greater than maximum quantity',
//       path: ['minQuantity']
//     }
//   )

// // Export types
// export type ProductBase = z.infer<typeof ProductBaseSchema>
// export type CreateProduct = z.infer<typeof CreateProductSchema>
// export type UpdateProduct = z.infer<typeof UpdateProductSchema>
// export type ProductQuery = z.infer<typeof ProductQuerySchema>
// export type ProductId = z.infer<typeof ProductIdSchema>
// export type ProductDetails = z.infer<typeof ProductDetailsSchema>
// export type TransferProductMeta = z.infer<typeof TransferProductMetaSchema>
// export type CreateTransferProduct = z.infer<typeof CreateTransferProductSchema>
// export type UpdateTransferProduct = z.infer<typeof UpdateTransferProductSchema>

// // Bulk Update Product Schema
// export const BulkUpdateProductSchema = z.object({
//   updates: z
//     .object({
//       policy: z.string().optional(),
//       description: z.string().optional(),
//       thumbnail: z.string().optional()
//     })
//     .optional()
// })

// export type BulkUpdateProduct = z.infer<typeof BulkUpdateProductSchema>
