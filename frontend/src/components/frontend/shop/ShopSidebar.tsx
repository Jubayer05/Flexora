'use client'
import CustomImage from '@/components/common/CustomImage'
import CustomInput from '@/components/common/CustomInput'
import { Typography } from '@/components/common/typography'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

export default function ShopSidebar({ mode = 'dark' }: { mode?: 'light' | 'dark' }) {
  const { filters, setFilter, setFilters, clearFilters } = useFilter(10)
  const search = (filters.search as string)?.trim() || ''

  const selectedCategoryId = filters.categoryForGroups != null ? String(filters.categoryForGroups) : undefined
  const selectedGroupId = filters.groupId != null ? String(filters.groupId) : undefined

  const { data, loading } = useAsync(
    `/categories?isRoot=true&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    true, true, true, 5000
  )

  const { data: groupsData, loading: groupsLoading } = useAsync(
    () => selectedCategoryId
      ? `/product-groups?categoryId=${selectedCategoryId}&limit=100`
      : null,
    true, true, true, 5000
  )
  const productGroups: any[] = (() => {
    const raw = groupsData?.data
    if (Array.isArray(raw)) return raw
    return (raw as any)?.productGroups ?? []
  })()

  const panelClassName =
    mode === 'dark'
      ? 'space-y-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-100'
      : 'space-y-3 rounded-lg border border-border bg-card text-card-foreground'
  const panelHeaderClassName =
    mode === 'dark'
      ? 'flex justify-between items-center gap-3 border-slate-700 border-b px-4 py-3'
      : 'flex justify-between items-center gap-3 border-border border-b px-4 py-3'
  const inputClassName =
    mode === 'dark'
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-400 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      : 'border-border bg-background text-foreground placeholder:text-muted-foreground text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
  const labelClassName = mode === 'dark' ? 'block font-semibold text-slate-200' : 'block font-semibold text-foreground'
  const skeletonClassName = mode === 'dark' ? 'bg-slate-700 rounded w-full h-4 animate-pulse' : 'bg-muted rounded w-full h-4 animate-pulse'

  // Check if there are any active filters
  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'page' && key !== 'limit' && filters[key] !== undefined && filters[key] !== ''
  )

  const categoryIcon = (category: any) => category?.icon || category?.meta?.icon || null
  const groupIcon = (g: any) => g?.meta?.icon || g?.category?.icon || null

  return (
    <div className='space-y-6 w-full'>
      {/* Category → Group Filter */}
      {(loading || (data?.data?.categories?.length ?? 0) > 0) && (
        <div className={panelClassName}>
          <div className={panelHeaderClassName}>
            <Typography variant='h5' weight='semibold'>
              Browse
            </Typography>
            {hasActiveFilters && (
              <Button
                variant='link'
                size='sm'
                className='font-semibold text-primary text-sm'
                onClick={clearFilters}
              >
                Reset all
              </Button>
            )}
          </div>

          <div className='px-2 pb-2'>
            {loading ? (
              <div className='space-y-2'>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className={skeletonClassName} />
                ))}
              </div>
            ) : (
              <Accordion
                type='single'
                collapsible
                className='w-full'
                value={selectedCategoryId || ''}
                onValueChange={(val) => {
                  setFilters({ categoryForGroups: val ? parseInt(val, 10) : undefined, groupId: undefined })
                }}
              >
                {data?.data?.categories?.map((category: any) => {
                  const isCategorySelected = selectedCategoryId === String(category.id)
                  const icon = categoryIcon(category)

                  return (
                    <AccordionItem key={category.id} value={String(category.id)} className='border-0'>
                      <AccordionTrigger
                        className={`flex items-center hover:bg-primary/5 px-3 py-1.5 font-semibold text-base hover:no-underline ${
                          isCategorySelected ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          {icon && (
                            <CustomImage src={icon} alt={category.name} width={20} height={20} className='size-5 rounded object-contain' />
                          )}
                          <span>{category.name}</span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className='px-2 pb-1 pt-0'>
                        {isCategorySelected ? (
                          groupsLoading ? (
                            <div className='space-y-1 pl-3'>
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className={skeletonClassName} />
                              ))}
                            </div>
                          ) : productGroups.length > 0 ? (
                            <div className='flex flex-col gap-1 pl-3 border-l border-primary/15 ml-2'>
                              {productGroups.map((g: any) => {
                                const isActive = selectedGroupId === String(g.id)
                                const gIcon = groupIcon(g)
                                return (
                                  <button
                                    key={g.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                                    }`}
                                    onClick={() => setFilter('groupId', String(g.id))}
                                  >
                                    {gIcon && (
                                      <CustomImage src={gIcon} alt={g.name} width={14} height={14} className='size-3.5 rounded object-contain opacity-70 shrink-0' />
                                    )}
                                    <span className='truncate flex-1'>{g.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <p className='pl-3 py-2 text-xs text-muted-foreground'>No groups available</p>
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

      {/* Price Filter */}
      <div className={panelClassName}>
        <div className={panelHeaderClassName}>
          <Typography variant='h5' weight='semibold'>
            Filter Product
          </Typography>
          {hasActiveFilters && (
            <Button
              variant='link'
              size='sm'
              className='font-semibold text-primary text-sm'
              onClick={clearFilters}
            >
              Reset all
            </Button>
          )}
        </div>

        <div className='space-y-4 p-4'>
          <div className='space-y-1.5'>
            <label className={labelClassName}>Price Range:</label>
            <div className='flex gap-2'>
              <CustomInput
                type='number'
                placeholder='Min'
                value={(filters.minPrice as number) || ''}
                onChange={(e) =>
                  setFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className={inputClassName}
              />
              <CustomInput
                type='number'
                placeholder='Max'
                value={(filters.maxPrice as number) || ''}
                onChange={(e) =>
                  setFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className={inputClassName}
                // inputMode='numeric'
                // pattern='[0-9]*'
                // onWheel={(e) => (e.target as HTMLInputElement).blur()}
                // style={{ MozAppearance: 'textfield' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
