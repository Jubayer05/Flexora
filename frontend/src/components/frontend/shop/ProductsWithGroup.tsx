import dynamic from 'next/dynamic'
import { useCallback, useMemo } from 'react'

import CustomImage from '@/components/common/CustomImage'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import ProductCardSkeleton from './ProductCardSkeleton'

const ProductCard = dynamic(() => import('@/components/card/ProductCard'), {
  loading: () => <ProductCardSkeleton />
})

export default function ProductsWithGroup() {
  const { filters, setFilter, clearFilters } = useFilter(10)
  const search = (filters.search as string)?.trim() || ''
  const selectedCategoryForGroups = filters.categoryForGroups

  const { data: groupsData, loading: groupsLoading } = useAsync(
    () =>
      `/product-groups?limit=100${
        selectedCategoryForGroups ? `&categoryId=${selectedCategoryForGroups}` : ''
      }${search ? `&search=${encodeURIComponent(search)}` : ''}`
  )

  const productsUrl = filters.groupId
    ? `/products?groupId=${filters.groupId}&limit=24` +
      (search ? `&search=${encodeURIComponent(search)}` : '')
    : search
      ? `/products?search=${encodeURIComponent(search)}&limit=24`
      : null
  const { data: productsData, loading: productsLoading } = useAsync(() => productsUrl)

  const productGroups = useMemo(() => {
    const raw = groupsData?.data
    if (Array.isArray(raw)) return raw
    return (raw as { productGroups?: unknown[] })?.productGroups ?? []
  }, [groupsData?.data])

  const products = productsData?.data?.products || []
  const selectedGroupId = filters.groupId != null ? String(filters.groupId) : undefined
  const isSearchResultsMode = !selectedGroupId && Boolean(search)

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some((key) => key !== 'page' && key !== 'limit' && filters[key])
  }, [filters])

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return undefined
    return productGroups.find((group: any) => String(group.id) === selectedGroupId)
  }, [productGroups, selectedGroupId])

  const groupIcon = useCallback((group: any) => {
    return group?.meta?.icon || group?.category?.icon || null
  }, [])

  const handleGroupSelect = useCallback(
    (groupId: string | number) => {
      setFilter('groupId', String(groupId))
    },
    [setFilter]
  )

  const getGroupStats = (group: any) => {
    const itemCount = group?.itemCount ?? group?._count?.products ?? null
    if (itemCount !== null) return itemCount
    return null
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .pwg-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }
        .pwg-root h1,.pwg-root h2,.pwg-root h3,.pwg-root h4,.pwg-root h5 { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }

        /* ── Sidebar panel ── */
        .pwg-sidebar {
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
        }

        .pwg-sidebar-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }

        .pwg-reset-btn {
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.03em;
          color: #a78bfa;
          background: rgba(167,139,250,0.10);
          border: 1px solid rgba(167,139,250,0.22);
          border-radius: 999px;
          padding: 3px 12px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .pwg-reset-btn:hover { background: rgba(167,139,250,0.20); color: #c4b5fd; }

        /* ── Group row button ── */
        .pwg-group-btn {
          width: 100%; text-align: left;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, transform 0.14s;
          outline: none;
        }
        .pwg-group-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.10);
        }
        .pwg-group-btn:focus-visible {
          box-shadow: 0 0 0 2px rgba(167,139,250,0.45);
        }
        .pwg-group-btn.active {
          background: linear-gradient(90deg, rgba(129,140,248,0.20) 0%, rgba(167,139,250,0.12) 100%);
          border-color: rgba(167,139,250,0.28);
          box-shadow: inset 0 0 0 1px rgba(167,139,250,0.15);
        }
        .pwg-group-btn:hover { transform: translateX(2px); }
        .pwg-group-btn.active:hover { transform: translateX(2px); }

        /* ── Group icon ── */
        .pwg-group-icon {
          width: 36px; height: 36px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.13);
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          transition: background 0.18s, box-shadow 0.18s;
        }
        .pwg-group-btn.active .pwg-group-icon {
          background: rgba(129,140,248,0.18);
          box-shadow: 0 4px 14px rgba(0,0,0,0.22), 0 0 14px rgba(129,140,248,0.18);
        }

        /* ── Badge count ── */
        .pwg-count-badge {
          margin-left: auto; flex-shrink: 0;
          font-size: 10.5px; font-weight: 600;
          color: rgba(190,190,215,0.60);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 999px;
          padding: 1.5px 8px;
          letter-spacing: 0.02em;
          transition: color 0.18s, background 0.18s;
        }
        .pwg-group-btn.active .pwg-count-badge {
          color: #a78bfa;
          background: rgba(167,139,250,0.12);
          border-color: rgba(167,139,250,0.22);
        }

        /* ── Active indicator bar ── */
        .pwg-active-bar {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 60%; border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #818cf8, #a78bfa);
          box-shadow: 0 0 10px rgba(129,140,248,0.6);
          opacity: 0; transition: opacity 0.18s;
        }
        .pwg-group-btn.active .pwg-active-bar { opacity: 1; }

        /* ── Skeleton shimmer ── */
        .pwg-skel {
          border-radius: 14px;
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: pwg-shimmer 1.6s ease-in-out infinite;
        }
        @keyframes pwg-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* ── Group header banner ── */
        .pwg-group-header {
          position: relative; border-radius: 20px;
          padding: 20px 24px; overflow: hidden;
          background: linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 12px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.10);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          margin-bottom: 24px;
        }
        .pwg-group-header::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(100deg, rgba(129,140,248,0.55) 0%, rgba(167,139,250,0.30) 30%, transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
        }

        .pwg-group-header-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 6px 20px rgba(0,0,0,0.28), 0 0 20px rgba(129,140,248,0.12);
        }

        /* ── Empty / prompt state ── */
        .pwg-state-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; padding: 80px 24px;
          border-radius: 20px;
          background: rgba(255,255,255,0.022);
          border: 1px dashed rgba(255,255,255,0.09);
          text-align: center;
        }
        .pwg-state-icon {
          width: 52px; height: 52px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          margin-bottom: 4px;
        }
      `}</style>

      <div className='pwg-root relative'>
        {/* Scene ambient light */}
        <div
          className='pointer-events-none absolute inset-0 -z-10'
          style={{
            background:
              'radial-gradient(900px 260px at 15% 0%, rgba(99,102,241,0.12), transparent 60%), radial-gradient(820px 280px at 95% 20%, rgba(14,165,233,0.07), transparent 58%), radial-gradient(600px 300px at 50% 100%, rgba(167,139,250,0.05), transparent 60%)'
          }}
        />

        <div className='flex gap-6 w-full'>
          {/* ─── Sidebar ─── */}
          <div className='hidden lg:block w-[260px] flex-shrink-0'>
            <div className='pwg-sidebar'>
              {/* Header */}
              <div className='pwg-sidebar-header'>
                <div className='flex items-center gap-2'>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'inline-block',
                      background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
                      boxShadow: '0 0 8px rgba(167,139,250,0.6)'
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-manrope)',
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: 'rgba(220,220,245,0.90)'
                    }}
                  >
                    Product Groups
                  </span>
                </div>
                {hasActiveFilters && (
                  <button className='pwg-reset-btn' onClick={clearFilters}>
                    Reset
                  </button>
                )}
              </div>

              {/* Group list */}
              <div className='p-3'>
                {groupsLoading ? (
                  <div className='space-y-2 pt-1'>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className='pwg-skel' style={{ height: 52 }} />
                    ))}
                  </div>
                ) : productGroups.length > 0 ? (
                  <div className='flex flex-col gap-1 pt-1'>
                    {productGroups.map((group: any) => {
                      const isActive = selectedGroupId === String(group.id)
                      const stats = getGroupStats(group)
                      const icon = groupIcon(group)

                      return (
                        <button
                          key={group.id}
                          className={`pwg-group-btn ${isActive ? 'active' : ''}`}
                          style={{ position: 'relative' }}
                          onClick={() => handleGroupSelect(String(group.id))}
                        >
                          {/* Active bar */}
                          <div className='pwg-active-bar' />

                          <div className='flex items-center gap-3'>
                            {icon && (
                              <div className='pwg-group-icon'>
                                <CustomImage
                                  src={icon}
                                  alt={group.name}
                                  width={18}
                                  height={18}
                                  className='object-contain'
                                />
                              </div>
                            )}
                            <div className='flex flex-col min-w-0 flex-1'>
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  lineHeight: 1.3,
                                  color: isActive ? '#c4b5fd' : 'rgba(220,220,245,0.85)',
                                  fontFamily: 'var(--font-manrope)',
                                  transition: 'color 0.15s'
                                }}
                              >
                                {group.name}
                              </span>
                              {group.category?.name && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: 'rgba(180,180,210,0.42)',
                                    fontWeight: 400,
                                    lineHeight: 1.3
                                  }}
                                >
                                  {group.category.name}
                                </span>
                              )}
                            </div>
                            {stats !== null && <div className='pwg-count-badge'>{stats}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '28px 16px',
                      textAlign: 'center',
                      color: 'rgba(190,190,215,0.45)',
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {search ? 'No matching groups found' : 'No groups available'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Products area ─── */}
          <div className='flex-1 min-w-0'>
            {selectedGroupId || isSearchResultsMode ? (
              <>
                {/* Group header banner */}
                {selectedGroup ? (
                  <div className='pwg-group-header'>
                    {/* Ambient radial overlays */}
                    <div
                      className='pointer-events-none absolute inset-0'
                      style={{
                        background:
                          'radial-gradient(600px 200px at 0% 0%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(500px 220px at 100% 100%, rgba(167,139,250,0.07), transparent 55%)'
                      }}
                    />

                    <div className='relative flex items-center gap-4'>
                      {groupIcon(selectedGroup) && (
                        <div className='pwg-group-header-icon'>
                          <CustomImage
                            src={groupIcon(selectedGroup)}
                            alt={selectedGroup.name}
                            width={26}
                            height={26}
                            className='object-contain'
                          />
                        </div>
                      )}
                      <div className='flex flex-col min-w-0'>
                        <span
                          style={{
                            fontFamily: 'var(--font-manrope)',
                            fontWeight: 700,
                            fontSize: 17,
                            lineHeight: 1.2,
                            color: 'rgba(235,235,255,0.96)',
                            letterSpacing: '0.01em'
                          }}
                        >
                          {selectedGroup.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            color: 'rgba(190,190,215,0.55)',
                            marginTop: 3,
                            fontWeight: 400
                          }}
                        >
                          {productsLoading
                            ? 'Loading products…'
                            : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
                        </span>
                      </div>

                      {/* Decorative pill */}
                      <div
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          padding: '4px 14px',
                          borderRadius: 999,
                          background: 'rgba(129,140,248,0.12)',
                          border: '1px solid rgba(129,140,248,0.22)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#a78bfa',
                          textTransform: 'uppercase' as const
                        }}
                        className='hidden sm:flex items-center gap-1.5'
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#818cf8',
                            boxShadow: '0 0 6px rgba(129,140,248,0.7)',
                            display: 'inline-block'
                          }}
                        />
                        Active
                      </div>
                    </div>
                  </div>
                ) : isSearchResultsMode ? (
                  <div className='pwg-group-header'>
                    <div
                      className='pointer-events-none absolute inset-0'
                      style={{
                        background:
                          'radial-gradient(600px 200px at 0% 0%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(500px 220px at 100% 100%, rgba(167,139,250,0.07), transparent 55%)'
                      }}
                    />

                    <div className='relative flex items-center gap-4'>
                      <div className='pwg-group-header-icon'>
                        <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
                          <circle
                            cx='11'
                            cy='11'
                            r='6.5'
                            stroke='rgba(235,235,255,0.8)'
                            strokeWidth='1.8'
                          />
                          <path
                            d='M16 16L20 20'
                            stroke='rgba(235,235,255,0.8)'
                            strokeWidth='1.8'
                            strokeLinecap='round'
                          />
                        </svg>
                      </div>
                      <div className='flex flex-col min-w-0'>
                        <span
                          style={{
                            fontFamily: 'var(--font-manrope)',
                            fontWeight: 700,
                            fontSize: 17,
                            lineHeight: 1.2,
                            color: 'rgba(235,235,255,0.96)',
                            letterSpacing: '0.01em'
                          }}
                        >
                          Search Results for &quot;{search}&quot;
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            color: 'rgba(190,190,215,0.55)',
                            marginTop: 3,
                            fontWeight: 400
                          }}
                        >
                          {productsLoading
                            ? 'Loading matching products…'
                            : `${products.length} related product${products.length !== 1 ? 's' : ''} found`}
                        </span>
                      </div>

                      <div
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          padding: '4px 14px',
                          borderRadius: 999,
                          background: 'rgba(129,140,248,0.12)',
                          border: '1px solid rgba(129,140,248,0.22)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#a78bfa',
                          textTransform: 'uppercase' as const
                        }}
                        className='hidden sm:flex items-center gap-1.5'
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#818cf8',
                            boxShadow: '0 0 6px rgba(129,140,248,0.7)',
                            display: 'inline-block'
                          }}
                        />
                        Search
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Products grid */}
                {productsLoading ? (
                  <div className='gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                ) : products.length > 0 ? (
                  <div className='gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
                    {products.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className='pwg-state-box'>
                    <div className='pwg-state-icon'>
                      <svg width='22' height='22' viewBox='0 0 24 24' fill='none'>
                        <path
                          d='M3 7h18M3 12h18M3 17h10'
                          stroke='rgba(200,200,230,0.35)'
                          strokeWidth='2'
                          strokeLinecap='round'
                        />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-manrope)',
                        fontWeight: 700,
                        fontSize: 16,
                        color: 'rgba(220,220,245,0.80)'
                      }}
                    >
                      No products found
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(180,180,210,0.48)', maxWidth: 260 }}>
                      This group doesn&apos;t have any products yet.
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
