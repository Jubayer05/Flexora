import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

/**
 * Container variants
 */

const containerVariants = cva('mx-auto w-full container min-w-0', {
  variants: {
    variant: {
      full: 'max-w-full',
      wide: 'max-w-screen-xl',
      boxed: 'max-w-7xl',
      narrow: 'max-w-screen-md',
      none: 'max-w-none'
    },
    padding: {
      none: 'px-0',
      compact: 'px-4 sm:px-5',
      base: 'px-4 sm:px-6 lg:px-20 2xl:px-6',
      spacious: 'px-6 sm:px-10 lg:px-24',
      wide: 'px-4 lg:px-20'
    },
    bg: {
      none: 'bg-transparent',
      surface: 'bg-card rounded-none xl:rounded-xl 2xl:rounded-3xl',
      muted: 'bg-muted',
      dark: 'bg-card',
      primary: 'bg-primary text-primary-foreground'
    }
  },
  defaultVariants: {
    variant: 'wide',
    padding: 'base',
    bg: 'none'
  }
})

/**
 * Container Props
 */
export interface ContainerProps
  extends
    Omit<React.ComponentPropsWithoutRef<'div'>, keyof VariantProps<typeof containerVariants>>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType
}

const Container = React.forwardRef(function Container(
  { as: Comp = 'div', className, variant, padding, bg, ...props }: ContainerProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Element = Comp as any
  return (
    <Element
      ref={ref}
      className={cn(containerVariants({ variant, padding, bg }), className)}
      {...props}
    />
  )
})

Container.displayName = 'Container'

export { Container, containerVariants }
export type ContainerVariant = VariantProps<typeof containerVariants>['variant']
export type ContainerPadding = VariantProps<typeof containerVariants>['padding']
export type ContainerBg = VariantProps<typeof containerVariants>['bg']
