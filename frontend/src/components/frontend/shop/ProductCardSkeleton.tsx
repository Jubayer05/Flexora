import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const productCardSkeletonVariants = cva(
  'group bg-foreground/80 shadow-primary/10 p-3 xl:p-4 border border-muted-foreground rounded-lg overflow-hidden',
  {
    variants: {
      variant: {
        default: 'space-y-4',
        compact: 'space-y-2'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const contentSkeletonVariants = cva('', {
  variants: {
    variant: {
      default: 'space-y-4',
      compact: 'space-y-2'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

const headerSkeletonVariants = cva('flex items-center gap-2', {
  variants: {
    variant: {
      default: '',
      compact: 'gap-3'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

const imageSkeletonVariants = cva('flex justify-center items-center rounded-lg', {
  variants: {
    variant: {
      default: 'w-16 h-16 aspect-square',
      compact: 'w-24 h-24 aspect-square flex-shrink-0'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

type TProps = VariantProps<typeof productCardSkeletonVariants>

export default function ProductCardSkeleton({ variant = 'default' }: TProps) {
  return (
    <div className={cn(productCardSkeletonVariants({ variant }))} data-theme='dark'>
      <div className={cn(headerSkeletonVariants({ variant }))}>
        {/* Product Image Skeleton */}
        <Skeleton className={cn('bg-primary/10', imageSkeletonVariants({ variant }))}>
          <Skeleton className='bg-primary/5 size-8' />
        </Skeleton>

        <div className='flex-1 space-y-1.5'>
          {/* Product Title Skeleton */}
          <Skeleton className='bg-primary/10 w-3/4 h-6' />
          <Skeleton className='bg-primary/10 w-1/2 h-4' />

          {variant === 'compact' && (
            <>
              {/* Description lines for compact variant */}
              <Skeleton className='bg-primary/10 w-full h-3' />
              <Skeleton className='bg-primary/10 w-4/5 h-3' />
            </>
          )}
        </div>
      </div>

      {/* Product Info Skeleton */}
      <div className={cn(contentSkeletonVariants({ variant }))}>
        {variant === 'default' && (
          <div className='space-y-1'>
            {/* Description lines for default variant */}
            <Skeleton className='bg-primary/10 w-full h-3' />
            <Skeleton className='bg-primary/10 w-5/6 h-3' />
            <Skeleton className='bg-primary/10 w-3/4 h-3' />
          </div>
        )}

        <div
          className={cn('space-y-2', {
            'flex justify-between items-center border-b border-muted-foreground py-2 space-y-0':
              variant === 'compact'
          })}
        >
          {variant === 'default' ? (
            <>
              {/* QTY and Type for default variant */}
              <div className='flex gap-3'>
                <Skeleton className='bg-primary/10 w-12 h-4' />
                <Skeleton className='bg-primary/10 w-8 h-4' />
              </div>
              <div className='flex gap-3'>
                <Skeleton className='bg-primary/10 w-12 h-4' />
                <Skeleton className='bg-primary/10 w-16 h-4' />
              </div>
            </>
          ) : (
            <>
              {/* QTY and Type for compact variant */}
              <div className='flex gap-2'>
                <Skeleton className='bg-primary/10 w-8 h-4' />
                <Skeleton className='bg-primary/10 w-6 h-4' />
              </div>
              <div className='flex gap-2'>
                <Skeleton className='bg-primary/10 w-10 h-4' />
                <Skeleton className='bg-primary/10 w-12 h-4' />
              </div>
            </>
          )}
        </div>

        {/* Price Skeleton */}
        <div className='flex items-center gap-2'>
          <Skeleton className='bg-primary/10 w-20 h-5' />
          <Skeleton className='bg-primary/10 w-12 h-4' />
        </div>

        {/* Button Skeleton */}
        <Skeleton className='bg-primary/10 rounded w-full h-10' />
      </div>
    </div>
  )
}
