// src/app/sitemap.ts
// just for redeployment, we will implement dynamic sitemap generation later when we have more pages and products
import { generateSitemap, type SitemapEntry } from '@/lib/sitemap/generateSitemap'
import { getSeoSiteUrl } from '@/lib/seo/url'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSeoSiteUrl()

  const staticPages = [
    '',
    'login',
    'sign-up',
    'forget-password',
    'shop',
    'reviews',
    'faqs',
    'blogs',
    'contact',
    'checkout'
  ]

  const entries: SitemapEntry[] = [
    ...staticPages.map((path) => ({
      loc: `${siteUrl}/${path}`,
      changefreq: 'monthly' as const,
      priority: 0.5,
      lastmod: new Date().toISOString()
    })),
    // ...(pages.data?.map((item: { slug: string }) => ({
    //   loc: `${siteUrl}/page/${item.slug}`,
    //   changefreq: 'weekly',
    //   priority: 0.9
    // })) || []),
    {
      loc: `${siteUrl}/sitemap.xml`,
      changefreq: 'weekly',
      priority: 1
    },
    {
      loc: `${siteUrl}/shop/sitemap.xml`,
      changefreq: 'weekly',
      priority: 0.9
    },
    {
      loc: `${siteUrl}/pages/sitemap.xml`,
      changefreq: 'monthly',
      priority: 0.8
    },
    {
      loc: `${siteUrl}/blogs/sitemap.xml`,
      changefreq: 'monthly',
      priority: 0.5
    }
  ]

  return generateSitemap(entries)
}
