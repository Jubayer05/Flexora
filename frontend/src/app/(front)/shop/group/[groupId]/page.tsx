import ProductCard from '@/components/card/ProductCard'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import ProductCardSkeleton from '@/components/frontend/shop/ProductCardSkeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import Script from 'next/script'
import { buildGroupJsonLd } from '@/lib/seo/jsonLd'
import { getSiteConfig } from '@/action/data'
import GroupProductsClient from '@/components/frontend/shop/GroupProductsClient'

// Enable ISR (Incremental Static Regeneration) - revalidate every hour
export const revalidate = 3600

// Generate metadata for SEO
export async function generateMetadata({
  params
}: {
  params: Promise<{ groupId: string }>
}): Promise<Metadata> {
  const { groupId } = await params
  // Default to localhost:5000/api/v1 if env var is not set (matches backend default port)
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flexora.com'

  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Use public endpoint to fetch single group
    const response = await fetch(`${baseApiUrl}/product-groups/${groupId}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        title: 'Product Group Not Found',
        description: 'The requested product group could not be found.'
      }
    }

    const result = await response.json()
    const group = result.data

    if (!group) {
      return {
        title: 'Product Group Not Found',
        description: 'The requested product group could not be found.'
      }
    }

    // Build SEO metadata from group data
    const seoData = group.seo || {}

    const metaTitle = seoData?.metaTitle || group.name || 'Product Group'
    const metaDescription =
      seoData?.metaDescription ||
      `Browse products in ${group.name}. Find the best deals and quality products.`
    const keywords = seoData?.keywords || []
    const ogImage = seoData?.ogImage || ''
    
    // Handle canonical URL - prefer clean slug route when available
    const defaultCanonicalUrl = group?.slug
      ? `${baseUrl}/shop/${group.slug}`
      : `${baseUrl}/shop/group/${groupId}`
    const canonicalUrl = seoData?.canonicalUrl || defaultCanonicalUrl
    
    const ogTitle = seoData?.ogTitle || metaTitle
    const ogDescription = seoData?.ogDescription || metaDescription
    const twitterCard = seoData?.twitterCard || 'summary_large_image'
    const twitterTitle = seoData?.twitterTitle || metaTitle
    const twitterDescription = seoData?.twitterDescription || metaDescription

    // Build page URL using slug when available
    const pageUrl = group?.slug ? `/shop/${group.slug}` : `/shop/group/${groupId}`

    // Build comprehensive metadata
    const baseMetadata = buildPageMetadata(null, {
      title: metaTitle,
      description: metaDescription,
      keywords: Array.isArray(keywords) ? keywords : keywords ? [keywords] : undefined,
      image: ogImage,
      url: pageUrl,
      type: 'website'
    })

    // Enhance with additional SEO fields
    return {
      ...baseMetadata,
      alternates: {
        ...baseMetadata.alternates,
        canonical: canonicalUrl
      },
      openGraph: {
        ...baseMetadata.openGraph,
        title: ogTitle,
        description: ogDescription,
        url: canonicalUrl,
        siteName: seoData?.ogSiteName || 'UHQ Accounts',
        images: ogImage
          ? [
              {
                url: ogImage.startsWith('http') ? ogImage : `${baseApiUrl}${ogImage}`,
                width: seoData?.ogImageWidth || 1200,
                height: seoData?.ogImageHeight || 630,
                alt: seoData?.ogImageAlt || ogTitle,
                type: 'image/jpeg'
              }
            ]
          : baseMetadata.openGraph?.images || []
      },
      twitter: {
        ...baseMetadata.twitter,
        card: twitterCard as 'summary' | 'summary_large_image',
        title: twitterTitle,
        description: twitterDescription,
        images: ogImage ? [ogImage.startsWith('http') ? ogImage : `${baseApiUrl}${ogImage}`] : baseMetadata.twitter?.images || []
      },
      robots: {
        index: seoData?.robotsIndex !== false,
        follow: seoData?.robotsFollow !== false,
        googleBot: {
          index: seoData?.robotsIndex !== false,
          follow: seoData?.robotsFollow !== false,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Product Group',
      description: 'Browse products in this group'
    }
  }
}

export default async function GroupProductsPage({
  params
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  // Default to localhost:5000/api/v1 if env var is not set (matches backend default port)
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

  let group: any = null
  let products: any[] = []

  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Use public endpoint to fetch single group
    const [groupResponse, productsResponse] = await Promise.all([
      fetch(`${baseApiUrl}/product-groups/${groupId}`, {
        next: { revalidate: 3600 },
        signal: controller.signal
      }),
      fetch(`${baseApiUrl}/products?groupId=${groupId}&limit=100`, {
        next: { revalidate: 3600 },
        signal: controller.signal
      })
    ])

    clearTimeout(timeoutId)

    if (!groupResponse.ok) {
      notFound()
    }

    const groupResult = await groupResponse.json()
    group = groupResult.data

    if (group?.slug) {
      redirect(`/shop/${group.slug}`)
    }

    if (productsResponse.ok) {
      const productsResult = await productsResponse.json()
      products = productsResult.data?.products || []
    }
  } catch (error) {
    console.error('Error fetching group:', error)
    notFound()
  }

  if (!group) {
    notFound()
  }

  // Fetch site settings for JSON-LD
  const siteSettings = await getSiteConfig()
  const jsonLd = buildGroupJsonLd(group, products, siteSettings)

  return (
    <>
      {/* Group JSON-LD Schema */}
      <Script
        id='group-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Client component for interactive features */}
      <GroupProductsClient group={group} products={products} />
    </>
  )
}
