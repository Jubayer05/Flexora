import { Typography } from '@/components/common/typography'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  subTitle?: string
  children?: React.ReactNode
  extra?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subTitle,
  children,
  extra,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-6 flex w-full flex-col gap-3', className)}>
      {/* Top row: title + subtitle + extra */}
      <div className='flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left'>
        {/* LEFT: Title + Subtitle */}
        <div
          className={cn('flex flex-col items-center md:items-start', {
            'gap-2': !subTitle
          })}
        >
          {title && (
            <Typography variant='h5' weight='bold'>
              {title}
            </Typography>
          )}
          {subTitle && (
            <Typography
              variant='subtitle2'
              weight='normal'
              className='text-muted-foreground'
            >
              {subTitle}
            </Typography>
          )}
        </div>

        {/* RIGHT: extra (filters / buttons) */}
        {extra && (
          <div className='flex w-full flex-wrap items-center justify-center gap-4 md:w-auto md:justify-end'>
            {extra}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}