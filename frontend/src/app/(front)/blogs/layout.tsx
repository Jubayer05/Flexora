import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { buildPageMetadata } from '@/lib/seo/metaBuilders'
import { PageData } from '@/types/page'
import { Metadata } from 'next'

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const baseApiUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''

  try {
    const response = await fetch(`${baseApiUrl}/pages/blogs`, {
      next: { revalidate: 3600 }
    })

    const result = await response.json()
    const pageData: PageData | null = result?.data ?? null

    return buildPageMetadata(null, {
      title: pageData?.seo?.metaTitle || pageData?.title || 'Blog',
      description: pageData?.seo?.metaDescription || pageData?.excerpt || pageData?.description,
      keywords: pageData?.seo?.keywords,
      image: pageData?.thumbnail || pageData?.banner,
      url: `/blogs`,
      type: 'website'
    })
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Blog | UHQ Accounts'
    }
  }
}

export default async function BlogLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Section>
      <Container>
        <div className='flex flex-col gap-8'>
          {/* <PageBreadcrumb title={'Blogs'} /> */}

          {/* Container Section */}
          <div className='w-full'>{children}</div>
        </div>
      </Container>
    </Section>
  )
}
