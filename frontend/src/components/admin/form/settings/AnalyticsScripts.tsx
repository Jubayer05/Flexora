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

const analyticsScriptsSchema = z.object({
  googleAnalytics: z.string().optional(),
  facebookPixel: z.string().optional()
})

export type AnalyticsScriptsType = z.infer<typeof analyticsScriptsSchema>

type TProps = {
  settingsKey: string
  initialValues?: AnalyticsScriptsType | undefined
  refetch?: () => void
}

const AnalyticsScriptsForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AnalyticsScriptsType>({
    resolver: zodResolver(analyticsScriptsSchema),
    defaultValues: {
      ...initialValues
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
              name='googleAnalytics'
              render={({ field }) => (
                <CustomInput
                  label='Google Analytics'
                  placeholder='Enter Google Analytics ID'
                  error={errors.googleAnalytics?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            <Controller
              control={control}
              name='facebookPixel'
              render={({ field }) => (
                <CustomInput
                  label='Facebook Pixel'
                  placeholder='Enter Facebook Pixel ID'
                  error={errors.facebookPixel?.message}
                  {...field}
                  value={field.value ?? ''}
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

export default AnalyticsScriptsForm
