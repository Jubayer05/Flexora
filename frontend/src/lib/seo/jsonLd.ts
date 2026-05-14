import { PageData } from '@/types/page'
import type { Product } from '@/types/product'
import { SiteSettings } from '@/lib/validations/schemas/siteSettings'
import { getImgUrl } from '@/lib/get-image-url'
import { getSeoSiteUrl, toAbsoluteSeoMediaUrl, toAbsoluteSeoUrl } from './url'

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  if (!pathOrUrl) return pathOrUrl
  if (pathOrUrl.startsWith('/files')) return toAbsoluteSeoMediaUrl(pathOrUrl)
  return toAbsoluteSeoUrl(pathOrUrl, siteUrl)
}

export function buildPageJsonLd(pageData: PageData, siteSettings: SiteSettings | null = null) {
  const siteUrl = getSeoSiteUrl()
  const pageSlug = pageData.slug === 'home' ? '' : `/pages/${pageData.slug}`
  const pageUrl = `${siteUrl}${pageSlug}`

  const img = pageData.thumbnail || pageData.banner
  const imgUrl =
    img && typeof getImgUrl(img) === 'string' ? toAbsoluteUrl(getImgUrl(img) as string, siteUrl) : undefined

  const title = pageData?.seo?.metaTitle || pageData.title
  const description =
    pageData?.seo?.metaDescription || pageData.excerpt || pageData.description || ''

  // Use dynamic Organization schema
  const organization = buildOrganizationJsonLd(siteSettings)

  // Use dynamic BreadcrumbList schema
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: pageData.title || 'Page', url: pageUrl }
  ])

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      // Website Schema
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: siteSettings?.name || siteSettings?.seo?.metaName || process.env.NEXT_PUBLIC_SITE_NAME || 'UHQ Accounts',
        publisher: { '@id': `${siteUrl}#organization` }
      },
      // WebPage Schema
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${siteUrl}#website` },
        ...(imgUrl
          ? {
            primaryImageOfPage: {
              '@type': 'ImageObject',
              url: imgUrl
            }
          }
          : {})
      },
      breadcrumb
    ]
  }
}

/**
 * Build Organization Schema from Site Settings
 * This is dynamic and can be updated from admin side via system_site_settings
 */
export function buildOrganizationJsonLd(siteSettings: SiteSettings | null) {
  const siteUrl = getSeoSiteUrl()

  if (!siteSettings) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'UHQ Accounts',
      url: siteUrl
    }
  }

  const logoUrl = siteSettings.logo?.default
    ? toAbsoluteUrl(siteSettings.logo.default, siteUrl)
    : undefined

  const socialLinks = siteSettings.socialLinks
    ? Object.values(siteSettings.socialLinks).filter((url) => url && url !== '')
    : []

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: siteSettings.name || siteSettings.seo?.metaName || 'UHQ Accounts',
    url: siteUrl,
    logo: logoUrl
      ? {
        '@type': 'ImageObject',
        url: logoUrl,
        width: 512,
        height: 512
      }
      : undefined,
    description: siteSettings.shortDescription || siteSettings.seo?.metaDescription,
    email: siteSettings.email,
    telephone: siteSettings.phone,
    address: siteSettings.address
      ? {
        '@type': 'PostalAddress',
        streetAddress: siteSettings.address
      }
      : undefined,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined
  }
}

/**
 * Build Blog Article Schema
 */
export function buildBlogJsonLd(blog: Blog, siteSettings: SiteSettings | null = null) {
  const siteUrl = getSeoSiteUrl()
  const blogUrl = `${siteUrl}/blogs/${blog.slug}`

  const thumbnailUrl = blog.thumbnail
    ? toAbsoluteUrl(blog.thumbnail, siteUrl)
    : undefined

  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toISOString()
    : blog.createdAt
      ? new Date(blog.createdAt).toISOString()
      : undefined

  const modifiedDate = blog.updatedAt ? new Date(blog.updatedAt).toISOString() : publishedDate

  // Build breadcrumb
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Blogs', url: `${siteUrl}/blogs` },
    { name: blog.category?.name || 'Blog', url: blog.category ? `${siteUrl}/blogs?category=${blog.category.slug}` : `${siteUrl}/blogs` },
    { name: blog.title, url: blogUrl }
  ])

  // Build organization reference
  const organization = buildOrganizationJsonLd(siteSettings)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'BlogPosting',
        '@id': `${blogUrl}#blogpost`,
        headline: blog.title,
        description: blog.excerpt || blog.content?.substring(0, 200) || '',
        image: thumbnailUrl
          ? {
            '@type': 'ImageObject',
            url: thumbnailUrl,
            width: 1200,
            height: 630
          }
          : undefined,
        datePublished: publishedDate,
        dateModified: modifiedDate,
        author: blog.author
          ? {
            '@type': 'Person',
            name: blog.author.username || blog.author.email || 'Admin',
            ...(blog.author.email ? { email: blog.author.email } : {})
          }
          : {
            '@type': 'Organization',
            name: organization.name
          },
        publisher: {
          '@id': `${siteUrl}#organization`
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': blogUrl
        },
        articleSection: blog.category?.name,
        keywords: blog.tags?.join(', ') || blog.category?.name,
        wordCount: blog.content ? blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length : undefined,
        inLanguage: 'en-US',
        url: blogUrl
      },
      breadcrumb
    ]
  }
}

