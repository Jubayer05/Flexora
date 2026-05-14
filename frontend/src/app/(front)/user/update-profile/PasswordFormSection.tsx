'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const resetPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .optional()
      .refine((val) => !val || (val.length >= 6 && val.length <= 50), {
        message: 'Current password must be between 6 and 50 characters'
      }),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(50, 'New password must not exceed 50 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function PasswordFormSection() {
  const { push } = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const onPasswordSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true)
    try {
      const response = await requests.post<{
        success: boolean
        message: string
      }>('/customer/change-password', { ...data })

      toast.success(response.message || 'Password changed successfully!')
      passwordForm.reset()
      push('/user/profile')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className='bg-background/50 backdrop-blur-sm border border-border'>
      <CardContent className='p-6'>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className='space-y-6'>
          <div className='mb-6'>
            <h3 className='text-card-foreground text-xl font-semibold mb-2'>Password Details</h3>
            <p className='text-muted-foreground text-sm'>Update your account password for security</p>
          </div>

          {/* Current Password Field */}
          <Controller
            name='currentPassword'
            control={passwordForm.control}
            render={({ field, fieldState }) => (
              <CustomInput
                label='Current Password'
                type='password'
                placeholder='Enter your current password'
                disabled={isSubmitting}
                error={fieldState.error?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />

          {/* New Password Field */}
          <Controller
            name='newPassword'
            control={passwordForm.control}
            render={({ field, fieldState }) => (
              <CustomInput
                label='New Password'
                type='password'
                placeholder='Enter your new password'
                required
                disabled={isSubmitting}
                error={fieldState.error?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                helperText='Must contain at least 8 characters with uppercase, lowercase, and number'
              />
            )}
          />

          {/* Confirm Password Field */}
          <Controller
            name='confirmPassword'
            control={passwordForm.control}
            render={({ field, fieldState }) => (
              <CustomInput
                label='Confirm New Password'
                type='password'
                placeholder='Confirm your new password'
                required
                disabled={isSubmitting}
                error={fieldState.error?.message}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />

          {/* Submit Button */}
          <div className='flex gap-3 pt-4'>
            <Button type='submit' disabled={isSubmitting} className='flex-1 sm:flex-none'>
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => push('/user/profile')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
