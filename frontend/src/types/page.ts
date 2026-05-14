interface FeatureItem {
  icon: string
  title: string
  description: string
}

export interface PageSection {
  type:
    | 'hero'
    | 'image'
    | 'text'
    | 'video'
    | 'cta'
    | 'features'
    | 'products'
    | 'testimonial'
    | 'categories'
  title?: string
  subtitle?: string
  heading?: string
  subheading?: string
  content?: string
  image?: string
  video?: string
  buttonText?: string
  buttonLink?: string
  items?: FeatureItem[]
  limit?: number
  layout?: 'grid' | 'carousel'
  columns?: number
  variant?: string
  dataPath?: string
  apiEndpoint?: string
}

export interface PageSEO {
  keywords: string[]
  ogImage: string
}

export interface PageContent {
  sections: PageSection[]
}

export interface Page {
  id: string
  slug: string
  title: string
  type: 'STATIC' | 'DYNAMIC'
  url: string
  subtitle?: string
  excerpt?: string
  description?: string
  banner?: string
  thumbnail?: string
  isActive: boolean
  sortOrder: number
  seo?: {
    keywords?: string[]
    metaTitle?: string
    metaDescription?: string
  }
  content?: {
    sections?: PageSection[]
  }
  meta?: {
    featured?: boolean
    showInFooter?: boolean
  }
}

export type PageData = Page // Record<string, Page>
