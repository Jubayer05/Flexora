'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { FeedbackFormData, FeedbackSchema } from '@/lib/validations/schemas/feedback'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface FeedbackFormProps {
  feedback?: Feedback
  onSuccess?: () => void
  onCancel?: () => void
}

export default function FeedbackForm({ feedback, onSuccess, onCancel }: FeedbackFormProps) {
  const isEditMode = !!feedback

  const safeRating =
    feedback != null && Number.isFinite(Number(feedback.rating)) ? Number(feedback.rating) : 5

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(FeedbackSchema),
    defaultValues: {
      productId: feedback?.productId || undefined,
      name: feedback?.name || '',
      feedback: feedback?.feedback || '',
      rating: safeRating,
      published: feedback?.published ?? true
    }
  })

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      if (isEditMode) {
        await requests.put(`/admin/feedbacks/${feedback.id}`, data)
        toast.success('Feedback updated successfully')
      } else {
        // When admin creates feedback, it's automatically published
        await requests.post('/admin/feedbacks', {
          ...data,
          published: true
        })
        toast.success('Feedback created successfully')
      }
      reset()
      onSuccess?.()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <Controller
        name='productId'
        control={control}
        render={({ field }) => (
          <CustomSelect
            url='/admin/products'
            value={field.value?.toString()}
            onChange={(value) => field.onChange(value ? Number(value) : undefined)}
            placeholder='Select product'
            showSearch={true}
            label='Product'
            options={(data: any) =>
              data?.data?.products?.map((category: any) => ({
                label: category.name,
                value: String(category.id)
              }))
            }
            disabled={isSubmitting}
          />
        )}
      />

      {/* Customer Name */}
      <Controller
        name='name'
        control={control}
        render={({ field }) => (
          <CustomInput
            label='Customer Name'
            placeholder='Enter customer name'
            error={errors.name?.message}
            {...field}
            value={field.value ?? ''}
            disabled={isSubmitting}
            required
          />
        )}
      />

      {/* Rating */}
      <Controller
        name='rating'
        control={control}
        render={({ field }) => (
          <CustomInput
            label='Rating (0.1-5)'
            type='number'
            step={0.1}
            min={0.1}
            max={5}
            error={errors.rating?.message}
            {...field}
            value={Number.isFinite(field.value) ? field.value : 5}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const value = (e.target as HTMLInputElement).value
              const num = Number(value)
              field.onChange(value === '' || !Number.isFinite(num) ? 5 : num)
            }}
            disabled={isSubmitting}
            helperText='Whole numbers (e.g., 3, 4, 5) or with 1 decimal (e.g., 4.5, 4.9)'
          />
        )}
      />

      {/* Feedback */}
      <Controller
        name='feedback'
        control={control}
        render={({ field }) => (
          <CustomInput
            label='Feedback'
            type='textarea'
            rows={4}
            placeholder='Enter customer feedback'
            error={errors.feedback?.message}
            {...field}
            value={field.value ?? ''}
            disabled={isSubmitting}
          />
        )}
      />

      {/* Actions */}
      <div className='flex justify-end gap-2 pt-4'>
        <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting
            ? isEditMode
              ? 'Updating...'
              : 'Creating...'
            : isEditMode
              ? 'Update Feedback'
              : 'Create Feedback'}
        </Button>
      </div>
    </form>
  )
}
