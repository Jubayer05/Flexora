import { fetchOnServer, getAnalyticsId, getHomepageData } from '@/action/data'
import AboutUs from '@/components/frontend/homepage/AboutUs'
import Agencies from '@/components/frontend/homepage/Agencies'
import AvailablePlatforms from '@/components/frontend/homepage/AvailablePlatforms'
import Categories from '@/components/frontend/homepage/Categories'
import FaqSection from '@/components/frontend/homepage/Faq'
import HeroSection from '@/components/frontend/homepage/HeroSection'
import HowItWorks from '@/components/frontend/homepage/HowItWorks'
import Newsletter from '@/components/frontend/homepage/Newsletter'
import Offers from '@/components/frontend/homepage/Offers'
import TestimonialOne from '@/components/frontend/homepage/TestimonialOne'
import Testimonials from '@/components/frontend/homepage/Testimonials'
import WhyChoose from '@/components/frontend/homepage/WhyChoose'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { getSeoRootApiUrl, getSeoSiteUrl, toAbsoluteSeoMediaUrl } from '@/lib/seo/url'
import { PageData } from '@/types/page'
import { GoogleTagManager } from '@next/third-parties/google'
import { Metadata } from 'next'
import SubscriptionPackagesPage from './subscription/SubscriptionPackage'

// Force dynamic rendering - disable static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching, always fetch fresh data

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const baseApiUrl = getSeoRootApiUrl()
  const baseUrl = getSeoSiteUrl()

  try {
    // Fetch site-wide SEO settings from page-meta (system_site_settings)
    const [siteSettingsResponse, pageResponse] = await Promise.allSettled([
      fetch(`${baseApiUrl}/settings/key/system_site_settings`, {
        next: { revalidate: 3600 }
      }),
      fetch(`${baseApiUrl}/pages/home`, {
        next: { revalidate: 3600 }
      })
    ])

    let siteSettings: any = null
    let pageData: PageData | null = null

    // Parse site settings if available
    if (siteSettingsResponse.status === 'fulfilled' && siteSettingsResponse.value.ok) {
      const siteResult = await siteSettingsResponse.value.json()
      siteSettings = siteResult?.data?.value || null
    }

    // Parse page data if available (for fallback)
    if (pageResponse.status === 'fulfilled' && pageResponse.value.ok) {
      const pageResult = await pageResponse.value.json()
      pageData = pageResult.data
    }

    // Use site settings SEO as primary source, with page data as fallback
    const metaTitle =
      siteSettings?.seo?.metaTitle || pageData?.seo?.metaTitle || pageData?.title || 'UHQ Accounts'
    const metaDescription =
      siteSettings?.seo?.metaDescription ||
      pageData?.seo?.metaDescription ||
      pageData?.excerpt ||
      pageData?.description ||
      ''
    const keywords = siteSettings?.seo?.metaKeywords || pageData?.seo?.keywords || []
    const ogImage = siteSettings?.seo?.ogImage || pageData?.thumbnail || pageData?.banner || ''
    const canonicalUrl = siteSettings?.seo?.canonicalUrl || `${baseUrl}/`
    const ogTitle = siteSettings?.seo?.ogTitle || metaTitle
    const ogDescription = siteSettings?.seo?.ogDescription || metaDescription
    const siteAuthor = siteSettings?.seo?.siteAuthor

    // Build metadata using site settings as base
    const baseMetadata = buildPageMetadata(siteSettings, {
      title: metaTitle,
      description: metaDescription,
      keywords: Array.isArray(keywords) ? keywords : keywords ? [keywords] : undefined,
      image: ogImage,
      url: '/',
      type: 'website'
    })

    // Enhance with additional SEO fields
    return {
      ...baseMetadata,
      alternates: {
        ...baseMetadata.alternates,
        canonical: canonicalUrl
      },
      openGraph: {
        ...baseMetadata.openGraph,
        title: ogTitle,
        description: ogDescription,
        url: canonicalUrl,
        siteName: siteSettings?.seo?.metaName || siteSettings?.name || 'UHQ Accounts',
        images: ogImage
          ? [
              {
                url: toAbsoluteSeoMediaUrl(ogImage),
                width: 1200,
                height: 630,
                alt: ogTitle,
                type: 'image/jpeg'
              }
            ]
          : baseMetadata.openGraph?.images || []
      },
      twitter: {
        ...baseMetadata.twitter,
        title: ogTitle,
        description: ogDescription,
        images: ogImage ? [toAbsoluteSeoMediaUrl(ogImage)] : baseMetadata.twitter?.images || []
      },
      authors: siteAuthor ? [{ name: siteAuthor }] : baseMetadata.authors
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'UHQ Accounts'
    }
  }
}

export default async function HomePage() {
  // Await all data fetches
  const [homeData, homeFaqs, analyticsId, featuredCategories] = await Promise.all([
    getHomepageData(),
    fetchOnServer('/settings/key/homepage_faq', 300),
    getAnalyticsId(),
    fetchOnServer('/categories?isFeatured=true', 300)
  ])

  return (
    <>
      <GoogleTagManager gtmId={analyticsId?.googleAnalytics || ''} />
      <HeroSection data={homeData?.hero} />
      <TestimonialOne data={homeData?.gameChanger} />
      <Agencies data={homeData?.agency} />
      <WhyChoose data={homeData?.whyChoose} />
      <Offers data={homeData?.offers} />
      <AboutUs data={homeData?.about} />
      <Categories data={homeData?.categories} categories={featuredCategories} />
      <AvailablePlatforms data={homeData?.platform} />
      <SubscriptionPackagesPage />
      <Testimonials data={homeData?.feedback} />
      <HowItWorks data={homeData?.howToWorks} />
      <FaqSection data={homeFaqs} />
      <Newsletter data={homeData?.subscribe} />
    </>
  )
}
