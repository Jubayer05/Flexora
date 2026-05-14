'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { useFilter } from '@/hooks/useFilter'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ShopFilterSheet from './ShopFilterSheet'

const SEARCH_DEBOUNCE_MS = 300

export default function ShopHeader() {
  const { filters, setFilter } = useFilter(10)
  const searchFromUrl = (filters.search as string) ?? ''
  const [searchValue, setSearchValue] = useState(searchFromUrl)

  useEffect(() => {
    setSearchValue(searchFromUrl)
  }, [searchFromUrl])

  const debouncedSetSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (debouncedSetSearchRef.current) clearTimeout(debouncedSetSearchRef.current)
    }
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setSearchValue(value)
      if (debouncedSetSearchRef.current) clearTimeout(debouncedSetSearchRef.current)
      debouncedSetSearchRef.current = setTimeout(() => {
        setFilter('search', value.trim() || undefined)
        debouncedSetSearchRef.current = null
      }, SEARCH_DEBOUNCE_MS)
    },
    [setFilter]
  )

  const sortOptions = [
    { title: 'All', label: 'All', value: 'all' },
    { title: 'Newest', label: 'Newest', value: 'newest' },
    { title: 'Oldest', label: 'Oldest', value: 'oldest' },
    { title: 'Price: Low to High', label: 'Price: Low to High', value: 'price_low_to_high' },
    { title: 'Price: High to Low', label: 'Price: High to Low', value: 'price_high_to_low' },
    { title: 'Popular', label: 'Popular', value: 'popular' },
    { title: 'Rating', label: 'Rating', value: 'ratings' }
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .sh-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }

        /* ── Header panel ── */
        .sh-panel {
          position: relative;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.09);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 14px 18px;
          overflow: hidden;
        }
        @media (max-width: 1023px) {
          .sh-panel {
            border-radius: 16px;
            padding: 12px 14px;
          }
        }

        /* ── Search input wrapper ── */
        .sh-search-wrap {
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .sh-panel::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(100deg, rgba(129,140,248,0.42) 0%, rgba(167,139,250,0.20) 35%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        /* ── Search icon ── */
        .sh-search-icon {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(180,180,210,0.40);
          pointer-events: none;
          display: flex; align-items: center;
        }

        /* ── Divider ── */
        .sh-vdivider {
          width: 1px; height: 28px; flex-shrink: 0;
          background: rgba(255,255,255,0.08);
        }

        /* ── Label ── */
        .sh-label {
          font-size: 12px; font-weight: 600;
          color: rgba(180,180,210,0.50);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Mobile filter button (legacy hook if wrapping trigger) ── */
        .sh-filter-btn {
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; flex-shrink: 0;
          border-radius: 12px;
          background: rgba(129,140,248,0.10);
          border: 1px solid rgba(129,140,248,0.22);
          color: #a78bfa;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .sh-filter-btn:hover {
          background: rgba(129,140,248,0.18);
          border-color: rgba(167,139,250,0.35);
        }
      `}</style>

      <div className='sh-root sh-panel'>
        {/* Ambient light */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              'radial-gradient(700px 200px at 0% 50%, rgba(99,102,241,0.07), transparent 55%), radial-gradient(500px 180px at 100% 50%, rgba(167,139,250,0.05), transparent 55%)'
          }}
        />

        <div className='relative flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-3'>
          {/* ── Search + mobile filters ── */}
          <div className='flex w-full min-w-0 items-stretch gap-2 lg:flex-1 lg:items-center'>
            <div className='sh-search-wrap min-w-0'>
              <CustomInput
                type='text'
                placeholder='Search products…'
                value={searchValue}
                onChange={handleSearchChange}
                inputClassName='min-h-11 h-11 py-0 pr-10 text-[16px] sm:text-[13.5px] border-transparent bg-transparent focus:border-transparent'
                className='w-full min-w-0'
                style={{
                  background: 'rgba(255,255,255,0.045)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12,
                  color: 'rgba(220,220,245,0.90)',
                  fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                  fontWeight: 500
                }}
              />
              <span className='sh-search-icon'>
                <Search size={16} />
              </span>
            </div>

            <div className='flex shrink-0 items-stretch lg:hidden'>
              <ShopFilterSheet />
            </div>
          </div>

          {/* ── Vertical divider (desktop) ── */}
          <div className='sh-vdivider hidden lg:block' />

          {/* ── Sort controls ── */}
          <div className='hidden lg:flex items-center gap-3'>
            <span className='sh-label'>Sort by</span>

            <CustomSelect
              placeholder='All'
              showSearch={false}
              staticOptions={sortOptions}
              className='min-w-[152px]'
              value={(filters?.sortBy as string) || 'all'}
              onChange={(value) => setFilter('sortBy', value === 'all' ? undefined : value)}
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                color: 'rgba(220,220,245,0.85)',
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 500
              }}
            />

            <div className='sh-vdivider' />

            <CustomSelect
              placeholder='Popularity'
              showSearch={false}
              staticOptions={[
                { label: 'All', title: 'All', value: 'all' },
                { label: 'Most Popular', title: 'Most Popular', value: 'asc' },
                { label: 'Least Popular', title: 'Least Popular', value: 'desc' }
              ]}
              value={(filters.popularity as string) || 'all'}
              className='min-w-[152px]'
              onChange={(value) => setFilter('popularity', value === 'all' ? undefined : value)}
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                color: 'rgba(220,220,245,0.85)',
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 500
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
