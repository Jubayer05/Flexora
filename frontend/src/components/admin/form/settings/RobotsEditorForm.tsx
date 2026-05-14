'use client'

import CustomInput from '@/components/common/CustomInput'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const robotsConfigSchema = z.object({
  content: z.string().min(1, 'Robots.txt content is required')
})

type RobotsConfigFormData = z.infer<typeof robotsConfigSchema>

type TProps = {
  settingsKey: string
  initialValues?: { content?: string } | null
  refetch?: () => void
}

const RobotsEditorForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<RobotsConfigFormData>({
    resolver: zodResolver(robotsConfigSchema),
    defaultValues: {
      content: initialValues?.content || ''
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Robots.txt updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  const defaultRobotsContent = `User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml`

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <PageHeader
        title='Robots.txt Editor'
        subTitle='Edit your robots.txt file. Changes will be reflected immediately without requiring a rebuild.'
      />

      <Card>
        <CardHeader>
          <CardTitle>Robots.txt Configuration</CardTitle>
          <CardDescription>
            Configure how search engines crawl your site. The robots.txt file will be served dynamically from your
            database.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='content'
            render={({ field }) => (
              <CustomInput
                label='Robots.txt Content'
                type='textarea'
                rows={20}
                placeholder={defaultRobotsContent}
                error={errors.content?.message}
                helperText='Enter the robots.txt content. Each line should follow the robots.txt standard format.'
                required
                {...field}
                value={field.value ?? ''}
                className='font-mono text-sm'
              />
            )}
          />

          <div className='rounded-md bg-muted p-4'>
            <h4 className='text-sm font-semibold mb-2'>Example Format:</h4>
            <pre className='text-xs text-muted-foreground whitespace-pre-wrap font-mono'>
              {defaultRobotsContent}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-4'>
        <Button type='submit' disabled={isSubmitting} size='lg'>
          {isSubmitting ? 'Saving...' : 'Save Robots.txt'}
        </Button>
      </div>
    </form>
  )
}

export default RobotsEditorForm

