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
    <Card className='border-border/70 bg-card/70' data-analytics-card='true'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
        <Icon className='h-4 w-4 text-primary' />
      </CardHeader>
      <CardContent>
        <div className='analytics-card-value text-2xl font-semibold leading-tight break-words'>{value}</div>
        {description ? <p className='mt-1 text-xs text-muted-foreground'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}
