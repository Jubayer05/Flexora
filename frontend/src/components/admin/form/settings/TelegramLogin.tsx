'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

// URL validation function
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url.trim() === '') return true // Allow empty URLs since they're optional
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

const telegramLoginSchema = z.object({
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  websiteUrl: z.string().optional().refine(isValidUrl, {
    message: 'Please enter a valid URL (http:// or https://)'
  }),
  redirectUrl: z.string().optional().refine(isValidUrl, {
    message: 'Please enter a valid redirect URL (http:// or https://)'
  }),
  isActive: z.boolean().optional()
})

export type TelegramLoginType = z.infer<typeof telegramLoginSchema>

type TProps = {
  settingsKey: string
  initialValues?: TelegramLoginType | undefined
  refetch?: () => void
}

const TelegramLoginForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<TelegramLoginType>({
    resolver: zodResolver(telegramLoginSchema),
    defaultValues: {
      ...initialValues,
      isActive: initialValues?.isActive ?? false
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
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='appId'
              render={({ field }) => (
                <CustomInput
                  label='Telegram Bot Token'
                  placeholder='Enter Telegram Bot Token'
                  error={errors.appId?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='appSecret'
              render={({ field }) => (
                <CustomInput
                  label='Telegram Bot Username'
                  placeholder='Enter Telegram Bot Username'
                  error={errors.appSecret?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='websiteUrl'
              render={({ field }) => (
                <CustomInput
                  label='Website URL'
                  placeholder='Enter your website URL'
                  error={errors.websiteUrl?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='redirectUrl'
              render={({ field }) => (
                <CustomInput
                  label='Telegram Webhook URL'
                  placeholder='Enter Telegram webhook URL'
                  error={errors.redirectUrl?.message}
                  {...field}
                  value={field.value ?? ''}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name='isActive'
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  label='Enable Telegram Login'
                  error={errors.isActive?.message}
                  {...field}
                  value={field.value}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />

            <Button type='submit'>
              {isSubmitting ? 'Submitting...' : initialValues ? 'Update' : 'Submit'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default TelegramLoginForm