/**
 * Build Product Schema
 */
export function buildProductJsonLd(product: Product, siteSettings: SiteSettings | null = null) {
  const siteUrl = getSeoSiteUrl()
  // Use slug if available, otherwise fallback to ID
  const productUrl = product.slug
    ? `${siteUrl}/product/${product.slug}`
    : `${siteUrl}/product/${product.id}`
  const imageUrl = product.thumbnail
    ? toAbsoluteUrl(product.thumbnail, siteUrl)
    : product.images && product.images.length > 0
      ? toAbsoluteUrl(product.images[0], siteUrl)
      : undefined

  const images = product.images && product.images.length > 0
    ? product.images.map((img) => toAbsoluteUrl(img, siteUrl))
    : imageUrl
      ? [imageUrl]
      : []

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0
  const originalPrice = product.originalPrice
    ? typeof product.originalPrice === 'string'
      ? parseFloat(product.originalPrice)
      : product.originalPrice
    : undefined

  const availability = product.stockCount > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock'

  // Build breadcrumb
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Shop', url: `${siteUrl}/shop` },
    ...(product.category ? [{ name: product.category.name, url: `${siteUrl}/shop` }] : []),
    { name: product.name, url: productUrl }
  ])

  // Build organization reference
  const organization = buildOrganizationJsonLd(siteSettings)

  // Aggregate rating if available (from reviews/feedback)
  const ratingValue = product.meta?.rating
  const reviewCount = product.meta?.reviewCount

  const aggregateRating =
    typeof ratingValue === 'number'
      ? {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount: typeof reviewCount === 'number' ? reviewCount : 0,
        bestRating: 5,
        worstRating: 1
      }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        description: product.description || product.seo?.description || '',
        image: images,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: organization.name
        },
        category: product.category?.name,
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'USD',
          price: price.toString(),
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
          availability: availability,
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@id': `${siteUrl}#organization`
          },
          ...(originalPrice && originalPrice > price
            ? {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: price.toString(),
                priceCurrency: 'USD',
                referenceQuantity: {
                  '@type': 'QuantitativeValue',
                  value: 1,
                  unitCode: 'C62' // unit
                }
              }
            }
            : {})
        },
        ...(aggregateRating ? { aggregateRating } : {}),
        manufacturer: {
          '@id': `${siteUrl}#organization`
        }
      },
      breadcrumb
    ]
  }
}

/**
 * Build BreadcrumbList Schema
 */
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }
}

/**
 * Build Review/Rating Schema
 */
export function buildReviewJsonLd(
  review: {
    author: string
    rating: number
    reviewBody?: string
    datePublished?: string
  },
  itemReviewed: {
    type: 'Product' | 'Blog' | 'Organization'
    name: string
    url: string
  }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: review.author
    },
    datePublished: review.datePublished || new Date().toISOString(),
    reviewBody: review.reviewBody,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1
    },
    itemReviewed: {
      '@type': itemReviewed.type,
      name: itemReviewed.name,
      url: itemReviewed.url
    }
  }
}

/**
 * Build Shop/CollectionPage Schema with Products
 */
export function buildShopJsonLd(
  products: Product[],
  siteSettings: SiteSettings | null = null,
  breadcrumbItems: { name: string; url: string }[] = []
) {
  const siteUrl = getSeoSiteUrl()
  const shopUrl = `${siteUrl}/shop`

  const organization = buildOrganizationJsonLd(siteSettings)

  const breadcrumb = breadcrumbItems.length > 0
    ? buildBreadcrumbJsonLd(breadcrumbItems)
    : buildBreadcrumbJsonLd([
      { name: 'Home', url: siteUrl },
      { name: 'Shop', url: shopUrl }
    ])

  const productList = products
    .filter((product) => product && product.id) // Filter out invalid products
    .slice(0, 8) // Ensure only 8 products max
    .map((product, index) => {
      // Use slug if available, otherwise fallback to ID
      const productUrl = product.slug
        ? `${siteUrl}/product/${product.slug}`
        : `${siteUrl}/product/${product.id}`
      const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0

      // Get image URL - handle both thumbnail and images array
      let imageUrl: string | undefined
      if (product.thumbnail) {
        imageUrl = toAbsoluteUrl(product.thumbnail, siteUrl)
      } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        imageUrl = toAbsoluteUrl(product.images[0], siteUrl)
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name || 'Product',
          url: productUrl,
          ...(imageUrl ? { image: imageUrl } : {}),
          offers: {
            '@type': 'Offer',
            price: price.toString(),
            priceCurrency: 'USD',
            availability:
              product.stockCount > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock'
          }
        }
      }
    })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'CollectionPage',
        '@id': `${shopUrl}#webpage`,
        url: shopUrl,
        name: 'Shop - UHQ Accounts',
        description: 'Browse our collection of high-quality accounts and services',
        isPartOf: {
          '@id': `${siteUrl}#website`
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: productList.length,
          itemListElement: productList.length > 0 ? productList : undefined
        }
      },
      breadcrumb
    ]
  }
}

