'use client'

import { socialAuthenticate } from '@/action/auth'
import { showError } from '@/lib/errMsg'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TelegramCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const getSafeRedirectTarget = () => {
    const callbackUrl = searchParams.get('callbackUrl')
    if (!callbackUrl) return '/shop'
    return callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/shop'
  }

  useEffect(() => {
    const id = searchParams.get('id')
    const hash = searchParams.get('hash')
    const auth_date = searchParams.get('auth_date')

    if (!id || !hash || !auth_date) {
      setStatus('error')
      showError('Invalid Telegram login data')
      setTimeout(() => router.replace('/login'), 2000)
      return
    }

    const payload = {
      id: parseInt(id, 10),
      first_name: searchParams.get('first_name') ?? undefined,
      last_name: searchParams.get('last_name') ?? undefined,
      username: searchParams.get('username') ?? undefined,
      photo_url: searchParams.get('photo_url') ?? undefined,
      auth_date: parseInt(auth_date, 10),
      hash
    }

    socialAuthenticate('telegram', undefined, payload)
      .then((result) => {
        if (result?.data?.token) {
          const redirectTarget = getSafeRedirectTarget()
          setStatus('success')
          toast.success('Signed in with Telegram!')
          router.replace(redirectTarget)
          window.location.href = redirectTarget
        } else {
          setStatus('error')
          showError(result?.errors ?? 'Telegram login failed')
          setTimeout(() => router.replace('/login'), 2000)
        }
      })
      .catch(() => {
        setStatus('error')
        showError('Telegram login failed')
        setTimeout(() => router.replace('/login'), 2000)
      })
  }, [router, searchParams])

  return (
    <div className='flex min-h-[40vh] flex-col items-center justify-center gap-4'>
      {status === 'loading' && (
        <>
          <div className='h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          <p className='text-muted-foreground text-sm'>Completing Telegram sign in...</p>
        </>
      )}
      {status === 'error' && (
        <p className='text-destructive text-sm'>Something went wrong. Redirecting to login...</p>
      )}
    </div>
  )
}
