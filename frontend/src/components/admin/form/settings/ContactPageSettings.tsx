'use client'

import { useState, memo } from 'react'
import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import { SiteSettings, siteSettingsSchema } from '@/lib/validations/schemas/contactPageSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: SiteSettings | undefined
  refetch?: () => void
}

const ContactPageSettings = memo(({ settingsKey, initialValues, refetch }: TProps) => {
  const [showTicketSettings, setShowTicketSettings] = useState(
    initialValues?.supportTicket?.enabled ?? false
  )

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      ...initialValues,
      email: initialValues?.email || '',
      phone: initialValues?.phone || '',
      address: initialValues?.address || '',
      website: initialValues?.website || '',
      businessHours: initialValues?.businessHours,
      supportMessage: initialValues?.supportMessage || '',
      supportTicket: {
        enabled: initialValues?.supportTicket?.enabled ?? false,
        supportEmail: initialValues?.supportTicket?.supportEmail || '',
        buttonText: initialValues?.supportTicket?.buttonText || '',
        successMessage: initialValues?.supportTicket?.successMessage || ''
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

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card title='Contact Information'>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
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
                    maxLength={255}
                    showCharCount
                    placeholder='Enter full address'
                    error={errors.address?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card title='Business Hours'>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
            <Controller
              control={control}
              name='businessHours'
              render={({ field }) => (
                <CustomInput
                  label='Monday'
                  placeholder='e.g., 9:00 AM - 5:00 PM'
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card title='Support Message'>
        <CardHeader>
          <CardTitle>Support Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name='supportMessage'
            render={({ field }) => (
              <CustomInput
                label='Message displayed on the contact page'
                type='textarea'
                rows={3}
                maxLength={500}
                showCharCount
                placeholder='Describe your support hours, response time, or instructions.'
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card title='Support Ticket Settings'>
        <CardHeader>
          <CardTitle className='flex justify-between items-center'>
            <span>Support Ticket Settings</span>
            <Controller
              control={control}
              name='supportTicket.enabled'
              render={({ field }) => (
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground text-sm'>
                    {field.value ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch 
                    checked={!!field.value} 
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      setShowTicketSettings(checked)
                    }} 
                  />
                </div>
              )}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={showTicketSettings ? '' : 'opacity-60'}>
            <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
              <Controller
                control={control}
                name='supportTicket.supportEmail'
                render={({ field }) => (
                  <CustomInput
                    label='Support Email'
                    type='email'
                    placeholder='support@example.com'
                    error={errors.supportTicket?.supportEmail?.message as string | undefined}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
              <Controller
                control={control}
                name='supportTicket.buttonText'
                render={({ field }) => (
                  <CustomInput
                    label='Button Text'
                    placeholder='e.g., Support, Sales, Billing'
                    error={errors.supportTicket?.buttonText?.message as string | undefined}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
              <div className='lg:col-span-2'>
                <Controller
                  control={control}
                  name='supportTicket.successMessage'
                  render={({ field }) => (
                    <CustomInput
                      label='Success Message'
                      type='textarea'
                      rows={3}
                      maxLength={255}
                      showCharCount
                      placeholder='Message shown after a ticket is submitted successfully.'
                      error={errors.supportTicket?.successMessage?.message as string | undefined}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
     <div className='flex justify-center sm:justify-start'>
      <Button type='submit'>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
      </div>
    </form>
  )
})

ContactPageSettings.displayName = 'ContactPageSettings'

export default ContactPageSettings
