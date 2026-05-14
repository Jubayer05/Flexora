import type { Metadata } from 'next'
import { SiteSettings } from '../validations/schemas/siteSettings'
import { getSeoSiteUrl, toAbsoluteSeoMediaUrl, toAbsoluteSeoUrl } from './url'

/** Safely convert to string - handles localized objects like { en: "Blog", bn: "ব্লগ" } */
function toMetaString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return (
      (obj.en as string) ??
      (obj.bn as string) ??
      (Object.values(obj).find((v) => typeof v === 'string') as string) ??
      ''
    )
  }
  return String(value)
}

export const buildSiteMetadata = (data: SiteSettings | null): Metadata => {
  const siteName = data?.seo?.metaName || data?.name || 'UHQ Accounts'
  const siteTitle = data?.seo?.metaTitle || data?.name || 'UHQ Accounts'
  const siteDescription =
    data?.seo?.metaDescription ||
    data?.shortDescription ||
    'Buy verified digital accounts, premium services, and business-ready account packages from UHQ Accounts.'
  const baseUrl = getSeoSiteUrl()

  // Construct full URLs for images
  const ogImageUrl = data?.seo?.ogImage
    ? toAbsoluteSeoMediaUrl(data.seo.ogImage)
    : data?.logo?.default
    ? toAbsoluteSeoMediaUrl(data.logo.default)
    : toAbsoluteSeoUrl('/images/logo.svg', baseUrl)

  const faviconUrl = data?.favicon ? toAbsoluteSeoMediaUrl(data.favicon) : toAbsoluteSeoUrl('/favicon.ico', baseUrl)

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteName}`
    },
    description: siteDescription,
    keywords: data?.seo?.metaKeywords,
    authors: data?.seo?.siteAuthor ? [{ name: data.seo.siteAuthor }] : undefined,
    creator: data?.seo?.siteAuthor,
    publisher: siteName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: data?.seo?.canonicalUrl ? toAbsoluteSeoUrl(data.seo.canonicalUrl, baseUrl) : baseUrl
    },
    openGraph: {
      type: 'website',
      locale: data?.locale || 'en_US',
      url: baseUrl,
      siteName: siteName,
      title: siteTitle,
      description: siteDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: siteTitle,
          type: 'image/jpeg'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      site: data?.socialLinks?.twitter
        ? `@${data.socialLinks.twitter.replace(/.*\//, '')}`
        : undefined,
      creator: data?.socialLinks?.twitter
        ? `@${data.socialLinks.twitter.replace(/.*\//, '')}`
        : undefined,
      title: siteTitle,
      description: siteDescription,
      images: [ogImageUrl]
    },
    icons: {
      icon: [
        { url: faviconUrl, type: 'image/x-icon' },
        { url: faviconUrl, sizes: '16x16', type: 'image/png' },
        { url: faviconUrl, sizes: '32x32', type: 'image/png' }
      ],
      shortcut: faviconUrl,
      apple: [{ url: faviconUrl, sizes: '180x180', type: 'image/png' }],
      other: [
        {
          rel: 'mask-icon',
          url: faviconUrl,
          color: data?.theme?.color?.primary || '#5bbad5'
        }
      ]
    },
    robots: {
      index: !data?.maintenanceMode,
      follow: !data?.maintenanceMode,
      googleBot: {
        index: !data?.maintenanceMode,
        follow: !data?.maintenanceMode
      }
    },
    verification: {
      google: data?.analytics?.googleAnalyticsId
    }
  }
}

/**
 * Build page-specific metadata that extends the site metadata
 */
