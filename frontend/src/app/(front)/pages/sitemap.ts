import { generateSitemap, type SitemapEntry } from '@/lib/sitemap/generateSitemap'
import { getSeoRootApiUrl, getSeoSiteUrl } from '@/lib/seo/url'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = []

  try {
    const baseUrl = getSeoSiteUrl()
    const apiBase = getSeoRootApiUrl()

    const res = await fetch(`${apiBase}/pages`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' }
    })

    if (!res.ok) {
      console.warn(`Pages API returned ${res.status}: ${res.statusText}`)
      return generateSitemap(entries) // 👈 was `return entries`
    }

    const data = await res.json()

    if (
      !data ||
      typeof data !== 'object' ||
      data.success !== true ||
      !data.data ||
      !Array.isArray(data.data.pages)
    ) {
      console.warn('Invalid pages API response structure')
      return generateSitemap(entries) // 👈 was `return entries`
    }

    for (const page of data.data.pages) {
      if (!page || typeof page !== 'object' || typeof page.slug !== 'string') continue

      const updatedAt =
        typeof page.updatedAt === 'string' && !isNaN(Date.parse(page.updatedAt))
          ? new Date(page.updatedAt).toISOString()
          : new Date().toISOString()

      entries.push({
        loc: `${baseUrl}/pages/${page.slug}`,
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: updatedAt
      })
    }
  } catch (error) {
    console.warn('Pages sitemap generation failed:', error)
  }

  return generateSitemap(entries) // 👈 ensure final return also uses this
}
