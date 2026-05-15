'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DashboardPaginationProps = {
  page: number
  pages: number
  total: number
  shown: number
  itemLabel: string
  loading?: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function DashboardPagination({
  page,
  pages,
  total,
  shown,
  itemLabel,
  loading,
  hasPrev,
  hasNext,
  onPrev,
  onNext
}: DashboardPaginationProps) {
  if (pages <= 1) return null

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <p className='text-sm text-muted-foreground'>
        Showing <span className='font-medium text-foreground'>{shown}</span> of{' '}
        <span className='font-medium text-foreground'>{total}</span> {itemLabel}
      </p>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={onPrev} disabled={!hasPrev || loading}>
          <ChevronLeft className='size-4' />
          Previous
        </Button>
        <span className='min-w-[4.5rem] rounded-md border border-border/80 bg-background px-3 py-1.5 text-center text-sm tabular-nums'>
          {page} / {pages}
        </span>
        <Button variant='outline' size='sm' onClick={onNext} disabled={!hasNext || loading}>
          Next
          <ChevronRight className='size-4' />
        </Button>
      </div>
    </div>
  )
}
