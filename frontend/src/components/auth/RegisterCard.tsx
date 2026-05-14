'use client'

import { registerUser } from '@/action/auth'
import CustomInput from '@/components/common/CustomInput'
import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { RegisterSchema, registerSchema } from '@/lib/validations/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import SocialAuth from '../common/SocialAuth'

interface SignUpCardProps {
  className?: string
  onSuccess?: () => void
  compact?: boolean
}

export default function RegisterCard({
  className = '',
  onSuccess,
  compact = false
}: SignUpCardProps) {
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const refCode = searchParams.get('ref') || undefined
  const socialCallbackUrl = (() => {
    const query = searchParams.toString()
    return query ? `/sign-up?${query}` : '/sign-up'
  })()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      telegramUsername: '',
      password: '',
      confirm: ''
    }
  })

  const onSubmit: SubmitHandler<RegisterSchema> = async (data) => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirm, ...rest } = data

    try {
      const userAgent = navigator.userAgent
      const payload = { ...rest, ...(refCode ? { ref: refCode } : {}) }
      const res = await registerUser(payload, userAgent)

      if (res?.data) {
        if (res.data.requiresVerification) {
          toast.success('Account created. Please check your email for the verification code.')
          onSuccess?.()
          window.location.href = `/verify-email?email=${encodeURIComponent(data.email)}`
          return
        }

        toast.success('Account created. Redirecting you to the shop.')
        onSuccess?.()
        window.location.href = '/shop'
      } else {
        showError(res?.errors)
      }
    } catch (error: unknown) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <div className={`space-y-${compact ? '4' : '6'} text-card-foreground`}>
      {/* Header */}
      <div className='text-center'>
        <Typography variant='h2' weight='semibold' className={compact ? 'text-xl' : 'text-2xl'}>
          Create your account
        </Typography>
        <Typography variant='body2' className='text-muted-foreground'>
          Save your orders, track deliveries, manage balance, and get support from one dashboard.
        </Typography>
      </div>

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        {/* Name Fields */}
        <Controller
          name='firstName'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='First Name'
              name='firstName'
              type='text'
              placeholder='Your first name'
              value={field.value}
              onChange={field.onChange}
              error={errors.firstName?.message}
              disabled={isLoading}
              required
            />
          )}
        />
        {/* <Controller
            name='lastName'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Last Name'
                name='lastName'
                type='text'
                placeholder='Enter last name'
                value={field.value}
                onChange={field.onChange}
                error={errors.lastName?.message}
                disabled={isLoading}
                required
              />
            )}
          /> */}

        {/* Email Field */}
        <Controller
          name='email'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Email Address'
              name='email'
              type='email'
              placeholder='you@example.com'
              value={field.value}
              onChange={field.onChange}
              error={errors.email?.message}
              disabled={isLoading}
              required
            />
          )}
        />

        {/* Phone Field */}
        <Controller
          name='phone'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Phone Number'
              name='phone'
              type='text'
              placeholder='Optional phone number'
              value={field.value}
              onChange={field.onChange}
              error={errors.phone?.message}
              disabled={isLoading}
              helperText='Optional. Add it only if you want support to contact you by phone.'
            />
          )}
        />

        {/* Telegram Field */}
        <Controller
          name='telegramUsername'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Telegram Username'
              name='telegramUsername'
              type='text'
              placeholder='Telegram username without @'
              value={field.value || ''}
              onChange={field.onChange}
              error={errors.telegramUsername?.message}
              disabled={isLoading}
              helperText='Optional. Add this if you want Telegram updates from your dashboard.'
            />
          )}
        />

        {/* Password Field */}
        <Controller
          name='password'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Create a strong password'
              value={field.value}
              onChange={field.onChange}
              error={errors.password?.message}
              disabled={isLoading}
              required
              helperText='Use at least 8 characters.'
              inputClassName='pr-1'
              suffix={
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground'
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOffIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
                </button>
              }
            />
          )}
        />

        {/* Confirm Password Field */}
        <Controller
          name='confirm'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Confirm Password'
              name='confirm'
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder='Re-enter your password'
              value={field.value}
              onChange={field.onChange}
              error={errors.confirm?.message}
              disabled={isLoading}
              required
              inputClassName='pr-1'
              suffix={
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground'
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className='h-5 w-5' />
                  ) : (
                    <EyeIcon className='h-5 w-5' />
                  )}
                </button>
              }
            />
          )}
        />

        {/* Submit Button */}
        <Button
          type='submit'
          className={`w-full text-primary-foreground ${compact ? 'h-10' : 'h-12'} font-semibold ${
            compact ? 'text-sm' : 'text-base'
          }`}
          size={compact ? 'default' : 'lg'}
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <SocialAuth loading={isLoading} callbackUrl={socialCallbackUrl} />

      {/* Sign In Link */}
      <div className='text-center'>
        <Typography variant='body2' className='text-muted-foreground'>
          Already have an account?{' '}
          <CustomLink
            href='/login?direct=true'
            className='font-semibold text-primary hover:underline'
          >
            Sign in
          </CustomLink>
        </Typography>
      </div>
    </div>
  )

  if (compact) {
    return <div className={`p-6 w-full text-card-foreground ${className}`}>{content}</div>
  }

  return (
    <Card
      className={`bg-card text-card-foreground backdrop-blur border border-border shadow-xl shadow-black/5 w-full p-6 sm:p-8 rounded-2xl ${className}`}
    >
      {content}
    </Card>
  )
}
