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
      <SelectTrigger className='w-[160px]'>
        <SelectValue placeholder='Select timeframe' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='daily'>Daily</SelectItem>
        <SelectItem value='weekly'>Weekly</SelectItem>
        <SelectItem value='monthly'>Monthly</SelectItem>
        <SelectItem value='yearly'>Yearly</SelectItem>
      </SelectContent>
    </Select>
  )
}
