'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import {
  EmailConfiguration,
  emailConfigurationSchema
} from '@/lib/validations/schemas/emailConfiguration'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: EmailConfiguration | undefined
  refetch?: () => void
}

const EmailConfigurationForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<EmailConfiguration>({
    resolver: zodResolver(emailConfigurationSchema) as any,
    defaultValues: {
      ...initialValues,
      smtpHost: initialValues?.smtpHost || '',
      smtpPort:
        initialValues?.smtpPort !== undefined && initialValues?.smtpPort !== null
          ? String(initialValues.smtpPort)
          : '',
      mailFromName: initialValues?.mailFromName || '',
      mailFromEmail: initialValues?.mailFromEmail || '',
      smtpUsername: initialValues?.smtpUsername || '',
      smtpPassword: initialValues?.smtpPassword || ''
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
          <div className='flex justify-between items-center w-full'>
            <CardTitle>SMTP</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
            <Controller
              control={control}
              name='smtpHost'
              render={({ field }) => (
                <CustomInput
                  label='SMTP Host'
                  placeholder='Enter SMTP host'
                  error={errors.smtpHost?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='smtpPort'
              render={({ field }) => (
                <CustomInput
                  label='SMTP Port'
                  type='number'
                  placeholder='Enter SMTP port'
                  error={errors.smtpPort?.message}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='smtpUsername'
              render={({ field }) => (
                <CustomInput
                  label='SMTP Username'
                  placeholder='Enter SMTP username'
                  error={errors.smtpUsername?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='smtpPassword'
              render={({ field }) => (
                <CustomInput
                  label='SMTP Password'
                  placeholder='Enter SMTP password'
                  error={errors.smtpPassword?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='mailFromEmail'
              render={({ field }) => (
                <CustomInput
                  label='Mail From Email'
                  placeholder='Enter Mail From Email'
                  error={errors.mailFromEmail?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='mailFromName'
              render={({ field }) => (
                <CustomInput
                  label='Mail From Name'
                  placeholder='Enter Mail From Name'
                  error={errors.mailFromName?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className='flex justify-center sm:justify-start'> 
      <Button type='submit'>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update' : 'Submit'}
      </Button>
      </div>
    </form>
  )
}

export default EmailConfigurationForm
