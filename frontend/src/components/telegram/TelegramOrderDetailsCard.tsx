'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, ChevronDown, Copy, Download, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'

interface TelegramOrderDetailsCardProps {
  order: any // Order type from props
  onDownloadClick?: (orderId: number, orderNumber: string) => void
}

interface TelegramAccount {
  id: number
  phoneNumber?: string
  phone?: string
  password?: string
  hasPremium?: boolean
  username?: string
}

export default function TelegramOrderDetailsCard({
  order,
  onDownloadClick
}: TelegramOrderDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPassword, setShowPassword] = useState<Set<number>>(new Set())
  const [verificationCodes, setVerificationCodes] = useState<Record<number, string>>({})

  // Extract telegram account details from order
  // Note: Order response doesn't include product.type, so we check platform only
  // Product type 'TELEGRAM_ACCOUNTS' is confirmed from product list
  const isTelegramAccount = order.product?.platform === 'TELEGRAM'
  const isDelivered = order.deliveryStatus === 'DELIVERED'

  // Fetch real account credentials from backend
  const { data: accountsData, loading: loadingAccounts } = useAsync<{
    success: boolean
    accounts: TelegramAccount[]
  }>(
    () => {
      if (!isTelegramAccount || !isDelivered || !order.id) return null
      return `/customer/orders/${order.id}/telegram-accounts`
    },
    false,
    false
  )

  const accounts = accountsData?.accounts || []

  if (!isTelegramAccount) {
    return null
  }

  const togglePassword = (accountId: number) => {
    const newVisible = new Set(showPassword)
    if (newVisible.has(accountId)) {
      newVisible.delete(accountId)
    } else {
      newVisible.add(accountId)
    }
    setShowPassword(newVisible)
  }

  const getPhoneNumber = (account: TelegramAccount): string => {
    return account.phoneNumber || account.phone || 'Not available'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const updateVerificationCode = (accountId: number, value: string) => {
    setVerificationCodes((current) => ({
      ...current,
      [accountId]: value
    }))
  }

  return (
    <Card className='bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-green-500/10 dark:to-blue-500/10 border border-emerald-200 dark:border-green-500/20 overflow-hidden'>
      {/* Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full p-4 hover:bg-emerald-100/50 dark:hover:bg-green-500/5 transition-colors flex items-center justify-between'
      >
        <div className='text-left flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-emerald-900 dark:text-white'>Telegram Account Details</span>
            {order.product?.name && (
              <span className='text-xs bg-emerald-200/80 dark:bg-green-500/20 px-2 py-1 rounded text-emerald-700 dark:text-green-300'>
                {order.product.name}
              </span>
            )}
          </div>
          <p className='text-sm text-emerald-700/80 dark:text-white/60 mt-1'>
            {isDelivered ? '✅ Delivered' : '⏳ Pending delivery'}
            {accounts.length > 0 && accounts.some(acc => acc.hasPremium) && ' • 👑 Premium'}
            {accounts.length > 1 && ` • ${accounts.length} accounts`}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-emerald-600 dark:text-green-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className='border-t border-emerald-200 dark:border-green-500/10 p-4 space-y-4 bg-white/60 dark:bg-background/30'>
          {!isDelivered ? (
            <div className='p-3 rounded-lg border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 flex gap-3'>
              <AlertCircle className='h-4 w-4 text-amber-600 dark:text-yellow-500 shrink-0 mt-0.5' />
              <div className='text-sm text-amber-700 dark:text-yellow-400'>
                Account is still being delivered. Check back soon for access details.
              </div>
            </div>
          ) : loadingAccounts ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='w-6 h-6 animate-spin text-emerald-600 dark:text-green-400' />
              <span className='ml-2 text-muted-foreground'>Loading account details...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className='p-3 rounded-lg border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 flex gap-3'>
              <AlertCircle className='h-4 w-4 text-amber-600 dark:text-yellow-500 shrink-0 mt-0.5' />
              <div className='text-sm text-amber-700 dark:text-yellow-400'>
                No account credentials available yet. Accounts may still be processing. Please try again in a few moments.
              </div>
            </div>
          ) : (
            <>
              {/* Display all accounts */}
              {accounts.map((account, index) => (
                <div key={account.id || index} className='space-y-3'>
                  {accounts.length > 1 && (
                    <div className='text-xs font-semibold text-emerald-700 dark:text-green-400 uppercase'>
                      Account #{index + 1}
                    </div>
                  )}

                  {/* Phone Number */}
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-emerald-700 dark:text-green-400 uppercase'>
                      Telegram Number
                    </label>
                    <div className='flex items-center gap-2 bg-muted/50 dark:bg-background/50 p-3 rounded-lg border border-border'>
                      <code className='text-sm font-mono text-foreground dark:text-white flex-1'>
                        {getPhoneNumber(account)}
                      </code>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          copyToClipboard(getPhoneNumber(account), 'Phone number')
                        }
                        className='text-emerald-600 hover:bg-emerald-100 dark:text-green-400 dark:hover:bg-green-500/10'
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  {account.password && (
                    <div className='space-y-2'>
                      <label className='text-xs font-semibold text-emerald-700 dark:text-green-400 uppercase'>
                        Password
                      </label>
                      <div className='flex items-center gap-2 bg-muted/50 dark:bg-background/50 p-3 rounded-lg border border-border'>
                        <code className='text-sm font-mono text-foreground dark:text-white flex-1'>
                          {showPassword.has(account.id) ? account.password : '•'.repeat(account.password.length || 8)}
                        </code>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => togglePassword(account.id)}
                          className='text-emerald-600 hover:bg-emerald-100 dark:text-green-400 dark:hover:bg-green-500/10'
                        >
                          {showPassword.has(account.id) ? (
                            <EyeOff className='w-4 h-4' />
                          ) : (
                            <Eye className='w-4 h-4' />
                          )}
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => copyToClipboard(account.password || '', 'Password')}
                          className='text-emerald-600 hover:bg-emerald-100 dark:text-green-400 dark:hover:bg-green-500/10'
                        >
                          <Copy className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-emerald-700 dark:text-green-400 uppercase'>
                      2FA Status
                    </label>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          account.password
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-muted-foreground/20 bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        {account.password ? 'Enabled' : 'Not Enabled'}
                      </span>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-emerald-700 dark:text-green-400 uppercase'>
                      Verification Code Box
                    </label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        value={verificationCodes[account.id] || ''}
                        onChange={(event) =>
                          updateVerificationCode(account.id, event.target.value)
                        }
                        placeholder='Enter the code you receive from Telegram'
                        className='border-border bg-muted/50 dark:bg-background/50'
                      />
                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() =>
                            copyToClipboard(
                              verificationCodes[account.id] || '',
                              'Verification code'
                            )
                          }
                          disabled={!verificationCodes[account.id]}
                        >
                          <Copy className='w-4 h-4' />
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => updateVerificationCode(account.id, '')}
                          disabled={!verificationCodes[account.id]}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Keep your login code here while completing Telegram verification on your
                      device.
                    </p>
                  </div>

                  {/* Premium Badge */}
                  {account.hasPremium && (
                    <div className='flex items-center gap-2 text-xs text-emerald-700 dark:text-green-400'>
                      <span>👑</span>
                      <span>Premium Account</span>
                    </div>
                  )}

                  {/* Separator for multiple accounts */}
                  {index < accounts.length - 1 && (
                    <div className='border-t border-emerald-200 dark:border-green-500/10 pt-3 mt-3' />
                  )}
                </div>
              ))}

              {/* Session Warning */}
              <div className='p-3 rounded-lg border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 flex gap-3'>
                <AlertCircle className='h-4 w-4 text-amber-600 dark:text-yellow-500 shrink-0 mt-0.5' />
                <div className='text-sm text-amber-700 dark:text-yellow-400'>
                  <p className='font-semibold'>Session Information:</p>
                  <p className='mt-1'>
                    If you see "session expired" error, try login by phone using this number
                    and password. Contact support for backup codes if needed.
                  </p>
                </div>
              </div>

              {/* Download Credentials Button */}
              <Button
                onClick={() => onDownloadClick?.(order.id, order.orderNumber)}
                className='w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-green-600 dark:hover:bg-green-700 text-white'
              >
                <Download className='w-4 h-4 mr-2' />
                Download Credentials (TXT, Excel, JSON)
              </Button>

              {/* Login Instructions */}
              <details className='group'>
                <summary className='cursor-pointer font-semibold text-emerald-700 dark:text-green-400 text-sm hover:text-emerald-600 dark:hover:text-green-300 transition-colors'>
                  📖 Login Instructions
                </summary>
                <div className='mt-3 space-y-2 text-sm text-muted-foreground dark:text-white/70 pl-3 border-l-2 border-emerald-300 dark:border-green-500/30'>
                  <p>
                    <strong>1. Open Telegram:</strong> Download or open the Telegram app
                  </p>
                  <p>
                    <strong>2. Start Login:</strong> Click "Sign in" → "Phone Number"
                  </p>
                  <p>
                    <strong>3. Enter Number:</strong> Enter the phone number shown above with
                    country code (e.g., +1)
                  </p>
                  <p>
                    <strong>4. Verify Code:</strong> Telegram sends verification code via SMS.
                    Enter the code when prompted.
                  </p>
                  <p>
                    <strong>5. 2FA Password:</strong> If enabled, enter the password above
                  </p>
                  <p>
                    <strong>6. Success:</strong> You're logged in! Contacts and messages will
                    load.
                  </p>
                  <p className='pt-2 text-emerald-700 dark:text-green-400'>
                    ✅ Save this information securely. We recommend taking a screenshot.
                  </p>
                </div>
              </details>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
