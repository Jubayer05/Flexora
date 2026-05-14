'use client'

import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import requests from '@/services/network/http'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface GuestAccessSectionProps {
  className?: string
  initialEmail?: string
  compact?: boolean
  redirectTo?: string
  onVerified?: (email: string, token: string) => Promise<void> | void
  loginRedirectTo?: string
}

export default function GuestAccessSection({
  className = '',
  initialEmail = '',
  compact = false,
  redirectTo = '/user/purchased-items',
  onVerified,
  loginRedirectTo = '/login'
}: GuestAccessSectionProps) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [verificationCode, setVerificationCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    setIsSending(true)
    try {
      const response = await requests.post('/customer/orders/guest/send-code', {
        email: email.trim()
      })

      if (response.success) {
        toast.success(response.message || 'Verification code sent to your email')
      } else {
        toast.error(response.message || 'Failed to send verification code')
      }
    } catch (error: any) {
      const errorCode = error?.response?.data?.code
      const errorMessage = error?.response?.data?.message || 'Failed to send verification code'

      if (errorCode === 'ACCOUNT_ALREADY_EXISTS') {
        toast.error(errorMessage)
        router.push(
          `${loginRedirectTo}?email=${encodeURIComponent(email.trim().toLowerCase())}&guestExistingUser=1`
        )
        return
      }

      toast.error(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleVerify = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    if (verificationCode.trim().length !== 6) {
      toast.error('Verification code must be 6 digits')
      return
    }

    setIsVerifying(true)
    try {
      const response = await requests.post('/customer/orders/guest/verify', {
        email: email.trim(),
        verificationCode: verificationCode.trim()
      })

      if (!response.success || !response.token) {
        toast.error(response.message || 'Verification failed')
        return
      }

      const normalizedEmail = email.trim().toLowerCase()
      sessionStorage.setItem('guestAccessToken', response.token)
      sessionStorage.setItem('guestVerifiedEmail', normalizedEmail)
      sessionStorage.setItem('guestOrderEmail', normalizedEmail)
      document.cookie = `guestAccessToken=${encodeURIComponent(response.token)}; path=/; SameSite=Lax`
      document.cookie = `guestAccessEmail=${encodeURIComponent(normalizedEmail)}; path=/; SameSite=Lax`

      if (onVerified) {
        await onVerified(normalizedEmail, response.token)
      } else {
        router.push(redirectTo)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className={`rounded-xl border border-border bg-muted/30 p-4 sm:p-5 space-y-4 ${className}`}>
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <Mail className='h-4 w-4 text-primary' />
          <Typography variant={compact ? 'subtitle2' : 'h4'} className='text-foreground'>
            Guest Access
          </Typography>
        </div>
        <Typography variant='body2' className='text-muted-foreground'>
          You are currently accessing as a guest.
        </Typography>
        <Typography variant='body2' className='text-muted-foreground'>
          To view more features, such as managing your account, full access to your purchases, and
          much more, sign up today for a better experience.
        </Typography>
        <Typography variant='body2' className='text-muted-foreground'>
          Enter your email and we will send you a code to verify your access.
        </Typography>
      </div>

      <div className='space-y-3'>
        <div className='space-y-2'>
          <Label htmlFor='guest-access-email'>Email address</Label>
          <Input
            id='guest-access-email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='your@email.com'
            autoComplete='email'
            disabled={isSending || isVerifying}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='guest-access-code'>OTP</Label>
          <div className='relative'>
            <Input
              id='guest-access-code'
              type={showCode ? 'text' : 'password'}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
              placeholder='000000'
              inputMode='numeric'
              maxLength={6}
              disabled={isSending || isVerifying}
              className='pr-10 font-mono tracking-[0.3em] text-center'
            />
            <button
              type='button'
              onClick={() => setShowCode((value) => !value)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              disabled={isSending || isVerifying}
            >
              {showCode ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>

        <div className='flex gap-3 flex-col sm:flex-row'>
          <Button
            type='button'
            variant='outline'
            onClick={handleSendCode}
            disabled={isSending || isVerifying}
            className='flex-1'
          >
            {isSending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending...
              </>
            ) : (
              'Send OTP'
            )}
          </Button>
          <Button
            type='button'
            onClick={handleVerify}
            disabled={isSending || isVerifying || verificationCode.trim().length !== 6}
            className='flex-1'
          >
            {isVerifying ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
