'use client'

import { Container } from '@/components/common/container'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import requests from '@/services/network/http'
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function GuestLoginVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const queryEmail = searchParams.get('email')
    const storedEmail = sessionStorage.getItem('guestOrderEmail')
    const nextEmail = queryEmail || storedEmail || ''

    if (!nextEmail) {
      router.replace('/guest-login')
      return
    }

    setEmail(nextEmail.toLowerCase())
  }, [router, searchParams])

  const handleVerify = async () => {
    if (!email) {
      router.replace('/guest-login')
      return
    }

    if (otp.trim().length !== 6) {
      toast.error('OTP must be 6 digits')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await requests.post('/customer/orders/guest/verify', {
        email,
        verificationCode: otp.trim()
      })

      if (!response.success || !response.token) {
        toast.error(response.message || 'OTP verification failed')
        return
      }

      sessionStorage.setItem('guestAccessToken', response.token)
      sessionStorage.setItem('guestVerifiedEmail', email)
      sessionStorage.setItem('guestOrderEmail', email)
      document.cookie = `guestAccessToken=${encodeURIComponent(response.token)}; path=/; SameSite=Lax`
      document.cookie = `guestAccessEmail=${encodeURIComponent(email)}; path=/; SameSite=Lax`

      router.push('/user/profile')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'OTP verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      router.replace('/guest-login')
      return
    }

    setIsResending(true)
    try {
      const response = await requests.post('/customer/orders/guest/send-code', { email })
      if (response.success) {
        toast.success('OTP sent again')
      } else {
        toast.error(response.message || 'Failed to resend OTP')
      }
    } catch (error: any) {
      const errorCode = error?.response?.data?.code
      const errorMessage = error?.response?.data?.message || 'Failed to resend OTP'

      if (errorCode === 'ACCOUNT_ALREADY_EXISTS') {
        toast.error(errorMessage)
        router.push(`/login?email=${encodeURIComponent(email)}&guestExistingUser=1`)
        return
      }

      toast.error(errorMessage)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Container className='py-10 sm:py-16'>
      <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center'>
        <Card className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8'>
          <div className='mb-6 flex items-center justify-between'>
            <Button asChild variant='ghost' size='sm' className='px-2'>
              <Link href='/guest-login'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Link>
            </Button>
          </div>

          <div className='mb-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <ShieldCheck className='h-6 w-6 text-primary' />
            </div>
            <Typography variant='h2' weight='semibold' className='text-2xl'>
              Verify OTP
            </Typography>
            <Typography variant='body2' className='mt-2 text-muted-foreground'>
              Enter the OTP sent to <span className='font-medium text-foreground'>{email}</span>.
            </Typography>
          </div>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='guest-otp'>OTP</Label>
              <div className='relative'>
                <Input
                  id='guest-otp'
                  type={showOtp ? 'text' : 'password'}
                  placeholder='000000'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                  inputMode='numeric'
                  disabled={isSubmitting || isResending}
                  className='pr-10 text-center font-mono tracking-[0.35em]'
                />
                <button
                  type='button'
                  onClick={() => setShowOtp((value) => !value)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  disabled={isSubmitting || isResending}
                >
                  {showOtp ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </div>

            <Button onClick={handleVerify} className='w-full' size='lg' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>

            <Button
              variant='outline'
              onClick={handleResend}
              className='w-full'
              disabled={isResending || isSubmitting}
            >
              {isResending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Resending...
                </>
              ) : (
                'Resend OTP'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  )
}
