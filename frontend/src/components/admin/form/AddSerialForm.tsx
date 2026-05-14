'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import useSerialStockStore from '@/services/state/serial-stock-state'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

interface AddSerialFormProps {
  onClose: () => void
}

// Zod schema for validation
const serialItemSchema = z.object({
  id: z.string().optional(),
  username: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, 'Please enter a valid email'),
  phone: z.string().optional(),
  password: z.string().optional(),
  note: z.string().optional()
}).refine((value) => Boolean(value.id || value.username || value.email || value.phone), {
  message: 'Add at least one identifier: social ID, username, email, or phone',
  path: ['id']
})

type SerialItemFormData = z.infer<typeof serialItemSchema>

export default function AddSerialForm({ onClose }: AddSerialFormProps) {
  const { addItem } = useSerialStockStore()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<SerialItemFormData>({
    resolver: zodResolver(serialItemSchema),
    defaultValues: {
      id: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      note: ''
    }
  })

  const onSubmit = (data: SerialItemFormData) => {
    addItem({
      id: data.id?.trim() || '',
      username: data.username?.trim() || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      password: data.password?.trim() || '',
      note: data.note?.trim() || ''
    })

    onClose()
  }

  return (
    <div className='z-50 fixed inset-0 flex justify-center items-center bg-black/50'>
      <div className='bg-gray-900 mx-4 p-6 rounded-lg w-full max-w-2xl'>
        {/* Header */}
        <div className='flex justify-between items-center mb-4'>
          <h3 className='font-medium text-white text-lg'>Add New Serial Item</h3>
          <button onClick={onClose} className='text-gray-400 hover:text-white transition-colors'>
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          {/* Social ID Field */}
          <div>
            <Controller
              name='id'
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...field}
                  type='text'
                  label='Social ID'
                  placeholder='Enter social ID'
                />
              )}
            />
            {errors.id && (
              <span className='block mt-1 text-red-500 text-xs'>{errors.id.message}</span>
            )}
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Controller
                name='username'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type='text'
                    label='Username'
                    placeholder='username'
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name='phone'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type='text'
                    label='Phone Number'
                    placeholder='+1234567890'
                  />
                )}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...field}
                  type='email'
                  label='Email Address'
                  placeholder='email address'
                />
              )}
            />
            {errors.email && (
              <span className='block mt-1 text-red-500 text-xs'>{errors.email.message}</span>
            )}
            </div>

          {/* Password Field */}
            <div>
            <Controller
              name='password'
              control={control}
              render={({ field }) => (
                <CustomInput {...field} type='text' label='Password' placeholder='password' />
              )}
            />
            {errors.password && (
              <span className='block mt-1 text-red-500 text-xs'>{errors.password.message}</span>
            )}
            </div>
          </div>

          {/* Note Field - Admin Private Note */}
          <div>
            <Controller
              name='note'
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...field}
                  label='Private Note (Admin Only - Optional)'
                  type='textarea'
                  placeholder='Private note visible only to admins, not customers'
                  rows={3}
                />
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 pt-4'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit'>Add Item</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
