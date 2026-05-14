'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface ResendProductFormProps {
  customer?: User | null
  onClose?: () => void
  onSuccess?: () => void
}

interface ResendProductFormData {
  productId?: string
  deliveryMethod: 'email' | 'telegram'
  note?: string
}

const ResendProductForm = ({ customer, onClose, onSuccess }: ResendProductFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ResendProductFormData>({
    defaultValues: {
      productId: '',
      note: ''
    }
  })

  const onSubmit: SubmitHandler<ResendProductFormData> = async (data) => {
    setLoading(true)
    try {
      await requests.post(`/admin/customers/${customer?.id}/resend-product`, data)
      toast.success('Product resent successfully!')

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Product ID Field */}
      <Controller
        name='productId'
        control={control}
        render={({ field }) => (
          <CustomInput
            {...field}
            label='Product ID (Optional)'
            error={errors.productId?.message}
            placeholder='Enter specific product ID to resend'
          />
        )}
      />
      {/* Note Field */}
      <Controller
        name='note'
        control={control}
        render={({ field }) => (
          <CustomInput
            {...field}
            label=' Note (Optional)'
            type='textarea'
            rows={3}
            placeholder='Add a note for this resend action...'
            error={errors.note?.message}
          />
        )}
      />
      {/* Action Buttons */}
      <div className='flex sm:flex-row flex-col-reverse justify-end gap-3'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          className='w-full sm:w-auto'
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type='submit' className='w-full sm:w-auto' disabled={loading}>
          {loading ? (
            <>
              <div className='mr-2 border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin' />
              Sending...
            </>
          ) : (
            'Resend Product'
          )}
        </Button>
      </div>
    </form>
  )
}

export default ResendProductForm
