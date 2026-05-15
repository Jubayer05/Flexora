'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIsMobile } from '@/hooks/use-mobile'
import useAsync from '@/hooks/useAsync'

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--primary)'
  }
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState('90d')

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('7d')
    }
  }, [isMobile])

  const days = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7
  const { data: response, loading } = useAsync<{
    success: boolean
    data: Array<{ date: string; visitors: number }>
    message: string
  }>(`/visitor/stats?days=${days}`)

  const filteredData = React.useMemo(() => {
    const visitorStats = response?.data
    if (!visitorStats || !Array.isArray(visitorStats) || visitorStats.length === 0) {
      return []
    }

    const now = new Date()
    const daysToSubtract = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    return visitorStats.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [response, timeRange])

  const rangeLabel =
    timeRange === '90d' ? 'Last 3 months' : timeRange === '30d' ? 'Last 30 days' : 'Last 7 days'

  return (
    <Card className='@container/chart gap-0 overflow-hidden border-border/80 py-0 shadow-sm'>
      <CardHeader className='flex flex-col gap-4 border-b border-border/80 bg-muted/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <CardTitle className='text-base font-semibold'>Visitor traffic</CardTitle>
          <CardDescription>Daily unique visitors across your storefront</CardDescription>
        </div>
        <ToggleGroup
          type='single'
          value={timeRange}
          onValueChange={(value) => value && setTimeRange(value)}
          variant='outline'
          className='hidden shrink-0 @[520px]/chart:flex'
        >
          <ToggleGroupItem value='90d' className='px-3 text-xs sm:text-sm'>
            3 months
          </ToggleGroupItem>
          <ToggleGroupItem value='30d' className='px-3 text-xs sm:text-sm'>
            30 days
          </ToggleGroupItem>
          <ToggleGroupItem value='7d' className='px-3 text-xs sm:text-sm'>
            7 days
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className='w-full @[520px]/chart:hidden sm:w-40' size='sm'>
            <SelectValue placeholder={rangeLabel} />
          </SelectTrigger>
          <SelectContent align='end'>
            <SelectItem value='90d'>Last 3 months</SelectItem>
            <SelectItem value='30d'>Last 30 days</SelectItem>
            <SelectItem value='7d'>Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className='px-4 pb-6 pt-4 sm:px-6'>
        <ChartContainer config={chartConfig} className='aspect-auto h-[280px] w-full'>
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id='fillVisitors' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-visitors)' stopOpacity={0.35} />
                <stop offset='95%' stopColor='var(--color-visitors)' stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray='4 4' className='stroke-border/60' />
            <XAxis
              dataKey='date'
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  }
                  indicator='dot'
                />
              }
            />
            <Area
              dataKey='visitors'
              type='natural'
              fill='url(#fillVisitors)'
              stroke='var(--color-visitors)'
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        {!loading && filteredData.length === 0 && (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            No visitor data for this period.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
