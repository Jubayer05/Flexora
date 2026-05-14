'use client'

import { Container } from '@/components/common/container'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import requests from '@/services/network/http'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function GuestLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContinue = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    setIsSubmitting(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const response = await requests.post('/customer/orders/guest/send-code', {
        email: normalizedEmail
      })

      if (!response.success) {
        toast.error(response.message || 'Failed to send OTP')
        return
      }

      sessionStorage.setItem('guestOrderEmail', normalizedEmail)
      toast.success('OTP sent to your email')
      router.push(`/guest-login/verify?email=${encodeURIComponent(normalizedEmail)}`)
    } catch (error: any) {
      const errorCode = error?.response?.data?.code
      const errorMessage = error?.response?.data?.message || 'Failed to send OTP'

      if (errorCode === 'ACCOUNT_ALREADY_EXISTS') {
        toast.error(errorMessage)
        router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}&guestExistingUser=1`)
        return
      }

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className='py-10 sm:py-16'>
      <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center'>
        <Card className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8'>
          <div className='mb-6 flex items-center justify-between'>
            <Button asChild variant='ghost' size='sm' className='px-2'>
              <Link href='/login'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Link>
            </Button>
          </div>

          <div className='mb-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <Mail className='h-6 w-6 text-primary' />
            </div>
            <Typography variant='h2' weight='semibold' className='text-2xl'>
              Guest Login
            </Typography>
            <Typography variant='body2' className='mt-2 text-muted-foreground'>
              Enter your email and we will send you an OTP to continue.
            </Typography>
          </div>

          <div className='mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
            If this email already has a UHQ Accounts profile, guest OTP will not be sent. You will
            need to sign in with the same email instead.
          </div>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='guest-email'>Email Address</Label>
              <Input
                id='guest-email'
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete='email'
                disabled={isSubmitting}
              />
            </div>

            <Button onClick={handleContinue} className='w-full' size='lg' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Sending OTP...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  )
}
