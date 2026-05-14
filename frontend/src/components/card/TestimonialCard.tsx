import { cn } from '@/lib/utils'
import { HomepageTestimonialType } from '@/lib/validations/schemas/testimonialSettings'
import { renderStars } from '@/utils/renderStarts'
import CustomImage from '../common/CustomImage'
import { Quote } from 'lucide-react'

type TestimonialItem = NonNullable<HomepageTestimonialType['testimonials']>[number]

export interface TestimonialCardProps {
  item: TestimonialItem
  variant?: 'default' | 'fancy'
}

const UserAvatar = ({
  avatar,
  name,
  size = 'medium',
  className = ''
}: {
  avatar?: string
  name?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}) => {
  const sizeMap = { small: 'size-8', medium: 'size-11', large: 'size-14 lg:size-16' }
  const imgSize = { small: 32, medium: 44, large: 64 }

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20',
        sizeMap[size],
        className
      )}
    >
      {avatar ? (
        <CustomImage
          src={avatar}
          width={imgSize[size]}
          height={imgSize[size]}
          alt={name || 'User'}
          className='h-full w-full object-cover'
        />
      ) : (
        <span
          className='flex h-full w-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary'
        >
          {name
            ? name.split(' ').map((w) => w[0].toUpperCase()).slice(0, 2).join('')
            : '?'}
        </span>
      )}
    </div>
  )
}

export default function TestimonialCard({ item, variant = 'default' }: TestimonialCardProps) {
  return (
    <div className='group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:bg-card cursor-grab select-none'>
      {/* Top accent on hover */}
      <div className='absolute top-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />

      {/* Quote icon */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-0.5'>
          {renderStars(item?.rating || 0, 16)}
        </div>
        <Quote className='size-6 shrink-0 text-primary/20 group-hover:text-primary/30 transition-colors duration-300' />
      </div>

      {/* Review text */}
      <p className='flex-1 text-sm leading-relaxed text-muted-foreground max-sm:line-clamp-none sm:line-clamp-5 md:line-clamp-4 font-manrope'>
        &ldquo;{item?.review || 'No review provided'}&rdquo;
      </p>

      {/* Divider */}
      <div className='h-px bg-linear-to-r from-transparent via-border to-transparent' />

      {/* Author */}
      <div className='flex items-center gap-3'>
        <UserAvatar avatar={item?.avatar} name={item?.name} size='medium' />
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold text-card-foreground'>
            {item?.name || 'Anonymous'}
          </p>
          {(item?.designation || item?.company) && (
            <p className='truncate text-xs text-muted-foreground'>
              {item?.designation ? `${item.designation}` : ''}
              {item?.designation && item?.company ? ' · ' : ''}
              {item?.company || ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
