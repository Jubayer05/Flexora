'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export type AnalyticsTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly'

type Props = {
  value: AnalyticsTimeframe
  onChange: (value: AnalyticsTimeframe) => void
}

export function TimeframeSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as AnalyticsTimeframe)}>
      <SelectTrigger className='w-[160px] bg-surface-container border-outline-variant text-foreground rounded-lg'>
        <SelectValue placeholder='Select timeframe' />
      </SelectTrigger>
      <SelectContent className='bg-popover border-outline-variant rounded-lg'>
        <SelectItem value='daily' className='hover:bg-muted focus:bg-muted'>Daily</SelectItem>
        <SelectItem value='weekly' className='hover:bg-muted focus:bg-muted'>Weekly</SelectItem>
        <SelectItem value='monthly' className='hover:bg-muted focus:bg-muted'>Monthly</SelectItem>
        <SelectItem value='yearly' className='hover:bg-muted focus:bg-muted'>Yearly</SelectItem>
      </SelectContent>
    </Select>
  )
}
