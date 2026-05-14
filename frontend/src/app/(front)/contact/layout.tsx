import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { PageData } from '@/types/page'
import { Metadata } from 'next'

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  try {
    const response = await fetch(`${baseApiUrl}/pages/contact`, {
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      return { title: 'Contact' }
    }

    const result = await response.json()
    const pageData: PageData = result.data

    return buildPageMetadata(null, {
      title: pageData?.seo?.metaTitle || pageData?.title,
      description: pageData?.seo?.metaDescription || pageData?.excerpt || pageData?.description,
      keywords: pageData?.seo?.keywords,
      image: pageData?.thumbnail || pageData?.banner,
      url: `/pages/${pageData?.slug}`,
      type: 'website'
    })
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Page'
    }
  }
}

export default function FaqPageLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
