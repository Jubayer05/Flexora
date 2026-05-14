import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { PageSection } from '@/types/page'
import parse from 'html-react-parser'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { CategoriesSection } from './CategoriesSection'
import { ProductsSection } from './ProductsSection'
import { SectionHeader } from './SectionHeader'
import { TestimonialsSection } from './TestimonialsSection'

// Helper to get icon component
const getIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName] || Icons.Box
  return IconComponent
}

// Helper to extract YouTube video ID
const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

export function PageSectionRenderer({ section, index }: { section: PageSection; index: number }) {
  // Hero Section
  if (section.type === 'hero') {
    return (
      <Section key={index} variant='lg' className='bg-muted/30'>
        <Container>
          <div className='mx-auto max-w-4xl text-center'>
            <SectionHeader heading={section.heading} subheading={section.subheading} />
            {section.content && (
              <div className='dark:prose-invert mx-auto max-w-none prose prose-lg'>
                {parse(section.content || '')}
              </div>
            )}
          </div>
        </Container>
      </Section>
    )
  }

  // Image Section (with or without content)
  if (section.type === 'image') {
    const hasContent = section.content && section.content.trim() !== '<p><br></p>'
    const imageUrl = section.image || '/images/placeholder.jpg'

    return (
      <Section key={index} variant='xl'>
        <Container>
          {hasContent ? (
            <div className='items-center gap-8 lg:gap-12 grid grid-cols-1 lg:grid-cols-2'>
              <div className='relative rounded-lg aspect-square overflow-hidden'>
                <CustomImage
                  src={imageUrl}
                  alt={section.heading || 'Section image'}
                  fill
                  className='object-cover'
                />
              </div>
              <div>
                <SectionHeader
                  heading={section.heading}
                  subheading={section.subheading}
                  className='mb-6 text-left'
                />
                <div className='dark:prose-invert max-w-none prose prose-lg'>
                  {parse(section.content || '')}
                </div>
              </div>
            </div>
          ) : (
            <div className='mx-auto max-w-5xl'>
              <SectionHeader heading={section.heading} subheading={section.subheading} />
              <div className='relative rounded-lg aspect-video overflow-hidden'>
                <CustomImage
                  src={imageUrl}
                  alt={section.heading || 'Section image'}
                  fill
                  className='object-cover'
                />
              </div>
            </div>
          )}
        </Container>
      </Section>
    )
  }

  // Text Section
  if (section.type === 'text') {
    return (
      <Section key={index} variant='lg'>
        <Container>
          <div className='mx-auto max-w-4xl'>
            <SectionHeader heading={section.heading} subheading={section.subheading} />
            {section.content && (
              <div className='dark:prose-invert max-w-none prose prose-lg'>
                {parse(section.content || '')}
              </div>
            )}
          </div>
        </Container>
      </Section>
    )
  }

  // Video Section
  if (section.type === 'video') {
    const hasContent = section.content && section.content.trim() !== '<p><br></p>'
    const videoId = section.video ? getYouTubeId(section.video) : null

    return (
      <Section key={index} variant='xl'>
        <Container>
          {hasContent ? (
            <div className='items-center gap-8 lg:gap-12 grid grid-cols-1 lg:grid-cols-2'>
              {videoId && (
                <div className='relative rounded-lg aspect-video overflow-hidden'>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={section.heading || 'Video'}
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                    className='absolute inset-0 w-full h-full'
                  />
                </div>
              )}
              <div>
                <SectionHeader
                  heading={section.heading}
                  subheading={section.subheading}
                  className='mb-6 text-left'
                />
                <div className='dark:prose-invert max-w-none prose prose-lg'>
                  {parse(section.content || '')}
                </div>
              </div>
            </div>
          ) : (
            <div className='mx-auto max-w-5xl'>
              <SectionHeader heading={section.heading} subheading={section.subheading} />
              {videoId && (
                <div className='relative rounded-lg aspect-video overflow-hidden'>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={section.heading || 'Video'}
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                    className='absolute inset-0 w-full h-full'
                  />
                </div>
              )}
            </div>
          )}
        </Container>
      </Section>
    )
  }

  // CTA Section
  if (section.type === 'cta') {
    return (
      <Section key={index} variant='lg' className='bg-primary/5'>
        <Container>
          <div className='mx-auto max-w-4xl text-center'>
            <SectionHeader heading={section.heading} subheading={section.subheading} />
            {section.content && (
              <div className='dark:prose-invert mx-auto mb-8 max-w-none prose prose-lg'>
                {parse(section.content || '')}
              </div>
            )}
            {section.buttonText && section.buttonLink && (
              <Button asChild size='lg'>
                <Link href={section.buttonLink}>{section.buttonText}</Link>
              </Button>
            )}
          </div>
        </Container>
      </Section>
    )
  }

  // Features Section
  if (section.type === 'features') {
    return (
      <Section key={index} variant='xl'>
        <Container>
          <SectionHeader heading={section.heading} subheading={section.subheading} />
          {section.items && section.items.length > 0 && (
            <div className='gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
              {section.items.map((item, idx) => {
                const IconComponent = getIcon(item.icon)
                return (
                  <div
                    key={idx}
                    className='flex flex-col items-center bg-card p-6 border rounded-lg text-center'
                  >
                    <div className='flex justify-center items-center bg-primary/10 mb-4 rounded-full w-12 h-12'>
                      <IconComponent className='w-6 h-6 text-primary' />
                    </div>
                    <Typography variant='h5' weight='semibold' className='mb-2'>
                      {item.title}
                    </Typography>
                    <Typography variant='body2' className='text-muted-foreground'>
                      {item.description}
                    </Typography>
                  </div>
                )
              })}
            </div>
          )}
        </Container>
      </Section>
    )
  }

  // Products Section - Lazy load
  if (section.type === 'products') {
    return (
      <ProductsSection
        key={index}
        heading={section.heading}
        subheading={section.subheading}
        apiEndpoint={section.apiEndpoint}
        dataPath={section.dataPath}
        variant={section.variant}
        limit={section.limit}
        columns={section.columns}
        layout={section.layout}
      />
    )
  }

  // Testimonial Section - Lazy load
  if (section.type === 'testimonial') {
    return (
      <TestimonialsSection
        key={index}
        heading={section.heading}
        subheading={section.subheading}
        apiEndpoint={section.apiEndpoint}
        variant={section.variant}
        limit={section.limit}
        columns={section.columns}
        layout={section.layout}
      />
    )
  }

  // Categories Section - Lazy load
  if (section.type === 'categories') {
    return (
      <CategoriesSection
        key={index}
        heading={section.heading}
        subheading={section.subheading}
        apiEndpoint={section.apiEndpoint}
        dataPath={section.dataPath}
        variant={section.variant}
        limit={section.limit}
        columns={section.columns}
        layout={section.layout}
      />
    )
  }

  return null
}
