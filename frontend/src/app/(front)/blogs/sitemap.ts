import { generateSitemap, type SitemapEntry } from '@/lib/sitemap/generateSitemap'
import { getSeoRootApiUrl, getSeoSiteUrl } from '@/lib/seo/url'
import type { MetadataRoute } from 'next'

// ... existing imports ...

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = []

  try {
    const baseUrl = getSeoSiteUrl()
    const apiBase = getSeoRootApiUrl()

    // Use Next.js fetch with revalidation instead of timeout
    // This allows static generation to work properly
    const res = await fetch(`${apiBase}/blogs`, {
      next: { revalidate: 3600 }, // Revalidate every hour
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      console.warn(`Blogs API returned ${res.status}: ${res.statusText}`)
      return generateSitemap(entries)
    }

    const data = await res.json()

    if (!data || typeof data !== 'object') {
      console.warn('Invalid API response: not an object')
      return generateSitemap(entries)
    }

    if (data.success !== true) {
      console.warn('API response indicates failure:', data.message || 'Unknown error')
      return generateSitemap(entries)
    }

    if (!data.data || typeof data.data !== 'object') {
      console.warn('Invalid API response: missing or invalid data field')
      return generateSitemap(entries)
    }

    const blogs = data.data.blogs
    if (!Array.isArray(blogs)) {
      console.warn('Invalid blogs data: not an array')
      return generateSitemap(entries)
    }

    for (const blog of blogs) {
      if (!blog || typeof blog !== 'object' || typeof blog.slug !== 'string') continue

      const updatedAt =
        typeof blog.updatedAt === 'string' && !isNaN(Date.parse(blog.updatedAt))
          ? new Date(blog.updatedAt).toISOString()
          : new Date().toISOString()

      entries.push({
        loc: `${baseUrl}/blogs/${blog.slug}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: updatedAt
      })
    }
  } catch (error) {
    // Handle timeout and other errors gracefully
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('Blogs sitemap generation timed out, using empty sitemap')
    } else {
      console.warn(
        'Blogs sitemap generation failed:',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  return generateSitemap(entries)
}
