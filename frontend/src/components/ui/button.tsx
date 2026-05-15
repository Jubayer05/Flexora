import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-tight transition-[color,background-color,box-shadow,border-color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: [
          'border border-transparent bg-primary text-on-primary shadow-sm',
          'hover:bg-primary/92 hover:shadow-md',
          'dark:border-primary-container/30 dark:bg-primary-container dark:text-white',
          'dark:shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]',
          'dark:hover:bg-primary-container/92 dark:hover:shadow-[0_2px_8px_rgba(255,86,44,0.28)]'
        ].join(' '),
        destructive: [
          'border border-transparent bg-destructive text-on-error shadow-sm',
          'hover:bg-destructive/92',
          'focus-visible:ring-destructive/30',
          'dark:bg-error-container dark:text-white',
          'dark:hover:bg-error-container/92 dark:shadow-[0_1px_2px_rgba(0,0,0,0.45)]'
        ].join(' '),
        outline: [
          'border border-border bg-background text-foreground shadow-xs',
          'hover:bg-accent hover:text-accent-foreground',
          'dark:border-outline-variant dark:bg-surface-container-high dark:text-white',
          'dark:hover:border-outline dark:hover:bg-surface-container-highest dark:hover:text-white'
        ].join(' '),
        secondary: [
          'border border-transparent bg-secondary text-on-secondary shadow-sm',
          'hover:bg-secondary/90',
          'dark:bg-surface-container-high dark:text-white',
          'dark:hover:bg-surface-container-highest dark:hover:text-white'
        ].join(' '),
        ghost: [
          'text-foreground hover:bg-accent hover:text-accent-foreground',
          'dark:text-white dark:hover:bg-surface-container-high dark:hover:text-white'
        ].join(' '),
        link: 'h-auto p-0 text-primary underline-offset-4 hover:underline dark:text-primary active:scale-100'
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-7 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Button, buttonVariants }
