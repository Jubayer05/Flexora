'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { AnalyticsSummaryCard } from '@/components/admin/analytics/AnalyticsSummaryCard'
import {
  type AnalyticsTimeframe,
  TimeframeSelect
} from '@/components/admin/analytics/TimeframeSelect'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { Activity, Eye, Globe2, MousePointerClick } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useMemo, useState } from 'react'

type TrafficResponse = {
  success: boolean
  data: {
    timeframe: AnalyticsTimeframe
    summary: {
      totalVisitors: number
      uniqueVisitors: number
      pageViews: number
      conversionRate: number
    }
    trend: Array<{
      label: string
      visitors: number
      pageViews: number
      uniqueVisitors: number
      orders: number
      conversionRate: number
    }>
    countries: Array<{
      country: string
      pageViews: number
      uniqueVisitors: number
      orders: number
      revenue: number
      engagementRate: number
    }>
    topPages: Array<{
      slug: string
      title: string
      pageViews: number
      uniqueVisitors: number
    }>
  }
}

const PIE_COLORS = ['#6d5efc', '#38bdf8', '#34d399', '#f59e0b', '#f97316', '#ef4444']

export default function TrafficAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('monthly')

  const { data, loading } = useAsync<TrafficResponse>(
    () => `/admin/analytics/traffic?timeframe=${timeframe}`,
    false,
    false,
    true
  )

  const analytics = data?.data
  const topCountries = useMemo(() => analytics?.countries.slice(0, 8) || [], [analytics?.countries])
  const topPages = useMemo(() => analytics?.topPages.slice(0, 6) || [], [analytics?.topPages])

  return (
    <div className='space-y-6 py-4 md:py-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Traffic Analytics</h1>
          <p className='text-sm text-muted-foreground'>
            Track visitors, page views, country traffic, and conversion trends.
          </p>
        </div>
        <TimeframeSelect value={timeframe} onChange={setTimeframe} />
      </div>

      {loading && !analytics ? (
        <div className='flex min-h-[320px] items-center justify-center'>
          <MotionLoader size='lg' variant='dots' />
        </div>
      ) : analytics ? (
        <>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <AnalyticsSummaryCard
              title='Total Visitors'
              value={analytics.summary.totalVisitors.toLocaleString()}
              description='Tracked by daily visitor counter'
              icon={Globe2}
            />
            <AnalyticsSummaryCard
              title='Unique Visitors'
              value={analytics.summary.uniqueVisitors.toLocaleString()}
              description='Based on tracked visitor IDs'
              icon={Eye}
            />
            <AnalyticsSummaryCard
              title='Page Views'
              value={analytics.summary.pageViews.toLocaleString()}
              description='Tracked page and URL interactions'
              icon={MousePointerClick}
            />
            <AnalyticsSummaryCard
              title='Conversion Rate'
              value={`${analytics.summary.conversionRate.toFixed(2)}%`}
              description='Orders divided by tracked visitor base'
              icon={Activity}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-3'>
            <Card className='xl:col-span-2'>
              <CardHeader>
                <CardTitle>Traffic Trend</CardTitle>
                <CardDescription>Visitors and page views across the selected timeframe.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='label' tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type='monotone' dataKey='visitors' stroke='#6d5efc' strokeWidth={2} dot={false} />
                    <Line type='monotone' dataKey='pageViews' stroke='#38bdf8' strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most viewed tracked pages and slugs.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={topPages}
                      dataKey='pageViews'
                      nameKey='title'
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {topPages.map((entry, index) => (
                        <Cell key={entry.slug} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Visitors By Country</CardTitle>
                <CardDescription>Countries generating the highest traffic volume.</CardDescription>
              </CardHeader>
              <CardContent className='h-[320px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={topCountries}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='country' tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey='pageViews' fill='#6d5efc' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Country Engagement</CardTitle>
                <CardDescription>Traffic and conversion activity by country.</CardDescription>
              </CardHeader>
              <CardContent className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='text-muted-foreground'>
                    <tr className='border-b border-border'>
                      <th className='py-3 text-left'>Country</th>
                      <th className='py-3 text-right'>Views</th>
                      <th className='py-3 text-right'>Unique</th>
                      <th className='py-3 text-right'>Orders</th>
                      <th className='py-3 text-right'>Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.countries.slice(0, 10).map((row) => (
                      <tr key={row.country} className='border-b border-border/50'>
                        <td className='py-3'>{row.country}</td>
                        <td className='py-3 text-right'>{row.pageViews.toLocaleString()}</td>
                        <td className='py-3 text-right'>{row.uniqueVisitors.toLocaleString()}</td>
                        <td className='py-3 text-right'>{row.orders.toLocaleString()}</td>
                        <td className='py-3 text-right'>{row.engagementRate.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
