'use client'

import { CustomSelect } from '@/components/common/CustomSelect'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { useFilter } from '@/hooks/useFilter'
import { cn } from '@/lib/utils'
import { Funnel, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ShopSidebar from './ShopSidebar'

export default function ShopFilterSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { filters, setFilter } = useFilter(10)
  const { theme, systemTheme } = useTheme()
  const effectiveTheme =
    theme === 'system' || !theme ? (systemTheme === 'dark' ? 'dark' : 'light') : theme
  const isDark = effectiveTheme === 'dark'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const sortOptions = [
    { title: 'All', label: 'All', value: 'all' },
    { title: 'Newest', label: 'Newest', value: 'newest' },
    { title: 'Oldest', label: 'Oldest', value: 'oldest' },
    { title: 'Price: Low to High', label: 'Price: Low to High', value: 'price_low_to_high' },
    { title: 'Price: High to Low', label: 'Price: High to Low', value: 'price_high_to_low' },
    { title: 'Popular', label: 'Popular', value: 'popular' },
    { title: 'Rating', label: 'Rating', value: 'ratings' }
  ]

  const sheet = isOpen && mounted && (
    <>
      <div
        className={cn('fixed inset-0 z-[200]', isDark ? 'bg-black/70' : 'bg-slate-900/45')}
        onClick={() => setIsOpen(false)}
        aria-hidden='true'
      />

      <div
        className={cn(
          // Escape shop header/backdrop-filter ancestors via portal; safe-area for notched devices
          'fixed inset-y-0 right-0 z-[201] flex h-[100dvh] max-h-[100dvh] w-full flex-col shadow-2xl sm:w-[min(380px,92vw)]',
          'pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)]',
          isDark
            ? 'border-l border-slate-700 bg-slate-950 text-slate-100'
            : 'border-l border-border bg-card text-card-foreground'
        )}
        role='dialog'
        aria-modal='true'
        aria-label='Filters'
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-between border-b px-4 py-3 sm:py-4',
            isDark ? 'border-slate-700' : 'border-border'
          )}
        >
          <Typography weight='semibold' className={isDark ? 'text-slate-100' : 'text-card-foreground'}>
            Filters
          </Typography>
          <button
            type='button'
            onClick={() => setIsOpen(false)}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md transition-colors',
              isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-label='Close filters'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:p-6'>
          <div className='flex flex-col gap-2'>
            <Typography className={isDark ? 'text-slate-300' : 'text-muted-foreground'} weight='semibold'>
              Sort & popularity
            </Typography>
            <div className='flex w-full flex-col gap-3 sm:flex-row sm:gap-2'>
              <div className='min-w-0 flex-1'>
                <CustomSelect
                  placeholder='All'
                  showSearch={false}
                  staticOptions={sortOptions}
                  className={cn(
                    'w-full min-w-0',
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-100 data-[placeholder]:text-slate-400'
                      : 'border-border bg-background text-foreground data-[placeholder]:text-muted-foreground'
                  )}
                  value={(filters?.sortBy as string) || 'all'}
                  onChange={(value) => setFilter('sortBy', value === 'all' ? undefined : value)}
                />
              </div>

              <div className='min-w-0 flex-1'>
                <CustomSelect
                  placeholder='Popularity'
                  showSearch={false}
                  staticOptions={[
                    { label: 'All', title: 'All', value: 'all' },
                    { label: 'Most Popular', title: 'Most Popular', value: 'asc' },
                    { label: 'Least Popular', title: 'Least Popular', value: 'desc' }
                  ]}
                  value={(filters.popularity as string) || 'all'}
                  className={cn(
                    'w-full min-w-0',
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-100 data-[placeholder]:text-slate-400'
                      : 'border-border bg-background text-foreground data-[placeholder]:text-muted-foreground'
                  )}
                  onChange={(value) => setFilter('popularity', value === 'all' ? undefined : value)}
                />
              </div>
            </div>
          </div>

          <ShopSidebar mode={isDark ? 'dark' : 'light'} />
        </div>

        <div
          className={cn(
            'shrink-0 border-t p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4',
            isDark ? 'border-slate-700' : 'border-border'
          )}
        >
          <Button
            variant='secondary'
            className={cn(
              'min-h-11 w-full border sm:min-h-10',
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                : 'border-border bg-secondary text-secondary-foreground hover:bg-muted'
            )}
            onClick={() => setIsOpen(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='icon'
        onClick={() => setIsOpen(true)}
        className={cn(
          'h-11 w-11 shrink-0 rounded-xl border shadow-none',
          'border-[rgba(129,140,248,0.22)] bg-[rgba(129,140,248,0.10)] text-[#a78bfa]',
          'hover:border-[rgba(167,139,250,0.35)] hover:bg-[rgba(129,140,248,0.18)] hover:text-[#c4b5fd]',
          'dark:border-[rgba(129,140,248,0.22)] dark:bg-[rgba(129,140,248,0.10)]'
        )}
        aria-label='Open filters'
      >
        <Funnel className='size-5' strokeWidth={2} />
      </Button>

      {sheet ? createPortal(sheet, document.body) : null}
    </>
  )
}
