'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

interface SubscriptionPackage {
  id: number
  name: string
  description?: any
  price: number
  discount: number
  duration: number
  isActive: boolean
  meta?: any
}

interface SubscriptionPackageFormProps {
  initialValues?: SubscriptionPackage | null
  onClose?: () => void
  onSuccess?: () => void
}

// Validation schemas
const createSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(0, 'Price must be at least 0')
    .max(10000, 'Price must not exceed 10000'),
  discount: z.coerce
    .number()
    .min(0, 'Discount must be at least 0')
    .max(100, 'Discount must not exceed 100'),
  duration: z.coerce.number().int().positive('Duration must be a positive number'),
  isActive: z.boolean(),
  // FileUploader can return absolute URLs or API paths like /files/...
  icon: z.string().optional().or(z.literal('')),
  // Keep lenient; we trim/filter empty strings on submit
  features: z.array(z.string()).optional()
})

const updateSchema = z.object({
  name: z.string().min(1, 'Package name is required').optional(),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(0, 'Price must be at least 0')
    .max(10000, 'Price must not exceed 10000')
    .optional(),
  discount: z.coerce
    .number()
    .min(0, 'Discount must be at least 0')
    .max(100, 'Discount must not exceed 100')
    .optional(),
  duration: z.coerce.number().int().positive('Duration must be a positive number').optional(),
  isActive: z.boolean().optional(),
  icon: z.string().optional().or(z.literal('')),
  features: z.array(z.string()).optional()
})

const SubscriptionPackageForm = ({
  initialValues,
  onClose,
  onSuccess
}: SubscriptionPackageFormProps) => {
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(initialValues)

  // Use appropriate schema based on whether we're creating or updating
  const schema = isEditing ? updateSchema : createSchema

  const meta = (initialValues?.meta as any) || {}
  const defaultFeatures = Array.isArray(meta.features) ? meta.features : []

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      price: initialValues?.price || 0,
      discount: initialValues?.discount || 0,
      duration: initialValues?.duration || 30,
      isActive: initialValues?.isActive ?? true,
      icon: meta.icon || '',
      features: defaultFeatures.length ? defaultFeatures : ['']
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'features'
  })

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const { icon, features, ...rest } = data
      const cleanFeatures =
        Array.isArray(features) && features.length
          ? (features as string[]).map((f) => f.trim()).filter(Boolean)
          : []

      const existingMeta = (initialValues?.meta as any) || {}

      const formData = {
        ...rest,
        description: rest.description || null,
        meta: {
          ...existingMeta,
          icon: icon || undefined,
          features: cleanFeatures
        }
      }

      if (isEditing) {
        await requests.put(`/admin/subscription-packages/${initialValues?.id}`, formData)
        toast.success('Subscription package updated successfully!')
      } else {
        await requests.post('/admin/subscription-packages', formData)
        toast.success('Subscription package created successfully!')
      }

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='space-y-4 pt-2'>
        {/* Basic Information */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Name Field */}
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Package Name'
                {...field}
                placeholder='Premium Plan'
                error={errors.name?.message as string | undefined}
                required
              />
            )}
          />

          {/* Duration Field */}
          <Controller
            name='duration'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Duration (days)'
                {...field}
                type='number'
                placeholder='30'
                min={1}
                error={errors.duration?.message as string | undefined}
                required
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                value={field.value?.toString() || '0'}
              />
            )}
          />
        </div>

        {/* Description Field */}
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
              <CustomInput
                label='Description'
                type='textarea'
                {...field}
                value={field.value ?? ''}
                placeholder='Enter package description (optional)'
                error={errors.description?.message as string | undefined}
              />
          )}
        />

        {/* Icon Upload (uses same uploader as PromotionalIconForm) */}
        <div className='space-y-2'>
          <Label className='text-sm'>Icon</Label>
          <Controller
            name='icon'
            control={control}
            render={({ field }) => (
              <FileUploader
                value={field.value || ''}
                onChangeAction={field.onChange}
                maxAllow={1}
                size='small'
              />
            )}
          />
          {errors.icon && (
            <p className='mt-1 text-xs text-destructive'>
              {errors.icon.message as string}
            </p>
          )}
        </div>

        {/* Price and Discount */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Price Field */}
          <Controller
            name='price'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Price ($)'
                {...field}
                type='number'
                placeholder='29.99'
                min={0}
                max={10000}
                step='0.01'
                error={errors.price?.message as string | undefined}
                required
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                value={field.value?.toString() || '0'}
              />
            )}
          />

          {/* Discount Field */}
          <Controller
            name='discount'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Discount (%)'
                {...field}
                type='number'
                placeholder='20'
                min={0}
                max={100}
                step='1'
                error={errors.discount?.message as string | undefined}
                required
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                value={field.value?.toString() || '0'}
              />
            )}
          />
        </div>

        {/* Status Toggle */}
        <Controller
          name='isActive'
          control={control}
          render={({ field }) => (
            <div className='flex items-center space-x-2'>
              <Switch id='isActive' checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor='isActive' className='cursor-pointer'>
                Active Package
              </Label>
            </div>
          )}
        />

        {/* Features / Benefits */}
        <div className='space-y-2'>
          <Label className='text-sm'>Features / Benefits</Label>
          <p className='text-xs text-muted-foreground'>
            Click &quot;Add feature&quot; to list the benefits of this subscription.
          </p>

          {fields.map((field, index) => (
            <div key={field.id} className='flex gap-2 items-start'>
              <Controller
                name={`features.${index}` as const}
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label={index === 0 ? 'Feature' : undefined}
                    type='text'
                    {...field}
                    value={field.value ?? ''}
                    placeholder='e.g. Priority support, higher limits...'
                    error={
                      (errors as any).features?.[index]?.message as string | undefined
                    }
                    className='flex-1'
                  />
                )}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='mt-6'
                onClick={() => remove(index)}
                disabled={loading || fields.length === 1}
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          ))}

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => append('')}
            disabled={loading}
          >
            <Plus className='w-4 h-4 mr-1' />
            Add feature
          </Button>
        </div>
      </div>

      {/* Form Actions */}
      <div className='flex flex-wrap gap-3 pt-4 border-t justify-center sm:justify-end'>
        <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type='submit' disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update Package' : 'Create Package'}
        </Button>
      </div>
    </form>
  )
}

export default SubscriptionPackageForm
