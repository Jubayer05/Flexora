'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { PageData, pageDataSchema } from '@/lib/validations/schemas/pageSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  initialValues?: PageData | null
  refetch?: () => void
}

const PageBannersForm = ({ initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PageData>({
    resolver: zodResolver(pageDataSchema)
    // defaultValues: {
    //   title: initialValues?.title,
    //   subtitle: initialValues?.subtitle ?? '',
    //   excerpt: initialValues?.excerpt ?? '',
    //   banner: initialValues?.banner ?? ''
    // }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.put(`/admin/custom-pages/${initialValues?.id}`, {
        ...data
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
        title: initialValues?.title,
        subtitle: initialValues?.subtitle ?? '',
        excerpt: initialValues?.excerpt ?? '',
        banner: initialValues?.banner ?? ''
      })
    }
  }, [initialValues, reset])

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>
            Banner Settings for <span className='text-primary'>{initialValues?.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name={`title`}
            render={({ field }) => (
              <CustomInput
                label='Page Title'
                placeholder='Enter page title'
                error={errors?.title?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name={`subtitle`}
            render={({ field }) => (
              <CustomInput
                label='Subtitle (Optional)'
                placeholder='Enter page subtitle'
                error={errors?.subtitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='excerpt'
            render={({ field }) => (
              <CustomInput
                label='Excerpt (Optional)'
                type='textarea'
                rows={3}
                placeholder='Brief introduction or summary'
                error={errors?.excerpt?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name={`banner`}
            render={({ field }) => (
              <FileUploader
                value={field.value || ''}
                onChangeAction={field.onChange}
                multiple={false}
                maxAllow={1}
                // size='large'
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

export default PageBannersForm
