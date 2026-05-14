import type { MetadataRoute } from 'next'

export type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: number
}

export function generateSitemap(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: entry.loc,
    lastModified: entry.lastmod ? new Date(entry.lastmod).toISOString() : new Date().toISOString(),
    changeFrequency: entry.changefreq,
    priority: entry.priority
  }))
}
