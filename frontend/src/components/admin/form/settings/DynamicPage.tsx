'use client'

import TextEditor from '@/components/admin/common/TextEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import { dynamicPageSchema, DynamicPageSchema } from '@/lib/validations/schemas/dynamicPage'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  pageKey: string
  initialValues?: DynamicPageSchema
  refetch?: () => void
}

const DynamicPageForm = ({ pageKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<DynamicPageSchema>({
    resolver: zodResolver(dynamicPageSchema),
    defaultValues: {
      title: initialValues?.title || '',
      description: initialValues?.description || ''
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${pageKey}`, {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='title'>Page Title</Label>
            <Controller
              control={control}
              name='title'
              render={({ field }) => <Input id='title' placeholder='Enter page title' {...field} />}
            />
            {errors.title && <p className='text-red-500 text-sm'>{errors.title.message}</p>}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Controller
              control={control}
              name='description'
              render={({ field }) => (
                <TextEditor value={field.value || ''} onChange={field.onChange} />
              )}
            />
            {errors.description && (
              <p className='text-red-500 text-sm'>{errors.description.message}</p>
            )}
          </div>

          <Button type='submit' disabled={isSubmitting} className='mt-6'>
            {isSubmitting ? 'Updating...' : 'Update Page'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default DynamicPageForm
