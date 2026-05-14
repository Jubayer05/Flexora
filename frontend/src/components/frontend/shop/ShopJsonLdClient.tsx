'use client'

import { buildShopJsonLd } from '@/lib/seo/jsonLd'
import type { Product } from '@/types/product'
import { useEffect, useRef, useState } from 'react'

type ShopJsonLdClientProps = {
  products?: Product[]
}

export default function ShopJsonLdClient({ products }: ShopJsonLdClientProps) {
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const [latestProducts, setLatestProducts] = useState<Product[]>([])
  const [jsonLd, setJsonLd] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'
    
    // Fetch 8 latest products for schema (sorted by createdAt desc)
    const fetchLatestProducts = fetch(
      `${apiUrl}/products?limit=8&sortBy=createdAt&sortOrder=desc&isActive=true`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data?.products) {
          // Get only the first 8 products
          return data.data.products.slice(0, 8)
        }
        return []
      })
      .catch(() => [])

    // Fetch site settings
    const fetchSiteSettings = fetch(`${apiUrl}/settings/key/system_site_settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data?.value) {
          return data.data.value
        }
        return null
      })
      .catch(() => null)

    // Wait for both to complete
    Promise.all([fetchLatestProducts, fetchSiteSettings]).then(
      ([products, settings]) => {
        setLatestProducts(products)
        setSiteSettings(settings)
        setLoading(false)
      }
    )
  }, [])

  useEffect(() => {
    if (!loading) {
      // Always generate schema, even if no products (will still have Organization and CollectionPage)
      // Ensure products have required fields for type safety
      const validProducts: Product[] = latestProducts.map((p) => ({
        ...p,
        _count: p._count || { accounts: 0 }
      }))
      const ld = buildShopJsonLd(validProducts, siteSettings)
      setJsonLd(ld)
    }
  }, [latestProducts, siteSettings, loading])

  // Update script content when jsonLd changes, avoiding DOM manipulation errors
  useEffect(() => {
    if (!jsonLd || loading) return

    // Remove existing script if it exists
    const existingScript = document.getElementById('shop-structured-data')
    if (existingScript) {
      existingScript.remove()
    }

    // Create new script element
    const script = document.createElement('script')
    script.id = 'shop-structured-data'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
    scriptRef.current = script

    // Cleanup function
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.remove()
      }
    }
  }, [jsonLd, loading])

  // Don't render anything - script is injected via useEffect
  return null
}

