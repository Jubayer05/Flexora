import { cva, VariantProps } from 'class-variance-authority'

export const blogCardVariants = cva(
  'group relative w-full rounded-lg overflow-clip bg-card',
  {
    variants: {
      variant: {
        default: 'flex flex-col gap-1 items-center p-2.5 border border-border',
        compact: 'flex flex-row gap-1 items-center',
        minimal: 'flex flex-col gap-1 items-center p-2.5',
        slim: 'flex flex-col gap-1 items-center p-2.5',
        simple: 'flex flex-col gap-1 items-center p-2.5'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export const blogImageWrapperVariants = cva('relative  rounded-lg overflow-clip', {
  variants: {
    variant: {
      default: ' aspect-[3/2] w-full max-w-full',
      compact: 'size-24 aspect-square block bg-muted relative',
      minimal: 'aspect-[3/2] w-full',
      slim: '',
      simple: ''
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

export const blogDetailsVariants = cva('text-card-foreground w-full', {
  variants: {
    variant: {
      default: 'space-y-1 sm:space-y-2 p-0.5 sm:p-5',
      compact: 'space-y-1 sm:space-y-2 p-0.5 sm:p-3',
      minimal: 'space-y-3 sm:space-y-5 p-0.5 sm:p-5',
      slim: 'space-y-3 sm:space-y-5 p-0.5 sm:p-5',
      simple: 'space-y-3 sm:space-y-5 p-0.5 sm:p-5'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

export type BlogCardVariants = VariantProps<typeof blogCardVariants>
