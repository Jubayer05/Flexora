'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { SiteSettings, siteSettingsSchema } from '@/lib/validations/schemas/contactPageSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: SiteSettings
  refetch?: () => void
}

const ContactSettings = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      address: initialValues?.address ?? '',
      website: (initialValues?.website as any) ?? '',
      businessHours: initialValues?.businessHours ?? '',
      supportMessage: initialValues?.supportMessage ?? '',
      supportTicket: {
        enabled: initialValues?.supportTicket?.enabled ?? false,
        supportEmail: initialValues?.supportTicket?.supportEmail ?? '',
        buttonText: initialValues?.supportTicket?.buttonText ?? '',
        successMessage: initialValues?.supportTicket?.successMessage ?? ''
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
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
            <Controller
              control={control}
              name='phone'
              render={({ field }) => (
                <CustomInput
                  label='Phone Number'
                  placeholder='+123 456 7890'
                  error={(errors as any)?.phone?.message as string}
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
                  label='Email Address'
                  type='email'
                  placeholder='help@example.com'
                  error={(errors as any)?.email?.message as string}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name='businessHours'
            render={({ field }) => (
              <CustomInput
                label='Business Hours'
                placeholder='Mon–Fri (09:00 AM – 5:00 PM)'
                error={(errors as any)?.businessHours?.message as string}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
          <p className='mt-1 text-muted-foreground text-xs'>This will be displayed in the footer</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name='supportMessage'
            render={({ field }) => (
              <CustomInput
                label='Help Message'
                type='textarea'
                rows={4}
                placeholder='If you have any questions about your order, please describe it and include your Order ID in the message (example: 2xxxx.xxxx.xxx).'
                error={(errors as any)?.supportMessage?.message as string}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
          <p className='mt-1 text-muted-foreground text-xs'>
            This message will be shown above the contact form
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support Ticket Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='supportTicket.enabled'
            render={({ field }) => (
              <CustomInput
                type='switch'
                label='Enable Support Ticket Button'
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
            <Controller
              control={control}
              name='supportTicket.supportEmail'
              render={({ field }) => (
                <CustomInput
                  label='Support Email'
                  type='email'
                  placeholder='support@example.com'
                  error={(errors as any)?.supportTicket?.supportEmail?.message as string}
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
                  placeholder='Submit Request'
                  error={(errors as any)?.supportTicket?.buttonText?.message as string}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </div>
          <Controller
            control={control}
            name='supportTicket.successMessage'
            render={({ field }) => (
              <CustomInput
                label='Success Message'
                type='textarea'
                rows={3}
                placeholder="Your contact request has been submitted successfully. We'll get back to you soon!"
                error={(errors as any)?.supportTicket?.successMessage?.message as string}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <div className='flex items-center gap-3 justify-center sm:justify-start'>
        <Button type='button' variant='secondary' onClick={refetch} disabled={isSubmitting}>
          Refresh
        </Button>
        <Button type='submit' disabled={isSubmitting} className=''>
          {isSubmitting ? 'Saving...' : initialValues ? 'Save Changes' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}

export default ContactSettings
