'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import requests from '@/services/network/http'
import { BarChart3 } from 'lucide-react'
import { useEffect, useState } from 'react'

const TEXTS = {
  title: 'Click Tracking Details',
  loading: 'Loading...',
  totalClicks: 'Total Clicks',
  uniqueVisitors: 'Unique Visitors',
  byPlatform: 'By Platform',
  byCountry: 'By Country',
  byBrowser: 'By Browser',
  byOS: 'By Operating System',
  visitorId: 'Visitor ID',
  clickCount: 'Clicks',
  platform: 'Platform',
  deviceType: 'Device Type',
  browser: 'Browser',
  os: 'OS',
  country: 'Country',
  firstClick: 'First Click',
  lastClick: 'Last Click',
  oneDay: '1 Day',
  sevenDays: '7 Days',
  oneMonth: '1 Month',
  allTime: 'All Time',
  summary: 'Summary',
  details: 'Click Details',
  close: 'Close',
  noData: 'No data available for this period'
}

interface ClickRow {
  id: number
  visitorId: string
  clickCount: number
  deviceInfo?: { platform?: string; deviceType?: string; browser?: string; os?: string }
  location?: { country?: string }
  firstClickAt: string
  lastClickAt: string
}

interface Stats {
  totalClicks: number
  uniqueVisitors: number
  byPlatform: Record<string, number>
  byCountry: Record<string, number>
  byBrowser: Record<string, number>
  byOS: Record<string, number>
}

interface ShowModalUrlTrackingProps {
  urlTrackingId: number | null
  isOpen: boolean
  onClose: () => void
}

export function ShowModalUrlTracking({
  urlTrackingId,
  isOpen,
  onClose
}: ShowModalUrlTrackingProps) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'1day' | '7days' | '30days' | 'all'>('all')
  const [clicks, setClicks] = useState<ClickRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const fetchAnalytics = async () => {
    if (!urlTrackingId) return
    try {
      setLoading(true)
      const data = await requests.get<{
        success: boolean
        data: { clicks: ClickRow[]; stats: Stats }
      }>(`/admin/url-tracking/analytics/${urlTrackingId}?period=${period}`)
      if (data?.success && data?.data) {
        setClicks(data.data.clicks || [])
        setStats(data.data.stats || null)
      }
    } catch (e) {
      console.error('Error fetching analytics:', e)
      setClicks([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && urlTrackingId) {
      fetchAnalytics()
    }
  }, [isOpen, urlTrackingId, period])

  const formatDate = (date: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
  }

  const formatVisitorId = (id: string) => {
    if (!id) return 'N/A'
    if (id.length <= 12) return id
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md sm:max-w-lg md:max-w-6xl lg:max-w-8xl xl:max-w-9xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-primary/20 rounded-lg'>
              <BarChart3 className='w-5 h-5 text-primary' />
            </div>
            <DialogTitle>{TEXTS.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex flex-wrap gap-2 mb-6'>
          {(['1day', '7days', '30days', 'all'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size='sm'
              onClick={() => setPeriod(p)}
            >
              {p === '1day' && TEXTS.oneDay}
              {p === '7days' && TEXTS.sevenDays}
              {p === '30days' && TEXTS.oneMonth}
              {p === 'all' && TEXTS.allTime}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-64 text-muted-foreground'>
            {TEXTS.loading}
          </div>
        ) : (
          <>
            <div className='mb-6'>
              <h4 className='text-lg font-semibold mb-4'>{TEXTS.summary}</h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-1'>{TEXTS.totalClicks}</p>
                  <p className='text-2xl font-bold'>{stats?.totalClicks ?? 0}</p>
                </div>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-1'>{TEXTS.uniqueVisitors}</p>
                  <p className='text-2xl font-bold'>{stats?.uniqueVisitors ?? 0}</p>
                </div>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-1'>{TEXTS.byPlatform}</p>
                  <div className='space-y-1'>
                    {stats?.byPlatform &&
                      Object.entries(stats.byPlatform)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([platform, count]) => (
                          <p key={platform} className='text-sm'>
                            {platform}: {count}
                          </p>
                        ))}
                  </div>
                </div>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-1'>{TEXTS.byCountry}</p>
                  <div className='space-y-1'>
                    {stats?.byCountry &&
                      Object.entries(stats.byCountry)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([country, count]) => (
                          <p key={country} className='text-sm'>
                            {country}: {count}
                          </p>
                        ))}
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-2 font-semibold'>
                    {TEXTS.byBrowser}
                  </p>
                  <div className='space-y-1'>
                    {stats?.byBrowser &&
                      Object.entries(stats.byBrowser)
                        .sort((a, b) => b[1] - a[1])
                        .map(([browser, count]) => (
                          <div key={browser} className='flex justify-between text-sm'>
                            <span className='text-muted-foreground'>{browser}</span>
                            <span className='font-semibold'>{count}</span>
                          </div>
                        ))}
                  </div>
                </div>
                <div className='rounded-lg border bg-muted/50 p-4'>
                  <p className='text-muted-foreground text-sm mb-2 font-semibold'>{TEXTS.byOS}</p>
                  <div className='space-y-1'>
                    {stats?.byOS &&
                      Object.entries(stats.byOS)
                        .sort((a, b) => b[1] - a[1])
                        .map(([os, count]) => (
                          <div key={os} className='flex justify-between text-sm'>
                            <span className='text-muted-foreground'>{os}</span>
                            <span className='font-semibold'>{count}</span>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className='text-lg font-semibold mb-4'>{TEXTS.details}</h4>
              <div className='overflow-x-auto rounded-lg border'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-muted/50 border-b'>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.visitorId}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.clickCount}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.platform}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.deviceType}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.browser}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.os}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.country}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.firstClick}</th>
                      <th className='px-4 py-2 text-left font-semibold'>{TEXTS.lastClick}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className='px-4 py-8 text-center text-muted-foreground'>
                          {TEXTS.noData}
                        </td>
                      </tr>
                    ) : (
                      clicks.map((click) => (
                        <tr key={click.id} className='border-b last:border-0 hover:bg-muted/30'>
                          <td className='px-4 py-2 font-mono text-xs'>
                            {formatVisitorId(click.visitorId)}
                          </td>
                          <td className='px-4 py-2'>{click.clickCount}</td>
                          <td className='px-4 py-2'>{click.deviceInfo?.platform ?? 'N/A'}</td>
                          <td className='px-4 py-2'>{click.deviceInfo?.deviceType ?? 'N/A'}</td>
                          <td className='px-4 py-2'>{click.deviceInfo?.browser ?? 'N/A'}</td>
                          <td className='px-4 py-2'>{click.deviceInfo?.os ?? 'N/A'}</td>
                          <td className='px-4 py-2'>{click.location?.country ?? 'N/A'}</td>
                          <td className='px-4 py-2 text-muted-foreground text-xs'>
                            {formatDate(click.firstClickAt)}
                          </td>
                          <td className='px-4 py-2 text-muted-foreground text-xs'>
                            {formatDate(click.lastClickAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className='flex justify-end mt-6'>
          <Button variant='outline' onClick={onClose}>
            {TEXTS.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShowModalUrlTracking
