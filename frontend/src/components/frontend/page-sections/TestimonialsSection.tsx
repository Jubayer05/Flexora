'use client'
import TestimonialCard from '@/components/card/TestimonialCard'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SectionHeader } from './SectionHeader'

interface TestimonialsSectionProps {
  heading?: string
  subheading?: string
  apiEndpoint?: string
  variant?: string
  limit?: number
  columns?: number
  layout?: 'grid' | 'carousel'
}

export function TestimonialsSection({
  heading,
  subheading,
  apiEndpoint,
  variant = 'default',
  limit = 8,
  columns = 4
}: TestimonialsSectionProps) {
  const { data, loading } = useAsync<any>(() => apiEndpoint || null, true)
  // Extract testimonials from the API response
  // Assumes API structure: { data: { value: [...] } }
  const allTestimonials = data?.data?.feedbacks || []
  const testimonials = Array.isArray(allTestimonials) ? allTestimonials.slice(0, limit) : []

  return (
    <Section variant='xl' className='bg-muted/30'>
      <Container>
        <SectionHeader heading={heading} subheading={subheading} />

        {loading ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
            {Array.from({ length: limit }).map((_, idx) => (
              <div key={idx} className='space-y-4 bg-card p-6 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='rounded-full w-12 h-12' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='w-24 h-4' />
                    <Skeleton className='w-16 h-3' />
                  </div>
                </div>
                <Skeleton className='w-full h-20' />
              </div>
            ))}
          </div>
        ) : testimonials.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
            {testimonials.map((testimonial: any, idx: number) => (
              <TestimonialCard
                key={testimonial.id || idx}
                item={testimonial}
                variant={variant as any}
              />
            ))}
          </div>
        ) : (
          <div className='py-12 text-muted-foreground text-center'>No testimonials available</div>
        )}
      </Container>
    </Section>
  )
}
