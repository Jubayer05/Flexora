'use client'
import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { X } from 'lucide-react'
import { Dispatch, SetStateAction, useState } from 'react'

interface FilterState {
  minPrice?: number
  maxPrice?: number
  productType?: string
  popularity?: string
}

interface AllProductSearchBarProps {
  filters: FilterState
  onFiltersChange: Dispatch<SetStateAction<FilterState>>
}

export default function AllProductSearchBar({
  filters,
  onFiltersChange
}: AllProductSearchBarProps) {
  const [priceError, setPriceError] = useState<string>('')

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange((prev) => ({ ...prev, [key]: value }))
  }

  const handlePriceChange = (key: 'minPrice' | 'maxPrice', value: string) => {
    const numValue = value ? parseInt(value) : undefined
    setPriceError('')
    if (key === 'minPrice') {
      if (numValue && filters.maxPrice && numValue > filters.maxPrice) {
        setPriceError('Min price cannot exceed max price')
        return
      }
      updateFilter(key, numValue)
    } else {
      if (numValue && filters.minPrice && numValue < filters.minPrice) {
        setPriceError('Max price cannot be less than min price')
        return
      }
      updateFilter(key, numValue)
    }
  }

  const resetFilters = () => {
    onFiltersChange({})
    setPriceError('')
  }

  const hasActiveFilters =
    filters.minPrice ||
    filters.maxPrice ||
    (filters.popularity && filters.popularity !== 'all')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .apsb-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }

        /* ── Main panel ── */
        .apsb-panel {
          position: relative;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.09);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .apsb-panel::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(100deg, rgba(129,140,248,0.42) 0%, rgba(167,139,250,0.20) 35%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        /* ── Inner padding area ── */
        .apsb-body {
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        @media (min-width: 1024px) {
          .apsb-body {
            flex-direction: row;
            align-items: flex-end;
            gap: 16px;
          }
        }

        /* ── Field group ── */
        .apsb-field { display: flex; flex-direction: column; gap: 7px; flex: 1; }

        /* ── Label ── */
        .apsb-label {
          font-size: 11px; font-weight: 700;
          color: rgba(180,180,210,0.50);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ── Vertical divider ── */
        .apsb-vdivider {
          width: 1px; height: 52px; flex-shrink: 0;
          background: rgba(255,255,255,0.07);
          align-self: flex-end;
          margin-bottom: 2px;
        }

        /* ── Price inputs row ── */
        .apsb-price-row { display: flex; gap: 8px; align-items: center; }
        .apsb-price-sep {
          font-size: 11px; font-weight: 600;
          color: rgba(180,180,210,0.30);
          flex-shrink: 0;
        }

        /* ── Error message ── */
        .apsb-error {
          font-size: 11px; font-weight: 600;
          color: #fca5a5;
          display: flex; align-items: center; gap: 4px;
          margin-top: 2px;
        }

        /* ── Reset button ── */
        .apsb-reset-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.03em;
          color: #a78bfa;
          background: rgba(167,139,250,0.10);
          border: 1px solid rgba(167,139,250,0.22);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          white-space: nowrap;
          align-self: flex-end;
          height: 38px;
          flex-shrink: 0;
        }
        .apsb-reset-btn:hover {
          background: rgba(167,139,250,0.18);
          border-color: rgba(167,139,250,0.35);
          color: #c4b5fd;
        }

        /* ── Active filter indicator bar ── */
        .apsb-active-bar {
          height: 2px;
          background: linear-gradient(90deg, rgba(129,140,248,0.70), rgba(167,139,250,0.40), transparent);
          border-radius: 0 0 20px 20px;
          transition: opacity 0.20s;
        }
      `}</style>

      <div className='apsb-root apsb-panel'>
        {/* Ambient light */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              'radial-gradient(700px 180px at 0% 100%, rgba(99,102,241,0.07), transparent 55%), radial-gradient(500px 180px at 100% 0%, rgba(167,139,250,0.05), transparent 55%)'
          }}
        />

        <div className='apsb-body relative'>
          {/* ── Price Range ── */}
          <div className='apsb-field'>
            <span className='apsb-label'>Price Range</span>
            <div className='apsb-price-row'>
              <CustomInput
                type='number'
                placeholder='Min'
                value={filters.minPrice || ''}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                className='flex-1'
                style={{
                  background: 'rgba(255,255,255,0.045)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 10,
                  color: 'rgba(220,220,245,0.90)',
                  fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 500
                }}
              />
              <span className='apsb-price-sep'>—</span>
              <CustomInput
                type='number'
                placeholder='Max'
                value={filters.maxPrice || ''}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                className='flex-1'
                style={{
                  background: 'rgba(255,255,255,0.045)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 10,
                  color: 'rgba(220,220,245,0.90)',
                  fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 500
                }}
              />
            </div>
            {priceError && (
              <span className='apsb-error'>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                  <circle cx='6' cy='6' r='5.5' stroke='#fca5a5' strokeWidth='1' />
                  <path
                    d='M6 3.5v3M6 8v.5'
                    stroke='#fca5a5'
                    strokeWidth='1.2'
                    strokeLinecap='round'
                  />
                </svg>
                {priceError}
              </span>
            )}
          </div>

          {/* Desktop divider */}
          <div className='apsb-vdivider hidden lg:block' />

          {/* ── Popularity ── */}
          <div className='apsb-field'>
            <span className='apsb-label'>Popularity</span>
            <CustomSelect
              placeholder='ALL'
              showSearch={false}
              staticOptions={[
                { label: 'ALL', title: 'ALL', value: 'all' },
                { label: 'Most Popular', title: 'Most Popular', value: 'asc' },
                { label: 'Least Popular', title: 'Least Popular', value: 'desc' }
              ]}
              className='w-full'
              value={filters.popularity || 'all'}
              onChange={(value) => updateFilter('popularity', value)}
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                color: 'rgba(220,220,245,0.85)',
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 500
              }}
            />
          </div>

          {/* ── Reset (when active filters exist) ── */}
          {hasActiveFilters && (
            <button className='apsb-reset-btn' onClick={resetFilters}>
              <X size={13} strokeWidth={2.5} />
              Reset
            </button>
          )}
        </div>

        {/* Active filters accent bar */}
        {hasActiveFilters && <div className='apsb-active-bar' />}
      </div>
    </>
  )
}
