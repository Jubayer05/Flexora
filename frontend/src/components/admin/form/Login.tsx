'use client'
import { authenticateAdmin } from '@/action/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import { LoginSchema, loginSchema } from '@/lib/validations/schemas'
import { useAdminStore } from '@/stores/admin-info'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

function getAdminLoginRedirect(callbackUrl: string | null) {
  if (!callbackUrl) {
    return '/admin/dashboard'
  }

  // Middleware stores protected callbacks in encrypted form. Send encrypted
  // values back through the login route so middleware can safely decrypt them.
  if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
    return callbackUrl
  }

  return `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
}

const AdminLoginForm = () => {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const [passwordVisible, setPasswordVisible] = React.useState(false)
  const { setAdminInfo } = useAdminStore((state) => state)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    setLoading(true)
    try {
      const userAgent = navigator.userAgent
      console.log('Attempting login with:', { email: data.email, userAgent })

      const res = await authenticateAdmin(data.email, data.password, userAgent)

      if (res?.error) {
        showError(res.error)
        return
      }

      if (res?.token) {
        setAdminInfo({
          ...res?.admin
        })
        toast.success('Login Successfully!')

        const redirectTo = getAdminLoginRedirect(callbackUrl)
        console.log('Redirecting after login:', redirectTo)
        window.location.href = redirectTo
      } else {
        // No token in response
        console.error('No token in response:', res)
        showError('Login failed: No token received')
      }
    } catch (error: any) {
      console.error('Login error:', error) // Debug log
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      const errorMessage = error?.message || 'Invalid credentials'
      showError(errorMessage)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 text-card-foreground'>
      {/* Email address Field */}
      <div className='space-y-2'>
        <Label htmlFor='email' className='text-card-foreground'>Email address</Label>
        <Controller
          name='email'
          control={control}
          render={({ field }) => (
            <div className='relative'>
              <Mail className='top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2' />
              <Input
                {...field}
                id='email'
                type='email'
                placeholder='Email address'
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
          )}
        />
        {errors.email && <p className='text-destructive text-sm'>{errors.email.message}</p>}
      </div>

      {/* Password Field */}
      <div className='space-y-2'>
        <Label htmlFor='password' className='text-card-foreground'>Password</Label>
        <Controller
          name='password'
          control={control}
          render={({ field }) => (
            <div className='relative'>
              <Lock className='top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2' />
              <Input
                {...field}
                id='password'
                type={passwordVisible ? 'text' : 'password'}
                placeholder='Password'
                className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type='button'
                onClick={() => setPasswordVisible(!passwordVisible)}
                className='top-1/2 right-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2'
              >
                {passwordVisible ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
          )}
        />
        {errors.password && <p className='text-destructive text-sm'>{errors.password.message}</p>}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className='flex justify-between items-center'>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id='remember'
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor='remember' className='font-normal text-sm text-card-foreground'>
            Remember me
          </Label>
        </div>
        {/* <Link href='/admin/forget-password' className='text-primary text-sm hover:underline'>
          Forgot password?
        </Link> */}
      </div>

      {/* Submit Button */}
      <Button type='submit' className='w-full' disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </Button>
    </form>
  )
}

export default AdminLoginForm
