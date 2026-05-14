import { z } from 'zod'

// === SEO Schema ===
export const seoSchema = z.object({
  keywords: z.array(z.string()),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional()
})

// === Content Section Schema ===
export const contentSectionSchema = z.object({
  type: z.enum([
    'hero',
    'text',
    'image',
    'video',
    'cta',
    'features',
    'products',
    'testimonial',
    'categories'
  ]),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  content: z.string().optional(),
  image: z.string().optional(),
  video: z.string().optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  // Dynamic list support
  apiEndpoint: z.string().optional(),
  dataPath: z.string().optional(),
  variant: z.string().optional(),
  limit: z.number().optional(),
  layout: z.enum(['grid', 'carousel']).optional(),
  columns: z.number().optional(),
  // Features static items
  items: z
    .array(
      z.object({
        icon: z.string().optional(),
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional()
      })
    )
    .optional()
})

// === Page Content Detail Schema ===
export const pageContentDetailSchema = z.object({
  sections: z.array(contentSectionSchema).optional()
})

// === Page Content Schema (for individual page content editing) ===
export const pageContentSchema = z.object({
  id: z.string().optional(), // for tracking purposes
  title: z.string().min(1, 'Title is required'),
  pageSlug: z.string().min(1, 'Page slug is required'),
  content: z.string().min(1, 'Content is required'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean()
})

// === Page Meta Schema ===
export const pageMetaSchema = z.object({
  featured: z.boolean().optional().default(false),
  showInFooter: z.boolean().optional().default(false)
})

// === Complete Page Data Schema (API Response) ===
export const pageDataSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  title: z.string().min(1, 'Title is required'),
  // Optional text fields may come as null from API; allow nulls to avoid validation errors
  subtitle: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  content: pageContentDetailSchema.optional(),
  seo: seoSchema.optional()
})

// === Page Banners Form Schema ===
export const pageBannersFormSchema = z.object({
  pages: z.array(pageDataSchema).min(1, 'At least one page is required')
})

// === Page Details Schema (for single page edit as per API response) ===
export const pageDetailsSchema = z
  .object({
    slug: z.string().min(1, 'Slug is required').optional(),
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().nullable().optional(),
    type: z.enum(['EXTERNAL', 'DYNAMIC', 'HYBRID']).default('DYNAMIC'),
    url: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    excerpt: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    banner: z.string().nullable().optional(),
    thumbnail: z.string().nullable().optional(),
    location: z.enum(['HEADER', 'FOOTER']).nullable(),
    group: z.string().nullable().optional(),
    content: pageContentDetailSchema.optional(),
    seo: seoSchema.optional(),
    meta: pageMetaSchema.optional()
  })
  .superRefine((data, ctx) => {
    // If EXTERNAL page, URL is required
    const raw = (data.url ?? '').trim()
    const isEmpty = raw.length === 0
    const isValidAbsolute = (() => {
      try {
        // new URL throws if not absolute (expects protocol)
        if (!raw) return false
        new URL(raw)
        return true
      } catch {
        return false
      }
    })()
    const isValidRelative = raw.startsWith('/') || raw === '#'

    if (data.type === 'EXTERNAL') {
      // Must be present and valid shape for EXTERNAL
      if (isEmpty || (!isValidAbsolute && !isValidRelative)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "URL must be absolute (e.g., https://example.com), start with '/' (e.g., /shop), or be '#'",
          path: ['url']
        })
      }
    } else {
      // If provided for other types, validate shape but don't require
      if (!isEmpty && !isValidAbsolute && !isValidRelative) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "URL must be absolute (e.g., https://example.com), start with '/' (e.g., /shop), or be '#'",
          path: ['url']
        })
      }
    }
  })

// === Main Page Settings Schema ===
export const pageSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, 'Title is required'),
      slug: z.string().min(1, 'Slug is required').optional(),
      parentSlug: z.string().optional(),
      isActive: z.boolean(),
      showInMenu: z.boolean(),
      menuOrder: z.number(),
      depth: z.number(),
      path: z.string().optional(),
      hasContent: z.boolean(),
      icon: z.string().optional(),
      target: z.enum(['_self', '_blank']),
      url: z.string().optional(),
      children: z.array(z.any()).optional() // Allow any for recursive validation
    })
  )
})

// === Tree Node Interface (for UI display) ===
export interface PageTreeNode extends Omit<PageItem, 'children'> {
  children: PageTreeNode[]
  level: number
}

// === Type Exports ===
export type PageContent = z.infer<typeof pageContentSchema>

export type PageSeo = z.infer<typeof seoSchema>
export type ContentSection = z.infer<typeof contentSectionSchema>
export type PageContentDetail = z.infer<typeof pageContentDetailSchema>
export type PageMeta = z.infer<typeof pageMetaSchema>
export type PageData = z.infer<typeof pageDataSchema>
export type PageBannersFormData = z.infer<typeof pageBannersFormSchema>
export type PageSettings = z.infer<typeof pageSchema>
export type PageDetails = z.infer<typeof pageDetailsSchema>
// === Unified Page Item Type (inferred from schema) ===
export type PageItem = z.infer<typeof pageSchema>['pages'][number]
