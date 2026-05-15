'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useAdminStore } from '@/stores/admin-info'
import { zodResolver } from '@hookform/resolvers/zod'
import Cookies from 'js-cookie'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const resetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  })

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

interface SecurityModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  const { clearAdminInfo } = useAdminStore()
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const onSubmit = async (data: ResetPasswordData) => {
    try {
      const response = await requests.post('/admin/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })

      if (response?.success) {
        toast.success('Password changed successfully. Please log in again.')
        reset()
        clearAdminInfo()
        Cookies.remove('adminToken')
        Cookies.remove('adminRefreshToken')
        Cookies.remove('permissions')
        Cookies.remove('userRole')
        onClose()
        window.location.replace('/login')
      }
    } catch (error) {
      showError(error)
    }
  }

  const handleClose = () => {
    reset()
    setVisiblePasswords({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    })
    onClose()
  }

  const togglePasswordVisibility = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field]
    }))
  }

  const renderPasswordToggle = (
    field: keyof typeof visiblePasswords,
    label: string
  ) => {
    const isVisible = visiblePasswords[field]
    const Icon = isVisible ? EyeOff : Eye

    return (
      <button
        type='button'
        className='inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={() => togglePasswordVisibility(field)}
        aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
      >
        <Icon className='h-4 w-4' />
      </button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Update your password to keep your account secure</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 py-4'>
          <Controller
            name='currentPassword'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Current Password'
                type={visiblePasswords.currentPassword ? 'text' : 'password'}
                placeholder='Enter current password'
                error={errors.currentPassword?.message}
                suffix={renderPasswordToggle('currentPassword', 'current password')}
                required
                {...field}
              />
            )}
          />

          <Controller
            name='newPassword'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='New Password'
                type={visiblePasswords.newPassword ? 'text' : 'password'}
                placeholder='At least 8 chars with uppercase, lowercase, and number'
                error={errors.newPassword?.message}
                suffix={renderPasswordToggle('newPassword', 'new password')}
                required
                {...field}
              />
            )}
          />

          <Controller
            name='confirmPassword'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Confirm New Password'
                type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                placeholder='Confirm new password'
                error={errors.confirmPassword?.message}
                suffix={renderPasswordToggle('confirmPassword', 'confirm password')}
                required
                {...field}
              />
            )}
          />

          <div className='flex justify-end gap-3 pt-4'>
            <Button type='button' variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
