'use client'

import { Pagination } from '@/components/common/Pagination'
import { Section } from '@/components/common/section'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { getPublicProductsPriceQuery, getPublicProductsSortQuery } from '@/lib/shopProductQuery'
import { useMemo, useState } from 'react'
import ProductCard from '../../card/ProductCard'
import AllProductSearchBar from './AllProductSearchBar'
import ProductCardSkeleton from './ProductCardSkeleton'

export default function AllProducts() {
  const { filters: urlFilters, page, limit, setPage } = useFilter(10)
  const [filters, setFilters] = useState<any>({})

  const mergedFilters = useMemo(() => ({ ...urlFilters, ...filters }), [urlFilters, filters])

  const search = (mergedFilters.search as string)?.trim() || ''
  const query =
    `/products?page=${page}&limit=${limit}` +
    (search ? `&search=${encodeURIComponent(search)}` : '') +
    getPublicProductsSortQuery(mergedFilters) +
    getPublicProductsPriceQuery(mergedFilters)

  const { data, loading } = useAsync(() => query)

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'page' && key !== 'limit' && filters[key] !== undefined && filters[key] !== ''
  )

  // if (!data?.data?.products?.length) {
  //   return null // Don't render the section if there are no products
  // }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .ap-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }
        .ap-root h1,.ap-root h2,.ap-root h3,.ap-root h4,.ap-root h5 {
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
        }

        .ap-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px 28px;
          border-radius: 20px;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 12px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.10);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          overflow: hidden;
        }
        .ap-header::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(100deg, rgba(99,102,241,0.45) 0%, rgba(236,72,153,0.22) 30%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        .ap-header-badge {
          display: flex; align-items: center;
          padding: 4px 14px;
          border-radius: 999px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: rgba(199, 210, 254, 0.95);
          text-transform: uppercase;
          flex-shrink: 0;
          gap: 6px;
        }

        .ap-header-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 8px rgba(129,140,248,0.70);
          display: inline-block;
          animation: ap-pulse 2s ease-in-out infinite;
        }

        @keyframes ap-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(129,140,248,0.70); }
          50% { opacity: 0.65; box-shadow: 0 0 14px rgba(129,140,248,0.45); }
        }

        .ap-reset-btn {
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.03em;
          color: #a78bfa;
          background: rgba(167,139,250,0.10);
          border: 1px solid rgba(167,139,250,0.22);
          border-radius: 999px;
          padding: 4px 12px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .ap-reset-btn:hover { background: rgba(167,139,250,0.20); color: #c4b5fd; }

        .ap-panel {
          background: linear-gradient(160deg, rgba(255,255,255,0.042) 0%, rgba(255,255,255,0.016) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 24px;
        }

        .ap-empty {
          padding: 28px 16px;
          text-align: center;
          color: rgba(190,190,215,0.55);
          font-size: 13px;
          font-weight: 600;
        }
      `}</style>

      <Section className='ap-root space-y-5 relative' variant={'lg'}>
        <div
          className='pointer-events-none absolute inset-0 -z-10'
          style={{
            background:
              'radial-gradient(900px 260px at 85% 0%, rgba(99,102,241,0.08), transparent 60%), radial-gradient(700px 280px at 10% 30%, rgba(236,72,153,0.06), transparent 58%)'
          }}
        />

        <div className='ap-header'>
          <div
            className='pointer-events-none absolute inset-0'
            style={{
              background:
                'radial-gradient(520px 150px at 50% 0%, rgba(99,102,241,0.08), transparent 55%)'
            }}
          />

          <div className='relative flex items-center gap-3'>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🛍️</span>
            <span
              style={{
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '0.01em',
                color: 'rgba(235,235,255,0.96)'
              }}
            >
              All Products
            </span>
          </div>

          <div className='relative flex items-center gap-2' style={{ marginLeft: 'auto' }}>
            {hasActiveFilters && (
              <button
                className='ap-reset-btn'
                onClick={() => {
                  setFilters({})
                  setPage(1)
                }}
              >
                Reset
              </button>
            )}
            <div className='ap-header-badge'>
              <span className='ap-header-dot' />
              Browse
            </div>
          </div>
        </div>

        <AllProductSearchBar filters={filters} onFiltersChange={setFilters} />

        <div className='ap-panel'>
          <div className='gap-3 xl:gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
            ) : data?.data?.products ? (
              data?.data?.products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className='ap-empty'>No products found</div>
            )}
          </div>
        </div>

        {data?.data?.pagination && (
          <Pagination paginationData={data.data.pagination} pageSizeOptions={[10, 20, 30, 50]} />
        )}
      </Section>
    </>
  )
}
