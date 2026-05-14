'use client'

import TextEditor from '@/components/admin/common/TextEditor'
import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import { PageContent, pageContentSchema } from '@/lib/validations/schemas/pageSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  initialValues?: PageContent
  refetch?: () => void
  pageKey?: string
}

const PageContentForm = ({ pageKey, initialValues, refetch }: TProps) => {
  const router = useRouter()

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<PageContent>({
    resolver: zodResolver(pageContentSchema),
    defaultValues: initialValues || {
      pageSlug: pageKey || '',
      title: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isActive: true
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const key = data?.pageSlug
      const res = await requests.post(`/admin/settings/${pageKey}`, {
        key,
        value: data
      })
      if (res?.success) {
        toast.success('Page content updated successfully!')
        refetch?.()
        router.back()
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileText className='w-5 h-5' />
            Dynamic Pages
          </CardTitle>
          <p className='max-w-xl text-muted-foreground text-sm'>
            Manage static pages like About Us, Terms & Conditions, Privacy Policy, etc. These pages
            can be displayed in your site&apos;s header, footer, or accessed via direct links.
          </p>
          <div className='bg-green-50 mt-2 p-3 border border-green-200 rounded-md'>
            <h5 className='mb-1 font-medium text-green-900 text-sm'>💡 Usage Tips:</h5>
            <ul className='space-y-1 text-green-800 text-xs'>
              <li>• Use clear, descriptive titles for better SEO</li>
              <li>• Slugs are auto-generated but can be customized</li>
              <li>• Enable &quot;Show in Footer/Header&quot; for easy navigation</li>
              <li>• Use rich text editor for professional formatting</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent>
          <div className='bg-foreground p-6 border rounded-lg'>
            <div className='gap-4 grid grid-cols-1 md:grid-cols-2 mb-4'>
              <div className={cn({ 'col-span-full': pageKey })}>
                <Controller
                  control={control}
                  name={`title`}
                  render={({ field }) => (
                    <CustomInput
                      label='Page Title'
                      placeholder='e.g., About Us, Privacy Policy'
                      error={errors.title?.message}
                      {...field}
                    />
                  )}
                />
              </div>

              {!pageKey && (
                <div className='space-y-2'>
                  <Controller
                    control={control}
                    name='pageSlug'
                    render={({ field }) => (
                      <CustomInput
                        label='Page Slug'
                        placeholder='e.g., about-us, privacy-policy'
                        error={errors.pageSlug?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
              )}
            </div>

            <Controller
              control={control}
              name={`metaTitle`}
              render={({ field }) => (
                <CustomInput
                  label='Meta Title (SEO)'
                  placeholder='SEO optimized title'
                  error={errors.metaTitle?.message}
                  maxLength={60}
                  showCharCount
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name={`metaDescription`}
              render={({ field }) => (
                <CustomInput
                  label='Meta Description (SEO)'
                  type='textarea'
                  rows={3}
                  placeholder='Brief description for search engines'
                  error={errors.metaDescription?.message}
                  maxLength={160}
                  showCharCount
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name={`content`}
              render={({ field }) => (
                <div className='space-y-2'>
                  <label className='font-medium text-sm'>Page Content</label>
                  <TextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder='Write your page content here...'
                  />
                  {errors.content && (
                    <p className='text-red-500 text-sm'>{errors.content?.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Button type='submit' disabled={isSubmitting} className='w-full md:w-auto'>
        {isSubmitting ? 'Saving...' : initialValues ? 'Update Pages' : 'Save Pages'}
      </Button>
    </form>
  )
}

export default PageContentForm
