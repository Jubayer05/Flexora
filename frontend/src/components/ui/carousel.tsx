'use client'

import { cn } from '@/lib/utils'
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import * as React from 'react'

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error('useCarousel must be used within a <Carousel />')
  return context
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === 'horizontal' ? 'x' : 'y' },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])
  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on('reInit', onSelect)
    api.on('select', onSelect)
    return () => {
      api?.off('select', onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role='region'
        aria-roledescription='carousel'
        data-slot='carousel'
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className='overflow-hidden' data-slot='carousel-content'>
      <div
        className={cn('flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', className)}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel()

  return (
    <div
      role='group'
      aria-roledescription='slide'
      data-slot='carousel-item'
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onClick'>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <>
      <style>{`
        .carousel-nav-btn {
          position: absolute;
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 8px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: rgba(200,200,230,0.70);
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.18s, box-shadow 0.18s;
          outline: none;
        }
        .carousel-nav-btn:hover:not(:disabled) {
          background: linear-gradient(160deg, rgba(129,140,248,0.18) 0%, rgba(167,139,250,0.10) 100%);
          border-color: rgba(167,139,250,0.30);
          color: #c4b5fd;
          box-shadow: 0 8px 28px rgba(0,0,0,0.34), 0 0 16px rgba(129,140,248,0.18), inset 0 1px 0 rgba(255,255,255,0.12);
          transform: scale(1.06);
        }
        .carousel-nav-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .carousel-nav-btn:focus-visible {
          box-shadow: 0 0 0 2px rgba(167,139,250,0.50);
        }
      `}</style>
      <button
        data-slot='carousel-previous'
        className={cn(
          'carousel-nav-btn',
          orientation === 'horizontal'
            ? 'top-1/2 -left-[46px] -translate-y-1/2'
            : '-top-[46px] left-1/2 -translate-x-1/2 rotate-90',
          className
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        aria-label='Previous slide'
        {...props}
      >
        <ArrowLeft size={15} strokeWidth={2.2} />
        <span className='sr-only'>Previous slide</span>
      </button>
    </>
  )
}

function CarouselNext({ className, ...props }: Omit<React.ComponentProps<'button'>, 'onClick'>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <button
      data-slot='carousel-next'
      className={cn(
        'carousel-nav-btn',
        orientation === 'horizontal'
          ? 'top-1/2 -right-[46px] -translate-y-1/2'
          : '-bottom-[46px] left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label='Next slide'
      {...props}
    >
      <ArrowRight size={15} strokeWidth={2.2} />
      <span className='sr-only'>Next slide</span>
    </button>
  )
}

export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi }
