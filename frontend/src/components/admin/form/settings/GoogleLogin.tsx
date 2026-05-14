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

const googleLoginSchema = z.object({
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

export type GoogleLoginType = z.infer<typeof googleLoginSchema>

type TProps = {
  settingsKey: string
  initialValues?: GoogleLoginType | undefined
  refetch?: () => void
}

const GoogleLoginForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<GoogleLoginType>({
    resolver: zodResolver(googleLoginSchema),
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
                  label='Google Client ID'
                  placeholder='Enter Google Client ID'
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
                  label='Google Client Secret'
                  placeholder='Enter Google Client Secret'
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
                  label='Valid OAuth Redirect URI'
                  placeholder='Enter Google redirect URL'
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
                  label='Enable Google Login'
                  error={errors.isActive?.message}
                  {...field}
                  value={field.value}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            
             <div className='flex justify-center sm:justify-start'> 
            <Button type='submit'>
              {isSubmitting ? 'Submitting...' : initialValues ? 'Update' : 'Submit'}
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default GoogleLoginForm
