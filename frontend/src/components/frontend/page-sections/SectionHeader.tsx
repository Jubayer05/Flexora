import { Typography } from '@/components/common/typography'

interface SectionHeaderProps {
  heading?: string
  subheading?: string
  className?: string
}

export function SectionHeader({ heading, subheading, className = '' }: SectionHeaderProps) {
  if (!heading && !subheading) return null

  return (
    <div className={`mb-12 text-center ${className}`}>
      {heading && (
        <Typography variant='h3' as='h2' weight='semibold' className='mb-4'>
          {heading}
        </Typography>
      )}
      {subheading && (
        <Typography variant='h5' className='text-muted-foreground'>
          {subheading}
        </Typography>
      )}
    </div>
  )
}