/**
 * Build Product Group/CollectionPage Schema with Products
 */
export function buildGroupJsonLd(
  group: any,
  products: Product[],
  siteSettings: SiteSettings | null = null
) {
  const siteUrl = getSeoSiteUrl()
  const fallbackSlug =
    typeof group?.name === 'string'
      ? group.name
          .trim()
          .replace(/[^A-Za-z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('')
      : ''
  const groupUrl = `${siteUrl}/shop/${group?.slug || fallbackSlug || group?.id}`

  const organization = buildOrganizationJsonLd(siteSettings)

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Shop', url: `${siteUrl}/shop` },
    { name: group.name, url: groupUrl }
  ])

  const productList = products
    .filter((product) => product && product.id)
    .slice(0, 8)
    .map((product, index) => {
      const productUrl = product.slug
        ? `${siteUrl}/product/${product.slug}`
        : `${siteUrl}/product/${product.id}`
      const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0

      let imageUrl: string | undefined
      if (product.thumbnail) {
        imageUrl = toAbsoluteUrl(product.thumbnail, siteUrl)
      } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        imageUrl = toAbsoluteUrl(product.images[0], siteUrl)
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name || 'Product',
          url: productUrl,
          ...(imageUrl ? { image: imageUrl } : {}),
          offers: {
            '@type': 'Offer',
            price: price.toString(),
            priceCurrency: 'USD',
            availability:
              product.stockCount > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock'
          }
        }
      }
    })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'CollectionPage',
        '@id': `${groupUrl}#webpage`,
        url: groupUrl,
        name: group.name || 'Product Group',
        description: group.seo?.metaDescription || `Browse products in ${group.name}`,
        isPartOf: {
          '@id': `${siteUrl}#website`
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: productList.length,
          itemListElement: productList.length > 0 ? productList : undefined
        }
      },
      breadcrumb
    ]
  }
}

/**
 * Build Blog Listing Page Schema
 */
export function buildBlogListingJsonLd(
  blogs: Blog[],
  siteSettings: SiteSettings | null = null
) {
  const siteUrl = getSeoSiteUrl()
  const blogsUrl = `${siteUrl}/blogs`

  const organization = buildOrganizationJsonLd(siteSettings)

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Blogs', url: blogsUrl }
  ])

  // Build blog list items (limit to first 10 for schema)
  const blogList = blogs
    .filter((blog) => blog && blog.slug)
    .slice(0, 10)
    .map((blog, index) => {
      const blogUrl = `${siteUrl}/blogs/${blog.slug}`

      // Get image URL
      let imageUrl: string | undefined
      if (blog.thumbnail) {
        imageUrl = toAbsoluteUrl(blog.thumbnail, siteUrl)
      } else if (blog.gallery && Array.isArray(blog.gallery) && blog.gallery.length > 0) {
        imageUrl = toAbsoluteUrl(blog.gallery[0], siteUrl)
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          '@id': `${blogUrl}#blogposting`,
          headline: blog.title || 'Blog Post',
          url: blogUrl,
          ...(imageUrl ? { image: { '@type': 'ImageObject', url: imageUrl } } : {}),
          datePublished: blog.publishedAt || blog.createdAt,
          dateModified: blog.updatedAt,
          author: blog.author
            ? {
              '@type': 'Person',
              name: blog.author.username || blog.author.email || 'Admin'
            }
            : {
              '@type': 'Organization',
              name: organization.name
            }
        }
      }
    })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: siteSettings?.name || siteSettings?.seo?.metaName || process.env.NEXT_PUBLIC_SITE_NAME || 'UHQ Accounts',
        publisher: { '@id': `${siteUrl}#organization` }
      },
      {
        '@type': 'CollectionPage',
        '@id': `${blogsUrl}#webpage`,
        url: blogsUrl,
        name: 'Blogs - UHQ Accounts',
        description: 'Browse our latest blog posts and articles',
        isPartOf: {
          '@id': `${siteUrl}#website`
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: blogList.length,
          itemListElement: blogList.length > 0 ? blogList : undefined
        }
      },
      breadcrumb
    ]
  }
}
