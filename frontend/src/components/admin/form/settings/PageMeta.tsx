'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { SiteSettings, siteSettingsSchema } from '@/lib/validations/schemas/siteSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: SiteSettings | undefined
  refetch?: () => void
}

const PageMetaForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      ...initialValues,
      seo: {
        ...initialValues?.seo,
        metaName: initialValues?.seo?.metaName || '',
        metaTitle: initialValues?.seo?.metaTitle || '',
        metaDescription: initialValues?.seo?.metaDescription || '',
        metaKeywords: initialValues?.seo?.metaKeywords || [],
        siteAuthor: initialValues?.seo?.siteAuthor || '',
        ogImage: initialValues?.seo?.ogImage || '',
        canonicalUrl: initialValues?.seo?.canonicalUrl || ''
      }
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Settings updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  const watchSeoKeywords = watch('seo.metaKeywords')

  // Handle SEO keywords input
  const handleSeoKeywordInput = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const input = e.target as HTMLInputElement
      const newKeyword = input.value.trim()
      if (newKeyword && !(watchSeoKeywords ?? []).includes(newKeyword)) {
        setValue('seo.metaKeywords', [...(watchSeoKeywords ?? []), newKeyword])
        input.value = ''
      }
    }
  }

  const removeSeoKeyword = (indexToRemove: number) => {
    setValue(
      'seo.metaKeywords',
      (watchSeoKeywords ?? []).filter((_, index) => index !== indexToRemove)
    )
  }

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Page Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
            <Controller
              control={control}
              name='seo.metaName'
              render={({ field }) => (
                <CustomInput
                  label='Meta Name'
                  placeholder='Enter meta name'
                  error={errors.seo?.metaName?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='seo.metaTitle'
              render={({ field }) => (
                <CustomInput
                  label='Meta Title'
                  placeholder='Enter meta title'
                  error={errors?.seo?.metaTitle?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className='col-span-full'>
              <Controller
                control={control}
                name='seo.metaDescription'
                render={({ field }) => (
                  <CustomInput
                    label='Meta Description'
                    type='textarea'
                    rows={4}
                    maxLength={160}
                    showCharCount={true}
                    placeholder='Meta description...'
                    helperText='Max 160 characters allowed'
                    error={
                      typeof errors?.seo?.metaDescription?.message === 'string'
                        ? errors?.seo?.metaDescription.message
                        : undefined
                    }
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
            <div className='col-span-full'>
              {/* <Controller
                control={control}
                name='siteKeywords'
                render={({ field }) => (
                  <CustomInput
                    label='Site Keywords'
                    placeholder='Enter site keywords'
                    error={errors.siteKeywords?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              /> */}

              <div className='space-y-2'>
                <CustomInput
                  label='Site Keywords'
                  type='text'
                  placeholder='Type keyword and press Enter'
                  onKeyDown={handleSeoKeywordInput}
                />
                <div className='flex flex-wrap gap-2'>
                  {(watchSeoKeywords ?? []).map((keyword, index) => (
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

            <Controller
              control={control}
              name='seo.siteAuthor'
              render={({ field }) => (
                <CustomInput
                  label='Site Author'
                  placeholder='Enter site author'
                  error={errors?.seo?.siteAuthor?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='seo.canonicalUrl'
              render={({ field }) => (
                <CustomInput
                  label='Canonical URL'
                  placeholder='Enter canonical URL'
                  error={errors?.seo?.canonicalUrl?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='seo.ogImage'
              render={({ field }) => (
                <div className='space-y-2'>
                  <label className='block font-medium text-sm'>OG Image</label>
                  <FileUploader
                    value={field.value || undefined}
                    onChangeAction={field.onChange}
                    maxAllow={1}
                    size='small'
                  />
                  <span className='text-red-500 text-xs'>{errors?.seo?.ogImage?.message}</span>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Button type='submit'>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update' : 'Submit'}
      </Button>
    </form>
  )
}

export default PageMetaForm
