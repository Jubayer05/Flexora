import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { PageSectionRenderer } from '@/components/frontend/page-sections/PageSectionRenderer'
import { getImgUrl } from '@/lib/get-image-url'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { buildPageJsonLd } from '@/lib/seo/jsonLd'
import { PageData } from '@/types/page'
import parse from 'html-react-parser'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Script from 'next/script'

// Enable ISR (Incremental Static Regeneration) - revalidate every hour
export const revalidate = 3600

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Try to fetch return policy page by slug
    const response = await fetch(`${baseApiUrl}/pages/return-policy`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const result = await response.json()
      const pageData: PageData = result.data

      return buildPageMetadata(null, {
        title: pageData?.seo?.metaTitle || pageData?.title || 'Return Policy',
        description: pageData?.seo?.metaDescription || pageData?.excerpt || pageData?.description || 'Our return and refund policy',
        keywords: pageData?.seo?.keywords,
        image: pageData?.thumbnail || pageData?.banner,
        url: '/return-policy',
        type: 'website'
      })
    }

    // Fallback: Try to get from settings
    const settingsResponse = await fetch(`${baseApiUrl}/settings/key/return_policy`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    if (settingsResponse.ok) {
      const settingsResult = await settingsResponse.json()
      const policyContent = settingsResult?.data?.value || ''

      return {
        title: 'Return Policy',
        description: 'Our return and refund policy',
        openGraph: {
          title: 'Return Policy',
          description: 'Our return and refund policy',
          url: '/return-policy'
        }
      }
    }
  } catch (error) {
    console.error('Error fetching return policy metadata:', error)
  }

  return {
    title: 'Return Policy',
    description: 'Our return and refund policy'
  }
}

export default async function ReturnPolicyPage() {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

  let pageData: PageData | null = null
  let policyContent: string | null = null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Try to fetch return policy page by slug
    const response = await fetch(`${baseApiUrl}/pages/return-policy`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const result = await response.json()
      pageData = result.data
    } else {
      // Fallback: Try to get from settings
      const settingsResponse = await fetch(`${baseApiUrl}/settings/key/return_policy`, {
        next: { revalidate: 3600 },
        signal: controller.signal
      })

      if (settingsResponse.ok) {
        const settingsResult = await settingsResponse.json()
        policyContent = settingsResult?.data?.value || null
      }
    }
  } catch (error) {
    console.error('Error fetching return policy:', error)
  }

  // Fetch site settings for JSON-LD
  let siteSettings = null
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

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
  }

  // Build JSON-LD if pageData exists
  const jsonLd = pageData ? buildPageJsonLd(pageData, siteSettings) : null

  // If we have pageData, render as a full page
  if (pageData && pageData.isActive) {
    return (
      <>
        {jsonLd && (
          <Script
            id='return-policy-schema'
            type='application/ld+json'
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
        {/* Banner Section */}
        <Section
          className='relative bg-cover bg-no-repeat bg-center'
          style={{
            backgroundImage: pageData.banner
              ? `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${getImgUrl(pageData.banner)})`
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

  // Fallback: Render simple policy content from settings
  if (policyContent) {
    return (
      <Section variant='xl'>
        <Container>
          <div className='max-w-4xl mx-auto'>
            <Typography variant='h2' as='h1' weight='semibold' className='mb-6'>
              Return Policy
            </Typography>
            <div className='dark:prose-invert max-w-none text-lg prose prose-lg'>
              {parse(policyContent)}
            </div>
          </div>
        </Container>
      </Section>
    )
  }

  // Default fallback content
  return (
    <Section variant='xl'>
      <Container>
        <div className='max-w-4xl mx-auto'>
          <Typography variant='h2' as='h1' weight='semibold' className='mb-6'>
            Return Policy
          </Typography>
          <div className='space-y-4 text-muted-foreground'>
            <Typography variant='body1'>
              Our return policy is currently being updated. Please contact our support team for
              assistance with returns or refunds.
            </Typography>
            <Typography variant='body1'>
              For questions about returns, refunds, or replacements, please reach out to our customer
              service team.
            </Typography>
          </div>
        </div>
      </Container>
    </Section>
  )
}








