'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface OTPVerificationProps {
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  isLoading?: boolean
  error?: string | null
  email?: string
  maxLength?: number
  expiryMinutes?: number
  resendCooldownSeconds?: number
}

export default function OTPVerification({
  onVerify,
  onResend,
  isLoading = false,
  error,
  email,
  maxLength = 6,
  expiryMinutes = 10,
  resendCooldownSeconds = 120
}: OTPVerificationProps) {
  const [otp, setOtp] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(expiryMinutes * 60) // in seconds
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeRemaining])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current)
      }
    }
  }, [resendCooldown])

  // Reset timer when OTP is sent
  const handleResend = async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before requesting a new code`)
      return
    }

    setIsResending(true)
    try {
      await onResend()
      setOtp('')
      setTimeRemaining(expiryMinutes * 60)
      setResendCooldown(resendCooldownSeconds)
      toast.success('OTP code sent! Check your email.')
      // Focus first input
      inputRefs.current[0]?.focus()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend OTP')
    } finally {
      setIsResending(false)
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(0, 1)
    if (!digit && value.length > 0) return

    const newOtp = otp.split('')
    newOtp[index] = digit
    const updatedOtp = newOtp.join('').slice(0, maxLength)
    setOtp(updatedOtp)

    // Auto-focus next input
    if (digit && index < maxLength - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-verify when all digits are entered
    if (updatedOtp.length === maxLength) {
      handleVerify(updatedOtp)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, maxLength)
    if (pastedData) {
      setOtp(pastedData)
      // Focus the last filled input or the last input
      const focusIndex = Math.min(pastedData.length - 1, maxLength - 1)
      inputRefs.current[focusIndex]?.focus()
      // Auto-verify if complete
      if (pastedData.length === maxLength) {
        handleVerify(pastedData)
      }
    }
  }

  const handleVerify = async (code?: string) => {
    const codeToVerify = code || otp
    if (codeToVerify.length !== maxLength) {
      toast.error(`Please enter a ${maxLength}-digit code`)
      return
    }

    try {
      await onVerify(codeToVerify)
    } catch (error) {
      // Error handling is done by parent component
      setOtp('')
      inputRefs.current[0]?.focus()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className='space-y-6'>
      {/* Instructions */}
      <div className='space-y-2 text-center'>
        <Label className='text-base font-semibold'>Enter Verification Code</Label>
        {email && (
          <p className='text-sm text-muted-foreground'>
            We&apos;ve sent a {maxLength}-digit code to <span className='font-medium'>{email}</span>
          </p>
        )}
        {!email && (
          <p className='text-sm text-muted-foreground'>
            Enter the {maxLength}-digit verification code sent to your email
          </p>
        )}
      </div>

      {/* OTP Input Fields */}
      <div className='flex justify-center gap-2'>
        {Array.from({ length: maxLength }).map((_, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type='text'
            inputMode='numeric'
            maxLength={1}
            value={otp[index] || ''}
            onChange={(e) => handleOtpChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            className='w-12 h-14 text-center text-2xl font-semibold tracking-widest'
            disabled={isLoading || timeRemaining === 0}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Timer */}
      {timeRemaining > 0 && (
        <div className='text-center text-sm text-muted-foreground'>
          Code expires in: <span className='font-medium text-foreground'>{formatTime(timeRemaining)}</span>
        </div>
      )}

      {timeRemaining === 0 && (
        <div className='text-center text-sm text-amber-600 dark:text-amber-400'>
          Code has expired. Please request a new one.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3'>
          <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <Button
          variant='outline'
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0 || isLoading}
          className='flex-1'
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
          {isResending
            ? 'Sending...'
            : resendCooldown > 0
              ? `Resend (${formatTime(resendCooldown)})`
              : 'Resend Code'}
        </Button>
        <Button
          onClick={() => handleVerify()}
          disabled={isLoading || otp.length !== maxLength || timeRemaining === 0}
          className='flex-1'
        >
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </Button>
      </div>

      {/* Help Text */}
      <p className='text-xs text-center text-muted-foreground'>
        Didn&apos;t receive the code? Check your spam folder or click &quot;Resend Code&quot; above.
      </p>
    </div>
  )
}

