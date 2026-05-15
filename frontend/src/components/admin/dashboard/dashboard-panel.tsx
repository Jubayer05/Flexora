'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type DashboardPanelProps = {
  title: string
  description?: string
  icon: LucideIcon
  iconTone?: 'primary' | 'warning' | 'info'
  actions?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const iconToneClasses = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400'
}

export function DashboardPanel({
  title,
  description,
  icon: Icon,
  iconTone = 'primary',
  actions,
  children,
  footer,
  className
}: DashboardPanelProps) {
  return (
    <Card
      className={cn(
        'flex h-full min-h-[360px] flex-col gap-0 overflow-hidden border-border/80 py-0 shadow-sm',
        className
      )}
    >
      <div className='flex flex-col gap-4 border-b border-border/80 bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg border',
              iconToneClasses[iconTone]
            )}
          >
            <Icon className='size-[18px]' strokeWidth={2} />
          </div>
          <div className='min-w-0 space-y-0.5'>
            <h3 className='text-base font-semibold leading-tight tracking-tight text-foreground'>
              {title}
            </h3>
            {description ? (
              <p className='text-sm leading-relaxed text-muted-foreground'>{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className='flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
            {actions}
          </div>
        ) : null}
      </div>

      <div className='flex flex-1 flex-col'>{children}</div>

      {footer ? (
        <div className='mt-auto border-t border-border/80 bg-muted/20 px-5 py-3.5'>{footer}</div>
      ) : null}
    </Card>
  )
}
