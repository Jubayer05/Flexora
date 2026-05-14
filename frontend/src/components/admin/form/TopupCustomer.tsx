'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { DollarSign } from 'lucide-react'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface TopupCustomerFormProps {
  customer?: User | null
  onClose?: () => void
  onSuccess?: () => void
}

interface TopupFormData {
  amount: number
  description: string
}

const TopupCustomerForm = ({ customer, onClose, onSuccess }: TopupCustomerFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<TopupFormData>({
    defaultValues: {
      amount: 0,
      description: ''
    }
  })

  const onSubmit: SubmitHandler<TopupFormData> = async (data) => {
    setLoading(true)
    try {
      await requests.post(`/admin/users/${customer?.id}/balance/add`, {
        amount: Number(data.amount),
        description: data.description
      })
      toast.success('Customer balance topped up successfully!')

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Amount Field */}
      <Controller
        name='amount'
        control={control}
        rules={{
          required: 'Amount is required',
          min: { value: 0.01, message: 'Amount must be greater than 0' }
        }}
        render={({ field }) => (
          <CustomInput
            label='Amount'
            {...field}
            type='number'
            error={errors.amount?.message}
            placeholder='100.00'
            step={0.01}
            min={0.01}
            max={1000000}
            prefix={<span className='font-medium text-muted-foreground'>$</span>}
            helperText='Minimum amount: $0.01, Maximum: $1,000,000'
          />
        )}
      />

      {/* description Field */}
      <Controller
        name='description'
        control={control}
        render={({ field }) => (
          <CustomInput
            label='description'
            {...field}
            error={errors.description?.message}
            type='textarea'
            placeholder='Add a description for this transaction...'
            rows={3}
            suffix={<DollarSign />}
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
              Processing...
            </>
          ) : (
            'Add Funds'
          )}
        </Button>
      </div>
    </form>
  )
}

export default TopupCustomerForm
