'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import { AddonsSettingsSchema } from '@/lib/validations/schemas/addonsSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Cloud,
  LineChart,
  MessageCircle,
  MessageSquare,
  MousePointer,
  ShieldCheck,
  Star
} from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

type FormValues = z.input<typeof AddonsSettingsSchema>

type TProps = {
  settingsKey: string
  initialValues?: FormValues | undefined
  refetch?: () => void
}

const AddonsForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(AddonsSettingsSchema),
    defaultValues: {
      recaptcha: {
        isActive: initialValues?.recaptcha?.isActive ?? false,
        siteKey: initialValues?.recaptcha?.siteKey ?? '',
        secretKey: initialValues?.recaptcha?.secretKey ?? ''
      },
      trustpilot: {
        isActive: initialValues?.trustpilot?.isActive ?? false,
        businessUnitId: initialValues?.trustpilot?.businessUnitId ?? '',
        apiKey: initialValues?.trustpilot?.apiKey ?? ''
      },
      googleAnalytics: {
        isActive: initialValues?.googleAnalytics?.isActive ?? false,
        trackingId: initialValues?.googleAnalytics?.trackingId ?? ''
      },
      microsoftClarity: {
        isActive: initialValues?.microsoftClarity?.isActive ?? false,
        projectId: initialValues?.microsoftClarity?.projectId ?? ''
      },
      cloudflareTurnstile: {
        isActive: initialValues?.cloudflareTurnstile?.isActive ?? false,
        siteKey: initialValues?.cloudflareTurnstile?.siteKey ?? '',
        secretKey: initialValues?.cloudflareTurnstile?.secretKey ?? ''
      },
      getButton: {
        isActive: initialValues?.getButton?.isActive ?? false
      },
      tawkTo: {
        isActive: initialValues?.tawkTo?.isActive ?? false,
        propertyId: initialValues?.tawkTo?.propertyId ?? '',
        widgetId: initialValues?.tawkTo?.widgetId ?? ''
      }
    }
  })

  useEffect(() => {
    if (!initialValues) return
    reset({
      recaptcha: {
        isActive: initialValues?.recaptcha?.isActive ?? false,
        siteKey: initialValues?.recaptcha?.siteKey ?? '',
        secretKey: initialValues?.recaptcha?.secretKey ?? ''
      },
      trustpilot: {
        isActive: initialValues?.trustpilot?.isActive ?? false,
        businessUnitId: initialValues?.trustpilot?.businessUnitId ?? '',
        apiKey: initialValues?.trustpilot?.apiKey ?? ''
      },
      googleAnalytics: {
        isActive: initialValues?.googleAnalytics?.isActive ?? false,
        trackingId: initialValues?.googleAnalytics?.trackingId ?? ''
      },
      microsoftClarity: {
        isActive: initialValues?.microsoftClarity?.isActive ?? false,
        projectId: initialValues?.microsoftClarity?.projectId ?? ''
      },
      cloudflareTurnstile: {
        isActive: initialValues?.cloudflareTurnstile?.isActive ?? false,
        siteKey: initialValues?.cloudflareTurnstile?.siteKey ?? '',
        secretKey: initialValues?.cloudflareTurnstile?.secretKey ?? ''
      },
      getButton: {
        isActive: initialValues?.getButton?.isActive ?? false
      },
      tawkTo: {
        isActive: initialValues?.tawkTo?.isActive ?? false,
        propertyId: initialValues?.tawkTo?.propertyId ?? '',
        widgetId: initialValues?.tawkTo?.widgetId ?? ''
      }
    })
  }, [initialValues, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Addons updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

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
      <div className='flex items-center gap-2'>
        {/* <span className='text-muted-foreground text-sm'>{active ? 'Enabled' : 'Disabled'}</span> */}
        <Switch checked={active} onCheckedChange={onToggle} />
      </div>
    </div>
  )

  // Brand colors (approximate, easy to tweak)
  const BRAND_COLORS = {
    recaptcha: '#4285F4', // Google blue
    trustpilot: '#00B67A',
    googleAnalytics: '#E37400',
    microsoftClarity: '#0078D4',
    cloudflareTurnstile: '#F48120',
    getButton: '#39B54A',
    tawkTo: '#30C3A6'
  }

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>Addons Management</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Toggle and configure third-party services. When enabled, configuration fields appear
            below.
          </p>
        </CardHeader>

        <CardContent className='flex flex-wrap md:[&>*]:flex-[1_1_calc(50%-1.5rem)] lg:[&>*]:flex-[1_1_calc(45.333%-1.5rem)] [&>*]:flex-[1_1_100%] gap-6'>
          {/* Google reCAPTCHA */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'recaptcha.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={ShieldCheck}
                  title='Google reCAPTCHA'
                  description='Protect your forms from spam and abuse.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.recaptcha}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('recaptcha.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name={'recaptcha.siteKey'}
                  render={({ field }) => (
                    <CustomInput
                      label='Site Key'
                      placeholder='Enter Site Key'
                      error={(errors as any)?.recaptcha?.siteKey?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'recaptcha.secretKey'}
                  render={({ field }) => (
                    <CustomInput
                      label='Secret Key'
                      placeholder='Enter Secret Key'
                      error={(errors as any)?.recaptcha?.secretKey?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Trustpilot */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'trustpilot.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={Star}
                  title='Trustpilot'
                  description='Display customer reviews and ratings.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.trustpilot}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('trustpilot.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name={'trustpilot.businessUnitId'}
                  render={({ field }) => (
                    <CustomInput
                      label='Business Unit ID'
                      placeholder='e.g., 1234567890abcdef'
                      error={(errors as any)?.trustpilot?.businessUnitId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'trustpilot.apiKey'}
                  render={({ field }) => (
                    <CustomInput
                      label='API Key'
                      placeholder='Enter Trustpilot API Key'
                      error={(errors as any)?.trustpilot?.apiKey?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Google Analytics */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'googleAnalytics.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={LineChart}
                  title='Google Analytics'
                  description='Track website traffic and user behavior.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.googleAnalytics}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('googleAnalytics.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <Controller
                control={control}
                name={'googleAnalytics.trackingId'}
                render={({ field }) => (
                  <CustomInput
                    label='Tracking ID'
                    placeholder='e.g., G-XXXXXXXXXX'
                    error={(errors as any)?.googleAnalytics?.trackingId?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          </Card>

          {/* Microsoft Clarity */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'microsoftClarity.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={MousePointer}
                  title='Microsoft Clarity'
                  description='Session recordings and heatmaps.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.microsoftClarity}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('microsoftClarity.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <Controller
                control={control}
                name={'microsoftClarity.projectId'}
                render={({ field }) => (
                  <CustomInput
                    label='Project ID'
                    placeholder='e.g., abc123'
                    error={(errors as any)?.microsoftClarity?.projectId?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          </Card>

          {/* Cloudflare Turnstile */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'cloudflareTurnstile.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={Cloud}
                  title='Cloudflare Turnstile'
                  description='Privacy-first CAPTCHA alternative.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.cloudflareTurnstile}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('cloudflareTurnstile.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name={'cloudflareTurnstile.siteKey'}
                  render={({ field }) => (
                    <CustomInput
                      label='Site Key'
                      placeholder='Enter Site Key'
                      error={(errors as any)?.cloudflareTurnstile?.siteKey?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'cloudflareTurnstile.secretKey'}
                  render={({ field }) => (
                    <CustomInput
                      label='Secret Key'
                      placeholder='Enter Secret Key'
                      error={(errors as any)?.cloudflareTurnstile?.secretKey?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* GetButton.io */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'getButton.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={MessageSquare}
                  title='GetButton.io'
                  description='Floating contact button (WhatsApp/Phone).'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.getButton}
                />
              )}
            />

            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('tawkTo.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name={'getButton.widgetId'}
                  render={({ field }) => (
                    <CustomInput
                      label='Property ID'
                      placeholder='e.g., 1234567890abcdef'
                      error={errors?.getButton?.widgetId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Tawk.to */}
          <Card className='p-4'>
            <Controller
              control={control}
              name={'tawkTo.isActive'}
              render={({ field }) => (
                <SectionHeader
                  Icon={MessageCircle}
                  title='Tawk.to'
                  description='Free live chat widget.'
                  active={field.value}
                  onToggle={field.onChange}
                  iconColor={BRAND_COLORS.tawkTo}
                />
              )}
            />
            <div
              className={`transition-all duration-300 ease-in-out ${
                watch('tawkTo.isActive')
                  ? 'opacity-100 max-h-[800px] mt-4'
                  : 'opacity-0 max-h-0 -mt-2 overflow-hidden'
              }`}
            >
              <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4'>
                <Controller
                  control={control}
                  name={'tawkTo.propertyId'}
                  render={({ field }) => (
                    <CustomInput
                      label='Property ID'
                      placeholder='e.g., 1234567890abcdef'
                      error={(errors as any)?.tawkTo?.propertyId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'tawkTo.widgetId'}
                  render={({ field }) => (
                    <CustomInput
                      label='Widget ID'
                      placeholder='e.g., 1abcdefg'
                      error={(errors as any)?.tawkTo?.widgetId?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>
          </Card>
        </CardContent>

        <div className='flex sm:justify-end justify-center px-6'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Addons'}
          </Button>
        </div>
      </Card>
    </form>
  )
}

export default AddonsForm
