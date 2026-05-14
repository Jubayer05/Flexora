import { generateSitemap, type SitemapEntry } from '@/lib/sitemap/generateSitemap'
import { getSeoRootApiUrl, getSeoSiteUrl } from '@/lib/seo/url'
import type { MetadataRoute } from 'next'


export const dynamic = 'force-dynamic'
export const revalidate = 0

// API allows max limit 1–100; we paginate to fetch all
const LIMIT = 100

async function fetchAllPages<T>(
  urlBuilder: (page: number) => string,
  pickItems: (json: any) => T[]
): Promise<T[]> {
  const all: T[] = []
  let page = 1

  while (true) {
    const url = urlBuilder(page)
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })

    if (!res.ok) {
      const body = await res.text()
      console.log('[SITEMAP] fetch failed:', res.status, url, body)
      break
    }

    const json = await res.json()
    const items = pickItems(json) || []
    all.push(...items)

    // stop when last page
    if (items.length < LIMIT) break
    page++
    if (page > 200) break // safety
  }

  return all
}


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = []

  const baseUrl = getSeoSiteUrl()
  const apiBase = getSeoRootApiUrl()

  // Optional: add /shop root
  entries.push({
    loc: `${baseUrl}/shop`,
    changefreq: 'weekly',
    priority: 0.8,
    lastmod: new Date().toISOString()
  })

  // -------------------
  // 1) Products (live at /product/[slug], not /shop/[slug])
  // -------------------
  const products = await fetchAllPages<any>(
    (page) => `${apiBase}/products?limit=${LIMIT}&page=${page}`,
    (json) => json?.data?.products ?? json?.data ?? []
  )

  for (const p of products) {
    const slugOrId = p?.slug || p?.id
    if (!slugOrId) continue

    entries.push({
      loc: `${baseUrl}/product/${slugOrId}`,
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: p?.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
    })
  }

  // -------------------
  // 2) Shop Groups (/shop/:slug)
  // -------------------
  const groups = await fetchAllPages<any>(
    (page) => `${apiBase}/product-groups?limit=${LIMIT}&page=${page}`,
    (json) => json?.data?.productGroups ?? json?.data ?? []
  )

  for (const g of groups) {
    const slugOrId = g?.slug || g?.id
    if (!slugOrId) continue

    entries.push({
      loc: `${baseUrl}/shop/${slugOrId}`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: g?.updatedAt ? new Date(g.updatedAt).toISOString() : new Date().toISOString()
    })
  }

  console.log('[SITEMAP] products:', products.length, 'groups:', groups.length, 'entries:', entries.length)

  return generateSitemap(entries)
}
