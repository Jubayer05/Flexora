import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import ShopStructuredData from '@/components/frontend/shop/ShopStructuredData'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { PageData } from '@/types/page'
import { Metadata } from 'next'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flexora.com'

  try {
    const [seoSettingsResponse, pageResponse] = await Promise.allSettled([
      fetch(`${baseApiUrl}/settings/key/shop_seo_settings`, { next: { revalidate: 3600 } }),
      fetch(`${baseApiUrl}/pages/shop`, { next: { revalidate: 3600 } })
    ])

    let seoData: any = null
    let pageData: PageData | null = null

    if (seoSettingsResponse.status === 'fulfilled' && seoSettingsResponse.value.ok) {
      const seoResult = await seoSettingsResponse.value.json()
      seoData = seoResult?.data?.value || null
    }

    if (pageResponse.status === 'fulfilled' && pageResponse.value.ok) {
      const pageResult = await pageResponse.value.json()
      pageData = pageResult.data
    }

    const metaTitle =
      seoData?.metaTitle || pageData?.seo?.metaTitle || pageData?.title || 'Shop - UHQ Accounts'
    const metaDescription =
      seoData?.metaDescription ||
      pageData?.seo?.metaDescription ||
      pageData?.excerpt ||
      pageData?.description ||
      'Browse verified Telegram groups and channels, available for instant transfer.'
    const keywords = seoData?.keywords || pageData?.seo?.keywords || []
    const ogImage = seoData?.ogImage || pageData?.thumbnail || pageData?.banner || ''
    const canonicalUrl = seoData?.canonicalUrl || `${baseUrl}/shop`
    const ogTitle = seoData?.ogTitle || metaTitle
    const ogDescription = seoData?.ogDescription || metaDescription
    const twitterCard = seoData?.twitterCard || 'summary_large_image'
    const twitterTitle = seoData?.twitterTitle || metaTitle
    const twitterDescription = seoData?.twitterDescription || metaDescription

    const baseMetadata = buildPageMetadata(null, {
      title: metaTitle,
      description: metaDescription,
      keywords: Array.isArray(keywords) ? keywords : keywords ? [keywords] : undefined,
      image: ogImage,
      url: '/shop',
      type: 'website'
    })

    return {
      ...baseMetadata,
      alternates: { ...baseMetadata.alternates, canonical: canonicalUrl },
      openGraph: {
        ...baseMetadata.openGraph,
        title: ogTitle,
        description: ogDescription,
        url: canonicalUrl,
        siteName: seoData?.ogSiteName || 'UHQ Accounts',
        images: ogImage
          ? [
              {
                url: ogImage.startsWith('http') ? ogImage : `${baseApiUrl}${ogImage}`,
                width: seoData?.ogImageWidth || 1200,
                height: seoData?.ogImageHeight || 630,
                alt: seoData?.ogImageAlt || ogTitle,
                type: 'image/jpeg'
              }
            ]
          : baseMetadata.openGraph?.images || []
      },
      twitter: {
        ...baseMetadata.twitter,
        card: twitterCard as 'summary' | 'summary_large_image',
        title: twitterTitle,
        description: twitterDescription,
        images: ogImage
          ? [ogImage.startsWith('http') ? ogImage : `${baseApiUrl}${ogImage}`]
          : baseMetadata.twitter?.images || []
      },
      robots: {
        index: seoData?.robotsIndex !== false,
        follow: seoData?.robotsFollow !== false,
        googleBot: {
          index: seoData?.robotsIndex !== false,
          follow: seoData?.robotsFollow !== false,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Shop - UHQ Accounts',
      description: 'Browse verified Telegram groups and channels, available for instant transfer.'
    }
  }
}

export default async function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .sl-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }

        /* ── Breadcrumb banner ── */
        .sl-breadcrumb-wrap {
          position: relative;
          border-radius: 20px;
          padding: 24px 28px;
          overflow: hidden;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 16px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .sl-breadcrumb-wrap::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(110deg, rgba(129,140,248,0.50) 0%, rgba(167,139,250,0.22) 35%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        .sl-breadcrumb-title {
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(22px, 4vw, 30px);
          letter-spacing: -0.01em;
          line-height: 1.15;
          background: linear-gradient(90deg, rgba(235,235,255,0.98) 0%, rgba(167,139,250,0.90) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .sl-breadcrumb-desc {
          font-size: 13.5px;
          font-weight: 400;
          color: rgba(180,180,210,0.55);
          line-height: 1.6;
          max-width: 600px;
        }

        .sl-breadcrumb-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 3px 12px;
          border-radius: 999px;
          background: rgba(129,140,248,0.10);
          border: 1px solid rgba(129,140,248,0.20);
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #a78bfa;
          margin-bottom: 12px;
        }
        .sl-breadcrumb-eyebrow-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 6px rgba(129,140,248,0.70);
        }
      `}</style>

      <ShopStructuredData />

      <Section>
        <Container>
          <div className='sl-root flex flex-col gap-8'>
            {/* ── Breadcrumb banner ── */}
            <div className='sl-breadcrumb-wrap'>
              {/* Ambient radials */}
              <div
                className='pointer-events-none absolute inset-0'
                style={{
                  background:
                    'radial-gradient(700px 200px at 0% 0%, rgba(99,102,241,0.11), transparent 55%), radial-gradient(500px 220px at 100% 100%, rgba(167,139,250,0.07), transparent 55%)'
                }}
              />

              <div className='relative'>
                {/* Eyebrow pill */}
                <div className='sl-breadcrumb-eyebrow'>
                  <span className='sl-breadcrumb-eyebrow-dot' />
                  Shop
                </div>

                {/* Title */}
                <h1 className='sl-breadcrumb-title'>Browse the Store</h1>

                {/* Description */}
                <p className='sl-breadcrumb-desc'>
                  Browse verified Telegram groups and channels, available for instant transfer.
                  Choose the right community for growth, marketing, or automation — safe and ready
                  for ownership change.
                </p>
              </div>
            </div>

            {/* ── Page content ── */}
            {children}
          </div>
        </Container>
      </Section>
    </>
  )
}
