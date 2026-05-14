'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface SendReplacementFormProps {
  customer?: User | null
  onClose?: () => void
  onSuccess?: () => void
}

interface SendReplacementFormData {
  productId?: string
  file?: string
  note?: string
}

const SendReplacementForm = ({ customer, onClose, onSuccess }: SendReplacementFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<SendReplacementFormData>({
    defaultValues: {
      productId: '',
      file: '',
      note: ''
    }
  })

  const onSubmit: SubmitHandler<SendReplacementFormData> = async (data) => {
    setLoading(true)
    try {
      await requests.post(`/admin/customers/${customer?.id}/send-replacement`, data)
      toast.success('Replacement sent successfully!')

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Product Information */}
      <Controller
        name='productId'
        control={control}
        render={({ field }) => (
          <CustomInput
            {...field}
            label='Product Name'
            placeholder='Enter original product ID'
            error={errors.productId?.message}
          />
        )}
      />

      {/* File */}
      <Controller
        name='file'
        control={control}
        render={({ field }) => (
          <CustomInput
            {...field}
            label='Choose File'
            placeholder=''
            error={errors.file?.message}
            type='file'
            accept='.pdf,.png,.jpg,.jpeg,.txt,.docx,.doc'
          />
        )}
      />

      {/* Note Field */}
      {/* <Controller
        name='note'
        control={control}
        render={({ field }) => (
          <CustomInput
            {...field}
            label='Additional Note (Optional)'
            type='textarea'
            rows={2}
            placeholder='Add any additional notes...'
            error={errors.note?.message}
          />
        )}
      /> */}

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
            'Send Replacement'
          )}
        </Button>
      </div>
    </form>
  )
}

export default SendReplacementForm
