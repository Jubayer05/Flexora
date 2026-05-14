'use client'

import TestimonialCard from '@/components/card/TestimonialCard'
import { cn } from '@/lib/utils'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel'
import * as React from 'react'

type FeedbackItem = {
  name?: string
  designation?: string
  company?: string
  avatar?: string
  rating?: number
  feedback?: string
}

export default function TestimonialsCarousel({ feedbacks }: { feedbacks: FeedbackItem[] }) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [selected, setSelected] = React.useState(0)
  const [snapCount, setSnapCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) return

    const sync = () => {
      setSnapCount(api.scrollSnapList().length)
      setSelected(api.selectedScrollSnap())
    }

    sync()
    api.on('reInit', sync)
    api.on('select', sync)

    return () => {
      api.off('reInit', sync)
      api.off('select', sync)
    }
  }, [api])

  return (
    <div className='relative min-w-0'>
      <div className='pointer-events-none absolute left-0 top-0 bottom-0 z-1 hidden w-12 bg-linear-to-r from-background to-transparent lg:block xl:w-16' />
      <div className='pointer-events-none absolute right-0 top-0 bottom-0 z-1 hidden w-12 bg-linear-to-l from-background to-transparent lg:block xl:w-16' />

      <Carousel
        className='w-full min-w-0'
        opts={{ align: 'start', loop: true, dragFree: false }}
        setApi={setApi}
      >
        <CarouselContent className='-ml-3 py-4 md:-ml-4'>
          {feedbacks.map((item, index) => (
            <CarouselItem
              key={index}
              className='basis-full pl-3 sm:basis-1/2 sm:pl-4 xl:basis-1/3'
            >
              <div className='h-full min-w-0'>
                <TestimonialCard
                  item={{
                    name: item?.name,
                    designation: item?.designation,
                    company: item?.company,
                    avatar: item?.avatar,
                    rating: item?.rating,
                    review: item?.feedback
                  }}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className='max-lg:hidden! lg:flex! lg:left-3! lg:right-auto! lg:top-1/2! lg:-translate-y-1/2! lg:z-30 xl:left-4! border-border/60 bg-card/80 shadow-lg backdrop-blur-sm hover:border-primary/40 hover:bg-card' />
        <CarouselNext className='max-lg:hidden! lg:flex! lg:right-3! lg:left-auto! lg:top-1/2! lg:-translate-y-1/2! lg:z-30 xl:right-4! border-border/60 bg-card/80 shadow-lg backdrop-blur-sm hover:border-primary/40 hover:bg-card' />
      </Carousel>

      <div className='mt-2 flex justify-center gap-1.5 lg:hidden' aria-hidden={snapCount === 0}>
        {Array.from({ length: snapCount }).map((_, i) => (
          <button
            key={i}
            type='button'
            aria-label={`Go to testimonial ${i + 1} of ${snapCount}`}
            className={cn(
              'h-2 min-w-2 rounded-full transition-all duration-200',
              i === selected ? 'w-6 bg-primary' : 'bg-muted-foreground/35 hover:bg-muted-foreground/50'
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
