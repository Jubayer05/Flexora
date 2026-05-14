import CustomImage from '@/components/common/CustomImage'
import { Typography } from '@/components/common/typography'
import CustomLink from '../common/CustomLink'
import { Button } from '../ui/button'
import { ArrowRight } from 'lucide-react'

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className='group relative flex flex-col items-center overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm text-center transition-all duration-500 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px_rgba(99,102,241,0.2)] hover:bg-card'>
      {/* Top gradient banner */}
      <div className='relative w-full h-20 lg:h-24 overflow-hidden bg-linear-to-br from-primary/20 via-primary/30 to-primary/15 transition-all duration-500 group-hover:from-primary/60 group-hover:via-primary/70 group-hover:to-primary/50'>
        {/* Animated shimmer */}
        <div className='absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
        {/* Top accent glow line */}
        <div className='absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100' />
      </div>

      {/* Floating icon */}
      <div className='relative -mt-12 lg:-mt-14 mb-2 flex justify-center'>
        <div className='relative'>
          {/* Glow */}
          <div className='absolute inset-0 rounded-full bg-primary/20 blur-md transition-all duration-500 group-hover:bg-primary/40 group-hover:blur-lg' />
          <div className='relative flex size-20 lg:size-24 items-center justify-center rounded-full border-[3px] border-primary/30 bg-gradient-to-tl from-[#12A2A8] to-primary shadow-lg shadow-primary/20 transition-all duration-500 group-hover:border-primary/60 group-hover:scale-105'>
            <CustomImage
              src={category?.icon}
              height={60}
              width={60}
              alt={`${category.name} category icon`}
              className='h-9 lg:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-110'
            />
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className='flex flex-col gap-4 p-4 lg:p-6 w-full'>
        <Typography
          variant='h3'
          as='h3'
          weight='semibold'
          className='text-lg sm:text-xl transition-colors duration-300 group-hover:text-primary'
        >
          {category.name}
        </Typography>

        <Typography variant='body2' className='text-muted-foreground font-manrope leading-relaxed line-clamp-3'>
          {category.description}
        </Typography>

        {/* Divider */}
        <div className='h-px w-full bg-linear-to-r from-transparent via-border to-transparent' />

        <Button
          className='w-full group/btn font-semibold gap-2 transition-all duration-300'
          size='lg'
          asChild
        >
          <CustomLink href='/shop'>
            Buy Now
            <ArrowRight className='size-4 transition-transform duration-300 group-hover/btn:translate-x-1' />
          </CustomLink>
        </Button>
      </div>
    </div>
  )
}
