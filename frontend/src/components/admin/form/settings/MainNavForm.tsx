'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Replaced by CustomInput across the form
import FileUploader from '@/components/common/FileUploader'
import { showError } from '@/lib/errMsg'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'
import { PageDetails, pageDetailsSchema } from '@/lib/validations/schemas/mainNavSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import TextEditor from '../../common/TextEditor'
import ContentSectionsBuilder from './ContentSectionsBuilder'

type TProps = {
  pageId?: string
  location: 'HEADER' | 'FOOTER'
  initialValues?: Partial<PageDetails>
  refetch?: () => void
}

// Section types moved to ContentSectionsBuilder

export default function MainNavForm({
  pageId,
  initialValues,
  refetch,
  location = 'HEADER'
}: TProps) {
  const router = useRouter()
  const isEditing = Boolean(initialValues)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<any>({
    resolver: zodResolver(pageDetailsSchema),
    defaultValues: {
      ...(initialValues as any),
      location,
      type: initialValues?.type || 'DYNAMIC',
      slug: initialValues?.slug || '',
      title: initialValues?.title || '',
      subtitle: initialValues?.subtitle || '',
      url: initialValues?.url ?? undefined,
      sortOrder: initialValues?.sortOrder ?? 0,
      excerpt: initialValues?.excerpt || '',
      description: initialValues?.description || '',
      banner: initialValues?.banner ?? '',
      thumbnail: initialValues?.thumbnail ?? '',
      content: initialValues?.content || { sections: [] },
      group: initialValues?.group || '',
      seo: {
        metaTitle: initialValues?.seo?.metaTitle || '',
        metaDescription: initialValues?.seo?.metaDescription || '',
        keywords: initialValues?.seo?.keywords || []
      },
      meta: {
        featured: initialValues?.meta?.featured || false,
        showInFooter: initialValues?.meta?.showInFooter || false
      },
      ...(initialValues as any)
    }
  })

  const watchSeoKeywords = (watch('seo.keywords') as string[]) || []
  const watchType = watch('type')

  // Handle SEO keywords input
  const handleSeoKeywordInput = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const input = e.target as HTMLInputElement
      const newKeyword = input.value.trim()
      if (newKeyword && !watchSeoKeywords.includes(newKeyword)) {
        setValue('seo.keywords', [...watchSeoKeywords, newKeyword])
        input.value = ''
      }
    }
  }

  const removeSeoKeyword = (indexToRemove: number) => {
    setValue(
      'seo.keywords',
      watchSeoKeywords.filter((_: string, index: number) => index !== indexToRemove)
    )
  }

  // FieldArray now handled inside ContentSectionsBuilder
  const onValid = async (data: any) => {
    try {
      // Normalize nullables for API: server expects strings, not null
      const payload: PageDetails = {
        ...data,
        location,
        url: data?.type === 'DYNAMIC' ? '' : data.url,
        slug: data.slug || '',
        subtitle: (data.subtitle as any) ?? '',
        excerpt: (data.excerpt as any) ?? '',
        description: (data.description as any) ?? '',
        banner: (data.banner as any) ?? '',
        thumbnail: (data.thumbnail as any) ?? '',
        group: data?.group ?? '',
        seo: {
          ...(data.seo || {}),
          metaTitle: data.seo?.metaTitle || '',
          metaDescription: data.seo?.metaDescription || '',
          keywords: data.seo?.keywords || []
        },
        content: data.type === 'EXTERNAL' ? undefined : data.content || { sections: [] }
      }
      // Ensure sortOrder is a number for API
      ;(payload as any).sortOrder =
        data?.sortOrder === '' || data?.sortOrder == null ? 0 : Number(data.sortOrder)

      const url = initialValues && pageId ? `/admin/custom-pages/${pageId}` : `/admin/custom-pages`
      const res = await requests[initialValues ? 'put' : 'post'](url, payload)
      if (res?.success) {
        toast.success(initialValues ? 'Page updated successfully!' : 'Page created successfully!')
        refetch?.()
        router.back()
      }
    } catch (error) {
      showError(error)
    }
  }

  const onSubmit = handleSubmit(onValid)

  useEffect(() => {
    // If type changes to DYNAMIC, clear URL field
    if (watchType === 'DYNAMIC') {
      setValue('url', '' as any)
    }
  }, [watchType, setValue])

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className='gap-4 grid grid-cols-1 md:grid-cols-2'>
          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <CustomInput
                label='Title'
                placeholder='Enter page title'
                error={errors.title?.message as any}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  const nameChangeHandler = createNameChangeHandler(
                    field.onChange,
                    (slug: string) => setValue('slug', slug),
                    { skipIfEditing: isEditing && Boolean(initialValues?.slug) }
                  )
                  nameChangeHandler(e.target.value)
                }}
                required
              />
            )}
          />

          <Controller
            control={control}
            name='slug'
            render={({ field }) => (
              <CustomInput
                label='Slug'
                name='slug'
                placeholder='about-us'
                error={errors.slug?.message as any}
                value={field.value ?? ''}
                onChange={(e) => {
                  const slugChangeHandler = createSlugChangeHandler(field.onChange)
                  slugChangeHandler(e.target.value)
                }}
              />
            )}
          />

          {/* <Controller
            control={control}
            name='location'
            render={({ field }) => (
              <CustomInput
                type='select'
                label='Location'
                name='location'
                value={(field.value as any) ?? 'DYNAMIC'}
                onValueChange={field.onChange as any}
                options={[
                  { value: 'HEADER', label: 'Main Navigation' },
                  { value: 'FOOTER', label: 'Footer Menu' }
                ]}
                error={errors.location?.message as any}
              />
            )}
          /> */}

          {/* {watch('location') === 'FOOTER' && (
            <Controller
              control={control}
              name='group'
              render={({ field }) => (
                <CustomInput
                  type='select'
                  label='Select Group'
                  name='group'
                  value={(field.value as any) ?? 'DYNAMIC'}
                  onValueChange={field.onChange as any}
                  options={[
                    { value: 'HOME', label: 'HOME' },
                    { value: 'QUICK ACCESS', label: 'QUICK_ACCESS' }
                  ]}
                  error={errors.group?.message as any}
                />
              )}
            />
          )} */}

          <Controller
            control={control}
            name='sortOrder'
            render={({ field }) => (
              <CustomInput
                type='number'
                label='Sort Order'
                name='sortOrder'
                placeholder='0'
                value={(field.value ?? 0) as any}
                error={errors.sortOrder?.message as any}
                onChange={(e: any) => {
                  const raw = e?.target?.value
                  const num = raw === '' || raw == null ? 0 : Number(raw)
                  field.onChange(Number.isNaN(num) ? 0 : num)
                }}
              />
            )}
          />

          <Controller
            control={control}
            name='type'
            render={({ field }) => (
              <CustomInput
                type='select'
                label='Page Type'
                name='type'
                value={(field.value as any) ?? 'DYNAMIC'}
                onValueChange={field.onChange as any}
                options={[
                  { value: 'DYNAMIC', label: 'Dynamic (built with sections)' },
                  { value: 'EXTERNAL', label: 'External URL (redirect/link)' },
                  { value: 'HYBRID', label: 'Hybrid (Pre build pages)' }
                ]}
                error={errors.type?.message as any}
              />
            )}
          />

          {(watchType === 'EXTERNAL' || watchType === 'HYBRID') && (
            <Controller
              control={control}
              name='url'
              render={({ field }) => (
                <CustomInput
                  type={watchType === 'HYBRID' ? 'select' : 'text'}
                  label={watchType === 'HYBRID' ? 'Select Page' : 'External URL'}
                  name='url'
                  placeholder={watchType === 'HYBRID' ? 'Shop' : '/pages/shop'}
                  value={(field.value as any) ?? ''}
                  {...(watchType === 'HYBRID'
                    ? { onValueChange: field.onChange as any }
                    : { onChange: field.onChange as any })}
                  {...(watchType === 'HYBRID' && {
                    options: [
                      { value: '/shop', label: 'Shop' },
                      { value: '/blogs', label: 'Blogs' },
                      { value: '/faqs', label: 'Faq' },
                      { value: '/contact', label: 'Contact' }
                    ]
                  })}
                  error={errors.url?.message as any}
                />
              )}
            />
          )}

          <div className='md:col-span-2'>
            <Controller
              control={control}
              name='subtitle'
              render={({ field }) => (
                <CustomInput
                  label='Subtitle'
                  name='subtitle'
                  placeholder='Learn more about our company'
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                  error={errors.subtitle?.message as any}
                />
              )}
            />
          </div>
          <div className='md:col-span-2'>
            <Controller
              control={control}
              name='excerpt'
              render={({ field }) => (
                <CustomInput
                  type='textarea'
                  rows={2}
                  label='Excerpt'
                  name='excerpt'
                  placeholder='Brief introduction...'
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                  error={errors.excerpt?.message as any}
                  showCharCount
                  maxLength={500}
                />
              )}
            />
          </div>
          {watchType === 'DYNAMIC' && (
            <div className='md:col-span-2'>
              <Controller
                control={control}
                name='description'
                render={({ field }) => (
                  <TextEditor
                    label='Content'
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder='Write page content here'
                    error={errors.content?.message as any}
                  />
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-6 w-full'>
        <Card>
          {/* <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader> */}
          <CardContent className='flex flex-row gap-6'>
            <Controller
              control={control}
              name='banner'
              render={({ field }) => (
                <div className='flex flex-col gap-2'>
                  <label htmlFor=''>Banner Image</label>
                  <FileUploader
                    value={field.value || ''}
                    onChangeAction={field.onChange}
                    maxAllow={1}
                    size='large'
                  />
                  <span className='text-red-500'>{errors?.banner?.message as any}</span>
                </div>
              )}
            />
            <Controller
              control={control}
              name='thumbnail'
              render={({ field }) => (
                <div className='flex flex-col gap-2'>
                  <label htmlFor=''>Thumbnail</label>
                  <FileUploader
                    value={field.value || ''}
                    onChangeAction={field.onChange}
                    maxAllow={1}
                    size='large'
                  />
                  <span className='text-red-500'>{errors?.thumbnail?.message as any}</span>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <Controller
              control={control}
              name={'meta.featured'}
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  label='Featured'
                  name='meta.featured'
                  checked={!!field.value}
                  onCheckedChange={field.onChange as any}
                />
              )}
            />
            <Controller
              control={control}
              name={'meta.showInFooter'}
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  label='Show in Footer'
                  name='meta.showInFooter'
                  checked={!!field.value}
                  onCheckedChange={field.onChange as any}
                />
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className='gap-4 grid grid-cols-1 md:grid-cols-2'>
          <Controller
            control={control}
            name='seo.metaTitle'
            render={({ field }) => (
              <CustomInput
                label='Meta Title'
                name='seo.metaTitle'
                value={field.value ?? ''}
                onChange={field.onChange as any}
              />
            )}
          />
          <div className='md:col-span-2'>
            <Controller
              control={control}
              name='seo.metaDescription'
              render={({ field }) => (
                <CustomInput
                  type='textarea'
                  rows={3}
                  label='Meta Description'
                  name='seo.metaDescription'
                  value={field.value ?? ''}
                  onChange={field.onChange as any}
                />
              )}
            />
          </div>
          <div className='md:col-span-2'>
            {/* SEO Keywords */}
            <div className='space-y-2'>
              <CustomInput
                label='SEO Keywords'
                type='text'
                placeholder='Type keyword and press Enter'
                onKeyDown={handleSeoKeywordInput}
              />
              <div className='flex flex-wrap gap-2'>
                {watchSeoKeywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className='inline-flex items-center gap-1 bg-green-100 px-2 py-1 rounded-md text-green-800 text-sm'
                  >
                    {keyword}
                    <button
                      type='button'
                      onClick={() => removeSeoKeyword(index)}
                      className='ml-1 text-green-600 hover:text-green-800'
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Sections Builder (hidden for EXTERNAL pages) */}
      {watchType === 'DYNAMIC' && (
        // Cast to simplify RHF generic mismatch across versions
        <ContentSectionsBuilder control={control as any} watch={watch as any} />
      )}

      <div className='flex justify-end gap-3'>
        <Button size={'lg'} type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialValues ? 'Save Changes' : 'Create Page'}
        </Button>
      </div>
    </form>
  )
}
