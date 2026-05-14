'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { showError } from '@/lib/errMsg'
import {
  EmailTemplateSchema,
  EmailTemplate,
  EmailTemplateTypeEnum,
  EmailTemplateFormType
} from '@/lib/validations/schemas/emailTemplate'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface EmailTemplateFormProps {
  initialData?: EmailTemplate | null
  onClose?: () => void
  onSuccess?: () => void
}

const EmailTemplateForm = ({ initialData, onClose, onSuccess }: EmailTemplateFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<EmailTemplateFormType>({
    resolver: zodResolver(EmailTemplateSchema),
    mode: 'onSubmit',
    defaultValues: {
      subject: initialData?.subject || '',
      body: initialData?.body || '',
      type: initialData?.type || EmailTemplateTypeEnum.WELCOME_EMAIL,
      isActive: initialData?.isActive ?? true,
      variables: initialData?.variables || []
    }
  })

  const onSubmit: SubmitHandler<EmailTemplateFormType> = async (data) => {
    setLoading(true)
    try {
      const endpoint = initialData?.id ? 'put' : 'post'
      const url = '/admin/email-templates' + (initialData?.id ? `/${initialData.id}` : '')

      await requests[endpoint](url, {
        ...data,
        ...(initialData?.id ? { id: initialData.id } : {})
      })
      toast.success(`Email template ${initialData?.id ? 'updated' : 'created'} successfully!`)

      onSuccess?.()
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Basic Information */}
      <div className='space-y-4'>
        <Controller
          name='type'
          control={control}
          render={({ field }) => (
            <div className='space-y-2'>
              <CustomSelect
                label='Template Type'
                placeholder='Select template type'
                staticOptions={Object.values(EmailTemplateTypeEnum).map((type) => ({
                  title: type
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                  value: type,
                  label: type
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())
                }))}
                value={field.value}
                onChange={(val) => field.onChange(val)}
              />
              {errors.type && <p className='text-destructive text-sm'>{errors.type.message}</p>}
            </div>
          )}
        />

        <Controller
          name='subject'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Email Subject'
              placeholder='Enter email subject'
              error={errors.subject?.message}
              {...field}
            />
          )}
        />

        <Controller
          name='body'
          control={control}
          render={({ field }) => (
            <div className='space-y-2'>
              <label className='font-medium text-sm'>Email Body</label>
              <Textarea
                placeholder='Enter email body content'
                className='min-h-50'
                {...field}
              />
              {errors.body && <p className='text-destructive text-sm'>{errors.body.message}</p>}
            </div>
          )}
        />
      </div>

      {/* Form Actions */}
      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={loading}>
          {loading
            ? initialData?.id
              ? 'Updating...'
              : 'Creating...'
            : initialData?.id
            ? 'Update Template'
            : 'Create Template'}
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            onClose?.()
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default EmailTemplateForm
