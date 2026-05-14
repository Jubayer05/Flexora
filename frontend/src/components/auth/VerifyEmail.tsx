'use client'

import { verifyEmailCodeAndLogin } from '@/action/auth'
import OTPVerification from '@/components/auth/OTPVerification'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

type VerificationConfig = {
  required: boolean
  captchaEnabled: boolean
  captchaSiteKey: string | null
  codeLength: number
  codeExpiryMinutes: number
  resendCooldownMinutes: number
  dailyLimit: number
}

const TurnstileWidget = ({
  siteKey,
  onTokenChange
}: {
  siteKey: string
  onTokenChange: (token: string) => void
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      containerRef.current.innerHTML = ''
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (token) => onTokenChange(token),
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => onTokenChange('')
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    )

    if (window.turnstile) {
      renderWidget()
    } else if (existingScript) {
      existingScript.addEventListener('load', renderWidget)
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.addEventListener('load', renderWidget)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [onTokenChange, siteKey])

  return <div ref={containerRef} className='flex justify-center' />
}

const VerifyEmail = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const email = searchParams.get('email')?.trim().toLowerCase() || ''

  const [config, setConfig] = useState<VerificationConfig | null>(null)
  const [status, setStatus] = useState<'idle' | 'pending' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const isVerifying = status === 'verifying'

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await requests.get<{ data: VerificationConfig }>('/auth/verification-config')
        setConfig(response.data)
      } catch (err) {
        showError(err)
      } finally {
        setLoadingConfig(false)
      }
    }

    loadConfig()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!token) {
        if (email) {
          setStatus('pending')
          setMessage(`We've sent a 6-digit verification code to ${email}. Enter it below to activate your account.`)
          return
        }

        setStatus('error')
        setMessage('Verification email is missing. Please register again.')
        return
      }

      setStatus('verifying')
      try {
        const res = await requests.post('/auth/verify-email', { token })
        setStatus('success')
        setMessage(res.message ?? 'Email verified successfully. You can now log in.')
        toast.success(res.message ?? 'Email verified successfully.')
      } catch (err) {
        setStatus('error')
        showError(err)
      }
    }

    run()
  }, [email, token])

  const verificationCopy = useMemo(() => {
    if (!config) return null
    return `Code expires in ${config.codeExpiryMinutes} minutes. You can request up to ${config.dailyLimit} codes per email each day.`
  }, [config])

  const handleVerifyCode = async (code: string) => {
    if (!email) {
      throw new Error('Verification email is missing.')
    }

    if (config?.captchaEnabled && !captchaToken) {
      setError('Please complete the verification challenge first.')
      throw new Error('Please complete the verification challenge first.')
    }

    setStatus('verifying')
    setError(null)

    try {
      const response = await verifyEmailCodeAndLogin({
        email,
        code,
        captchaToken: config?.captchaEnabled ? captchaToken : undefined
      }, navigator.userAgent)

      if (!response.data?.token) {
        throw new Error(response.errors || response.message || 'Failed to verify your code.')
      }

      setStatus('success')
      setMessage(response.message ?? 'Email verified successfully. You can now log in.')
      toast.success(response.message ?? 'Email verified successfully.')
      router.push('/shop')
    } catch (err: any) {
      const nextError =
        err?.response?.data?.message || err?.message || 'Failed to verify your code.'
      setStatus('pending')
      setError(nextError)
      setCaptchaToken('')
      if (window.turnstile) {
        window.turnstile.reset()
      }
      throw err
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      throw new Error('Verification email is missing.')
    }

    setError(null)
    const response = await requests.post('/auth/resend-verification', { email })
    toast.success(response.message || 'Verification code sent. Check your inbox.')
  }

  return (
    <Card className='w-full max-w-md border-border bg-card p-8 text-card-foreground shadow-sm'>
      <div className='space-y-4'>
        <div className='space-y-2 text-center'>
          <Typography variant='h3' weight='semibold'>
            Email Verification
          </Typography>
          <Typography variant='body2' className='text-muted-foreground'>
            {message ||
              'We are processing your verification request. You can close this page if it takes too long.'}
          </Typography>
          {verificationCopy && !token ? (
            <Typography variant='body2' className='text-xs text-muted-foreground'>
              {verificationCopy}
            </Typography>
          ) : null}
        </div>

        {loadingConfig ? (
          <div className='py-6 text-center text-sm text-muted-foreground'>Loading verification form...</div>
        ) : null}

        {!loadingConfig && status === 'pending' && email ? (
          <div className='space-y-4'>
            {config?.captchaEnabled && config.captchaSiteKey ? (
              <div className='space-y-2 rounded-xl border border-border bg-background/60 p-4'>
                <Typography variant='body2' className='text-center text-muted-foreground'>
                  Complete the security challenge before verifying your code.
                </Typography>
                <TurnstileWidget
                  siteKey={config.captchaSiteKey}
                  onTokenChange={setCaptchaToken}
                />
              </div>
            ) : null}

            <OTPVerification
              onVerify={handleVerifyCode}
              onResend={handleResendCode}
              isLoading={isVerifying}
              error={error}
              email={email}
              maxLength={config?.codeLength || 6}
              expiryMinutes={config?.codeExpiryMinutes || 10}
              resendCooldownSeconds={(config?.resendCooldownMinutes || 5) * 60}
            />
          </div>
        ) : null}

        <div className='pt-2'>
          <Button type='button' className='h-11 w-full' onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default VerifyEmail
