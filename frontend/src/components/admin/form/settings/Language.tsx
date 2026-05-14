'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

// ===  Language Schema ===
const languageSchema = z.object({
  id: z.number().min(0).optional(),
  icon: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  shortName: z.string().min(1).max(5),
  position: z.number().min(1),
  isActive: z.boolean()
})

export type LanguageType = z.infer<typeof languageSchema>

type TProps = {
  settingsKey: string
  data?: LanguageType[] | undefined
  initialValues?: LanguageType | undefined
  onSuccess?: () => void
  onCancel?: () => void
}

const LanguageForm = ({ settingsKey, initialValues, data, onSuccess, onCancel }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<LanguageType>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      ...initialValues,
      id: initialValues?.id ?? Math.floor(Math.random() * 1_000_000_000), // Generate a random id if not provided
      name: initialValues?.name ?? '',
      icon: initialValues?.icon ?? '',
      position: initialValues?.position ?? (data?.length ?? 0) + 1,
      isActive: initialValues?.isActive ?? true
    }
  })

  const onSubmit = handleSubmit(async (formData: LanguageType) => {
    const existingData: LanguageType[] = Array.isArray(data) ? data : []
    let readyData: LanguageType[]
    if (initialValues) {
      // Update existing item by id or name
      readyData = existingData.map((item: LanguageType) => {
        if (
          (item.id && formData.id && item.id === formData.id) ||
          (item.name && formData.name && item.name === formData.name)
        ) {
          return { ...formData }
        }
        return item
      })
    } else {
      // Add new item
      readyData = [...existingData, formData]
    }

    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: readyData
      })
      if (res?.success) {
        toast.success('Settings updated successfully!')

        onSuccess?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6 pt-4'>
      <Controller
        control={control}
        name='icon'
        render={({ field }) => (
          <div className='space-y-2'>
            <label className='block font-medium text-gray-700 text-sm'>Category Icon</label>
            <FileUploader
              value={field.value || undefined}
              onChangeAction={field.onChange}
              maxAllow={1}
              size='small'
            />
            <span className='text-red-500 text-xs'>{errors.icon?.message}</span>
          </div>
        )}
      />

      <Controller
        control={control}
        name='name'
        render={({ field }) => (
          <CustomInput
            label='Name'
            placeholder='Enter language name'
            error={errors.name?.message}
            {...field}
            value={field.value ?? ''}
            required
          />
        )}
      />

      <Controller
        control={control}
        name='shortName'
        render={({ field }) => (
          <CustomInput
            label='Short Name'
            placeholder='Enter language short name'
            error={errors.shortName?.message}
            {...field}
            value={field.value ?? ''}
            required
          />
        )}
      />

      <Controller
        control={control}
        name='position'
        render={({ field }) => (
          <CustomInput
            label='Positions'
            error={errors.position?.message}
            {...field}
            type='number'
            placeholder='0'
            value={field.value}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        )}
      />

      <Controller
        control={control}
        name='isActive'
        render={({ field }) => (
          <CustomInput
            type='switch'
            label={`Status ${field.value ? '(Active)' : '(Inactive)'}`}
            error={errors.isActive?.message}
            {...field}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked)}
            required
          />
        )}
      />

      <div className='flex sm:flex-row flex-col-reverse justify-end gap-3'>
        <Button type='submit'>
          {isSubmitting ? 'Submitting...' : initialValues ? 'Update' : 'Submit'}
        </Button>

        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export default LanguageForm
