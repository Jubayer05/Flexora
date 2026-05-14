import { cn } from '@/lib/utils'
import {
  blogCardVariants,
  blogDetailsVariants,
  blogImageWrapperVariants
} from '../../card/blog-card/blog-card-variants'

type BlogCardVariant = 'default' | 'slim' | 'minimal' | 'simple' | 'compact'

type BlogCardProps = {
  variant?: BlogCardVariant
  className?: string
}

export const BlogCardSkeleton = ({ variant = 'default', className }: BlogCardProps) => {
  return (
    <div className={cn(blogCardVariants({ variant }), 'animate-pulse', className)}>
      {/* Blog Thumbnail Skeleton */}
      <div
        className={cn(
          blogImageWrapperVariants({ variant }),
          'bg-muted rounded-md overflow-hidden'
        )}
      />

      {/* Blog Details Skeleton */}
      <div className={blogDetailsVariants({ variant })}>
        {/* Date + Categories Skeleton */}
        <div className='hidden md:flex flex-col justify-center items-start gap-y-2 text-muted-foreground'>
          <div className='bg-muted rounded w-24 h-3' />

          <div className='flex flex-wrap gap-2'>
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className='bg-muted rounded-full w-16 h-4' />
            ))}
          </div>
        </div>

        {/* Title Skeleton */}
        <div className='space-y-1.5'>
          <div className={cn('bg-muted rounded w-full h-4 lg:h-5')} />
          <div className={cn('bg-muted rounded w-1/3 h-4 lg:h-5')} />
        </div>

        {/* Description + Button Skeleton */}
        {variant !== 'compact' && (
          <>
            <div className='space-y-2 mt-2'>
              <div className='bg-muted rounded w-full h-3' />
              <div className='bg-muted rounded w-5/6 h-3' />
              <div className='bg-muted rounded w-2/3 h-3' />
            </div>

            <div className='bg-muted mt-3 rounded w-20 h-4' />
          </>
        )}
      </div>
    </div>
  )
}
