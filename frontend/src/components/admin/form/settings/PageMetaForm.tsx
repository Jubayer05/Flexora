'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { PageData, PageSeo, seoSchema } from '@/lib/validations/schemas/pageSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  initialValues?: PageData | null
  refetch?: () => void
}

const PageMetaForm = ({ initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PageSeo>({
    resolver: zodResolver(seoSchema)
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.put(`/admin/custom-pages/${initialValues?.id}`, {
        seo: data
      })
      if (res?.success) {
        refetch?.()
        toast.success('Pages updated successfully!')
      }
    } catch (error) {
      showError(error)
    }
  })

  // Populate form when async initialValues arrive/updated
  useEffect(() => {
    if (initialValues) {
      reset({
        metaTitle: initialValues?.seo?.metaTitle ?? '',
        metaDescription: initialValues?.seo?.metaDescription ?? '',
        keywords: Array.isArray(initialValues?.seo?.keywords)
          ? (initialValues?.seo?.keywords as string[])
          : []
      })
    }
  }, [initialValues, reset])

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>
            Meta Settings for <span className='text-primary'>{initialValues?.title}</span>
          </CardTitle>
        </CardHeader>
        {/* <div className='border w-full h-[0.5px]' /> */}
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name={'metaTitle'}
            render={({ field }) => (
              <CustomInput
                label='Meta Title'
                placeholder='Enter meta title'
                error={(errors as any)?.metaTitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name={'metaDescription'}
            render={({ field }) => (
              <CustomInput
                label='Meta Description'
                type='textarea'
                rows={3}
                placeholder='Enter meta description'
                error={(errors as any)?.metaDescription?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name={'keywords'}
            render={({ field }) => (
              <CustomInput
                label='Keywords'
                placeholder='keyword1, keyword2, keyword3'
                helperText='Comma-separated list of keywords'
                error={(errors as any)?.keywords?.message}
                value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                onChange={(e: any) => {
                  const v = typeof e?.target?.value === 'string' ? e.target.value : ''
                  const arr = v
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                  field.onChange(arr)
                }}
              />
            )}
          />
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-center sm:justify-start">
      <Button type='submit' disabled={isSubmitting} size={'lg'}>
        {isSubmitting ? 'Saving...' : initialValues ? 'Update Pages' : 'Save Pages'}
      </Button>
      </div>
    </form>
  )
}

export default PageMetaForm
