'use client'

import { Typography } from '@/components/common/typography'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function BlogSectionWelcome({
  title,
  description,
  className,
  children
}: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm',
        'dark:border-border dark:bg-card',
        className
      )}
    >
      <Typography variant='h5' weight='bold' className='text-foreground'>
        {title}
      </Typography>
      {description && (
        <Typography
          variant='body2'
          weight='normal'
          className='mt-2 text-muted-foreground'
        >
          {description}
        </Typography>
      )}
      {children && <div className='mt-4'>{children}</div>}
    </div>
  )
}
