import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, value, defaultValue, ...props }: React.ComponentProps<'input'>) {
  // Extract value and defaultValue from rest to avoid passing twice
  const { ...restProps } = props as React.ComponentProps<'input'>

  // If onChange is provided, treat as controlled: always pass value (use '' when undefined)
  // to avoid switching from uncontrolled to controlled when value goes from undefined to defined.
  const isControlled = typeof props.onChange === 'function'
  const valueProps =
    isControlled || value !== undefined
      ? { value: value ?? '' }
      : defaultValue !== undefined
        ? { defaultValue }
        : {}

  return (
    <input
      type={type}
      data-slot='input'
      {...valueProps}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      {...restProps}
    />
  )
}

export { Input }
