'use client'

import { useEffect, useMemo, useState } from 'react'
import TurnstileWidget from '@/components/common/TurnstileWidget'
import { Pagination } from '@/components/common/Pagination'
import MotionLoader from '@/components/common/MotionLoader'
import TelegramCodeDialog from '@/components/telegram/TelegramCodeDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import requests from '@/services/network/http'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ChevronDown,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'

interface TelegramAccount {
  orderId: number
  orderNumber: string
  phoneNumber: string
  productName: string
  orderDate: string
  deliveryStatus: string
  orderStatus: string
}

interface TelegramSecurityConfig {
  perAccountDailyLimit: number
  perPhoneDailyLimit: number
  resendCooldownSeconds: number
  blockDurationHours: number
  captchaEnabled: boolean
  captchaSiteKey: string | null
}

interface RateLimitState {
  accountSendsToday: number
  phoneSendsToday: number
  remainingAccountSends: number
  remainingPhoneSends: number
  cooldownSeconds: number
  blockedUntil: string | null
  isBlocked: boolean
}

export default function TelegramAccountsPage() {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [reRequestingCode, setReRequestingCode] = useState<number | null>(null)
  const [kickingSession, setKickingSession] = useState<number | null>(null)
  const [kickDialogOpen, setKickDialogOpen] = useState<number | null>(null)
  const [selectedCodeOrder, setSelectedCodeOrder] = useState<{
    orderId: number
    orderNumber: string
  } | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({})

  const { page, limit } = useFilter(10)

  const { data, loading, mutate } = useAsync<{
    success: boolean
    data: {
      accounts: TelegramAccount[]
      total: number
      pendingOTP: number
      delivered: number
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
        hasNext: boolean
        hasPrev: boolean
      }
    }
    message: string
  }>(() => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    return `/customer/telegram-accounts?${params.toString()}`
  })

  const { data: securityConfigResponse } = useAsync<{
    success: boolean
    data: TelegramSecurityConfig
    message: string
  }>('/customer/telegram-accounts/security-config')

  const securityConfig = securityConfigResponse?.data

  useEffect(() => {
    const hasActiveCooldown = Object.values(cooldowns).some((value) => value > 0)
    if (!hasActiveCooldown) return

    const timer = window.setInterval(() => {
      setCooldowns((current) => {
        const next: Record<number, number> = {}
        Object.entries(current).forEach(([key, value]) => {
          if (value > 1) {
            next[Number(key)] = value - 1
          }
        })
        return next
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldowns])

  const startCooldown = (orderId: number, seconds: number) => {
    if (seconds <= 0) return
    setCooldowns((current) => ({ ...current, [orderId]: seconds }))
  }

  const resetCaptcha = () => {
    setCaptchaToken('')
    setCaptchaResetKey((current) => current + 1)
  }

  const extractTimeoutFromError = (error: any): number => {
    const timeoutValue = error?.response?.data?.errors?.[0]?.cooldownSeconds
      ?? error?.response?.data?.errors?.[0]?.timeoutSeconds
      ?? error?.response?.data?.data?.timeout

    return typeof timeoutValue === 'number' ? timeoutValue : 0
  }

  const ensureCaptchaReady = (): boolean => {
    if (securityConfig?.captchaEnabled && !captchaToken) {
      toast.error('Please complete the security challenge first.')
      return false
    }

    return true
  }

  const handleReRequestCode = async (orderId: number) => {
    if (!ensureCaptchaReady()) return

    setReRequestingCode(orderId)
    try {
      const response = await requests.post<{
        success: boolean
        data?: {
          timeout?: number
          rateLimits?: RateLimitState | null
        }
        message: string
      }>('/customer/telegram-accounts/re-request-code', {
        orderId,
        captchaToken: securityConfig?.captchaEnabled ? captchaToken : undefined
      })

      if (response.success) {
        const cooldownSeconds =
          response.data?.rateLimits?.cooldownSeconds ||
          response.data?.timeout ||
          securityConfig?.resendCooldownSeconds ||
          60

        startCooldown(orderId, cooldownSeconds)
        toast.success(response.message || 'Code re-requested successfully.')
        resetCaptcha()
      } else {
        toast.error(response.message || 'Failed to re-request code')
      }
    } catch (error: any) {
      const timeoutSeconds = extractTimeoutFromError(error)
      if (
        timeoutSeconds &&
        timeoutSeconds <= (securityConfig?.resendCooldownSeconds || 60)
      ) {
        startCooldown(orderId, Math.min(timeoutSeconds, securityConfig?.resendCooldownSeconds || 60))
      }

      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to re-request code.'
      )
      resetCaptcha()
    } finally {
      setReRequestingCode(null)
    }
  }

  const handleKickAdminSession = async (orderId: number) => {
    setKickingSession(orderId)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/customer/telegram-accounts/kick-admin-session',
        { orderId }
      )

      if (response.success) {
        toast.success(response.message || 'Admin session kicked successfully')
        setKickDialogOpen(null)
        mutate?.()
      } else {
        toast.error(response.message || 'Failed to kick admin session')
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to kick admin session. Please try again.'
      )
    } finally {
      setKickingSession(null)
    }
  }

  const accounts = data?.data?.accounts || []

  const groupedAccounts = useMemo(() => {
    return accounts.reduce<Record<string, TelegramAccount[]>>((acc, account) => {
      const key = format(new Date(account.orderDate), 'MMMM dd, yyyy')
      acc[key] = acc[key] || []
      acc[key].push(account)
      return acc
    }, {})
  }, [accounts])

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className='py-12 text-center font-manrope'>
        <p className='text-lg font-medium text-muted-foreground'>No Telegram accounts found</p>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your purchased Telegram accounts will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-5xl space-y-5 px-1 font-manrope sm:px-0'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold text-card-foreground sm:text-3xl'>
          My Telegram Accounts
        </h1>
        <p className='text-base text-muted-foreground'>
          Manage your purchased Telegram accounts without leaving this page.
        </p>
      </div>

      <Alert className='border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle className='font-semibold text-yellow-700 dark:text-yellow-300'>
          Important Warnings
        </AlertTitle>
        <AlertDescription className='mt-2 space-y-2 text-sm'>
          <p>
            If you logout our session, you may no longer be able to get verification codes from us.
          </p>
          <p>
            Telegram can auto-kick sessions at any time, so secure the account on your side as soon
            as possible.
          </p>
        </AlertDescription>
      </Alert>

      {securityConfig ? (
        <Alert className='border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'>
          <Shield className='h-4 w-4' />
          <AlertTitle className='font-semibold text-cyan-700 dark:text-cyan-300'>
            Code Request Limits
          </AlertTitle>
          <AlertDescription className='mt-2 space-y-2 text-sm'>
            <p>
              You can send up to {securityConfig.perAccountDailyLimit} code requests per account
              each day.
            </p>
            <p>
              You can send up to {securityConfig.perPhoneDailyLimit} OTP requests to this number
              per day maximum.
            </p>
            <p>
              If the limit is exceeded, further sends are blocked for {securityConfig.blockDurationHours}{' '}
              hours.
            </p>
            <p>These protections apply to Telegram and SMS code sending channels.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {securityConfig?.captchaEnabled && securityConfig.captchaSiteKey ? (
        <Card className='rounded-3xl border-border bg-card p-4 text-card-foreground'>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>Security Challenge</p>
              <p className='text-sm text-muted-foreground'>
                Complete this challenge before requesting Telegram login or delivery codes.
              </p>
            </div>
            <TurnstileWidget
              key={captchaResetKey}
              siteKey={securityConfig.captchaSiteKey}
              onTokenChange={setCaptchaToken}
            />
          </div>
        </Card>
      ) : null}

      <div className='space-y-4'>
        {Object.entries(groupedAccounts).map(([dateLabel, items]) => (
          <div key={dateLabel} className='space-y-3'>
            <div className='flex items-center justify-between gap-3 px-1'>
              <p className='text-sm font-semibold text-primary sm:text-base'>{dateLabel}</p>
              <span className='rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground'>
                {items.length} {items.length > 1 ? 'accounts' : 'account'}
              </span>
            </div>

            {items.map((account) => {
              const expanded = expandedOrderId === account.orderId
              const delivered = account.deliveryStatus === 'DELIVERED'
              const cooldown = cooldowns[account.orderId] || 0
              const requiresCaptcha = Boolean(securityConfig?.captchaEnabled)
              const captchaMissing = requiresCaptcha && !captchaToken

              return (
                <Card
                  key={account.orderId}
                  className='overflow-hidden rounded-3xl border-border bg-card text-card-foreground'
                >
                  <button
                    type='button'
                    onClick={() =>
                      setExpandedOrderId((current) =>
                        current === account.orderId ? null : account.orderId
                      )
                    }
                    className='flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/20'
                  >
                    <div className='min-w-0 flex-1 space-y-3'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <p className='text-lg font-semibold text-card-foreground'>
                            Account #{account.orderNumber}
                          </p>
                          <p className='font-mono text-sm text-muted-foreground'>
                            {account.phoneNumber || 'Phone unavailable'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            delivered
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {delivered ? 'Active' : account.deliveryStatus}
                        </span>
                      </div>

                      <div className='rounded-2xl border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground'>
                        {account.productName || 'Telegram Account'}
                      </div>
                    </div>

                    <ChevronDown
                      className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className='space-y-4 border-t border-border bg-muted/10 p-4'>
                      <div className='rounded-2xl border border-border bg-background/70 p-3'>
                        <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                          Telegram Number
                        </div>
                        <div className='mt-1 font-mono text-sm text-card-foreground'>
                          {account.phoneNumber || 'Phone unavailable'}
                        </div>
                      </div>

                      {captchaMissing ? (
                        <div className='rounded-2xl border border-dashed border-border bg-background/60 p-3 text-sm text-muted-foreground'>
                          Complete the security challenge above before requesting a login code.
                        </div>
                      ) : null}

                      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <Button
                          type='button'
                          onClick={() =>
                            setSelectedCodeOrder({
                              orderId: account.orderId,
                              orderNumber: account.orderNumber
                            })
                          }
                          disabled={captchaMissing}
                          className='h-11 rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          <KeyRound className='mr-2 h-4 w-4' />
                          Get Code
                        </Button>

                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => handleReRequestCode(account.orderId)}
                          disabled={captchaMissing || reRequestingCode === account.orderId || cooldown > 0}
                          className='h-11 rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'
                        >
                          {reRequestingCode === account.orderId ? (
                            <>
                              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                              Requesting...
                            </>
                          ) : (
                            <>
                              <RefreshCw className='mr-2 h-4 w-4' />
                              {cooldown > 0 ? `Try again in ${cooldown}s` : 'Refresh Code'}
                            </>
                          )}
                        </Button>

                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => setKickDialogOpen(account.orderId)}
                          disabled={kickingSession === account.orderId}
                          className='h-11 rounded-2xl border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400 sm:col-span-2'
                        >
                          {kickingSession === account.orderId ? (
                            <>
                              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                              Logging out...
                            </>
                          ) : (
                            <>
                              <LogOut className='mr-2 h-4 w-4' />
                              Logout Session
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        ))}
      </div>

      {data?.data?.pagination && <Pagination paginationData={data.data.pagination} />}

      {selectedCodeOrder && (
        <TelegramCodeDialog
          open={!!selectedCodeOrder}
          onOpenChange={(open) => !open && setSelectedCodeOrder(null)}
          orderId={selectedCodeOrder.orderId}
          orderNumber={selectedCodeOrder.orderNumber}
          captchaToken={captchaToken}
          captchaRequired={Boolean(securityConfig?.captchaEnabled)}
          onCaptchaConsumed={resetCaptcha}
          defaultRetrySeconds={securityConfig?.resendCooldownSeconds || 60}
        />
      )}

      <Dialog open={kickDialogOpen !== null} onOpenChange={(open) => !open && setKickDialogOpen(null)}>
        <DialogContent className='border-border bg-card text-card-foreground sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
              <Shield className='h-5 w-5' />
              Logout Admin Session?
            </DialogTitle>
            <DialogDescription className='text-muted-foreground'>
              This removes our Telegram session from the selected account.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <Alert className='border-red-500/20 bg-red-500/10'>
              <AlertTriangle className='h-4 w-4 text-red-500' />
              <AlertTitle className='text-red-600 dark:text-red-400'>Warning</AlertTitle>
              <AlertDescription className='mt-2 text-red-700 dark:text-red-300/90'>
                After logout, you may stop receiving login codes from us for this account.
              </AlertDescription>
            </Alert>

            <Alert className='border-yellow-500/20 bg-yellow-500/10'>
              <AlertTriangle className='h-4 w-4 text-yellow-500' />
              <AlertTitle className='text-yellow-600 dark:text-yellow-400'>Before continuing</AlertTitle>
              <AlertDescription className='mt-2 text-yellow-700 dark:text-yellow-300/90'>
                Make sure you already control the account and have saved the important details.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setKickDialogOpen(null)}
              className='border-border bg-background text-card-foreground hover:bg-muted'
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => kickDialogOpen && handleKickAdminSession(kickDialogOpen)}
              disabled={kickingSession === kickDialogOpen}
            >
              {kickingSession === kickDialogOpen ? (
                <>
                  <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className='mr-2 h-4 w-4' />
                  Logout Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
