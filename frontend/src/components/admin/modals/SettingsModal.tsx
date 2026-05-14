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
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  phone: z.string().optional().or(z.literal('')),
  telegramUsername: z.string().optional().or(z.literal(''))
})

type UpdateProfileData = z.infer<typeof updateProfileSchema>

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { adminInfo, setAdminInfo } = useAdminStore()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: '',
      phone: '',
      telegramUsername: ''
    }
  })

  // Reset form when modal opens with admin data
  useEffect(() => {
    if (isOpen && adminInfo) {
      reset({
        firstName: adminInfo.firstName || '',
        phone: adminInfo.phone || '',
        telegramUsername: adminInfo.telegramUsername || ''
      })
    }
  }, [isOpen, adminInfo, reset])

  const onSubmit = async (data: UpdateProfileData) => {
    if (!adminInfo?.id) return

    try {
      const response = await requests.put(`/admin/admins/${adminInfo.id}`, {
        firstName: data.firstName.trim(),
        phone: data.phone?.trim() || '',
        telegramUsername: data.telegramUsername?.trim() || ''
      })

      const updatedAdmin = response?.data?.admin
      if (response?.success && updatedAdmin) {
        // Update admin info in store
        setAdminInfo({
          ...adminInfo,
          ...updatedAdmin
        })
        toast.success('Profile updated successfully!')
        onClose()
      }
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[min(560px,calc(100vw-2rem))] max-w-none'>
        <DialogHeader>
          <DialogTitle>Update Profile Settings</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 py-4'>
          <Controller
            name='firstName'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='First Name'
                type='text'
                placeholder='John'
                error={errors.firstName?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            name='phone'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Phone'
                type='text'
                placeholder='+1234567890'
                error={errors.phone?.message}
                {...field}
              />
            )}
          />

          <Controller
            name='telegramUsername'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Telegram Username'
                type='text'
                placeholder='username'
                error={errors.telegramUsername?.message}
                {...field}
              />
            )}
          />

          <div className='flex justify-end gap-3 pt-4'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
