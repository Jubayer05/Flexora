'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import { SocialLoginSettingsSchema } from '@/lib/validations/schemas/socialLoginSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Facebook, Mail, Send, Twitter } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

type FormValues = z.input<typeof SocialLoginSettingsSchema>

type ProviderValue = { isActive?: boolean; appId?: string; appSecret?: string } | null

type TProps = {
  initialGoogle?: ProviderValue
  initialFacebook?: ProviderValue
  initialTwitter?: ProviderValue
  initialTelegram?: ProviderValue
  refetch?: () => void
}

const SectionHeader = ({
  Icon,
  title,
  description,
  active,
  onToggle,
  iconColor
}: {
  Icon: React.ComponentType<{ className?: string; color?: string }>
  title: string
  description: string
  active: boolean
  onToggle: (v: boolean) => void
  iconColor?: string
}) => (
  <div className='flex justify-between items-start gap-4'>
    <div className='flex items-center gap-3'>
      <Icon className='w-7 h-7' color={iconColor} />
      <div>
        <h3 className='font-medium'>{title}</h3>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
    </div>
    <Switch checked={active} onCheckedChange={onToggle} />
  </div>
)

const providerDefaults = (v?: ProviderValue) => ({
  isActive: v?.isActive ?? false,
  appId: v?.appId ?? '',
  appSecret: v?.appSecret ?? ''
})

const SocialLoginForm = ({
  initialGoogle,
  initialFacebook,
  initialTwitter,
  initialTelegram,
  refetch
}: TProps) => {
  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(SocialLoginSettingsSchema),
    defaultValues: {
      google: providerDefaults(initialGoogle),
      facebook: providerDefaults(initialFacebook),
      twitter: providerDefaults(initialTwitter),
      telegram: providerDefaults(initialTelegram)
    }
  })

  useEffect(() => {
    reset({
      google: providerDefaults(initialGoogle),
      facebook: providerDefaults(initialFacebook),
      twitter: providerDefaults(initialTwitter),
      telegram: providerDefaults(initialTelegram)
    })
  }, [initialGoogle, initialFacebook, initialTwitter, initialTelegram, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const [googleRes, facebookRes, twitterRes, telegramRes] = await Promise.all([
        requests.post('/admin/settings/system_google_login', {
          value: {
            isActive: data.google.isActive,
            appId: data.google.appId || undefined,
            appSecret: data.google.appSecret || undefined
          }
        }),
        requests.post('/admin/settings/system_facebook_login', {
          value: {
            isActive: data.facebook.isActive,
            appId: data.facebook.appId || undefined,
            appSecret: data.facebook.appSecret || undefined
          }
        }),
        requests.post('/admin/settings/system_twitter_login', {
          value: {
            isActive: data.twitter.isActive,
            appId: data.twitter.appId || undefined,
            appSecret: data.twitter.appSecret || undefined
          }
        }),
        requests.post('/admin/settings/system_telegram_login', {
          value: {
            isActive: data.telegram.isActive,
            appId: data.telegram.appId || undefined,
            appSecret: data.telegram.appSecret || undefined
          }
        })
      ])
      const results = [googleRes, facebookRes, twitterRes, telegramRes] as { success?: boolean }[]
      const allOk = results.every((r) => r?.success)
      const anyOk = results.some((r) => r?.success)
      if (allOk) {
        toast.success('Social login settings updated successfully!')
        refetch?.()
      } else if (anyOk) {
        toast.success('Settings updated (one or more may have failed).')
        refetch?.()
      } else {
        showError('Failed to update settings')
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>Social Login Management</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Enable Google, Facebook, Twitter (X), or Telegram login. When enabled, each provider
            will appear on the login and sign-up pages. Credentials are stored in the database.
          </p>
        </CardHeader>

        <CardContent className='space-y-6'>
          {/* Google */}
          <Card className='p-4'>
            <Controller
              control={control}
              name='google.isActive'
              render={({ field }) => (
                <SectionHeader
                  Icon={Mail}
                  title='Google Login'
                  description='Allow users to sign in with their Google account.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor='#4285F4'
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('google.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name='google.appId'
                  render={({ field }) => (
                    <CustomInput
                      label='Google Client ID'
                      placeholder='e.g. xxxxx.apps.googleusercontent.com'
                      error={(errors as any)?.google?.appId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name='google.appSecret'
                  render={({ field }) => (
                    <CustomInput
                      label='Google Client Secret'
                      placeholder='Enter Client Secret'
                      error={(errors as any)?.google?.appSecret?.message}
                      {...field}
                      value={field.value ?? ''}
                      type='password'
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Facebook */}
          <Card className='p-4'>
            <Controller
              control={control}
              name='facebook.isActive'
              render={({ field }) => (
                <SectionHeader
                  Icon={Facebook}
                  title='Facebook Login'
                  description='Allow users to sign in with their Facebook account.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor='#1877F2'
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('facebook.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name='facebook.appId'
                  render={({ field }) => (
                    <CustomInput
                      label='Facebook App ID'
                      placeholder='Enter App ID'
                      error={(errors as any)?.facebook?.appId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name='facebook.appSecret'
                  render={({ field }) => (
                    <CustomInput
                      label='Facebook App Secret'
                      placeholder='Enter App Secret'
                      error={(errors as any)?.facebook?.appSecret?.message}
                      {...field}
                      value={field.value ?? ''}
                      type='password'
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Twitter (X) */}
          <Card className='p-4'>
            <Controller
              control={control}
              name='twitter.isActive'
              render={({ field }) => (
                <SectionHeader
                  Icon={Twitter}
                  title='Twitter (X) Login'
                  description='Allow users to sign in with their Twitter / X account.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor='#000000'
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('twitter.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name='twitter.appId'
                  render={({ field }) => (
                    <CustomInput
                      label='Twitter Client ID'
                      placeholder='OAuth 2.0 Client ID from developer portal'
                      error={(errors as any)?.twitter?.appId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name='twitter.appSecret'
                  render={({ field }) => (
                    <CustomInput
                      label='Twitter Client Secret'
                      placeholder='OAuth 2.0 Client Secret'
                      error={(errors as any)?.twitter?.appSecret?.message}
                      {...field}
                      value={field.value ?? ''}
                      type='password'
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Telegram */}
          <Card className='p-4'>
            <Controller
              control={control}
              name='telegram.isActive'
              render={({ field }) => (
                <SectionHeader
                  Icon={Send}
                  title='Telegram Login'
                  description='Allow users to sign in with Telegram (Login Widget).'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor='#0088cc'
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('telegram.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name='telegram.appId'
                  render={({ field }) => (
                    <CustomInput
                      label='Bot Username'
                      placeholder='e.g. MyBot (without @)'
                      error={(errors as any)?.telegram?.appId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name='telegram.appSecret'
                  render={({ field }) => (
                    <CustomInput
                      label='Bot Token'
                      placeholder='From @BotFather'
                      error={(errors as any)?.telegram?.appSecret?.message}
                      {...field}
                      value={field.value ?? ''}
                      type='password'
                    />
                  )}
                />
              </div>
            </div>
          </Card>
        </CardContent>

        <div className='flex sm:justify-end justify-center px-6 pb-6'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Social Login'}
          </Button>
        </div>
      </Card>
    </form>
  )
}

export default SocialLoginForm
