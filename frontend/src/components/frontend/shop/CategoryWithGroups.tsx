'use client'

import CustomImage from '@/components/common/CustomImage'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { getPublicProductsPriceQuery, getPublicProductsSortQuery } from '@/lib/shopProductQuery'
import { ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import ProductCardSkeleton from './ProductCardSkeleton'

const ProductCard = dynamic(() => import('@/components/card/ProductCard'), {
  loading: () => <ProductCardSkeleton />
})

type Category = { id: number; name: string; icon?: string | null; meta?: { icon?: string } | null }
type Group = {
  id: number
  name: string
  slug?: string | null
  category?: { name?: string; icon?: string | null } | null
  meta?: { icon?: string } | null
  _count?: { products?: number }
  itemCount?: number
}

const getPublicGroupSlug = (g: Group) => {
  if (g?.slug) return g.slug
  return String(g?.name || '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

export default function CategoryWithGroups() {
  const { filters, setFilters, setFilter, clearFilters } = useFilter(10)
  const search = (filters.search as string)?.trim() || ''
  const selectedCategoryId =
    filters.categoryForGroups != null ? String(filters.categoryForGroups) : undefined
  const selectedGroupId = filters.groupId != null ? String(filters.groupId) : undefined

  // ── Data fetching ─────────────────────────────────────────────────────────
  // Root categories only; groups remain nested under their category.
  const { data: catData, loading: catLoading } = useAsync(
    `/categories?isRoot=true&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    true,
    true,
    true,
    5000
  )

  // Groups for selected category (or search across all).
  const groupsKeyFn = () => {
    if (selectedCategoryId)
      return `/product-groups?categoryId=${selectedCategoryId}&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`
    if (search) return `/product-groups?limit=100&search=${encodeURIComponent(search)}`
    return null
  }
  const { data: groupsData, loading: groupsLoading } = useAsync(groupsKeyFn, true, true, true, 5000)

  // Products for selected group (map UI sort URL params → API sortBy/sortOrder)
  const productExtraQuery = `${getPublicProductsSortQuery(filters)}${getPublicProductsPriceQuery(filters)}`

  const productsKeyFn = () => {
    if (selectedGroupId)
      return `/products?groupId=${selectedGroupId}&limit=24${search ? `&search=${encodeURIComponent(search)}` : ''}${productExtraQuery}`
    if (search && !selectedCategoryId && !selectedGroupId)
      return `/products?search=${encodeURIComponent(search)}&limit=24${productExtraQuery}`
    return null
  }
  const { data: productsData, loading: productsLoading } = useAsync(productsKeyFn)

  // ── Derived data ──────────────────────────────────────────────────────────
  const categories: Category[] = catData?.data?.categories ?? []
  const productGroups: Group[] = (() => {
    const raw = groupsData?.data
    if (Array.isArray(raw)) return raw
    return (raw as any)?.productGroups ?? []
  })()
  const products: any[] = productsData?.data?.products ?? []

  const selectedCategory = categories.find((c) => String(c.id) === selectedCategoryId)
  const selectedGroup = productGroups.find((g) => String(g.id) === selectedGroupId)

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'page' && key !== 'limit' && filters[key] !== undefined && filters[key] !== ''
  )

  const categoryIcon = (c: any) => c?.icon || c?.meta?.icon || null
  const groupIcon = (g: any) => g?.meta?.icon || g?.category?.icon || null
  const getGroupStats = (g: any) => g?.itemCount ?? g?._count?.products ?? null

  const handleCategorySelect = (catId: string) => {
    // catId is '' when accordion closes (collapsible), set undefined in that case
    setFilters({ categoryForGroups: catId ? parseInt(catId, 10) : undefined, groupId: undefined })
  }
  const handleGroupClick = (groupId: number | string) => setFilter('groupId', String(groupId))

  // View modes
  const showProducts =
    Boolean(selectedGroupId) || (Boolean(search) && !selectedCategoryId && !selectedGroupId)
  const showGroups = Boolean(selectedCategoryId) && !selectedGroupId
  const showCategories = !selectedCategoryId && !selectedGroupId && !search

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .cgw-root { font-family: var(--font-manrope),'Manrope',system-ui,sans-serif; }
        .cgw-root h1,.cgw-root h2,.cgw-root h3,.cgw-root h4,.cgw-root h5 { font-family: var(--font-manrope),'Manrope',system-ui,sans-serif; }

        /* ── Sidebar panel ── */
        .cgw-sidebar-panel {
          background: linear-gradient(160deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.025) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .cgw-sidebar-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        /* ── Category row ── */
        .cgw-cat-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; border-radius: 12px; cursor: pointer;
          font-weight: 600; font-size: 13.5px; letter-spacing: 0.01em;
          color: rgba(220,220,240,0.78);
          transition: background 0.18s, color 0.18s, box-shadow 0.18s;
        }
        .cgw-cat-row:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .cgw-cat-row.active {
          background: linear-gradient(90deg,rgba(129,140,248,0.22) 0%,rgba(167,139,250,0.14) 100%);
          color: #a78bfa;
          box-shadow: inset 0 0 0 1px rgba(167,139,250,0.25);
        }
        /* ── Group sub-row ── */
        .cgw-sub-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 12px 7px 14px; border-radius: 10px; cursor: pointer;
          font-size: 12.5px; font-weight: 500; color: rgba(200,200,220,0.65);
          transition: background 0.15s, color 0.15s;
        }
        .cgw-sub-row:hover { background: rgba(255,255,255,0.05); color: rgba(220,220,255,0.9); }
        .cgw-sub-row.active { background: rgba(129,140,248,0.15); color: #a78bfa; }
        /* ── Icon badge ── */
        .cgw-icon-badge {
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px; width: 28px; height: 28px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); flex-shrink: 0;
        }
        /* ── Breadcrumb ── */
        .cgw-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 12px; margin-bottom: 18px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          font-size: 12px; font-weight: 500; color: rgba(180,180,210,0.50);
        }
        .cgw-breadcrumb-link {
          color: rgba(180,180,210,0.50); cursor: pointer; transition: color 0.15s;
        }
        .cgw-breadcrumb-link:hover { color: #a78bfa; }
        .cgw-breadcrumb-active { color: rgba(220,220,245,0.85); font-weight: 600; }
        /* ── Group/Category cards ── */
        .cgw-card {
          position: relative; border-radius: 20px; padding: 22px; overflow: hidden;
          cursor: pointer; text-decoration: none; display: block;
          transition: transform 0.22s cubic-bezier(.22,.68,0,1.2), box-shadow 0.22s ease;
          background: linear-gradient(145deg,rgba(255,255,255,0.065) 0%,rgba(255,255,255,0.025) 100%);
          border: 1px solid rgba(255,255,255,0.11);
          box-shadow: 0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.09);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }
        .cgw-card::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 50%,rgba(129,140,248,0.06) 100%);
          opacity: 0; transition: opacity 0.25s ease;
        }
        .cgw-card::after {
          content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg,rgba(167,139,250,0.5) 0%,rgba(129,140,248,0.3) 40%,transparent 70%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; opacity: 0; transition: opacity 0.25s ease;
        }
        .cgw-card:hover { transform: translateY(-4px) scale(1.012); box-shadow: 0 20px 60px rgba(0,0,0,0.40), 0 0 40px rgba(129,140,248,0.12), inset 0 1px 0 rgba(255,255,255,0.14); }
        .cgw-card:hover::before { opacity: 1; }
        .cgw-card:hover::after  { opacity: 1; }
        /* category card button variant */
        .cgw-cat-card { border: none; text-align: left; width: 100%; font-family: var(--font-manrope),'Manrope',system-ui,sans-serif; }
        /* ── Card icon wrapper ── */
        .cgw-card-icon {
          width: 46px; height: 46px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          background: linear-gradient(145deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 4px 14px rgba(0,0,0,0.28), 0 0 0 4px rgba(255,255,255,0.03);
          transition: transform 0.22s cubic-bezier(.22,.68,0,1.2), box-shadow 0.22s ease;
        }
        .cgw-card:hover .cgw-card-icon { transform: scale(1.10) rotate(-3deg); box-shadow: 0 8px 22px rgba(0,0,0,0.36), 0 0 18px rgba(129,140,248,0.18); }
        /* ── Badge pill ── */
        .cgw-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 500; letter-spacing: 0.01em; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); color: rgba(200,200,220,0.65); }
        .cgw-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(167,139,250,0.7); }
        .cgw-badge-dot-green { background: rgba(52,211,153,0.7); }
        /* ── Arrow icon ── */
        .cgw-arrow { position: absolute; bottom: 18px; right: 18px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); opacity: 0; transform: translate(4px,-4px); transition: opacity 0.22s ease, transform 0.22s ease; }
        .cgw-card:hover .cgw-arrow { opacity: 1; transform: translate(0,0); }
        /* ── Ambient glow on card hover ── */
        .cgw-glow { position: absolute; top: -30%; left: -20%; width: 160%; height: 160%; border-radius: 50%; background: radial-gradient(ellipse at 30% 30%,rgba(129,140,248,0.13),transparent 65%); opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .cgw-card:hover .cgw-glow { opacity: 1; }
        /* ── Reset button ── */
        .cgw-reset-btn { font-size: 11.5px; font-weight: 600; letter-spacing: 0.03em; color: #a78bfa; background: rgba(167,139,250,0.10); border: 1px solid rgba(167,139,250,0.22); border-radius: 999px; padding: 3px 12px; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .cgw-reset-btn:hover { background: rgba(167,139,250,0.20); color: #c4b5fd; }
        /* ── Skeleton shimmer ── */
        .cgw-skel { border-radius: 14px; background: linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 100%); background-size: 200% 100%; animation: cgw-shimmer 1.6s ease-in-out infinite; }
        @keyframes cgw-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        /* ── Empty state ── */
        .cgw-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 24px; border-radius: 20px; background: rgba(255,255,255,0.025); border: 1px dashed rgba(255,255,255,0.10); color: rgba(200,200,220,0.45); font-size: 14px; font-weight: 500; }
        .cgw-empty-icon { width: 48px; height: 48px; opacity: 0.35; }
        /* ── Group header banner ── */
        .cgw-group-header { position: relative; border-radius: 20px; padding: 20px 24px; overflow: hidden; background: linear-gradient(135deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.022) 100%); border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 12px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.10); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); margin-bottom: 24px; }
        .cgw-group-header::after { content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; border-radius: inherit; background: linear-gradient(100deg,rgba(129,140,248,0.55) 0%,rgba(167,139,250,0.30) 30%,transparent 60%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; padding: 1px; pointer-events: none; }
        .cgw-group-header-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: linear-gradient(145deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 6px 20px rgba(0,0,0,0.28),0 0 20px rgba(129,140,248,0.12); }
        /* ── Prompt state ── */
        .cgw-prompt { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 24px; border-radius: 20px; background: rgba(255,255,255,0.022); border: 1px dashed rgba(255,255,255,0.09); text-align: center; }
        .cgw-prompt-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); margin-bottom: 4px; }
      `}</style>

      <div className='cgw-root relative'>
        <div
          className='pointer-events-none absolute inset-0 -z-10'
          style={{
            background:
              'radial-gradient(900px 300px at 5% -5%,rgba(99,102,241,0.13),transparent 55%), radial-gradient(700px 300px at 95% 5%,rgba(217,70,239,0.09),transparent 52%), radial-gradient(500px 260px at 50% 100%,rgba(129,140,248,0.06),transparent 60%)'
          }}
        />

        <div className='flex gap-6 w-full'>
          {/* ── Sidebar ── */}
          <div className='hidden lg:block w-full lg:w-[260px] shrink-0 mt-3'>
            {(catLoading || categories.length > 0) && (
              <div className='cgw-sidebar-panel'>
                <div className='cgw-sidebar-header'>
                  <div className='flex items-center gap-2'>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
                        display: 'inline-block',
                        flexShrink: 0,
                        boxShadow: '0 0 8px rgba(167,139,250,0.6)'
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-manrope)',
                        fontWeight: 700,
                        fontSize: 13.5,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(220,220,245,0.90)'
                      }}
                    >
                      Categories
                    </span>
                  </div>
                  {hasActiveFilters && (
                    <button className='cgw-reset-btn' onClick={clearFilters}>
                      Reset
                    </button>
                  )}
                </div>

                <div className='p-3'>
                  {catLoading ? (
                    <div className='space-y-2'>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className='cgw-skel' style={{ height: 38 }} />
                      ))}
                    </div>
                  ) : (
                    <Accordion
                      type='single'
                      collapsible
                      className='w-full space-y-[2px]'
                      value={selectedCategoryId || ''}
                      onValueChange={handleCategorySelect}
                    >
                      {categories.map((cat) => {
                        const isCatSelected = selectedCategoryId === String(cat.id)
                        const icon = categoryIcon(cat)

                        return (
                          <AccordionItem key={cat.id} value={String(cat.id)} className='border-0'>
                            <AccordionTrigger
                              className={`cgw-cat-row hover:no-underline w-full ${isCatSelected ? 'active' : ''}`}
                              style={{ textDecoration: 'none' }}
                            >
                              {icon && (
                                <div className='cgw-icon-badge'>
                                  <CustomImage
                                    src={icon}
                                    alt={cat.name}
                                    width={16}
                                    height={16}
                                    className='object-contain'
                                  />
                                </div>
                              )}
                              <span style={{ flex: 1, textAlign: 'left' }}>{cat.name}</span>
                            </AccordionTrigger>

                            <AccordionContent className='pb-1 pt-0 px-1'>
                              {isCatSelected ? (
                                groupsLoading ? (
                                  <div className='space-y-1 pl-2 pt-1'>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <div key={i} className='cgw-skel' style={{ height: 30 }} />
                                    ))}
                                  </div>
                                ) : productGroups.length > 0 ? (
                                  <div className='flex flex-col gap-[2px] pl-2 border-l border-white/[0.07] ml-[13px] mt-[2px]'>
                                    {productGroups.map((g) => {
                                      const isActive = selectedGroupId === String(g.id)
                                      const gIcon = groupIcon(g)
                                      const stats = getGroupStats(g)
                                      return (
                                        <button
                                          key={g.id}
                                          className={`cgw-sub-row ${isActive ? 'active' : ''}`}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer'
                                          }}
                                          onClick={() => handleGroupClick(g.id)}
                                        >
                                          {gIcon && (
                                            <CustomImage
                                              src={gIcon}
                                              alt={g.name}
                                              width={14}
                                              height={14}
                                              className='object-contain opacity-70 shrink-0'
                                            />
                                          )}
                                          <span className='truncate flex-1'>{g.name}</span>
                                          {stats !== null && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: 'rgba(180,180,210,0.38)',
                                                marginLeft: 'auto',
                                                flexShrink: 0
                                              }}
                                            >
                                              {stats}
                                            </span>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div
                                    className='cgw-sub-row'
                                    style={{ cursor: 'default', opacity: 0.4 }}
                                  >
                                    No groups in this category
                                  </div>
                                )
                              ) : null}
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Main content area ── */}
          <div className='flex-1 mt-3 min-w-0'>
            {/* Breadcrumb */}
            {(selectedCategoryId || selectedGroupId) && (
              <div className='cgw-breadcrumb mb-4'>
                <button
                  className='cgw-breadcrumb-link'
                  onClick={() => setFilters({ categoryForGroups: undefined, groupId: undefined })}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    color: 'inherit'
                  }}
                >
                  All
                </button>
                {selectedCategory && (
                  <>
                    <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                    <button
                      className={`cgw-breadcrumb-link ${!selectedGroupId ? 'cgw-breadcrumb-active' : ''}`}
                      onClick={() => setFilter('groupId', undefined as any)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: selectedGroupId ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                        fontSize: 'inherit'
                      }}
                    >
                      {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedGroup && (
                  <>
                    <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                    <span className='cgw-breadcrumb-active truncate'>{selectedGroup.name}</span>
                  </>
                )}
              </div>
            )}

            {/* ── Products view (group selected or search) ── */}
            {showProducts && (
              <>
                {selectedGroup && (
                  <div className='cgw-group-header'>
                    <div
                      className='pointer-events-none absolute inset-0'
                      style={{
                        background:
                          'radial-gradient(600px 200px at 0% 0%,rgba(99,102,241,0.12),transparent 55%), radial-gradient(500px 220px at 100% 100%,rgba(167,139,250,0.07),transparent 55%)'
                      }}
                    />
                    <div className='relative flex items-center gap-4'>
                      {groupIcon(selectedGroup) && (
                        <div className='cgw-group-header-icon'>
                          <CustomImage
                            src={groupIcon(selectedGroup)!}
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
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        className='hidden sm:flex'
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
                )}

                {productsLoading ? (
                  <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                ) : products.length > 0 ? (
                  <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
                    {products.map((p: any) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                ) : (
                  <div className='cgw-empty'>
                    <svg className='cgw-empty-icon' viewBox='0 0 48 48' fill='none'>
                      <rect
                        x='6'
                        y='10'
                        width='36'
                        height='28'
                        rx='6'
                        stroke='currentColor'
                        strokeWidth='2'
                      />
                      <path d='M6 18h36' stroke='currentColor' strokeWidth='2' />
                    </svg>
                    {search ? 'No matching products found' : 'No products in this group yet'}
                  </div>
                )}
              </>
            )}

            {/* ── Groups view (category selected) ── */}
            {showGroups &&
              (groupsLoading ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className='cgw-skel' style={{ height: 110 }} />
                  ))}
                </div>
              ) : productGroups.length > 0 ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {productGroups.map((g, idx) => {
                    const stats = getGroupStats(g)
                    const icon = groupIcon(g)
                    return (
                      <button
                        key={g.id}
                        className='cgw-card cgw-cat-card'
                        style={{ animationDelay: `${idx * 40}ms` }}
                        onClick={() => handleGroupClick(g.id)}
                      >
                        <div className='cgw-glow' />
                        <div className='relative flex flex-col gap-4'>
                          <div className='flex items-start gap-3'>
                            {icon && (
                              <div className='cgw-card-icon'>
                                <CustomImage
                                  src={icon}
                                  alt={g.name}
                                  width={24}
                                  height={24}
                                  className='object-contain'
                                />
                              </div>
                            )}
                            <div className='flex flex-col gap-1 min-w-0 pt-1'>
                              <span
                                style={{
                                  fontFamily: 'var(--font-manrope)',
                                  fontWeight: 700,
                                  fontSize: 15,
                                  lineHeight: 1.25,
                                  color: 'rgba(235,235,255,0.95)',
                                  letterSpacing: '0.01em'
                                }}
                              >
                                {g.name}
                              </span>
                            </div>
                          </div>
                          {stats !== null && (
                            <div className='flex flex-wrap gap-2'>
                              <div className='cgw-badge'>
                                <div className='cgw-badge-dot cgw-badge-dot-green' />
                                {stats} {stats !== 1 ? 'items' : 'item'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className='cgw-arrow'>
                          <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                            <path
                              d='M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8'
                              stroke='rgba(220,220,255,0.75)'
                              strokeWidth='1.4'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className='cgw-empty'>
                  <svg className='cgw-empty-icon' viewBox='0 0 48 48' fill='none'>
                    <rect
                      x='6'
                      y='10'
                      width='36'
                      height='28'
                      rx='6'
                      stroke='currentColor'
                      strokeWidth='2'
                    />
                    <path d='M6 18h36' stroke='currentColor' strokeWidth='2' />
                  </svg>
                  No groups in this category
                </div>
              ))}

            {/* ── Categories overview (default / nothing selected) ── */}
            {showCategories &&
              (catLoading ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className='cgw-skel' style={{ height: 110 }} />
                  ))}
                </div>
              ) : categories.length > 0 ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  {categories.map((cat, idx) => {
                    const icon = categoryIcon(cat)
                    return (
                      <button
                        key={cat.id}
                        className='cgw-card cgw-cat-card'
                        style={{ animationDelay: `${idx * 40}ms` }}
                        onClick={() => handleCategorySelect(String(cat.id))}
                      >
                        <div className='cgw-glow' />
                        <div className='relative flex flex-col gap-4'>
                          <div className='flex items-start gap-3'>
                            {icon && (
                              <div className='cgw-card-icon'>
                                <CustomImage
                                  src={icon}
                                  alt={cat.name}
                                  width={24}
                                  height={24}
                                  className='object-contain'
                                />
                              </div>
                            )}
                            <div className='flex flex-col gap-1 min-w-0 pt-1'>
                              <span
                                style={{
                                  fontFamily: 'var(--font-manrope)',
                                  fontWeight: 700,
                                  fontSize: 15,
                                  lineHeight: 1.25,
                                  color: 'rgba(235,235,255,0.95)',
                                  letterSpacing: '0.01em'
                                }}
                              >
                                {cat.name}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: 'rgba(180,180,210,0.40)',
                                  letterSpacing: '0.04em',
                                  fontWeight: 400
                                }}
                              >
                                Browse groups →
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='cgw-arrow'>
                          <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                            <path
                              d='M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8'
                              stroke='rgba(220,220,255,0.75)'
                              strokeWidth='1.4'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className='cgw-empty'>
                  <svg className='cgw-empty-icon' viewBox='0 0 48 48' fill='none'>
                    <rect
                      x='6'
                      y='10'
                      width='36'
                      height='28'
                      rx='6'
                      stroke='currentColor'
                      strokeWidth='2'
                    />
                    <path d='M6 18h36' stroke='currentColor' strokeWidth='2' />
                    <circle cx='14' cy='14' r='2' fill='currentColor' />
                    <circle cx='20' cy='14' r='2' fill='currentColor' />
                  </svg>
                  No categories available
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
