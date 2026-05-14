'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

interface AddTelegramAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialProductId?: number | null
  initialProductName?: string | null
}

type Step = 'phone' | 'otp' | 'review'

interface AssignedProxy {
  host: string
  port: number
  type: 'socks5' | 'http'
  username?: string
  password?: string
}

interface SessionResponse {
  success: boolean
  status: string
  message: string
  sessionCreated: boolean
  phoneNumber: string
  requires2FA?: boolean
  proxy?: AssignedProxy
  userInfo?: {
    username?: string
  }
}

interface OtpSubmitResponse {
  success: boolean
  status: string
  message: string
  phoneNumber: string
  sessionPath: string
  password2FA: string
  requires2FA?: boolean
  proxy?: AssignedProxy
  userInfo?: {
    username?: string
  }
}

interface AccountCreationResponse {
  success: boolean
  message: string
}

export function AddTelegramAccountModal({
  open,
  onOpenChange,
  onSuccess,
  initialProductId,
  initialProductName
}: AddTelegramAccountModalProps) {
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [username, setUsername] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password2FA, setPassword2FA] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [sessionPath, setSessionPath] = useState('')
  const [productId, setProductId] = useState<string>('')
  const [useProxy, setUseProxy] = useState(false)
  const [assignedProxy, setAssignedProxy] = useState<AssignedProxy | null>(null)

  useEffect(() => {
    if (open) {
      setProductId(initialProductId ? initialProductId.toString() : '')
    }
  }, [initialProductId, open])

  const handleReset = () => {
    setStep('phone')
    setPhoneNumber('')
    setUsername('')
    setOtpCode('')
    setPassword2FA('')
    setRequires2FA(false)
    setSessionPath('')
    setProductId('')
    setUseProxy(false)
    setAssignedProxy(null)
    setLoading(false)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    setLoading(true)
    try {
      const response = await requests.post<SessionResponse>(
        '/admin/telegram-sessions/create-session',
        {
          phoneNumber: phoneNumber.trim(),
          useProxy
        }
      )

      if (response.success) {
        setRequires2FA(Boolean(response.requires2FA))
        setUsername(response.userInfo?.username || '')
        setAssignedProxy(response.proxy || null)
        toast.success(response.message || 'OTP sent successfully')
        setStep('otp')
      } else {
        toast.error(response.message || 'Failed to send OTP')
      }
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error('Please enter the OTP code')
      return
    }

    setLoading(true)
    try {
      const response = await requests.post<OtpSubmitResponse>(
        '/admin/telegram-sessions/submit-otp',
        {
          phoneNumber: phoneNumber.trim(),
          otpCode: otpCode.trim(),
          password2FA: password2FA.trim() || null,
          useProxy
        }
      )

      if (response.success) {
        setRequires2FA(Boolean(response.requires2FA))
        setUsername(response.userInfo?.username || '')
        setAssignedProxy(response.proxy || assignedProxy)
        toast.success(response.message || 'OTP verified successfully')
        // Store the session data for next step (keep existing phoneNumber if response doesn't have it)
        if (response.phoneNumber) {
          setPhoneNumber(response.phoneNumber)
        }
        setSessionPath(response.sessionPath)
        if (response.password2FA) {
          setPassword2FA(response.password2FA)
        }
        setStep('review')
      } else {
        if (response.requires2FA) {
          setRequires2FA(true)
        }
        toast.error(response.message || 'Failed to verify OTP')
      }
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productId) {
      toast.error('Please select a Telegram item first, then add the account from that item.')
      return
    }

    setLoading(true)
    try {
      const response = await requests.post<AccountCreationResponse>('/admin/telegram-accounts', {
        productId: parseInt(productId),
        username,
        phone: phoneNumber,
        password: password2FA || '',
        sessionFile: sessionPath,
        proxy: assignedProxy || undefined
      })

      if (response.success) {
        toast.success(response.message || 'Telegram account created successfully')
        handleClose()
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to create account')
      }
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add New Telegram Account</DialogTitle>
          <DialogDescription>
            {step === 'phone'
              ? 'Enter the phone number to create a new Telegram session.'
              : step === 'otp'
              ? 'Enter the OTP code sent to your phone number.'
              : 'Review the Telegram item and create the account.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit}>
            <div className='gap-4 grid py-4'>
              <div className='gap-2 grid'>
                <Label htmlFor='phoneNumber'>Phone Number</Label>
                <Input
                  id='phoneNumber'
                  type='tel'
                  placeholder='+1234567890'
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <p className='text-muted-foreground text-sm'>
                  Enter the phone number with country code (e.g., +1234567890)
                </p>
              </div>

              <div className='rounded-lg border border-border bg-muted/20 px-3 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <Label className='text-sm font-medium'>Use Proxy?</Label>
                    <p className='text-muted-foreground text-xs mt-1'>
                      If enabled, the system will auto-assign one healthy proxy from the available list for
                      this login session.
                    </p>
                  </div>
                  <Switch checked={useProxy} onCheckedChange={setUseProxy} disabled={loading} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
                Send OTP
              </Button>
            </DialogFooter>
          </form>
        ) : step === 'otp' ? (
          <form onSubmit={handleOtpSubmit}>
            <div className='gap-4 grid py-4'>
              <div className='gap-2 grid'>
                <Label htmlFor='phoneNumber'>Phone Number</Label>
                <Input id='phoneNumber' type='tel' value={phoneNumber} disabled />
              </div>

              <div className='gap-2 grid'>
                <Label htmlFor='otpCode'>
                  OTP Code <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='otpCode'
                  type='text'
                  placeholder='Enter OTP code'
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {requires2FA ? (
                <div className='gap-2 grid'>
                  <Label htmlFor='password2FA'>2FA Password</Label>
                  <Input
                    id='password2FA'
                    type='password'
                    placeholder='Enter your Telegram 2FA password'
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    disabled={loading}
                  />
                  <p className='text-muted-foreground text-sm'>
                    This account has 2FA enabled. Enter the password to continue.
                  </p>
                </div>
              ) : null}

              {useProxy && assignedProxy ? (
                <div className='rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm'>
                  <div className='font-medium text-foreground'>Assigned Proxy</div>
                  <p className='mt-1 text-muted-foreground break-all'>
                    {assignedProxy.host}:{assignedProxy.port} ({assignedProxy.type.toUpperCase()})
                  </p>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type='button'
                variant='ghost'
                onClick={() => {
                  setStep('phone')
                  setPassword2FA('')
                  setRequires2FA(false)
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button type='submit' disabled={loading}>
                {loading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
                Verify OTP
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleAccountCreation}>
            <div className='gap-4 grid py-4'>
              <div className='gap-2 grid'>
                <Label htmlFor='phoneNumber'>Phone Number</Label>
                <Input id='phoneNumber' type='tel' value={phoneNumber} disabled />
              </div>

              {!username.trim() ? (
                <div className='gap-2 grid'>
                  <Label htmlFor='username'>Telegram Username</Label>
                  <Input
                    id='username'
                    type='text'
                    placeholder='@username'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                  <p className='text-muted-foreground text-sm'>
                    Auto-detect unavailable. Enter the username manually if needed.
                  </p>
                </div>
              ) : null}

              <div className='gap-2 grid'>
                <Label htmlFor='sessionPath'>Session Path</Label>
                <Input id='sessionPath' type='text' value={sessionPath} disabled />
              </div>

              <div className='gap-2 grid'>
                <Label>Telegram Item</Label>
                <div className='rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm'>
                  <div className='font-medium text-foreground'>
                    {initialProductName || `Product #${productId}`}
                  </div>
                  <p className='mt-1 text-muted-foreground'>
                    This account will be added directly to the selected Telegram management item.
                  </p>
                </div>
              </div>

              <div className='gap-2 grid'>
                <Label>Proxy Preference</Label>
                <div className='rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm'>
                  {useProxy && assignedProxy ? (
                    <>
                      <div className='font-medium text-foreground'>
                        Proxy enabled for this session
                      </div>
                      <p className='mt-1 text-muted-foreground break-all'>
                        {assignedProxy.host}:{assignedProxy.port} ({assignedProxy.type.toUpperCase()})
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='font-medium text-foreground'>No proxy selected</div>
                      <p className='mt-1 text-muted-foreground'>
                        This login session will be created without a proxy.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setStep('otp')}
                disabled={loading}
              >
                Back
              </Button>
              <Button type='submit' disabled={loading}>
                {loading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
