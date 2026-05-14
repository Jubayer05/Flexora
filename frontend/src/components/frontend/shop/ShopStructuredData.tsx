import { fetchOnServer, getSiteConfig } from '@/action/data'
import { buildShopJsonLd } from '@/lib/seo/jsonLd'
import type { Product } from '@/types/product'

type ShopStructuredDataProps = {
  products?: Product[]
}

/**
 * Server component that fetches latest products and generates JSON-LD schema
 * Uses ISR (Incremental Static Regeneration) to cache data at build time
 */
export default async function ShopStructuredData({ products }: ShopStructuredDataProps) {
  // If products are provided as props, use them; otherwise fetch latest 8 products
  let latestProducts: Product[] = products || []

  if (!products || products.length === 0) {
    try {
      // Fetch 8 latest products for schema (sorted by createdAt desc)
      // Using ISR with 3600s (1 hour) revalidation
      // fetchOnServer returns the API response directly: { success: true, data: { products: [], pagination: {} } }
      const productsData = await fetchOnServer<{
        success: boolean
        data: {
          products: Product[]
          pagination: any
        }
      }>(
        '/products?limit=8&sortBy=createdAt&sortOrder=desc&isActive=true',
        3600 // Revalidate every hour
      )

      // productsData.data is the API response object: { success: true, data: { products: [], pagination: {} } }
      if (productsData?.data?.data?.products) {
        latestProducts = productsData.data.data.products.slice(0, 8)
      }
    } catch (error) {
      console.error('Error fetching products for shop schema:', error)
      // Continue with empty array - schema will still work with Organization and CollectionPage
    }
  }

  // Fetch site settings (cached for 1 hour)
  const siteSettings = await getSiteConfig()

  // Generate JSON-LD schema
  const jsonLd = buildShopJsonLd(latestProducts, siteSettings)

  // Use regular script tag instead of Next.js Script component to avoid DOM manipulation issues
  // when component re-renders or is used in multiple places
  return (
    <script
      id='shop-structured-data'
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}




