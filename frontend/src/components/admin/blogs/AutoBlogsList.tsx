'use client'

import CustomImage from '@/components/common/CustomImage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { Calendar, Clock, ExternalLink, Pencil, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export interface AutoBlogListItem {
  id: number
  title: string
  slug: string
  thumbnail: string | null
  categoryId: number | null
  category?: { id: number; name: string; slug: string } | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

type ListResponse = {
  success?: boolean
  data: {
    blogs: AutoBlogListItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Published'
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000) % 24
  const d = Math.floor(ms / 86400000)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export interface AutoBlogsListProps {
  /** When this value changes, the list will refetch (e.g. after bulk create). */
  refreshTrigger?: number
}

export default function AutoBlogsList({ refreshTrigger }: AutoBlogsListProps) {
  const now = useNow(1000)
  const { data, loading, mutate } = useAsync<ListResponse>(
    () => 'admin/blogs?limit=100&sortBy=publishedAt&sortOrder=asc'
  )

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      mutate()
    }
  }, [refreshTrigger, mutate])

  const blogs = data?.data?.blogs ?? []

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-foreground'>Auto blogs (scheduled & published)</h3>
        <Button variant='outline' size='sm' onClick={() => mutate()} className='gap-2' disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && blogs.length === 0 ? (
        <div className='rounded-xl border border-border bg-card p-8 text-center text-muted-foreground'>
          Loading…
        </div>
      ) : blogs.length === 0 ? (
        <div className='rounded-xl border border-border bg-card p-8 text-center text-muted-foreground'>
          No blogs yet. Create some with the form above.
        </div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-1 lg:grid-cols-2'>
          {blogs.map((blog) => {
            const publishAt = blog.publishedAt ? new Date(blog.publishedAt).getTime() : null
            const remaining = publishAt != null ? publishAt - now : null
            const isScheduled = remaining != null && remaining > 0
            const isLive = blog.isPublished && (remaining == null || remaining <= 0)

            return (
              <li key={blog.id}>
                <Card className='overflow-hidden border-border'>
                  <CardContent className='p-0'>
                    <div className='flex gap-4 p-4'>
                      <div className='relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-muted'>
                        {blog.thumbnail ? (
                          <CustomImage
                            src={blog.thumbnail}
                            alt=''
                            fill
                            className='object-cover'
                          />
                        ) : (
                          <div className='flex h-full w-full items-center justify-center text-xs text-muted-foreground'>
                            No image
                          </div>
                        )}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-medium text-foreground' title={blog.title}>
                          {blog.title}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>/{blog.slug}</p>
                        {blog.category && (
                          <p className='mt-1 text-xs text-muted-foreground'>
                            Category: {blog.category.name}
                          </p>
                        )}
                        <div className='mt-2 flex flex-wrap items-center gap-3 text-xs'>
                          {blog.publishedAt && (
                            <span className='flex items-center gap-1 text-muted-foreground'>
                              <Calendar className='size-3.5' />
                              {new Date(blog.publishedAt).toLocaleString()}
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              isLive ? 'text-green-600 dark:text-green-400' : isScheduled ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            <Clock className='size-3.5' />
                            {isScheduled
                              ? formatRemaining(remaining!)
                              : isLive
                                ? 'Published'
                                : 'Draft'}
                          </span>
                        </div>
                        <div className='mt-2 flex gap-2'>
                          <Button variant='outline' size='sm' className='gap-1' asChild>
                            <Link href={`/admin/blogs/${blog.id}`}>
                              <ExternalLink className='size-3.5' />
                              View
                            </Link>
                          </Button>
                          <Button variant='outline' size='sm' className='gap-1' asChild>
                            <Link href={`/admin/blogs/${blog.id}/edit`}>
                              <Pencil className='size-3.5' />
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
