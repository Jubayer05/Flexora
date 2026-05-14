import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { PageSectionRenderer } from '@/components/frontend/page-sections/PageSectionRenderer'
import { getImgUrl } from '@/lib/get-image-url'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { PageData } from '@/types/page'
import parse from 'html-react-parser'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildPageJsonLd } from '@/lib/seo/jsonLd'
import Script from 'next/script'
import { UrlTrackPageView } from '@/components/frontend/UrlTrackPageView'

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

    const response = await fetch(`${baseApiUrl}/pages/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { 
        title: 'Page Not Found',
        description: 'The requested page could not be found.'
      }
    }

    const result = await response.json()
    const pageData: PageData = result.data

    return buildPageMetadata(null, {
      title: pageData?.seo?.metaTitle || pageData?.title || 'Page',
      description: pageData?.seo?.metaDescription || pageData?.excerpt || pageData?.description || '',
      keywords: pageData?.seo?.keywords,
      image: pageData?.thumbnail || pageData?.banner,
      url: `/pages/${pageData?.slug || slug}`,
      type: 'website'
    })
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Page',
      description: 'Page content'
    }
  }
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
    
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  let pageData: PageData | null = null

  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${baseApiUrl}/pages/${slug}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      pageData = null
    } else {
      const result = await response.json()
      pageData = result.data
    }
  } catch (error) {
    console.error('Error fetching page:', error)
  }

  if (!pageData || !pageData.isActive) {
    notFound()
  }

  // Fetch site settings for dynamic Organization schema
  let siteSettings = null
  try {
    // Add timeout for faster failure in development
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const settingsResponse = await fetch(`${baseApiUrl}/settings/key/system_site_settings`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (settingsResponse.ok) {
      const settingsResult = await settingsResponse.json()
      siteSettings = settingsResult?.data?.value || null
    }
  } catch (error) {
    console.error('Error fetching site settings:', error)
    // Continue with null siteSettings - buildPageJsonLd handles this
  }
  
  // ✅ build JSON-LD AFTER pageData and siteSettings are available
  const jsonLd = buildPageJsonLd(pageData, siteSettings)
  
  return (
    <>
      <UrlTrackPageView slug={slug} />
      {/* Banner Section */}
       <Script
        id="page-schema"
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section
        className='relative bg-cover bg-no-repeat bg-center'
        style={{
          backgroundImage: pageData.banner
            ? `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${getImgUrl(
                pageData.banner
              )})`
            : "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url('/images/bg/breadcrumb.webp')"
        }}
      >
        <Container>
          <div className='py-2 md:py-6'>
            <Typography variant='h2' as='h1' weight='semibold' className='mb-4 text-white'>
              {pageData.title}
            </Typography>

            {pageData.subtitle && (
              <Typography variant='h4' as='h2' className='text-white/90 text-xl md:text-2xl'>
                {pageData.subtitle}
              </Typography>
            )}

            {pageData.excerpt && (
              <Typography variant='body1' className='mt-4 max-w-3xl text-white/80 text-lg'>
                {pageData.excerpt}
              </Typography>
            )}
          </div>
        </Container>
      </Section>

      {/* Main Description Section */}
      {pageData.description && (
        <Section variant='xl'>
          <Container>
            <div className='dark:prose-invert max-w-none text-lg prose prose-lg'>
              {parse(pageData.description)}
            </div>
          </Container>
        </Section>
      )}

      {/* Dynamic Content Sections */}
      {pageData.content?.sections && pageData.content.sections.length > 0 && (
        <>
          {pageData.content.sections.map((section, index) => (
            <PageSectionRenderer key={index} section={section} index={index} />
          ))}
        </>
      )}
    </>
  )
}
