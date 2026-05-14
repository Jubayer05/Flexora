import { z } from 'zod'

// === SEO Schema ===
export const seoSchema = z.object({
  keywords: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional()
})

// === Content Section Schema ===
export const contentSectionSchema = z.object({
  type: z.enum(['hero', 'text', 'image', 'video', 'cta']),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  content: z.string().optional(),
  image: z.string().optional(),
  video: z.string().optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional()
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
  featured: z.boolean().optional(),
  showInFooter: z.boolean().optional()
})

// === Complete Page Data Schema (API Response) ===
export const pageDataSchema = z.object({
  id: z.string().optional(),
  // slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  // Optional text fields may come as null from API; allow nulls to avoid validation errors
  subtitle: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  seo: seoSchema.optional()
})

// === Page Banners Form Schema ===
export const pageBannersFormSchema = z.object({
  pages: z.array(pageDataSchema).min(1, 'At least one page is required')
})

// === Page Item Interface (for recursive structure) ===
export interface PageItem {
  id?: string
  title: string
  slug: string
  parentSlug?: string
  isActive: boolean
  showInMenu: boolean
  menuOrder: number
  depth: number
  path?: string
  hasContent: boolean
  icon?: string
  target: '_self' | '_blank'
  url?: string
  children?: PageItem[]
}

// === Page Item Schema (for tree structure and menu management) ===
export const pageItemSchema: z.ZodType<PageItem> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required'),
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
    children: z.array(pageItemSchema).optional()
  })
)

// === Page Item Form Schema (extends pageItemSchema for form usage) ===
export const pageItemFormSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required'),
    parentSlug: z.string().optional(),
    isActive: z.boolean(),
    showInMenu: z.boolean(),
    menuOrder: z.number().min(0),
    depth: z.number().min(0),
    path: z.string().optional(),
    hasContent: z.boolean(),
    icon: z.string().optional(),
    target: z.enum(['_self', '_blank']),
    url: z.string().optional(),
    isExternal: z.boolean() // Helper field for form state
  })
  .refine(
    (data: any) => {
      // If it's an external link, URL is required
      if (data.isExternal && (!data.url || data.url.trim() === '')) {
        return false
      }
      return true
    },
    {
      message: 'URL is required for external links',
      path: ['url']
    }
  )

// === Main Page Settings Schema ===
export const pageSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, 'Title is required'),
      slug: z.string().min(1, 'Slug is required'),
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

// === Recursive Page Settings Schema (for nested validation) ===
export const pageSettingsSchema = z.object({
  pages: z.array(pageItemSchema)
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
export type PageItemFormData = z.infer<typeof pageItemFormSchema>
export type PageSettings = z.infer<typeof pageSchema>
export type PageSettingsRecursive = z.infer<typeof pageSettingsSchema>
