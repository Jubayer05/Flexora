'use client'

import { buildBlogListingJsonLd } from '@/lib/seo/jsonLd'
import Script from 'next/script'
import { useEffect, useState } from 'react'

type BlogListingJsonLdClientProps = {
  blogs?: Blog[]
}

export default function BlogListingJsonLdClient({ blogs = [] }: BlogListingJsonLdClientProps) {
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const [jsonLd, setJsonLd] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'
    
    // Fetch site settings
    fetch(`${apiUrl}/settings/key/system_site_settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data?.value) {
          setSiteSettings(data.data.value)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!loading) {
      // Always generate schema, even if no blogs (will still have Organization and CollectionPage)
      const ld = buildBlogListingJsonLd(blogs, siteSettings)
      setJsonLd(ld)
    }
  }, [blogs, siteSettings, loading])

  if (!jsonLd || loading) return null

  return (
    <Script
      id='blog-listing-structured-data'
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}



















