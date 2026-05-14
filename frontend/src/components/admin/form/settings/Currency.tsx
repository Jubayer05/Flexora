'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { currencySchema, CurrencyType } from '@/lib/validations/schemas/currency'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  data?: CurrencyType[] | undefined
  initialValues?: CurrencyType | undefined
  onSuccess?: () => void
  onCancel?: () => void
}

const CurrencyForm = ({ settingsKey, initialValues, data, onSuccess, onCancel }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CurrencyType>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      ...initialValues,
      id: initialValues?.id ?? Math.floor(Math.random() * 1_000_000_000), // Generate a random id if not provided
      exchangeRate: initialValues?.exchangeRate ?? 0,
      isDefault: initialValues?.isDefault ?? false,
      status: initialValues?.status ?? 'active',
      name: initialValues?.name ?? '',
      code: initialValues?.code ?? '',
      symbol: initialValues?.symbol ?? ''
    }
  })

  const onSubmit = handleSubmit(async (formData) => {
    const existingData = data ?? []
    let readyData: CurrencyType[]
    if (initialValues) {
      // Update existing item by id or name
      readyData = existingData.map((item) => {
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
        name='name'
        render={({ field }) => (
          <CustomInput
            label='Name'
            placeholder='Enter currency name'
            error={errors.name?.message}
            {...field}
            value={field.value ?? ''}
            required
          />
        )}
      />

      <Controller
        control={control}
        name='code'
        render={({ field }) => (
          <CustomInput
            label='Code'
            placeholder='Enter currency code'
            error={errors.code?.message}
            {...field}
            value={field.value ?? ''}
            required
          />
        )}
      />

      <Controller
        control={control}
        name='symbol'
        render={({ field }) => (
          <CustomInput
            label='Symbol'
            placeholder='Enter currency symbol'
            error={errors.symbol?.message}
            {...field}
            value={field.value ?? ''}
            required
          />
        )}
      />

      <Controller
        control={control}
        name='exchangeRate'
        render={({ field }) => (
          <CustomInput
            type='number'
            step={0.0001}
            min={0}
            label='Exchange Rate'
            placeholder='Enter currency exchange rate'
            error={errors.exchangeRate?.message}
            {...field}
            value={field.value?.toString() || '0'}
            onChange={(e) => field.onChange(Number(e.target.value))}
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

export default CurrencyForm