export const buildPageMetadata = (
  siteData: SiteSettings | null,
  pageData: {
    title?: string
    description?: string
    keywords?: string[]
    image?: string
    url?: string
    type?: 'website' | 'article'
    publishedTime?: string
    modifiedTime?: string
    authors?: string[]
  }
): Metadata => {
  const baseMetadata = buildSiteMetadata(siteData)
  const baseUrl = getSeoSiteUrl()

  const titleStr = toMetaString(pageData.title)
  const pageTitle = titleStr
    ? `${titleStr} | ${siteData?.seo?.metaName || siteData?.name || 'UHQ Accounts'}`
    : baseMetadata.title?.toString()

  const pageDescription =
    toMetaString(pageData.description) || baseMetadata.description?.toString() || ''

  // Safely handle the OpenGraph images array
  const baseImages = baseMetadata.openGraph?.images
  let baseImageUrl = ''

  if (Array.isArray(baseImages) && baseImages.length > 0) {
    const firstImage = baseImages[0]
    if (typeof firstImage === 'string') {
      baseImageUrl = firstImage
    } else if (firstImage instanceof URL) {
      baseImageUrl = firstImage.toString()
    } else if (firstImage && typeof firstImage === 'object' && 'url' in firstImage) {
      const url = firstImage.url
      baseImageUrl = url instanceof URL ? url.toString() : url
    }
  } else if (typeof baseImages === 'string') {
    baseImageUrl = baseImages
  } else if (baseImages instanceof URL) {
    baseImageUrl = baseImages.toString()
  } else if (baseImages && typeof baseImages === 'object' && 'url' in baseImages) {
    const url = baseImages.url
    baseImageUrl = url instanceof URL ? url.toString() : url
  }

  const pageImageUrl = pageData.image ? toAbsoluteSeoMediaUrl(pageData.image) : baseImageUrl

  return {
    ...baseMetadata,
    title: pageTitle,
    description: pageDescription,
    keywords: pageData.keywords || baseMetadata.keywords,
    authors: pageData.authors ? pageData.authors.map((name) => ({ name })) : baseMetadata.authors,
    alternates: {
      ...baseMetadata.alternates,
      canonical: pageData.url ? toAbsoluteSeoUrl(pageData.url, baseUrl) : baseMetadata.alternates?.canonical
    },
    openGraph: {
      ...baseMetadata.openGraph,
      type: pageData.type || 'website',
      url: pageData.url ? toAbsoluteSeoUrl(pageData.url, baseUrl) : baseMetadata.openGraph?.url,
      title:
        titleStr ||
        (typeof baseMetadata.openGraph?.title === 'string' ? baseMetadata.openGraph.title : ''),
      description: pageDescription,
      images: [
        {
          url: pageImageUrl,
          width: 1200,
          height: 630,
          alt:
            titleStr ||
            (typeof baseMetadata.openGraph?.title === 'string' ? baseMetadata.openGraph.title : ''),
          type: 'image/jpeg'
        }
      ],
      publishedTime: pageData.publishedTime,
      modifiedTime: pageData.modifiedTime
    },
    twitter: {
      ...baseMetadata.twitter,
      title: titleStr || baseMetadata.twitter?.title,
      description: pageDescription,
      images: [pageImageUrl]
    }
  }
}

/**
 * Generate structured data (JSON-LD) for the site
 */
export const buildStructuredData = (data: SiteSettings | null) => {
  if (!data) return null

  const baseUrl = getSeoSiteUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    description: data.shortDescription,
    url: baseUrl,
    logo: data.logo?.default ? toAbsoluteSeoMediaUrl(data.logo.default) : undefined,
    email: data.email,
    telephone: data.phone,
    address: data.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: data.address
        }
      : undefined,
    sameAs: Object.entries(data.socialLinks || {})
      .filter(([, url]) => url && url !== '')
      .map(([, url]) => url)
  }
}

export const buildBlogMetadata = (data: Blog | null | undefined): Metadata => {
  const titleStr = data ? toMetaString(data.title) : ''
  const descStr = data ? toMetaString(data.excerpt) : ''
  const siteName = 'UHQ Accounts'
  return {
    title: titleStr ? `${titleStr} | ${siteName}` : siteName,
    description: descStr,
    openGraph: {
      title: titleStr || siteName,
      description: descStr,
      type: 'article',
      url: `${getSeoSiteUrl()}/blogs/${data?.slug || ''}`,
      images: data?.thumbnail ? [{ url: toAbsoluteSeoMediaUrl(data.thumbnail) }] : []
    }
  }
}
