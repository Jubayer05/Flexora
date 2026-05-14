'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import requests from '@/services/network/http'
import { CheckCircle2, Copy, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface RateLimitState {
  accountSendsToday: number
  phoneSendsToday: number
  remainingAccountSends: number
  remainingPhoneSends: number
  cooldownSeconds: number
  blockedUntil: string | null
  isBlocked: boolean
}

interface TelegramCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number | null
  orderNumber?: string | null
  captchaToken?: string
  captchaRequired?: boolean
  onCaptchaConsumed?: () => void
  defaultRetrySeconds?: number
}

interface TelegramCodeResponse {
  success: boolean
  data: {
    code: string | null
    phoneNumber: string
    orderId: number
    orderNumber: string
    requestedFreshCode: boolean
    expiresAt?: string | null
    nextRetrySeconds?: number
    rateLimits?: RateLimitState | null
  }
  message: string
}

export default function TelegramCodeDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  captchaToken,
  captchaRequired = false,
  onCaptchaConsumed,
  defaultRetrySeconds = 60
}: TelegramCodeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [requestedFreshCode, setRequestedFreshCode] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)

  useEffect(() => {
    if (retryCountdown <= 0) return

    const timer = window.setInterval(() => {
      setRetryCountdown((current) => (current > 1 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [retryCountdown])

  const extractTimeoutFromError = (error: any): number => {
    const timeoutValue = error?.response?.data?.errors?.[0]?.cooldownSeconds
      ?? error?.response?.data?.errors?.[0]?.timeoutSeconds
      ?? error?.response?.data?.data?.timeout

    return typeof timeoutValue === 'number' ? timeoutValue : 0
  }

  const fetchCode = async () => {
    if (!orderId) return

    if (captchaRequired && !captchaToken) {
      setMessage('Complete the security challenge before requesting a Telegram code.')
      return
    }

    setLoading(true)
    try {
      const response = await requests.post<TelegramCodeResponse>(
        '/customer/telegram-accounts/get-code',
        {
          orderId,
          captchaToken: captchaRequired ? captchaToken : undefined
        }
      )

      setCode(response.data.code)
      setPhoneNumber(response.data.phoneNumber || '')
      setRequestedFreshCode(Boolean(response.data.requestedFreshCode))
      setMessage(response.message || 'Telegram login code retrieved successfully.')

      if (!response.data.code && response.data.nextRetrySeconds) {
        setRetryCountdown(response.data.nextRetrySeconds)
      } else {
        setRetryCountdown(0)
      }

      onCaptchaConsumed?.()
    } catch (error: any) {
      const nextMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch Telegram login code.'
      const timeoutSeconds = extractTimeoutFromError(error)

      setCode(null)
      setMessage(nextMessage)
      setRetryCountdown(
        timeoutSeconds && timeoutSeconds <= defaultRetrySeconds ? timeoutSeconds : 0
      )
      toast.error(nextMessage)
      onCaptchaConsumed?.()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !orderId) return

    setCode(null)
    setPhoneNumber('')
    setMessage('')
    setRequestedFreshCode(false)
    setRetryCountdown(0)
    void fetchCode()
  }, [open, orderId])

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Login code copied to clipboard')
    } catch {
      toast.error('Failed to copy login code')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md border-border bg-card text-card-foreground sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-card-foreground'>
            {orderNumber ? `Account #${orderNumber}` : 'Telegram Login Code'}
          </DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            Latest code for your Telegram login flow.
          </DialogDescription>
        </DialogHeader>

        <div className='rounded-2xl border border-border bg-muted/30 p-5'>
          {loading ? (
            <div className='flex min-h-40 flex-col items-center justify-center gap-3 text-center'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <div className='space-y-1'>
                <p className='font-semibold text-card-foreground'>Checking latest code...</p>
                <p className='text-sm text-muted-foreground'>
                  Please wait while we read the newest Telegram message.
                </p>
              </div>
            </div>
          ) : code ? (
            <div className='space-y-4 text-center'>
              <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <div className='space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
                  Your Login Code
                </p>
                <div className='rounded-2xl border border-primary/20 bg-background px-4 py-5 text-4xl font-bold tracking-[0.35em] text-card-foreground'>
                  {code}
                </div>
                {phoneNumber && (
                  <p className='text-sm text-muted-foreground'>For {phoneNumber}</p>
                )}
              </div>
              <div className='rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-sm text-amber-600 dark:text-amber-400'>
                <div className='mb-1 flex items-center gap-2 font-semibold'>
                  <ShieldAlert className='h-4 w-4' />
                  Do not share this code
                </div>
                <p>This code gives login access to the Telegram account.</p>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='min-h-32 rounded-2xl border border-dashed border-border bg-background/50 p-4 text-sm text-muted-foreground'>
                <p className='font-medium text-card-foreground'>
                  {requestedFreshCode ? 'A fresh code was requested.' : 'No recent code found yet.'}
                </p>
                <p className='mt-2'>
                  {message || 'Try again after a few seconds if Telegram has just sent a code.'}
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                onClick={fetchCode}
                disabled={loading || retryCountdown > 0 || (captchaRequired && !captchaToken)}
                className='w-full border-border bg-background text-card-foreground hover:bg-muted'
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                {retryCountdown > 0 ? `Try again in ${retryCountdown}s` : 'Check Again'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className='gap-2'>
          {code && (
            <Button
              type='button'
              variant='outline'
              onClick={handleCopy}
              className='border-border bg-background text-card-foreground hover:bg-muted'
            >
              <Copy className='mr-2 h-4 w-4' />
              Copy Code
            </Button>
          )}
          <Button type='button' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
