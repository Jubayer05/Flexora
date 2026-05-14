'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { showError } from '@/lib/errMsg'
import { RankSystemType, rankSystemSchema } from '@/lib/validations/schemas/rankSystem'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { memo, useState } from 'react'
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form'
import type { FieldValues } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'

/** Form schema: features at top level for useFieldArray */
const rankSystemFormSchema = rankSystemSchema.omit({ meta: true }).extend({
  features: z.array(z.string())
})

/** Explicit form type so useFieldArray infers features as string[] */
interface RankSystemFormValues extends FieldValues {
  name: string
  displayOrder?: number
  description?: string
  minSpending: number
  maxSpending: number
  discount?: number
  bonusDevices?: number
  features: string[]
  icon?: string
}

interface RankSystemFormProps {
  initialData?: RankSystemType | null
  onClose?: () => void
  onSuccess?: () => void
}

const RankSystemForm = memo(({ initialData, onClose, onSuccess }: RankSystemFormProps) => {
  const [loading, setLoading] = useState(false)

  const initialFeatures =
    Array.isArray(initialData?.meta?.features) && initialData.meta.features.length > 0
      ? initialData.meta.features
      : ['']

  const safeNum = (v: unknown): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<RankSystemFormValues>({
    resolver: zodResolver(rankSystemFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: initialData?.name || '',
      displayOrder: safeNum(initialData?.displayOrder),
      description: initialData?.description || '',
      minSpending: safeNum(initialData?.minSpending),
      maxSpending: safeNum(initialData?.maxSpending),
      discount: safeNum(initialData?.discount),
      bonusDevices: safeNum(initialData?.bonusDevices),
      features: initialFeatures,
      icon: initialData?.icon || ''
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'features'
  })

  const onSubmit: SubmitHandler<RankSystemFormValues> = async (data) => {
    setLoading(true)
    try {
      const cleanFeatures = (data.features ?? []).map((f) => f.trim()).filter(Boolean)
      const payload = {
        ...data,
        meta: { features: cleanFeatures }
      }
      delete (payload as any).features
      const endpoint = initialData?.id ? `put` : `post`
      const url = `/admin/ranks` + (initialData?.id ? `/${initialData?.id}` : '')

      await requests[endpoint](url, {
        ...payload,
        ...(initialData?.id ? { id: initialData.id } : {})
      })

      toast.success(`Rank System ${initialData?.id ? 'updated' : 'created'} successfully!`)

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
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap [&>*]:flex-1 gap-4 [&>*]:min-w-[45%]'>
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Rank Name'
                placeholder='Enter rank name (e.g., NEWBIE, JUNIOR, VIP)'
                error={errors.name?.message}
                {...field}
                value={field.value}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  field.onChange(val)
                }}
              />
            )}
          />

          <Controller
            name='displayOrder'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Display Order'
                placeholder='Enter display order (lower numbers appear first)'
                type='number'
                error={errors.displayOrder?.message}
                {...field}
                value={safeNum(field.value)}
                onChange={(e) => field.onChange(safeNum(e.target.value))}
              />
            )}
          />
        </div>
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <div className='space-y-1'>
              <Label>Description</Label>
              <Textarea placeholder='Enter rank description' {...field} value={field.value || ''} />
              {errors.description && (
                <span className='font-medium text-red-500 text-xs'>
                  {errors.description.message}
                </span>
              )}
            </div>
          )}
        />

        <div className='flex flex-wrap [&>*]:flex-1 gap-4 [&>*]:min-w-[45%]'>
          <Controller
            name='minSpending'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Minimum Spending'
                placeholder='Enter minimum spending amount to reach this rank'
                type='number'
                error={errors.minSpending?.message}
                {...field}
                value={safeNum(field.value)}
                onChange={(e) => field.onChange(safeNum(e.target.value))}
              />
            )}
          />

          <Controller
            name='maxSpending'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Maximum Spending'
                placeholder='Enter maximum spending amount for this rank'
                type='number'
                error={errors.maxSpending?.message}
                {...field}
                value={safeNum(field.value)}
                onChange={(e) => field.onChange(safeNum(e.target.value))}
              />
            )}
          />

          <Controller
            name='discount'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Discount Percentage'
                placeholder='Enter discount percentage (0-100)'
                type='number'
                min='0'
                max='100'
                error={errors.discount?.message}
                {...field}
                value={safeNum(field.value)}
                onChange={(e) => field.onChange(safeNum(e.target.value))}
              />
            )}
          />

          <Controller
            name='bonusDevices'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Bonus Devices'
                placeholder='Enter number of bonus devices for this rank'
                type='number'
                min='0'
                error={errors.bonusDevices?.message}
                {...field}
                value={safeNum(field.value)}
                onChange={(e) => field.onChange(safeNum(e.target.value))}
              />
            )}
          />
        </div>

        {/* Features: add/remove inputs */}
        <div className='space-y-3'>
          <Label className='text-sm'>Features</Label>
          <p className='text-xs text-muted-foreground'>
            Click &quot;Add feature&quot; to add benefits for this rank.
          </p>
          <div className='flex flex-col gap-3'>
            {fields.map((field, index) => (
              <div key={field.id} className='flex gap-3 items-center'>
                <div className='flex-1 min-w-0'>
                  <Controller
                    name={`features.${index}` as const}
                    control={control}
                    render={({ field: f }) => (
                      <CustomInput
                        type='text'
                        {...f}
                        value={f.value ?? ''}
                        placeholder='e.g. Early access to sales, VIP support...'
                        className='w-full'
                      />
                    )}
                  />
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='flex-shrink-0 h-9 w-9'
                  onClick={() => remove(index)}
                  disabled={loading || fields.length <= 1}
                  aria-label='Remove feature'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            ))}
          </div>
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

        {/* Icon upload (same pattern as SubscriptionPackage) */}
        <div className='space-y-2'>
          <Label className='text-sm'>Icon</Label>
          <Controller
            control={control}
            name='icon'
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
            <span className='font-medium text-red-500 text-xs'>{errors.icon.message}</span>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={loading}>
          {loading
            ? initialData?.id
              ? 'Updating...'
              : 'Creating...'
            : initialData?.id
            ? 'Update Rank'
            : 'Create Rank'}
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
})

RankSystemForm.displayName = 'RankSystemForm'

export default RankSystemForm
