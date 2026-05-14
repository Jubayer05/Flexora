'use client'

import { authenticate, resendVerificationEmail } from '@/action/auth'
import CustomInput from '@/components/common/CustomInput'
import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { showError } from '@/lib/errMsg'
import { LoginSchema, loginSchema } from '@/lib/validations/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, Mail, ShoppingBag } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import GuestCheckoutModal from '../checkout/GuestCheckoutModal'
import SocialAuth from '../common/SocialAuth'

const EMAIL_NOT_VERIFIED_MSG = 'Your email is not verified yet. Check your inbox or send a new code.'

interface LoginCardProps {
  className?: string
  onSuccess?: () => void
  compact?: boolean
}

export default function LoginCard({ className = '', compact = false, onSuccess }: LoginCardProps) {
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  // Get product info from URL params (if coming from "Buy Now" button)
  const productId = searchParams.get('productId')
  const quantity = searchParams.get('quantity') || '1'
  const callbackUrl = searchParams.get('callbackUrl')
  const hasProductInfo = !!productId
  const prefilledEmail = searchParams.get('email') || ''
  const guestExistingUser = searchParams.get('guestExistingUser') === '1'
  const socialCallbackUrl = (() => {
    const query = searchParams.toString()
    return query ? `/login?${query}` : '/login'
  })()

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail)
    }
  }, [prefilledEmail, setValue])

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    setIsLoading(true)

    try {
      const userAgent = navigator.userAgent
      const res = await authenticate(data, userAgent)

      if (res?.data?.token) {
        setEmailNotVerified(false)
        toast.success('Welcome back. Redirecting you now.')

        // If there's a callback URL, do a full page navigation
        // so the middleware can handle the encrypted callback redirect
        if (callbackUrl) {
          onSuccess?.()
          // Use window.location for full page reload to trigger middleware
          window.location.href = `${window.location.pathname}${window.location.search}`
        } else {
          // No callback - send the user to shop without overriding their theme
          onSuccess?.()
          window.location.href = '/shop'
        }
      } else {
        const msg = typeof res?.errors === 'string' ? res.errors : res?.message
        const isEmailNotVerified = msg && String(msg).includes('Email not verified')
        setEmailNotVerified(!!isEmailNotVerified)
        showError(res?.errors ?? res?.message)
      }
    } catch (error: unknown) {
      showError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <div className={`space-y-${compact ? '4' : '6'} text-card-foreground`}>
      {/* Logo and Header */}
      <div className='text-center'>
        <Typography variant='h2' weight='semibold' className={compact ? 'text-xl' : 'text-2xl'}>
          Welcome back
        </Typography>
        <Typography variant='body2' className='text-muted-foreground'>
          Sign in to manage orders, downloads, balance, and support tickets.
        </Typography>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        {guestExistingUser && (
          <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3'>
            <Typography variant='body2' className='text-amber-800 dark:text-amber-100'>
              You are already a UHQ Accounts user. Please sign in with this email instead of using
              guest login.
            </Typography>
          </div>
        )}

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
              onChange={(e) => {
                field.onChange(e)
              }}
              error={errors.email?.message}
              required
              size={compact ? 'middle' : 'large'}
              disabled={isLoading}
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
              placeholder='Your password'
              value={field.value}
              onChange={(e) => {
                field.onChange(e)
              }}
              error={errors.password?.message}
              required
              size={compact ? 'middle' : 'large'}
              disabled={isLoading}
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

        {/* Remember Me & Forgot Password */}
        <div className='flex justify-between items-center'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='rememberMe'
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <label htmlFor='rememberMe' className='font-medium text-sm cursor-pointer text-card-foreground'>
              Remember me
            </label>
          </div>
          <CustomLink
            href='/forgot-password'
            className='font-medium text-primary text-sm hover:underline'
          >
            Forgot password?
          </CustomLink>
        </div>

        {/* Login Button */}
        <Button
          type='submit'
          className={`w-full text-primary-foreground ${compact ? 'h-10' : 'h-12'} font-semibold ${
            compact ? 'text-sm' : 'text-base'
          }`}
          size={compact ? 'default' : 'lg'}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        {/* Resend verification when email not verified */}
        {emailNotVerified && (
          <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2'>
            <Typography variant='body2' className='text-amber-800 dark:text-amber-100'>
              {EMAIL_NOT_VERIFIED_MSG}
            </Typography>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='w-full border-amber-500/50 text-amber-800 dark:text-amber-100 hover:bg-amber-500/20'
              disabled={resendLoading || resendSent}
              onClick={async () => {
                const email = watch('email')
                if (!email) {
                  toast.error('Enter your email first so we know where to send the code.')
                  return
                }
                setResendLoading(true)
                setResendSent(false)
                const result = await resendVerificationEmail(email)
                setResendLoading(false)
                if (result.success) {
                  setResendSent(true)
                  toast.success(result.message || 'Verification email sent. Please check your inbox.')
                } else {
                  toast.error(result.message || "We couldn't resend the email. Please try again.")
                }
              }}
            >
              <Mail className='mr-2 h-4 w-4' />
              {resendLoading
                ? 'Sending...'
                : resendSent
                  ? 'Email sent'
                  : 'Resend verification email'}
            </Button>
          </div>
        )}
      </form>

      <Button
        type='button'
        variant='outline'
        className={`w-full ${compact ? 'h-10' : 'h-12'} font-semibold ${compact ? 'text-sm' : 'text-base'}`}
        size={compact ? 'default' : 'lg'}
        onClick={() => {
          window.location.href = '/guest-login'
        }}
        disabled={isLoading}
      >
        Continue as Guest
      </Button>

      {/* Guest Checkout Button - Show only if product info exists */}
      {hasProductInfo && (
        <div className='space-y-3'>
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='border-border border-t w-full' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-muted px-2 text-muted-foreground'>Or</span>
            </div>
          </div>

          <Button
            type='button'
            variant='outline'
            className={`w-full ${compact ? 'h-10' : 'h-12'} font-semibold ${
              compact ? 'text-sm' : 'text-base'
            }`}
            size={compact ? 'default' : 'lg'}
            onClick={() => setShowGuestModal(true)}
            disabled={isLoading}
          >
            <ShoppingBag className='mr-2 w-4 h-4' />
            Continue as Guest
          </Button>
        </div>
      )}

      <SocialAuth loading={isLoading} callbackUrl={socialCallbackUrl} />

      {/* Sign Up Link */}
      <div className='text-center'>
        <Typography variant='body2' className='text-muted-foreground'>
          Don&apos;t have an account?{' '}
          <CustomLink
            href='/sign-up?direct=true'
            className='font-semibold text-primary hover:underline'
          >
            Sign up
          </CustomLink>
        </Typography>
      </div>

      {/* Guest Checkout Modal */}
      {hasProductInfo && (
        <GuestCheckoutModal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          productId={parseInt(productId!)}
          quantity={parseInt(quantity)}
        />
      )}
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
