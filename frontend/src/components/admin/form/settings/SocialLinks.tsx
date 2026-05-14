'use client'

import CustomInput from '@/components/common/CustomInput'
import CustomLink from '@/components/common/CustomLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import {
  SOCIAL_PLATFORM_CONFIGS,
  SocialLinksSchema,
  SocialLinksType,
  SocialPlatform
} from '@/lib/validations/schemas/socialLinks'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Globe } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: SocialLinksType | undefined
  refetch?: () => void
}

const SocialLinksForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SocialLinksType>({
    resolver: zodResolver(SocialLinksSchema),
    defaultValues: {
      facebook: {
        url: initialValues?.facebook?.url || '',
        isActive: initialValues?.facebook?.isActive ?? true,
        displayText: initialValues?.facebook?.displayText || ''
      },
      twitter: {
        url: initialValues?.twitter?.url || '',
        isActive: initialValues?.twitter?.isActive ?? true,
        displayText: initialValues?.twitter?.displayText || ''
      },
      instagram: {
        url: initialValues?.instagram?.url || '',
        isActive: initialValues?.instagram?.isActive ?? true,
        displayText: initialValues?.instagram?.displayText || ''
      },
      linkedin: {
        url: initialValues?.linkedin?.url || '',
        isActive: initialValues?.linkedin?.isActive ?? true,
        displayText: initialValues?.linkedin?.displayText || ''
      },
      youtube: {
        url: initialValues?.youtube?.url || '',
        isActive: initialValues?.youtube?.isActive ?? true,
        displayText: initialValues?.youtube?.displayText || ''
      },
      tiktok: {
        url: initialValues?.tiktok?.url || '',
        isActive: initialValues?.tiktok?.isActive ?? true,
        displayText: initialValues?.tiktok?.displayText || ''
      },
      discord: {
        url: initialValues?.discord?.url || '',
        isActive: initialValues?.discord?.isActive ?? true,
        displayText: initialValues?.discord?.displayText || ''
      },
      telegram: {
        url: initialValues?.telegram?.url || '',
        isActive: initialValues?.telegram?.isActive ?? true,
        displayText: initialValues?.telegram?.displayText || ''
      },
      github: {
        url: initialValues?.github?.url || '',
        isActive: initialValues?.github?.isActive ?? true,
        displayText: initialValues?.github?.displayText || ''
      },
      dribbble: {
        url: initialValues?.dribbble?.url || '',
        isActive: initialValues?.dribbble?.isActive ?? true,
        displayText: initialValues?.dribbble?.displayText || ''
      }
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Social links updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  const renderSocialLinkField = (platform: SocialPlatform) => {
    const config = SOCIAL_PLATFORM_CONFIGS[platform]
    const watchedUrl = watch(`${platform}.url`)

    return (
      <Card key={platform} className='p-4'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded w-4 h-4' style={{ backgroundColor: config.color }} />
            <h3 className='font-medium text-sm'>{config.label}</h3>
            {watchedUrl && (
              <CustomLink
                href={watchedUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:text-primary transition-colors'
              >
                <ExternalLink className='w-4 h-4' />
              </CustomLink>
            )}
          </div>
          <Controller
            control={control}
            name={`${platform}.isActive`}
            render={({ field }) => (
              <div className='flex items-center gap-2'>
                <label className='text-muted-foreground text-sm'>
                  {field.value ? 'Active' : 'Inactive'}
                </label>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!watchedUrl}
                />
              </div>
            )}
          />
        </div>

        <Controller
          control={control}
          name={`${platform}.url`}
          render={({ field }) => (
            <CustomInput
              placeholder={config.placeholder}
              error={errors[platform]?.url?.message}
              {...field}
              value={field.value || ''}
              className='mb-2'
            />
          )}
        />

        {/* <Controller
          control={control}
          name={`${platform}.displayText`}
          render={({ field }) => (
            <CustomInput
              placeholder={`Custom display text for ${config.label} (optional)`}
              {...field}
              value={field.value || ''}
              className='text-sm'
            />
          )}
        /> */}
      </Card>
    )
  }

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Globe className='w-5 h-5' />
            Social Media Management
          </CardTitle>
          <p className='text-muted-foreground text-sm'>
            Configure your social media presence. Only active links with URLs will be displayed.
          </p>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='gap-4 grid md:grid-cols-2'>
            {Object.values(SocialPlatform).map((platform) => renderSocialLinkField(platform))}
          </div>

          <div className='flex sm:justify-end justify-center'>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Social Links'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default SocialLinksForm
