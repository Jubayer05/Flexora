import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductDetailsClient from '@/components/frontend/shop/ProductDetailsClient'
import Script from 'next/script'
import { buildProductJsonLd } from '@/lib/seo/jsonLd'
import { getSiteConfig } from '@/action/data'
import type { Product as ProductType } from '@/types/product'

// Enable ISR (Incremental Static Regeneration) - revalidate every hour
export const revalidate = 3600

// Generate metadata for SEO
export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${baseApiUrl}/products/slug/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.'
      }
    }

    const result = await response.json()
    const product = result.data

    if (!product || !product.isActive) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.'
      }
    }

    // Build SEO metadata from product data
    const seoData = product.seo || {}
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0

    return buildPageMetadata(null, {
      title: seoData.metaTitle || product.name || 'Product',
      description:
        seoData.metaDescription ||
        product.description ||
        `Buy ${product.name} for $${price.toFixed(2)}. ${product.description || ''}`,
      keywords: seoData.keywords || product.tags?.join(', ') || '',
      image: product.thumbnail || product.images?.[0] || '',
      url: `/product/${product.slug || slug}`,
      type: 'website' // OpenGraph type must be 'website' or 'article', not 'product'
    })
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Product',
      description: 'Product details'
    }
  }
}

export default async function ProductDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  let product: ProductType | null = null

  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${baseApiUrl}/products/slug/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      notFound()
    }

    const result = await response.json()
    const productData = result.data

    if (!productData || !productData.isActive) {
      notFound()
    }

    // Ensure product has all required properties with proper types
    // Convert API response to match our Product type
    product = {
      id: productData.id,
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug || slug, // Ensure slug exists
      description: productData.description || '', // Ensure description exists
      type: (productData.type || 'FILE') as ProductType['type'], // Ensure type exists
      platform: productData.platform || null,
      telegramUrl: productData.telegramUrl || null,
      price: typeof productData.price === 'string' ? productData.price : String(productData.price || 0),
      originalPrice: productData.originalPrice 
        ? (typeof productData.originalPrice === 'string' ? productData.originalPrice : String(productData.originalPrice))
        : null,
      costPrice: productData.costPrice 
        ? (typeof productData.costPrice === 'string' ? productData.costPrice : String(productData.costPrice))
        : null,
      stockCount: productData.stockCount || 0,
      soldCount: productData.soldCount || 0,
      minQuantity: productData.minQuantity || 1,
      maxQuantity: productData.maxQuantity ?? 0,
      isActive: productData.isActive ?? true,
      isPrivate: productData.isPrivate ?? false,
      privateUrl: productData.privateUrl || null,
      isFeatured: productData.isFeatured ?? false,
      images: Array.isArray(productData.images) ? productData.images : [], // Ensure images is an array
      thumbnail: productData.thumbnail || null,
      createdAt: productData.createdAt || new Date().toISOString(),
      updatedAt: productData.updatedAt || new Date().toISOString(),
      meta: productData.meta || null,
      seo: productData.seo || null,
      categoryId: productData.categoryId,
      category: productData.category || null, // Include category if present
      productGroup: productData.productGroup || null, // Include productGroup if present
      tags: Array.isArray(productData.tags) ? productData.tags : [], // Ensure tags is an array
      btnText: productData.btnText || null,
      reviewStats: productData.reviewStats || { averageRating: 0, reviewCount: 0 },
      _count: productData._count || { accounts: 0 } // Ensure _count exists
    } as ProductType

    const feedbackResult = await fetch(`${baseApiUrl}/feedbacks/product/${productData.id}?page=1&limit=50`, {
      cache: 'no-store'
    }).then((res) => (res.ok ? res.json() : null)).catch(() => null)

    ;(product as any).feedbacks = feedbackResult?.data?.feedbacks || []
  } catch (error) {
    console.error('Error fetching product:', error)
    notFound()
  }

  if (!product || !product.isActive) {
    notFound()
  }

  // Fetch site settings for JSON-LD
  const siteSettings = await getSiteConfig()
  // Cast to any to avoid type conflict between global and local Product types
  const jsonLd = buildProductJsonLd(product as any, siteSettings)

  console.log('PRODUCT DEBUG:', product)

  return (
    <>
      {/* Product JSON-LD Schema */}
      <Script
        id='product-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Product Details Client Component */}
      <ProductDetailsClient product={product as any} />
    </>
  )
}

