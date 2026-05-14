import CustomImage from '@/components/common/CustomImage'
import { Typography } from '@/components/common/typography'
import Icon from '@/components/icons'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  blogCardVariants,
  blogDetailsVariants,
  blogImageWrapperVariants
} from './blog-card-variants'

type BlogCardVariant = 'default' | 'slim' | 'minimal' | 'simple' | 'compact'

type BlogCardProps = {
  post: Blog
  variant?: BlogCardVariant
  className?: string
}

export const BlogCard = ({ post, variant = 'default', className }: BlogCardProps) => {
  const href = `/blogs/${post?.slug || post?.id}`

  return (
    <div className={cn(blogCardVariants({ variant }), className)}>
      {/* Blog Thumbnail */}
      <Link href={href || '/'} className={blogImageWrapperVariants({ variant })}>
        <CustomImage
          src={post?.thumbnail}
          alt={post?.title}
          fill
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          className='object-cover group-hover:scale-105 transition-transform duration-500'
        />
      </Link>

      {/* Blog Details */}
      <div className={blogDetailsVariants({ variant })}>
        <div className='hidden md:flex flex-col justify-center items-start gap-y-2 text-muted-foreground'>
          {post.createdAt && (
            <Typography variant='body2' className='flex items-center gap-1.5 whitespace-nowrap'>
              <Icon name='calendar' strokeWidth={1.5} size={16} className='text-muted-foreground' />{' '}
              {new Date(post.createdAt).toDateString()}
            </Typography>
          )}
        </div>

        <Typography
          prefetch={false}
          href={`/blogs/${post?.slug}`}
          weight={variant === 'default' || variant === 'minimal' ? 'semibold' : 'normal'}
          variant={variant === 'compact' ? 'body1' : 'h5'}
          className={cn('text-card-foreground line-clamp-2')}
        >
          {post?.title}
        </Typography>

        {variant !== 'compact' && (
          <>
            <Typography className={cn('text-muted-foreground line-clamp-3')}>{post?.excerpt}</Typography>

            <Link
              href={`/blogs/${post?.slug}`}
              prefetch={false}
              className={'font-medium text-primary'}
            >
              Read More
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
