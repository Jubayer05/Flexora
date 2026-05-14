'use client'

import CustomInput from '@/components/common/CustomInput'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { DollarSign, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface ManageFundsFormProps {
  customer?: User | null
  onClose?: () => void
  onSuccess?: () => void
}

interface ManageFundsFormData {
  type: 'add' | 'deduct'
  amount: number
  reason: string
}

const ManageFundsForm = ({ customer, onClose, onSuccess }: ManageFundsFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ManageFundsFormData>({
    defaultValues: {
      type: 'add',
      amount: 0,
      reason: ''
    }
  })

  const selectedType = watch('type')

  const onSubmit: SubmitHandler<ManageFundsFormData> = async (data) => {
    setLoading(true)
    try {
      const payload = {
        amount: Number(data.amount),
        description: data.reason.trim() || (data.type === 'add' ? 'Admin added funds' : 'Admin deducted funds')
      }
      if (data.type === 'add') {
        await requests.post(`/admin/users/${customer?.id}/balance/add`, {
          ...payload,
          type: 'ADJUSTMENT'
        })
        toast.success('Funds added successfully!')
      } else {
        await requests.post(`/admin/users/${customer?.id}/balance/deduct`, payload)
        toast.success('Funds deducted successfully!')
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
      {/* Type: Add or Deduct */}
      <div className='space-y-3'>
        <Label>Transaction Type</Label>
        <Controller
          name='type'
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className='flex gap-4'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='add' id='type-add' />
                <Label htmlFor='type-add' className='flex items-center gap-2 font-normal cursor-pointer'>
                  <Plus className='h-4 w-4 text-green-600' />
                  Add Funds
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='deduct' id='type-deduct' />
                <Label htmlFor='type-deduct' className='flex items-center gap-2 font-normal cursor-pointer'>
                  <Minus className='h-4 w-4 text-red-600' />
                  Deduct Funds
                </Label>
              </div>
            </RadioGroup>
          )}
        />
      </div>

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
            value={field.value || ''}
            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
            error={errors.amount?.message}
            placeholder='100.00'
            step={0.01}
            min={0.01}
            max={1000000}
            prefix={<span className='font-medium text-muted-foreground'>$</span>}
            helperText={
              selectedType === 'deduct'
                ? 'Amount will be deducted from customer balance. Ensure sufficient balance.'
                : 'Minimum amount: $0.01, Maximum: $1,000,000'
            }
          />
        )}
      />

      {/* Reason/Description Field - required for deduct */}
      <Controller
        name='reason'
        control={control}
        rules={{
          required: selectedType === 'deduct' ? 'Reason is required for deduction' : false,
          minLength:
            selectedType === 'deduct'
              ? { value: 3, message: 'Reason must be at least 3 characters' }
              : undefined
        }}
        render={({ field }) => (
          <CustomInput
            label={selectedType === 'deduct' ? 'Reason for deduction' : 'Reason (optional)'}
            {...field}
            error={errors.reason?.message}
            type='textarea'
            placeholder={
              selectedType === 'deduct'
                ? 'Please provide a reason for this deduction...'
                : 'Add a note for this transaction (optional)...'
            }
            rows={3}
            suffix={selectedType === 'add' ? <DollarSign className='h-4 w-4 text-muted-foreground' /> : undefined}
          />
        )}
      />

      {/* Action Buttons */}
      <div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          className='w-full sm:w-auto'
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type='submit'
          variant={selectedType === 'deduct' ? 'destructive' : 'default'}
          className='w-full sm:w-auto'
          disabled={loading}
        >
          {loading ? (
            <>
              <div className='mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
              Processing...
            </>
          ) : selectedType === 'add' ? (
            'Add Funds'
          ) : (
            'Deduct Funds'
          )}
        </Button>
      </div>
    </form>
  )
}

export default ManageFundsForm
