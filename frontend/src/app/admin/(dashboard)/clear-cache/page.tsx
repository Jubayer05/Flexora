'use client'

import {
  AlertTriangle,
  Database,
  FileText,
  Package,
  RefreshCw,
  Settings,
  Trash2,
  TrendingUp,
  Users
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import useAsync from '@/hooks/useAsync'

type CacheType = 'all' | 'products' | 'categories' | 'user' | 'analytics' | 'settings' | 'blog'

interface CacheOption {
  type: CacheType
  title: string
  description: string
  icon: React.ReactNode
  pattern: string
}

const cacheOptions: CacheOption[] = [
  {
    type: 'all',
    title: 'Clear All Cache',
    description:
      'Clear all Redis cached data (products, categories, settings, users, analytics, blog)',
    icon: <RefreshCw className='w-6 h-6' />,
    pattern: 'uhq:*'
  },
  {
    type: 'products',
    title: 'Product Cache',
    description: 'Clear cached product lists and product detail data',
    icon: <Package className='w-6 h-6' />,
    pattern: 'uhq:product:*'
  },
  {
    type: 'categories',
    title: 'Category Cache',
    description: 'Clear cached category tree and category data',
    icon: <Database className='w-6 h-6' />,
    pattern: 'uhq:categories*'
  },
  {
    type: 'user',
    title: 'User Cache',
    description: 'Clear cached user profiles and session-related data',
    icon: <Users className='w-6 h-6' />,
    pattern: 'uhq:user*'
  },
  {
    type: 'analytics',
    title: 'Analytics Cache',
    description: 'Clear cached analytics and dashboard metrics',
    icon: <TrendingUp className='w-6 h-6' />,
    pattern: 'uhq:analytics*'
  },
  {
    type: 'settings',
    title: 'Settings Cache',
    description: 'Clear cached application settings and configuration',
    icon: <Settings className='w-6 h-6' />,
    pattern: 'uhq:settings*'
  },
  {
    type: 'blog',
    title: 'Blog Cache',
    description: 'Clear cached blog posts, categories, and related data',
    icon: <FileText className='w-6 h-6' />,
    pattern: 'uhq:blog*'
  }
]

interface CacheStatsResponse {
  data?: {
    performance?: { hitRate?: string; totalRequests?: number; hits?: number; misses?: number }
    keyDistribution?: {
      products?: number
      categories?: number
      users?: number
      analytics?: number
      settings?: number
      blog?: number
      total?: number
    }
    redis?: { memoryUsage?: string; connections?: number | string }
    timestamp?: string
  }
}

const iconColors: Record<CacheType, string> = {
  all: 'bg-destructive/90 text-destructive-foreground',
  products: 'bg-blue-500/90 text-white',
  categories: 'bg-green-500/90 text-white',
  user: 'bg-purple-500/90 text-white',
  analytics: 'bg-orange-500/90 text-white',
  settings: 'bg-muted text-muted-foreground',
  blog: 'bg-indigo-500/90 text-white'
}

// Static copy for Cache statistics card — keep in sync to avoid server/client hydration mismatch
const CACHE_STATS_DESCRIPTION =
  'Hit rate and key counts from Redis. After clearing, click Refresh to verify: total keys and category counts should decrease by the number of entries removed.'

export default function ClearCachePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCache, setSelectedCache] = useState<CacheOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastCleared, setLastCleared] = useState<Record<CacheType, string>>({} as Record<CacheType, string>)
  const [lastClearedCount, setLastClearedCount] = useState<Record<CacheType, number>>({} as Record<CacheType, number>)

  const {
    data: statsData,
    loading: statsLoading,
    mutate: mutateStats
  } = useAsync<CacheStatsResponse>(() => '/admin/cache/stats', true)

  const stats = statsData?.data
  const performance = stats?.performance
  const keyDistribution = stats?.keyDistribution
  const redis = stats?.redis

  const handleCacheSelect = (cacheOption: CacheOption) => {
    setSelectedCache(cacheOption)
    setIsDialogOpen(true)
  }

  const handleConfirmClear = async () => {
    if (!selectedCache) return
    setLoading(true)
    try {
      const res = await requests.delete<{ data?: { clearedEntries?: number } }>(
        '/admin/cache/clear',
        { data: { pattern: selectedCache.pattern } } as any
      )
      const count = (res as any)?.data?.clearedEntries ?? 0
      setLastCleared((prev) => ({ ...prev, [selectedCache.type]: new Date().toLocaleString() }))
      setLastClearedCount((prev) => ({ ...prev, [selectedCache.type]: count }))
      toast.success(
        selectedCache.type === 'all'
          ? `Redis cache cleared: ${count} entries removed. Stats updated below.`
          : `${selectedCache.title} cleared: ${count} entries removed. Stats updated below.`
      )
      setIsDialogOpen(false)
      setSelectedCache(null)
      mutateStats()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader
        title='Clear cache'
        subTitle='Manage Redis cache: view statistics and clear by type or clear all.'
      />

      {/* Cache statistics */}
      <Card className='mb-6 border-border bg-card'>
        <CardHeader className='flex flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-foreground'>Cache statistics</CardTitle>
            <CardDescription className='text-muted-foreground'>
              {CACHE_STATS_DESCRIPTION}
            </CardDescription>
          </div>
          <Button variant='outline' size='sm' onClick={() => mutateStats()} disabled={statsLoading}>
            <RefreshCw className={`mr-2 w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className='flex items-center gap-2 text-muted-foreground text-sm'>
              <RefreshCw className='w-4 h-4 animate-spin' />
              Loading statistics…
            </div>
          ) : (
            <div className='gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                  Hit rate
                </p>
                <p className='mt-1 text-foreground text-xl font-semibold'>
                  {performance?.hitRate ?? '—'}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {performance?.hits ?? 0} hits / {performance?.misses ?? 0} misses
                </p>
              </div>
              <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                  Total keys
                </p>
                <p className='mt-1 text-foreground text-xl font-semibold'>
                  {keyDistribution?.total ?? 0}
                </p>
                <p className='text-muted-foreground text-xs'>
                  Products: {keyDistribution?.products ?? 0} · Settings: {keyDistribution?.settings ?? 0} · Blog: {keyDistribution?.blog ?? 0}
                </p>
              </div>
              <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                  Redis memory
                </p>
                <p className='mt-1 text-foreground text-xl font-semibold'>
                  {redis?.memoryUsage ?? '—'}
                </p>
                <p className='text-muted-foreground text-xs'>
                  May not drop after clear (Redis keeps memory; other keys may exist). Use Total keys to verify.
                </p>
              </div>
              <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                  Connections
                </p>
                <p className='mt-1 text-foreground text-xl font-semibold'>
                  {redis?.connections ?? '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redis clear all + Selective clearing */}
      <div className='mb-2 text-foreground text-sm font-medium'>Selective cache clearing</div>
      <p className='mb-4 text-muted-foreground text-sm'>
        Clear all Redis cache or only keys matching a specific type. Clearing resets in-memory stats.
      </p>
      <div className='gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
        {cacheOptions.map((option) => (
          <Card key={option.type} className='border-border bg-card transition-shadow hover:shadow-md'>
            <CardHeader>
              <div className='flex flex-wrap items-start gap-4'>
                <div
                  className={`${iconColors[option.type]} flex h-12 w-12 shrink-0 items-center justify-center rounded-lg`}
                >
                  {option.icon}
                </div>
                <div className='min-w-0 flex-1'>
                  <CardTitle className='text-foreground text-lg'>{option.title}</CardTitle>
                  <CardDescription className='mt-2 text-muted-foreground'>
                    {option.description}
                  </CardDescription>
                  {lastCleared[option.type] && (
                    <div className='mt-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs'>
                      <p className='font-medium text-foreground'>
                        Verified: {lastClearedCount[option.type] ?? 0} entries removed
                      </p>
                      <p className='text-muted-foreground'>at {lastCleared[option.type]}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleCacheSelect(option)}
                variant={option.type === 'all' ? 'destructive' : 'outline'}
                className='w-full sm:w-auto'
              >
                <Trash2 className='mr-2 w-4 h-4' />
                {option.type === 'all' ? 'Clear all Redis cache' : 'Clear'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning */}
      <Card className='mt-8 border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5'>
        <CardContent className='pt-6'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400' />
            <div>
              <h4 className='font-medium text-amber-800 dark:text-amber-200 text-sm'>
                Important
              </h4>
              <p className='mt-1 text-amber-700 dark:text-amber-300 text-sm'>
                Clearing cache can temporarily slow the app while data is re-fetched. Prefer
                clearing during low traffic. &quot;Clear all&quot; removes every key with prefix{' '}
                <code className='rounded bg-amber-500/20 px-1 text-xs'>uhq:*</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-md border-border bg-card'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-foreground'>
              <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400' />
              Confirm cache clear
            </DialogTitle>
            <DialogDescription className='text-muted-foreground'>
              Clear <strong className='text-foreground'>{selectedCache?.title.toLowerCase()}</strong>?
              <br />
              <span className='mt-2 block'>{selectedCache?.description}</span>
              <span className='mt-2 block font-medium text-destructive'>
                This cannot be undone and may briefly affect performance.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmClear}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  Clearing…
                </>
              ) : (
                <>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Clear cache
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
