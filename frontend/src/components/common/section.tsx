import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const sectionVariants = cva('block w-full', {
  variants: {
    variant: {
      none: 'py-0',
      xs: 'py-2',
      sm: 'py-4',
      md: 'py-6 md:py-8 lg:py-10',
      lg: 'py-12 lg:py-14',
      xl: 'py-14 xl:py-20',
      xxl: 'py-20 xl:py-32'
    },
    bg: {
      none: '',
      light: 'bg-muted/50',
      mid: 'bg-muted',
      dark: 'bg-card',
      secondary: 'bg-secondary text-secondary-foreground',
      primary: 'bg-primary text-primary-foreground',
      foreground: 'bg-card text-card-foreground'
    },
    fullWidth: {
      true: 'w-full',
      false: 'max-w-screen-xl mx-auto'
    }
  },
  defaultVariants: {
    variant: 'md',
    bg: 'none',
    fullWidth: true
  }
})

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof sectionVariants> {
  as?: React.ElementType
}

const Section = React.forwardRef(function Section(
  { as: Comp = 'section', className, variant, bg, fullWidth, ...props }: SectionProps,
  ref: React.ForwardedRef<HTMLElement>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Element = Comp as any
  return (
    <Element
      ref={ref}
      className={cn(sectionVariants({ variant, bg, fullWidth }), className)}
      {...props}
    />
  )
})

Section.displayName = 'Section'

export { Section, sectionVariants }
export type SectionVariant = VariantProps<typeof sectionVariants>['variant']
export type SectionBg = VariantProps<typeof sectionVariants>['bg']
export type SectionFullWidth = VariantProps<typeof sectionVariants>['fullWidth']
