'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Form schema for creating a new custom page
const createPageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(300, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  title: z.string().max(200, 'Title too long').optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional()
})

type CreatePageFormData = z.infer<typeof createPageSchema>

const CreatePageForm = () => {
  const router = useRouter()
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreatePageFormData>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      slug: '',
      title: '',
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Convert keywords string to array if provided
      const keywordsArray = data.keywords
        ? data.keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : []

      // Build SEO object if any SEO fields are provided
      const seo: any = {}
      if (data.metaTitle) seo.metaTitle = data.metaTitle
      if (data.metaDescription) seo.metaDescription = data.metaDescription
      if (keywordsArray.length > 0) seo.keywords = keywordsArray

      // Prepare payload
      const payload: any = {
        slug: data.slug,
        type: 'DYNAMIC',
        isActive: true
      }

      if (data.title) payload.title = data.title
      if (Object.keys(seo).length > 0) payload.seo = seo

      const res = await requests.post('/admin/custom-pages', payload)

      if (res?.success) {
        toast.success('Page created successfully!')
        router.push('/admin/settings/meta-management')
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Page Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='slug'
            render={({ field }) => (
              <CustomInput
                label='Slug'
                placeholder='e.g., new-page'
                error={errors.slug?.message}
                helperText='Lowercase letters, numbers, and hyphens only (e.g., my-new-page)'
                required
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <CustomInput
                label='Title'
                placeholder='Enter page title'
                error={errors.title?.message}
                helperText='Display name for the page'
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO & Meta Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='metaTitle'
            render={({ field }) => (
              <CustomInput
                label='Meta Title'
                placeholder='Enter meta title for SEO'
                error={errors.metaTitle?.message}
                helperText='SEO title for search engines'
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='metaDescription'
            render={({ field }) => (
              <CustomInput
                label='Meta Description'
                type='textarea'
                rows={3}
                placeholder='Enter meta description for SEO'
                error={errors.metaDescription?.message}
                helperText='SEO description for search engines'
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='keywords'
            render={({ field }) => (
              <CustomInput
                label='Keywords'
                placeholder='keyword1, keyword2, keyword3'
                error={errors.keywords?.message}
                helperText='Comma-separated list of keywords for SEO'
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <div className='flex justify-end gap-4'>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Page'}
        </Button>
      </div>
    </form>
  )
}

export default CreatePageForm


