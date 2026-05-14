'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface CustomerFormProps {
  customer?: User | null
  onClose?: () => void
  onSuccess?: () => void
}

interface CustomerFormData {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  telegramUsername?: string
}

const CustomerForm = ({ customer, onClose, onSuccess }: CustomerFormProps) => {
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(customer)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<CustomerFormData>({
    defaultValues: {
      email: customer?.email || '',
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      phone: customer?.phone || '',
      telegramUsername: customer?.telegramUsername || ''
    }
  })

  const onSubmit: SubmitHandler<CustomerFormData> = async (data) => {
    setLoading(true)
    try {
      if (isEditing) {
        await requests.put(`/admin/customers/${customer?.id}`, data)
        toast.success('Customer updated successfully!')
      } else {
        await requests.post('/admin/customers', data)
        toast.success('Customer updated successfully!')
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
      {/* Customer Information Section */}
      <div className='space-y-4'>
        {/* Email Field - Full Width */}
        <Controller
          name='email'
          control={control}
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }}
          render={({ field }) => (
            <CustomInput
              label='Email address'
              {...field}
              type='email'
              placeholder='Enter customer email address'
            />
          )}
        />

        {/* Name Fields - Two Column Grid */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* First Name Field */}
          <Controller
            name='firstName'
            control={control}
            render={({ field }) => (
              <CustomInput label='First Name' placeholder='Enter first name' {...field} />
            )}
          />

          {/* Last Name Field */}
          <Controller
            name='lastName'
            control={control}
            render={({ field }) => (
              <CustomInput {...field} label='Last Name' placeholder='Enter last name' />
            )}
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
        {/* Phone Field */}
        <Controller
          name='phone'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Phone/Whatsapp Number'
              placeholder='+1 (555) 123-4567'
              error={errors.phone?.message}
              {...field}
            />
          )}
        />

        {/* Telegram Username Field */}
        <Controller
          name='telegramUsername'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Telegram Username'
              placeholder='@username'
              error={errors.phone?.message}
              {...field}
            />
          )}
        />
      </div>

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
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{isEditing ? 'Update Customer' : 'Create Customer'}</>
          )}
        </Button>
      </div>
    </form>
  )
}

export default CustomerForm
