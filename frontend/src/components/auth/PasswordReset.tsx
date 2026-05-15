'use client'
import CustomInput from '@/components/common/CustomInput'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Email request schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

// Reset password schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match',
    path: ['confirmPassword']
  })

type EmailSchema = z.infer<typeof emailSchema>
type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>

const PasswordResetForm = ({ isCustomer = true }: { isCustomer?: boolean }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Email form (request reset link)
  const emailForm = useForm<EmailSchema>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: ''
    }
  })

  // Reset password form
  const resetForm = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  })

  const onEmailSubmit: SubmitHandler<EmailSchema> = async (values) => {
    setLoading(true)
    try {
      const res = await requests.post('/auth/password-reset/request', values)
      toast.success(res.message ?? 'Reset password link sent successfully')
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  const onResetSubmit: SubmitHandler<ResetPasswordSchema> = async (values) => {
    setLoading(true)
    try {
      const res = await requests.post('/auth/password-reset/confirm', {
        ...values,
        resetToken: token
      })
      toast.success(res.message ?? 'Password updated successfully')
      router.push('/login')
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className='space-y-8 text-card-foreground'>
      {/* Header */}
      <div className='text-center'>
        <Typography variant='h3' weight='semibold'>
          {token ? 'Set New Password' : 'Reset Password'}
        </Typography>
        <Typography variant='body2' className='text-muted-foreground'>
          {token
            ? 'Enter your new password below'
            : 'Enter your email address and we will send you a reset link'}
        </Typography>
      </div>

      {!token ? (
        // Request reset link form
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className='space-y-4'>
          <Controller
            name='email'
            control={emailForm.control}
            render={({ field }) => (
              <CustomInput
                label='Email Address'
                name='email'
                type='email'
                placeholder='Enter your email'
                value={field.value}
                onChange={field.onChange}
                error={emailForm.formState.errors.email?.message}
                required
                size='large'
                disabled={loading}
              />
            )}
          />

          <Button
            type='submit'
            className='bg-primary hover:bg-primary/90 w-full h-12 font-semibold text-primary-foreground text-base'
            size='lg'
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      ) : (
        // Set new password form
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className='space-y-4'>
          {/* New Password Field */}
          <Controller
            name='password'
            control={resetForm.control}
            render={({ field }) => (
              <CustomInput
                label='New Password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='Enter your new password'
                value={field.value}
                onChange={field.onChange}
                error={resetForm.formState.errors.password?.message}
                required
                size='large'
                disabled={loading}
                inputClassName='pr-1'
                suffix={
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground'
                    disabled={loading}
                  >
                    {showPassword ? <EyeOffIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
                  </button>
                }
              />
            )}
          />

          {/* Confirm Password Field */}
          <Controller
            name='confirmPassword'
            control={resetForm.control}
            render={({ field }) => (
              <CustomInput
                label='Confirm Password'
                name='confirmPassword'
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder='Re-type your password'
                value={field.value}
                onChange={field.onChange}
                error={resetForm.formState.errors.confirmPassword?.message}
                required
                size='large'
                disabled={loading}
                inputClassName='pr-1'
                suffix={
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground'
                    disabled={loading}
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

          <Button
            type='submit'
            className='bg-primary hover:bg-primary/90 w-full h-12 font-semibold text-primary-foreground text-base'
            size='lg'
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      )}
    </div>
  )

  return (
    <Card className='bg-card text-card-foreground p-8 border border-border w-full max-w-md'>
      {content}
    </Card>
  )
}

export default PasswordResetForm
