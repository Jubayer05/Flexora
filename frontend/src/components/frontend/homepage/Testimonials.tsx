import { fetchOnServer } from '@/action/data'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { MessageSquareQuote } from 'lucide-react'
import TestimonialsCarousel from './TestimonialsCarousel'

export default async function Testimonials({ data }: { data: any }) {
  const feedbackData = await fetchOnServer('/feedbacks?page=1&limit=12')
  const feedbacks = feedbackData?.data?.feedbacks

  if (!feedbacks || feedbacks.length === 0) return null

  return (
    <Section variant='xl' className='relative overflow-hidden'>
      {/* Ambient background — pure CSS, no client JS needed */}
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-primary/7 blur-[100px]' />
        <div className='absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-violet-500/5 blur-[90px]' />
        <div
          className='absolute inset-0 opacity-[0.018]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      <Container>
        {/* Top accent line */}
        <div className='mb-12 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent' />

        {/* Header */}
        <div className='mb-8 flex flex-col items-center gap-3 text-center sm:mb-12 sm:gap-4'>
          {data?.subTitle && (
            <div className='inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary sm:px-5 sm:py-2 sm:text-sm'>
              <span className='h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary' />
              <MessageSquareQuote className='size-3.5 shrink-0' />
              <span className='text-balance'>{data.subTitle}</span>
            </div>
          )}

          {data?.title && (
            <h2 className='max-w-2xl bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl'>
              {data.title}
            </h2>
          )}

          {data?.desc && (
            <p className='mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base'>
              {data.desc}
            </p>
          )}
        </div>

        <div className='-mx-4 min-w-0 px-4 sm:mx-0 sm:px-0'>
          <TestimonialsCarousel feedbacks={feedbacks} />
        </div>
      </Container>
    </Section>
  )
}
