import { getSiteConfig } from '@/action/data'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import GroupProductsClient from '@/components/frontend/shop/GroupProductsClient'
import ProductDetailsClient from '@/components/frontend/shop/ProductDetailsClient'
import { buildGroupJsonLd } from '@/lib/seo/jsonLd'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'

export const revalidate = 3600

async function getPrivateProductBySlug(slug: string) {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

  if (!slug) return null

  try {
    const response = await fetch(`${baseApiUrl}/products/private/${slug}`, {
      next: { revalidate: 60 }
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Error fetching private product by slug:', error)
    return null
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://uhqaccounts.com'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${baseApiUrl}/product-groups/slug/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    let group: any = null
    if (response.ok) {
      const result = await response.json()
      group = result.data
    }

    if (!group) {
      const product = await getPrivateProductBySlug(slug)
      if (product) {
        return {
          title: product.name || 'Product',
          description: product.description || '',
          openGraph: {
            title: product.name || 'Product',
            description: product.description || '',
            images: product.thumbnail ? [product.thumbnail] : []
          }
        }
      }

      return {
        title: 'Product Group Not Found',
        description: 'The requested product group could not be found.'
      }
    }

    const seoData = group.seo || {}
    const effectiveSlug = group.slug || slug
    const pageUrl = `/shop/${effectiveSlug}`
    const defaultCanonicalUrl = `${baseUrl}${pageUrl}`
    const canonicalUrl = seoData?.canonicalUrl || defaultCanonicalUrl

    const metaTitle = seoData?.metaTitle || group.name || 'Product Group'
    const metaDescription =
      seoData?.metaDescription ||
      `Browse products in ${group.name}. Find the best deals and quality products.`
    const keywords = seoData?.keywords || []
    const ogImage = seoData?.ogImage || ''

    const baseMetadata = buildPageMetadata(null, {
      title: metaTitle,
      description: metaDescription,
      keywords: Array.isArray(keywords) ? keywords : keywords ? [keywords] : undefined,
      image: ogImage,
      url: pageUrl,
      type: 'website'
    })

    return {
      ...baseMetadata,
      alternates: {
        ...baseMetadata.alternates,
        canonical: canonicalUrl
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

export default async function GroupProductsBySlugPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

  let group: any = null
  let products: any[] = []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const groupResponse = await fetch(`${baseApiUrl}/product-groups/slug/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (groupResponse.ok) {
      const groupResult = await groupResponse.json()
      group = groupResult.data
    }

    if (!group) {
      const product = await getPrivateProductBySlug(slug)

      if (product) {
        return (
          <Section variant='xl'>
            <Container>
              <ProductDetailsClient product={product} />
            </Container>
          </Section>
        )
      }

      notFound()
    }

    const productsResponse = await fetch(`${baseApiUrl}/products?groupId=${group.id}&limit=100`, {
      next: { revalidate: 3600 }
    })

    if (productsResponse.ok) {
      const productsResult = await productsResponse.json()
      products = productsResult.data?.products || []
    }
  } catch (error) {
    console.error('Error fetching group by slug:', error)
    notFound()
  }

  if (!group) {
    notFound()
  }

  const siteSettings = await getSiteConfig()
  const jsonLd = buildGroupJsonLd(group, products, siteSettings)

  return (
    <>
      <Script
        id='group-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GroupProductsClient group={group} products={products} />
    </>
  )
}
