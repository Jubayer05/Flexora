'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, ChevronDown, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface TelegramAccount {
  id: number
  phoneNumber?: string
  phone?: string
  username?: string
  twoFactorEnabled?: boolean
  sessionExpiry?: Date
  hasPremium?: boolean
  password?: string
  meta?: Record<string, any>
}

interface TelegramCredentialsDisplayProps {
  accounts: TelegramAccount[]
  productName: string
  orderId: number
}

export default function TelegramCredentialsDisplay({
  accounts,
  productName,
  orderId
}: TelegramCredentialsDisplayProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set([0]))
  const [verificationCodes, setVerificationCodes] = useState<Record<number, string>>({})

  const togglePassword = (index: number) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(index)) {
      newVisible.delete(index)
    } else {
      newVisible.add(index)
    }
    setVisiblePasswords(newVisible)
  }

  const getPhoneNumber = (account: TelegramAccount): string => {
    return account.phoneNumber || account.phone || 'N/A'
  }

  const getPassword = (account: TelegramAccount): string => {
    return account.password || account.meta?.password || ''
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const updateVerificationCode = (index: number, value: string) => {
    setVerificationCodes((current) => ({
      ...current,
      [index]: value
    }))
  }

  if (!accounts || accounts.length === 0) {
    return null
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='space-y-2'>
        <h3 className='text-lg font-semibold text-green-400'>✓ Telegram Credentials</h3>
        <p className='text-sm text-white/60'>
          Your {productName} account credentials have been successfully delivered
        </p>
      </div>

      {/* Accounts List */}
      <div className='space-y-3'>
        {accounts.map((account, index) => (
          <Card
            key={`${account.id}-${index}`}
            className='bg-background/50 border border-green-500/20 overflow-hidden'
          >
            {/* Account Header */}
            <button
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              className='w-full p-4 hover:bg-green-500/5 transition-colors flex items-center justify-between'
            >
              <div className='text-left'>
                <p className='font-semibold text-white'>
                  {getPhoneNumber(account)}
                  {account.username && (
                    <span className='text-sm text-white/60 ml-2'>(@{account.username})</span>
                  )}
                </p>
                <p className='text-xs text-white/40 mt-1'>
                  {account.sessionExpiry
                    ? `Session expires: ${new Date(account.sessionExpiry).toLocaleDateString()}`
                    : 'Permanent session'}
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-green-400 transition-transform ${
                  expandedIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Account Details */}
            {expandedIndex === index && (
              <div className='border-t border-green-500/10 p-4 space-y-4 bg-green-500/5'>
                {/* Phone Number */}
                <div className='space-y-2'>
                  <label className='text-xs font-semibold text-green-400 uppercase'>
                    Telegram Number
                  </label>
                  <div className='flex items-center gap-2 bg-background/50 p-3 rounded-lg border border-white/10'>
                    <code className='text-sm font-mono text-white flex-1'>
                      {getPhoneNumber(account)}
                    </code>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => copyToClipboard(getPhoneNumber(account), 'Phone number')}
                      className='text-green-400 hover:bg-green-500/10'
                    >
                      <Copy className='w-4 h-4' />
                    </Button>
                  </div>
                </div>

                {/* Password */}
                {getPassword(account) && (
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-green-400 uppercase'>
                      Password
                    </label>
                    <div className='flex items-center gap-2 bg-background/50 p-3 rounded-lg border border-white/10'>
                      <code className='text-sm font-mono text-white flex-1'>
                        {visiblePasswords.has(index)
                          ? getPassword(account)
                          : '•'.repeat(getPassword(account).length)}
                      </code>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => togglePassword(index)}
                        className='text-green-400 hover:bg-green-500/10'
                      >
                        {visiblePasswords.has(index) ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          copyToClipboard(getPassword(account), 'Password')
                        }
                        className='text-green-400 hover:bg-green-500/10'
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2FA Code if available */}
                {account.meta?.twoFactorCode && (
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-green-400 uppercase'>
                      2FA Backup Code
                    </label>
                    <div className='flex items-center gap-2 bg-background/50 p-3 rounded-lg border border-white/10'>
                      <code className='text-sm font-mono text-white flex-1'>
                        {account.meta?.twoFactorCode}
                      </code>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          copyToClipboard(
                            account.meta?.twoFactorCode || '',
                            '2FA Code'
                          )
                        }
                        className='text-green-400 hover:bg-green-500/10'
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                <div className='space-y-2'>
                  <label className='text-xs font-semibold text-green-400 uppercase'>
                    Verification Code Box
                  </label>
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Input
                      value={verificationCodes[index] || ''}
                      onChange={(event) => updateVerificationCode(index, event.target.value)}
                      placeholder='Enter the code you receive from Telegram'
                      className='border-white/10 bg-background/50 text-white placeholder:text-white/40'
                    />
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          copyToClipboard(verificationCodes[index] || '', 'Verification code')
                        }
                        disabled={!verificationCodes[index]}
                        className='border-green-500/20 text-green-400 hover:bg-green-500/10'
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => updateVerificationCode(index, '')}
                        disabled={!verificationCodes[index]}
                        className='border-white/10 text-white/70 hover:bg-white/5'
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <p className='text-xs text-white/50'>
                    Use this box to keep the Telegram login code handy while you verify the account
                    on your device.
                  </p>
                </div>

                {/* Session Note */}
                <div className='p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 flex gap-3'>
                  <AlertCircle className='h-4 w-4 text-yellow-500 shrink-0 mt-0.5' />
                  <div className='text-sm text-yellow-400'>
                    <p className='font-semibold'>Session Information:</p>
                    <p className='mt-1'>
                      If you see "session expired" error, try login by phone using this number
                      and the password. Contact our support for backup codes if needed.
                    </p>
                  </div>
                </div>

                {/* Login Instructions */}
                <details className='group'>
                  <summary className='cursor-pointer font-semibold text-green-400 text-sm hover:text-green-300 transition-colors'>
                    📖 Login Instructions
                  </summary>
                  <div className='mt-3 space-y-2 text-sm text-white/70 pl-3 border-l-2 border-green-500/30'>
                    <p>
                      <strong>1. Open Telegram:</strong> Download or open Telegram app
                    </p>
                    <p>
                      <strong>2. Start Login:</strong> Click "Sign in" and select "Phone Number"
                    </p>
                    <p>
                      <strong>3. Enter Phone:</strong> Enter the phone number shown above (with
                      country code like +1)
                    </p>
                    <p>
                      <strong>4. Enter Code:</strong> Telegram will send a code via SMS. Enter it
                      when prompted.
                    </p>
                    <p>
                      <strong>5. Enter Password:</strong> If enabled, enter the password above
                    </p>
                    <p>
                      <strong>6. Success:</strong> You're logged in! Your account information and
                      contacts will load.
                    </p>
                    <p className='pt-2 text-yellow-400'>
                      ⚠️ Pro Tip: Save this information safely. We recommend taking a screenshot.
                    </p>
                  </div>
                </details>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Download Options */}
      <div className='p-3 rounded-lg border border-blue-500/20 bg-blue-500/10'>
        <p className='text-xs text-blue-300'>
          💾 Download a backup of this information using the download button below to keep it
          safe
        </p>
      </div>
    </div>
  )
}
