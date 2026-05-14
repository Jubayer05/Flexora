import { fetchOnServer, getSiteConfig } from '@/action/data'
import BlogDetails from '@/components/frontend/blog/blog-details'
import { buildBlogMetadata } from '@/lib/seo/metaBuilders'
import { buildBlogJsonLd } from '@/lib/seo/jsonLd'
import { Metadata } from 'next'
import Script from 'next/script'

type TProps = {
  params: Params<'blogSlug'>
}

export async function generateMetadata({ params }: TProps): Promise<Metadata> {
  const pageParams = await params
  const data = await fetchOnServer(`/blogs/slug/${pageParams?.blogSlug}`)
  return buildBlogMetadata(data?.data)
}

export default async function BlogDetailsPage({ params }: TProps) {
  const pageParams = await params
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  // Fetch blog data and site settings for JSON-LD
  const [blogResponse, siteSettings] = await Promise.all([
    fetch(`${baseApiUrl}/blogs/slug/${pageParams?.blogSlug}`, {
      next: { revalidate: 3600 }
    }).then((res) => res.json()),
    getSiteConfig()
  ])

  const blog: Blog = blogResponse?.data
  const jsonLd = blog ? buildBlogJsonLd(blog, siteSettings) : null

  return (
    <>
      {jsonLd && (
        <Script
          id='blog-structured-data'
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BlogDetails />
    </>
  )
}
