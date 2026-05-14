'use client'
import { Section } from '@/components/common/section'
import useAsync from '@/hooks/useAsync'
import { useMemo } from 'react'
import ProductCard from '../../card/ProductCard'

type TopTenConfig = {
  mode?: 'auto' | 'manual'
  productIds?: number[]
}

export default function TopTenProducts() {
  const { data: settingsData } = useAsync<{ data?: { value?: TopTenConfig | null } }>(
    () => '/settings/key/shop_top_ten_products'
  )

  const config = settingsData?.data?.value ?? null
  const manualIds = useMemo(
    () =>
      Array.from(
        new Set(
          (config?.productIds ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      ).slice(0, 10),
    [config?.productIds]
  )
  const isManualMode = config?.mode === 'manual' && manualIds.length > 0

  const { data, loading } = useAsync(() =>
    isManualMode
      ? `/products?ids=${manualIds.join(',')}&limit=10&page=1`
      : '/products?limit=10&page=1&sortBy=soldCount&sortOrder=desc'
  )

  const products = useMemo(() => {
    const fetchedProducts = data?.data?.products ?? []
    if (!isManualMode) return fetchedProducts

    const orderMap = new Map(manualIds.map((id, index) => [id, index]))
    return [...fetchedProducts].sort(
      (a: any, b: any) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
    )
  }, [data?.data?.products, isManualMode, manualIds])

  if (!loading && !products.length) {
    return null
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .ttp-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }
        .ttp-root h1,.ttp-root h2,.ttp-root h3,.ttp-root h4,.ttp-root h5 {
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
        }

        /* ── Section header ── */
        .ttp-header {
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
        .ttp-header::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(100deg, rgba(251,113,53,0.50) 0%, rgba(251,146,60,0.28) 30%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        .ttp-header-badge {
          display: flex; align-items: center; gap-6px;
          padding: 4px 14px;
          border-radius: 999px;
          background: rgba(251,113,53,0.12);
          border: 1px solid rgba(251,113,53,0.25);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #fb923c;
          text-transform: uppercase;
          flex-shrink: 0;
          gap: 6px;
        }

        .ttp-header-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #f97316;
          box-shadow: 0 0 8px rgba(249,115,22,0.70);
          display: inline-block;
          animation: ttp-pulse 2s ease-in-out infinite;
        }

        @keyframes ttp-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(249,115,22,0.70); }
          50% { opacity: 0.65; box-shadow: 0 0 14px rgba(249,115,22,0.45); }
        }

        /* ── Rank badge on each card slot ── */
        .ttp-rank-wrapper {
          position: relative;
        }
        .ttp-rank-badge {
          position: absolute;
          top: -8px; left: -8px; z-index: 10;
          width: 26px; height: 26px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          letter-spacing: -0.02em;
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.32);
          border: 1px solid rgba(255,255,255,0.15);
          pointer-events: none;
          transition: transform 0.18s;
        }
        .ttp-rank-badge-top {
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
        }
        .ttp-rank-badge-mid {
          background: linear-gradient(135deg, rgba(129,140,248,0.30) 0%, rgba(167,139,250,0.18) 100%);
          color: rgba(220,220,245,0.85);
          border-color: rgba(167,139,250,0.25);
        }
        .ttp-rank-wrapper:hover .ttp-rank-badge { transform: scale(1.08); }

        /* ── Skeleton shimmer ── */
        .ttp-skel {
          border-radius: 14px;
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: ttp-shimmer 1.6s ease-in-out infinite;
        }
        @keyframes ttp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Panel wrapper ── */
        .ttp-panel {
          background: linear-gradient(160deg, rgba(255,255,255,0.042) 0%, rgba(255,255,255,0.016) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 24px;
        }
      `}</style>

      <Section className='ttp-root space-y-5 relative' variant='lg'>
        {/* Ambient background */}
        <div
          className='pointer-events-none absolute inset-0 -z-10'
          style={{
            background:
              'radial-gradient(900px 260px at 80% 0%, rgba(251,113,53,0.08), transparent 60%), radial-gradient(700px 280px at 10% 30%, rgba(99,102,241,0.07), transparent 58%)'
          }}
        />

        {/* ── Section header ── */}
        <div className='ttp-header'>
          {/* Ambient overlay */}
          <div
            className='pointer-events-none absolute inset-0'
            style={{
              background:
                'radial-gradient(500px 140px at 50% 0%, rgba(251,113,53,0.08), transparent 55%)'
            }}
          />

          <div className='relative flex items-center gap-3'>
            <span style={{ fontSize: 26, lineHeight: 1 }}>🔥</span>
            <span
              style={{
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '0.01em',
                color: 'rgba(235,235,255,0.96)'
              }}
            >
              Top 10 Products
            </span>
          </div>

          <div className='ttp-header-badge relative' style={{ marginLeft: 'auto' }}>
            <span className='ttp-header-dot' />
            Trending
          </div>
        </div>

        {/* ── Product grid ── */}
        <div className='ttp-panel'>
          <div className='gap-3 xl:gap-5 grid grid-cols-1 md:grid-cols-2'>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className='ttp-skel' style={{ height: 180 }} />
                ))
              : products.map((product: any, index: number) => {
                  const rank = index + 1
                  const isTopThree = rank <= 3

                  return (
                    <div key={product.id} className='ttp-rank-wrapper'>
                      {/* Rank badge */}
                      <div
                        className={`ttp-rank-badge ${isTopThree ? 'ttp-rank-badge-top' : 'ttp-rank-badge-mid'}`}
                      >
                        {rank}
                      </div>

                      <ProductCard variant='compact' product={product} />
                    </div>
                  )
                })}
          </div>
        </div>
      </Section>
    </>
  )
}
