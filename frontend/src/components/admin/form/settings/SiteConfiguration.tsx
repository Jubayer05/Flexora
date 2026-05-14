'use client'

import CustomInput from '@/components/common/CustomInput'
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

const SiteConfiguration = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      ...initialValues,
      name: initialValues?.name || '',
      email: initialValues?.email || '',
      phone: initialValues?.phone || '',
      address: initialValues?.address || '',
      website: initialValues?.website || '',
      shortDescription: initialValues?.shortDescription || '',
      logo: {
        default: initialValues?.logo?.default || '',
        dark: initialValues?.logo?.dark || ''
      },
      // seo: initialValues?.seo || {},
      footer: initialValues?.footer || {},
      favicon: initialValues?.favicon || ''
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

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card title='Basic Information'>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
            <Controller
              control={control}
              name='name'
              render={({ field }) => (
                <CustomInput
                  label='Site Name'
                  placeholder='Enter site name'
                  error={errors.name?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='email'
              render={({ field }) => (
                <CustomInput
                  label='Email'
                  type='email'
                  placeholder='contact@example.com'
                  error={errors.email?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='phone'
              render={({ field }) => (
                <CustomInput
                  label='Phone'
                  type='tel'
                  placeholder='+1 (555) 123-4567'
                  error={errors.phone?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='website'
              render={({ field }) => (
                <CustomInput
                  label='Website'
                  type='url'
                  placeholder='https://example.com'
                  error={errors.website?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <div className='lg:col-span-2'>
              <Controller
                control={control}
                name='address'
                render={({ field }) => (
                  <CustomInput
                    label='Address'
                    type='textarea'
                    rows={2}
                    placeholder='Enter full address'
                    error={errors.address?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>

            <div className='lg:col-span-2'>
              <Controller
                control={control}
                name='shortDescription'
                render={({ field }) => (
                  <CustomInput
                    label='Short Description'
                    type='textarea'
                    rows={3}
                    placeholder='Brief description of the site'
                    error={errors.shortDescription?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card title='Footer'>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
        </CardHeader>

        <CardContent>
          <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
            <div className='lg:col-span-2'>
              <Controller
                control={control}
                name='footer.copyright'
                render={({ field }) => (
                  <CustomInput
                    label='Copyright Text'
                    type='textarea'
                    placeholder='Enter copyright text'
                    error={errors.footer?.copyright?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name='footer.credit.companyName'
              render={({ field }) => (
                <CustomInput
                  label='Credit Company Name'
                  placeholder='Enter company name'
                  error={errors.footer?.credit?.companyName?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='footer.credit.url'
              render={({ field }) => (
                <CustomInput
                  label='Credit Company URL'
                  type='url'
                  placeholder='https://example.com'
                  error={errors.footer?.credit?.url?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* <Card title='SEO'>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>

        <CardContent>
          <div className='flex flex-col gap-4'>
            <Controller
              control={control}
              name='seo.metaTitle'
              render={({ field }) => (
                <CustomInput
                  label='Meta Title'
                  error={
                    typeof errors.seo?.metaTitle?.message === 'string'
                      ? errors.seo.metaTitle.message
                      : undefined
                  }
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='seo.metaDescription'
              render={({ field }) => (
                <CustomInput
                  label='Meta Description'
                  type='textarea'
                  rows={4}
                  placeholder='Meta description...'
                  maxLength={160}
                  showCharCount={true}
                  helperText='Max 160 characters allowed'
                  error={
                    typeof errors.seo?.metaDescription?.message === 'string'
                      ? errors.seo.metaDescription.message
                      : undefined
                  }
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='seo.metaKeywords'
              render={({ field }) => (
                <CustomInput
                  label='Meta Keywords'
                  type='textarea'
                  rows={3}
                  placeholder='Enter keywords separated by commas'
                  helperText='Separate keywords with commas'
                  error={
                    typeof errors.seo?.metaKeywords?.message === 'string'
                      ? errors.seo.metaKeywords.message
                      : undefined
                  }
                  value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    const keywords = e.target.value
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean)
                    field.onChange(keywords)
                  }}
                />
              )}
            />
          </div>
        </CardContent>
      </Card> */}

      <Button type='submit'>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
    </form>
  )
}

export default SiteConfiguration
