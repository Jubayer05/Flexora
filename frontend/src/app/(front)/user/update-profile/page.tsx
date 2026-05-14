'use client'

import CustomInput from '@/components/common/CustomInput'
import CustomImage from '@/components/common/CustomImage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ImagePlus, Loader2, User, X } from 'lucide-react'

// Lazy load password form to reduce initial bundle
const PasswordFormSection = dynamic(
  () => import('@/app/(front)/user/update-profile/PasswordFormSection'),
  {
    loading: () => <div className='text-muted-foreground'>Loading...</div>,
    ssr: false
  }
)

// Zod Schemas
const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\+?[1-9]\d{1,14}$/.test(value), {
    message: 'Please enter a valid phone number'
  })

const optionalTelegramUsernameSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || (value.length >= 5 && value.length <= 32), {
    message: 'Telegram username must be 5 to 32 characters long'
  })

const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters long')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  phone: optionalPhoneSchema,
  telegramUsername: optionalTelegramUsernameSchema,
  photoUrl: z.string().url('Invalid image URL').optional().or(z.literal(''))
})

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function UpdateProfilePage() {
  const { push } = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userData = Cookies.get('user') ? JSON.parse(Cookies.get('user') as string) : null

  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: userData?.firstName || '',
      phone: userData?.phone || '',
      telegramUsername: userData?.telegramUsername || '',
      photoUrl: userData?.photoUrl || ''
    }
  })

  // Password form is now lazy-loaded in PasswordFormSection component
  // The form is initialized within that component when it's rendered

  // Load existing user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await requests.get<{
          success: boolean
          data: {
            firstName?: string
            phone?: string
            telegramUsername?: string
            photoUrl?: string
          }
        }>('/customer/profile')

        if (response.success && response.data) {
          const { firstName, phone, telegramUsername, photoUrl } = response.data
          profileForm.reset({
            firstName: firstName || '',
            phone: phone || '',
            telegramUsername: telegramUsername || '',
            photoUrl: photoUrl || ''
          })
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
        toast.error('Failed to load profile data')
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if user exists in cookie, otherwise mark as loaded immediately
    if (userData?.id) {
      loadUserData()
    } else {
      setIsLoading(false)
    }
  }, [profileForm, userData?.id])

  const onProfileSubmit = useCallback(async (data: UpdateProfileFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        firstName: data.firstName.trim(),
        phone: data.phone.trim(),
        telegramUsername: data.telegramUsername.trim()
      }

      const response = await requests.put<{
        success: boolean
        message: string
        data?: any
      }>('/customer/profile', payload)

      if (response.success) {
        if (response.data) {
          Cookies.set('user', JSON.stringify(response.data))
        }
        toast.success(response.message || 'Profile updated successfully!')
        push('/user/profile')
      } else {
        toast.error(response.message || 'Failed to update profile')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [push])

  const handleProfileImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Only images are allowed (JPEG, PNG, GIF, WebP)')
        return
      }
      if (file.size > MAX_PROFILE_IMAGE_SIZE) {
        toast.error('Image must be 2MB or less')
        return
      }
      setIsUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const response = await requests.post<{
          success: boolean
          data: string
          message?: string
        }>('/customer/profile/upload-image', formData as any)
        if (response.success && response.data) {
          profileForm.setValue('photoUrl', response.data)
          toast.success('Profile image uploaded')
        } else {
          toast.error(response.message || 'Upload failed')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to upload image')
      } finally {
        setIsUploadingImage(false)
        e.target.value = ''
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [profileForm]
  )

  const photoUrl = profileForm.watch('photoUrl')

  const tabs = [
    {
      id: 'profile',
      label: 'Update Profile'
    },
    {
      id: 'password',
      label: 'Change Password'
    }
  ]

  return (
    <div className='space-y-4 sm:space-y-6 font-manrope'>
      {/* Tab Navigation */}
      <div>
        <nav className='flex flex-wrap gap-2 sm:gap-4'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer py-2 sm:py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className='min-h-100 sm:min-h-125 pt-4'>
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className='bg-card backdrop-blur-sm border border-border'>
            <CardContent className='p-6'>
              {isLoading ? (
                <div className='flex justify-center items-center py-8'>
                  <div className='text-muted-foreground'>Loading profile data...</div>
                </div>
              ) : (
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className='space-y-6'>
                  <div className='mb-6'>
                    <h3 className='text-card-foreground text-xl font-semibold mb-2'>Profile Information</h3>
                    <p className='text-muted-foreground text-sm'>
                      Update your personal information and contact details
                    </p>
                  </div>

                  {/* Profile Image */}
                  <div className='space-y-3'>
                    <label className='text-sm font-medium text-white'>Profile Photo</label>
                    <div className='flex items-center gap-4'>
                      <div className='relative flex-shrink-0'>
                        <div className='w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center'>
                          {photoUrl ? (
                            <CustomImage
                              src={photoUrl}
                              alt='Profile preview'
                              width={96}
                              height={96}
                              className='w-full h-full object-cover'
                              unoptimized
                            />
                          ) : (
                            <User className='w-12 h-12 text-muted-foreground' />
                          )}
                        </div>
                        {isUploadingImage && (
                          <div className='absolute inset-0 rounded-full bg-background/80 flex items-center justify-center'>
                            <Loader2 className='w-8 h-8 text-primary animate-spin' />
                          </div>
                        )}
                      </div>
                      <div className='flex flex-col gap-2'>
                        <input
                          ref={fileInputRef}
                          type='file'
                          accept={ALLOWED_IMAGE_TYPES.join(',')}
                          className='hidden'
                          onChange={handleProfileImageSelect}
                          disabled={isUploadingImage || isSubmitting}
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage || isSubmitting}
                        >
                          {isUploadingImage ? (
                            <Loader2 className='w-4 h-4 animate-spin mr-2' />
                          ) : (
                            <ImagePlus className='w-4 h-4 mr-2' />
                          )}
                          {photoUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {photoUrl && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='text-muted-foreground hover:text-destructive'
                            onClick={() => profileForm.setValue('photoUrl', '')}
                            disabled={isSubmitting}
                          >
                            <X className='w-4 h-4 mr-2' />
                            Remove
                          </Button>
                        )}
                        <p className='text-white/50 text-xs'>JPEG, PNG, GIF or WebP. Max 2MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* First Name Field */}
                  <Controller
                    name='firstName'
                    control={profileForm.control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        label='First Name'
                        placeholder='Enter your first name'
                        required
                        disabled={isSubmitting}
                        error={fieldState.error?.message}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                  />

                  {/* Phone Field */}
                  <Controller
                    name='phone'
                    control={profileForm.control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        label='Phone Number'
                        type='tel'
                        placeholder='Enter your phone number (e.g., +1234567890)'
                        disabled={isSubmitting}
                        error={fieldState.error?.message}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        helperText='Optional. Include country code for international numbers.'
                      />
                    )}
                  />

                  {/* Telegram Username Field */}
                  <Controller
                    name='telegramUsername'
                    control={profileForm.control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        label='Telegram Username'
                        placeholder='Enter your Telegram username (optional)'
                        disabled={isSubmitting}
                        error={fieldState.error?.message}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        helperText='Your Telegram username without the @ symbol'
                      />
                    )}
                  />

                  {/* Submit Button */}
                  <div className='flex gap-3 pt-4'>
                    <Button type='submit' disabled={isSubmitting} className='flex-1 sm:flex-none'>
                      {isSubmitting ? 'Updating Profile...' : 'Update Profile'}
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <PasswordFormSection />
        )}
      </div>
    </div>
  )
}
