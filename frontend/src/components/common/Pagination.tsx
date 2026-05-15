'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import type { PaginationData } from '@/hooks/useFilter'
import { usePagination } from '@/hooks/useFilter'

interface PaginationProps {
  paginationData?: PaginationData
  pageSizeOptions?: number[]
  className?: string
  showRowsPerPage?: boolean
  showPageInfo?: boolean
  showFirstLastButtons?: boolean
}

export function Pagination({
  paginationData,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className = '',
  showRowsPerPage = true,
  showPageInfo = true,
  showFirstLastButtons = true
}: PaginationProps) {
  const {
    page,
    limit,
    totalPages,
    total,
    hasNext,
    hasPrev,
    setLimit,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage
  } = usePagination(paginationData)

  // Don't render if there's no pagination data
  if (!paginationData) {
    return null
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-4 bg-surface-container/20 rounded-lg border border-outline-variant/20 ${className}`}
    >
      {/* Rows per page */}
      {showRowsPerPage && (
        <div className='flex items-center gap-2 order-2 sm:order-1'>
          <Label
            htmlFor='pagination-rows-per-page'
            className='font-medium text-on-surface-variant text-xs whitespace-nowrap'
          >
            Rows per page
          </Label>
          <Select value={`${limit}`} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger
              size='sm'
              id='pagination-rows-per-page'
              className='bg-surface-container border-outline-variant w-20 text-foreground justify-between rounded-lg h-8'
            >
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side='top' className='bg-popover border-outline-variant rounded-lg'>
              {pageSizeOptions.map((size) => (
                <SelectItem
                  key={size}
                  value={`${size}`}
                  className='hover:bg-muted focus:bg-muted text-on-surface'
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Page info */}
      {showPageInfo && (
        <div className='flex justify-center items-center gap-2 order-1 sm:order-2 font-medium text-on-surface text-sm'>
          <span>
            Page <span className='font-semibold'>{page}</span> of <span className='font-semibold'>{totalPages}</span>
          </span>
          {total > 0 && (
            <span className='text-muted-foreground text-xs hidden sm:inline'>
              ({total.toLocaleString()} total)
            </span>
          )}
        </div>
      )}
      {/* Navigation buttons */}
      <div className='flex justify-center items-center gap-1 order-3'>
        {showFirstLastButtons && (
          <Button
            variant='outline'
            size='icon'
            className='hover:bg-muted disabled:opacity-40 w-8 h-8 border-outline-variant text-on-surface-variant rounded-lg'
            onClick={goToFirstPage}
            disabled={!hasPrev}
          >
            <span className='sr-only'>Go to first page</span>
            <ChevronsLeft className='w-4 h-4' />
          </Button>
        )}

        <Button
          variant='outline'
          size='icon'
          className='hover:bg-muted disabled:opacity-40 border-outline-variant w-8 h-8 text-on-surface-variant rounded-lg'
          onClick={prevPage}
          disabled={!hasPrev}
        >
          <span className='sr-only'>Go to previous page</span>
          <ChevronLeft className='w-4 h-4' />
        </Button>

        <Button
          variant='outline'
          size='icon'
          className='hover:bg-muted disabled:opacity-40 border-outline-variant w-8 h-8 text-on-surface-variant rounded-lg'
          onClick={nextPage}
          disabled={!hasNext}
        >
          <span className='sr-only'>Go to next page</span>
          <ChevronRight className='w-4 h-4' />
        </Button>

        {showFirstLastButtons && (
          <Button
            variant='outline'
            size='icon'
            className='hover:bg-muted disabled:opacity-40 border-outline-variant w-8 h-8 text-on-surface-variant rounded-lg'
            onClick={goToLastPage}
            disabled={!hasNext}
          >
            <span className='sr-only'>Go to last page</span>
            <ChevronsRight className='w-4 h-4' />
          </Button>
        )}
      </div>
    </div>
  )
}
