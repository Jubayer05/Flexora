'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  value: string
  description?: string
  icon: LucideIcon
}

export function AnalyticsSummaryCard({ title, value, description, icon: Icon }: Props) {
  return (
    <Card className='border border-outline-variant/40 bg-surface-container/20' data-analytics-card='true'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 px-5'>
        <CardTitle className='text-sm font-medium text-on-surface-variant'>{title}</CardTitle>
        <Icon className='h-4 w-4 text-primary' />
      </CardHeader>
      <CardContent className='px-5'>
        <div className='analytics-card-value text-2xl font-semibold leading-tight break-words text-on-surface'>{value}</div>
        {description ? <p className='mt-1 text-xs text-muted-foreground'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}
