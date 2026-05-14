'use client'

import ProductCard from '@/components/card/ProductCard'
import TestimonialCard from '@/components/card/TestimonialCard'
import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { PageDetails } from '@/lib/validations/schemas/mainNavSchema'
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Control, Controller, useFieldArray, UseFormWatch } from 'react-hook-form'
import TextEditor from '../../common/TextEditor'

type BuilderProps = {
  control: Control<PageDetails>
  watch: UseFormWatch<PageDetails>
}

const sectionTypes = [
  'hero',
  'text',
  'image',
  'video',
  'cta',
  'features',
  'products',
  'testimonial',
  'categories'
] as const

export default function ContentSectionsBuilder({ control, watch }: BuilderProps) {
  const {
    fields: sectionFields,
    append,
    remove,
    move
  } = useFieldArray({
    control,
    name: 'content.sections' as const
  })

  // HTML5 drag-n-drop state for reordering
  let dragIndex = -1
  let overIndex = -1

  const handleDuplicate = (index: number) => {
    const items = watch('content.sections') || []
    const clone = { ...(items[index] || {}) }
    append(clone)
  }

  return (
    <Card>
      <CardHeader className='flex md:flex-row flex-col md:justify-between md:items-center gap-4'>
        <CardTitle>Content Sections</CardTitle>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='secondary'
            onClick={() => append(defaultSectionConfig('text'))}
          >
            <Plus className='mr-2 w-4 h-4' /> Add Section
          </Button>
        </div>
      </CardHeader>
      <CardContent className='gap-6 grid grid-cols-1 md:grid-cols-[260px,1fr]'>
        {/* Palette Sidebar */}
        <div className='bg-background/40 p-3 border rounded-md'>
          <div className='mb-2 font-medium text-sm'>Widgets</div>
          <div className='gap-2 grid grid-cols-2'>
            {sectionTypes.map((t) => (
              <Button
                key={t}
                type='button'
                size='sm'
                variant='outline'
                onClick={() => append(defaultSectionConfig(t))}
                className='justify-start capitalize'
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Canvas with draggable list */}
        <div
          className='space-y-3'
          onDragOver={(e) => {
            e.preventDefault()
          }}
        >
          {sectionFields.map((field, index) => {
            const typeName = `content.sections.${index}.type` as const
            const typeValue = watch(typeName)
            return (
              <div
                key={field.id}
                className='bg-background p-4 border rounded-md'
                draggable
                onDragStart={() => {
                  dragIndex = index
                }}
                onDragEnter={() => {
                  overIndex = index
                }}
                onDragEnd={() => {
                  if (dragIndex !== -1 && overIndex !== -1 && dragIndex !== overIndex) {
                    move(dragIndex, overIndex)
                  }
                  dragIndex = -1
                  overIndex = -1
                }}
              >
                <div className='flex justify-between items-center gap-3'>
                  <div className='flex items-center gap-2 text-muted-foreground'>
                    <GripVertical className='w-5 h-5' />
                    <span className='text-sm'>
                      #{index + 1}: {field?.type ? `${field.type.toUpperCase()} -` : ''} Section
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      onClick={() => handleDuplicate(index)}
                    >
                      <Copy className='w-4 h-4' />
                    </Button>
                    <Button type='button' size='sm' variant='ghost' onClick={() => remove(index)}>
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>

                <div className='space-y-4 pt-6'>
                  <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
                    <Controller
                      control={control}
                      name={typeName}
                      render={({ field }) => (
                        <CustomInput
                          type='select'
                          label='Type'
                          name={`content.sections.${index}.type`}
                          value={(field.value as string) ?? ''}
                          onValueChange={field.onChange as any}
                          options={sectionTypes.map((t) => ({
                            value: t,
                            label: t?.toLocaleUpperCase()
                          }))}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name={`content.sections.${index}.heading` as const}
                      render={({ field }) => (
                        <CustomInput
                          label='Heading'
                          name={`content.sections.${index}.heading`}
                          value={field.value ?? ''}
                          onChange={field.onChange as any}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name={`content.sections.${index}.subheading` as const}
                      render={({ field }) => (
                        <CustomInput
                          label='Subheading'
                          name={`content.sections.${index}.subheading`}
                          value={field.value ?? ''}
                          onChange={field.onChange as any}
                        />
                      )}
                    />
                  </div>

                  {typeValue === 'image' && (
                    <div className='mt-3'>
                      <Controller
                        control={control}
                        name={`content.sections.${index}.image` as const}
                        render={({ field }) => (
                          <FileUploader
                            label='Image URL'
                            value={field.value || undefined}
                            onChangeAction={field.onChange}
                            maxAllow={1}
                            size='small'
                          />
                        )}
                      />
                    </div>
                  )}

                  {typeValue === 'video' && (
                    <div className='mt-3'>
                      <Controller
                        control={control}
                        name={`content.sections.${index}.video` as const}
                        render={({ field }) => (
                          <CustomInput
                            label='Video URL'
                            name={`content.sections.${index}.video`}
                            placeholder='https://...'
                            value={field.value ?? ''}
                            onChange={field.onChange as any}
                          />
                        )}
                      />
                    </div>
                  )}

                  {typeValue === 'cta' && (
                    <div className='gap-4 grid grid-cols-1 md:grid-cols-2 mt-3'>
                      <Controller
                        control={control}
                        name={`content.sections.${index}.buttonText` as const}
                        render={({ field }) => (
                          <CustomInput
                            label='Button Text'
                            name={`content.sections.${index}.buttonText`}
                            value={field.value ?? ''}
                            onChange={field.onChange as any}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.buttonLink` as const}
                        render={({ field }) => (
                          <CustomInput
                            label='Button Link'
                            name={`content.sections.${index}.buttonLink`}
                            value={field.value ?? ''}
                            onChange={field.onChange as any}
                          />
                        )}
                      />
                    </div>
                  )}

                  {(typeValue === 'products' ||
                    typeValue === 'testimonial' ||
                    typeValue === 'categories') && (
                    <div className='gap-4 grid grid-cols-1 md:grid-cols-2 mt-3'>
                      <Controller
                        control={control}
                        name={`content.sections.${index}.apiEndpoint` as const}
                        render={({ field }) => (
                          <CustomInput
                            label='API Endpoint'
                            name={`content.sections.${index}.apiEndpoint`}
                            placeholder='/api/v2/products'
                            value={field.value ?? ''}
                            onChange={field.onChange as any}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.dataPath` as const}
                        render={({ field }) => (
                          <CustomInput
                            label='Data Path'
                            name={`content.sections.${index}.dataPath`}
                            placeholder='data?.data?.products (optional chaining supported)'
                            value={field.value ?? ''}
                            onChange={field.onChange as any}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.variant` as const}
                        render={({ field }) => (
                          <CustomInput
                            type='select'
                            label='Variant'
                            name={`content.sections.${index}.variant`}
                            value={(field.value as string) ?? ''}
                            onValueChange={field.onChange as any}
                            options={[
                              { value: 'default', label: 'Default' },
                              { value: 'compact', label: 'Compact' },
                              { value: 'fancy', label: 'Fancy (testimonials)' }
                            ]}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.layout` as const}
                        render={({ field }) => (
                          <CustomInput
                            type='select'
                            label='Layout'
                            name={`content.sections.${index}.layout`}
                            value={(field.value as string) ?? 'grid'}
                            onValueChange={field.onChange as any}
                            options={[
                              { value: 'grid', label: 'Grid' },
                              { value: 'carousel', label: 'Carousel' }
                            ]}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.columns` as const}
                        render={({ field }) => (
                          <CustomInput
                            type='select'
                            label='Columns'
                            name={`content.sections.${index}.columns`}
                            value={String(field.value ?? '4')}
                            onValueChange={(v: any) => field.onChange(Number(v))}
                            options={[1, 2, 3, 4, 5, 6].map((n) => ({
                              value: String(n),
                              label: `${n}`
                            }))}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`content.sections.${index}.limit` as const}
                        render={({ field }) => (
                          <CustomInput
                            type='number'
                            label='Limit'
                            name={`content.sections.${index}.limit`}
                            placeholder='e.g. 8'
                            value={field.value as any}
                            onChange={(e: any) => field.onChange(Number(e.target.value))}
                          />
                        )}
                      />
                    </div>
                  )}

                  {typeValue === 'features' && (
                    <div className='space-y-3 mt-3'>
                      <FeaturesItemsBuilder control={control} index={index} />
                    </div>
                  )}

                  {/* Type-specific fields */}
                  {typeValue !== 'products' &&
                    typeValue !== 'testimonial' &&
                    typeValue !== 'categories' &&
                    typeValue !== 'features' && (
                      <div className='mt-3'>
                        <Controller
                          control={control}
                          name={`content.sections.${index}.content` as const}
                          render={({ field }) => (
                            <div className='space-y-4'>
                              <TextEditor
                                label='Content'
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder='Write page content here'
                              />
                            </div>
                          )}
                        />
                      </div>
                    )}
                </div>
                {/* <Tabs defaultValue='content' className='mt-4'>
                  <TabsList>
                    <TabsTrigger value='content'>Content</TabsTrigger>
                    <TabsTrigger value='preview'>Preview</TabsTrigger>
                  </TabsList>
             
                  <TabsContent value='preview'>
                    <LivePreview sectionIndex={index} watch={watch} />
                  </TabsContent>
                </Tabs> */}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function FeaturesItemsBuilder({
  control,
  index
}: {
  control: Control<PageDetails>
  index: number
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `content.sections.${index}.items` as any
  })

  return (
    <Card>
      <CardHeader className='flex flex-row justify-between items-center p-3'>
        <CardTitle className='text-sm'>Features Items</CardTitle>
        <Button
          type='button'
          size='sm'
          variant='secondary'
          onClick={() => append({ icon: '', title: '', description: '' } as any)}
        >
          <Plus className='mr-2 w-4 h-4' /> Add Item
        </Button>
      </CardHeader>
      <CardContent className='space-y-3'>
        {fields.length === 0 && (
          <div className='text-muted-foreground text-sm'>No items yet. Add your first feature.</div>
        )}
        {fields.map((item, itemIndex) => (
          <div key={item.id} className='gap-3 grid grid-cols-1 md:grid-cols-3'>
            <Controller
              control={control}
              name={`content.sections.${index}.items.${itemIndex}.icon` as const}
              render={({ field }) => (
                <CustomInput
                  label='Icon'
                  name={`content.sections.${index}.items.${itemIndex}.icon`}
                  placeholder='shield, bolt, ...'
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                />
              )}
            />
            <Controller
              control={control}
              name={`content.sections.${index}.items.${itemIndex}.title` as const}
              render={({ field }) => (
                <CustomInput
                  label='Title'
                  name={`content.sections.${index}.items.${itemIndex}.title`}
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                />
              )}
            />
            <Controller
              control={control}
              name={`content.sections.${index}.items.${itemIndex}.description` as const}
              render={({ field }) => (
                <CustomInput
                  label='Description'
                  name={`content.sections.${index}.items.${itemIndex}.description`}
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                />
              )}
            />
            <div className='md:col-span-3'>
              <Button type='button' size='sm' variant='ghost' onClick={() => remove(itemIndex)}>
                <Trash2 className='mr-2 w-4 h-4' /> Remove
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Helpers / Preview
function defaultSectionConfig(type: (typeof sectionTypes)[number]) {
  if (type === 'products' || type === 'testimonial' || type === 'categories') {
    return {
      type,
      heading: '',
      subheading: '',
      apiEndpoint: '',
      // Default to the top-level "data" object; we'll auto-pick arrays within
      dataPath: 'data',
      variant: 'default',
      layout: 'grid' as const,
      columns: 4,
      limit: 8
    }
  }
  if (type === 'features') {
    return {
      type,
      heading: '',
      subheading: '',
      items: []
    }
  }
  // basic types
  return { type, heading: '', subheading: '', content: '' }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LivePreview({
  sectionIndex,
  watch
}: {
  sectionIndex: number
  watch: UseFormWatch<PageDetails>
}) {
  const base = watch(`content.sections.${sectionIndex}` as const) as any
  const type = base?.type as string
  const heading = base?.heading as string
  const subheading = base?.subheading as string

  const isDynamic = type === 'products' || type === 'testimonial' || type === 'categories'
  const shouldFetch = Boolean(isDynamic && base?.apiEndpoint)
  const { data, loading: isLoading, error } = useAsync(shouldFetch ? base.apiEndpoint : null)
  
  // Helper: robust path resolver supporting optional chaining (?.) and bracket indices ([0])
  const getByPath = (obj: any, path?: string): any => {
    if (obj == null) return undefined
    if (!path) return obj

    const normalized = path
      .replace(/\s+/g, '')
      .replace(/\?\./g, '.')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/^\./, '')

    const parts = normalized.split('.').filter(Boolean)
    let acc: any = obj
    for (let seg of parts) {
      if (seg.endsWith('?')) seg = seg.slice(0, -1)
      if (acc == null) return undefined
      if (Array.isArray(acc) && /^\d+$/.test(seg)) {
        acc = acc[Number(seg)]
      } else {
        acc = acc[seg as keyof typeof acc]
      }
    }
    return acc
  }

  // If resolved value isn't an array, try to pick a likely array field (type-aware first, then common keys)
  const toArrayGuess = (val: any, preferredKeys?: string[]): any[] => {
    if (Array.isArray(val)) return val
    if (val && typeof val === 'object') {
      const common = [
        'products',
        'product',
        'testimonials',
        'testimonial',
        'categories',
        'category',
        'items',
        'list',
        'rows',
        'data',
        'results'
      ]
      const candidates = [...(preferredKeys || []), ...common]
      for (const k of candidates) {
        if (Array.isArray((val as any)[k])) return (val as any)[k]
      }
      const firstArrayKey = Object.keys(val as any).find((k) => Array.isArray((val as any)[k]))
      if (firstArrayKey) return (val as any)[firstArrayKey]
    }
    return []
  }

  const resolved = base?.dataPath ? getByPath(data, base?.dataPath) : data
  const preferredByType: Record<string, string[]> = {
    products: ['products', 'product', 'items', 'results', 'rows'],
    testimonial: ['testimonials', 'testimonial', 'reviews', 'feedbacks', 'items', 'results'],
    categories: ['categories', 'category', 'items', 'results']
  }
  const list = toArrayGuess(resolved, preferredByType[type] || [])
  const items = list.slice(0, base?.limit || 8)

  return (
    <div className='space-y-3'>
      {(heading || subheading) && (
        <div>
          {heading && <h3 className='font-semibold text-lg'>{heading}</h3>}
          {subheading && <p className='text-muted-foreground text-sm'>{subheading}</p>}
        </div>
      )}

      {/* Loading & Error */}
      {isDynamic && isLoading && <div className='text-muted-foreground text-sm'>Loading…</div>}
      {isDynamic && error && (
        <div className='text-red-500 text-sm'>
          Failed to load: {String(error?.message || error)}
        </div>
      )}

      {/* Static Features */}
      {type === 'features' && Array.isArray(base?.items) && (
        <div className={gridCols(base?.columns || 3)}>
          {base.items.map((it: any, i: number) => (
            <div key={i} className='bg-background p-4 border rounded-md'>
              <div className='font-semibold'>{it.title || 'Title'}</div>
              {it.description && (
                <div className='text-muted-foreground text-sm'>{it.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Products Preview */}
      {type === 'products' &&
        (base?.layout === 'carousel' ? (
          <div className='flex gap-3 pb-2 overflow-x-auto'>
            {items.map((p: any, idx: number) => (
              <div key={idx} className='min-w-65 max-w-70'>
                <ProductCard product={p} variant={(base?.variant as any) || 'default'} />
              </div>
            ))}
          </div>
        ) : (
          <div className={gridCols(base?.columns || 4)}>
            {items.map((p: any, idx: number) => (
              <ProductCard key={idx} product={p} variant={(base?.variant as any) || 'default'} />
            ))}
          </div>
        ))}

      {/* Testimonials Preview */}
      {type === 'testimonial' &&
        (base?.layout === 'carousel' ? (
          <div className='flex gap-3 pb-2 overflow-x-auto'>
            {items.map((t: any, idx: number) => (
              <div key={idx} className='min-w-[320px] max-w-90'>
                <TestimonialCard
                  item={normalizeTestimonial(t)}
                  variant={(base?.variant as any) || 'default'}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={gridCols(base?.columns || 3)}>
            {items.map((t: any, idx: number) => (
              <TestimonialCard
                key={idx}
                item={normalizeTestimonial(t)}
                variant={(base?.variant as any) || 'default'}
              />
            ))}
          </div>
        ))}

      {/* Categories Preview (placeholder) */}
      {type === 'categories' &&
        (base?.layout === 'carousel' ? (
          <div className='flex gap-3 pb-2 overflow-x-auto'>
            {items.map((c: any, idx: number) => (
              <div key={idx} className='bg-background p-4 border rounded-md min-w-40'>
                <div className='font-semibold'>{c?.name || c?.title || `Category ${idx + 1}`}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={gridCols(base?.columns || 4)}>
            {items.map((c: any, idx: number) => (
              <div key={idx} className='bg-background p-4 border rounded-md'>
                <div className='font-semibold'>{c?.name || c?.title || `Category ${idx + 1}`}</div>
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}

function gridCols(cols: number) {
  const map: Record<number, string> = {
    1: 'grid grid-cols-1 gap-3',
    2: 'grid grid-cols-2 gap-3',
    3: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3',
    4: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3',
    5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3',
    6: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'
  }
  return map[cols] || map[4]
}

function normalizeTestimonial(t: any) {
  return {
    avatar: t?.avatar || t?.image || t?.photo || '',
    name: t?.name || t?.author || 'Anonymous',
    designation: t?.designation || t?.role || '',
    company: t?.company || '',
    rating: Number(t?.rating ?? 5),
    review: t?.review || t?.content || t?.feedback || ''
  }
}
