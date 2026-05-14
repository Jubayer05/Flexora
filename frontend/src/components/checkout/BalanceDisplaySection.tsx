'use client'

import { Typography } from '@/components/common/typography'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet, TrendingUp, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

interface BalanceDisplaySectionProps {
  balance: number
  totalAmount: number
  onBalanceAmountChange: (amount: number) => void
  disabled?: boolean
}

export function BalanceDisplaySection({
  balance,
  totalAmount,
  onBalanceAmountChange,
  disabled = false
}: BalanceDisplaySectionProps) {
  const [walletAmountToUse, setWalletAmountToUse] = useState(0)
  const [isExpanded, setIsExpanded] = useState(balance > 0 && balance <= totalAmount)

  const maxWalletUsage = Math.min(balance, totalAmount)
  const remainingToPay = Math.max(0, totalAmount - walletAmountToUse)
  const balanceCoversFull = walletAmountToUse >= totalAmount
  const balancePartial = walletAmountToUse > 0 && !balanceCoversFull
  const insufficientBalance = balance > 0 && balance < totalAmount

  // Handle quick action buttons
  const handleUseFullBalance = () => {
    const amount = maxWalletUsage
    setWalletAmountToUse(amount)
    onBalanceAmountChange(amount)
  }

  const handleUseHalfBalance = () => {
    const halfAmount = Math.min(balance / 2, totalAmount)
    setWalletAmountToUse(halfAmount)
    onBalanceAmountChange(halfAmount)
  }

  const handleClearBalance = () => {
    setWalletAmountToUse(0)
    onBalanceAmountChange(0)
  }

  // Handle custom amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    const validAmount = Math.min(Math.max(0, value), maxWalletUsage)
    setWalletAmountToUse(validAmount)
    onBalanceAmountChange(validAmount)
  }

  if (balance === 0) return null

  return (
    <div className='space-y-3'>
      {/* Prominent Balance Display */}
      <div className='bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-lg p-4'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='flex justify-center items-center bg-primary/20 rounded-full w-10 h-10'>
              <Wallet className='w-5 h-5 text-primary' />
            </div>
            <div>
              <Typography variant='body2' className='text-muted-foreground text-sm'>
                Your Balance
              </Typography>
              <Typography variant='h2' className='text-2xl font-bold text-primary'>
                ${balance.toFixed(2)}
              </Typography>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setIsExpanded(!isExpanded)}
            className='text-primary hover:bg-primary/10'
          >
            {isExpanded ? '−' : '+'}
          </Button>
        </div>

        {/* Quick Status */}
        <div className='space-y-1 text-xs text-muted-foreground'>
          <div className='flex items-center justify-between'>
            <span>Total to pay:</span>
            <span className='font-semibold text-foreground'>${totalAmount.toFixed(2)}</span>
          </div>
          {balance >= totalAmount && (
            <div className='flex items-center gap-1 text-primary'>
              <Check className='w-3 h-3' />
              <span>Balance covers full amount</span>
            </div>
          )}
          {insufficientBalance && (
            <div className='flex items-center gap-1 text-amber-600'>
              <TrendingUp className='w-3 h-3' />
              <span>Partial balance: ${balance.toFixed(2)} available</span>
            </div>
          )}
        </div>
      </div>

      {/* Balance Usage Options - Collapsible */}
      {isExpanded && (
        <div className='border border-primary/20 rounded-lg p-4 space-y-4 bg-background/50'>
          {/* Amount Input */}
          <div className='space-y-2'>
            <label className='text-sm font-semibold text-foreground block'>
              How much to use from balance?
            </label>
            <div className='flex gap-2'>
              <Input
                type='number'
                min={0}
                max={maxWalletUsage}
                step={0.01}
                value={walletAmountToUse || ''}
                onChange={handleAmountChange}
                placeholder='0.00'
                disabled={disabled}
                className='flex-1 font-medium'
              />
              <span className='flex items-center px-3 bg-background rounded-md border border-input text-sm font-medium'>
                USD
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className='grid grid-cols-3 gap-2'>
            <Button
              type='button'
              variant={walletAmountToUse === maxWalletUsage ? 'default' : 'outline'}
              size='sm'
              onClick={handleUseFullBalance}
              disabled={disabled}
              className='text-xs'
            >
              Use All
            </Button>
            <Button
              type='button'
              variant={walletAmountToUse === Math.min(balance / 2, totalAmount) ? 'default' : 'outline'}
              size='sm'
              onClick={handleUseHalfBalance}
              disabled={disabled}
              className='text-xs'
            >
              Use Half
            </Button>
            <Button
              type='button'
              variant={walletAmountToUse === 0 ? 'destructive' : 'outline'}
              size='sm'
              onClick={handleClearBalance}
              disabled={disabled}
              className='text-xs'
            >
              Clear
            </Button>
          </div>

          {/* Calculation Breakdown */}
          <div className='space-y-2 bg-foreground/5 rounded-lg p-3 border border-border'>
            <Typography variant='body2' className='font-semibold text-sm mb-2'>
              Payment Breakdown
            </Typography>

            <div className='space-y-1 text-sm'>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Balance to use:</span>
                <span className='font-medium text-blue-600'>
                  ${walletAmountToUse.toFixed(2)}
                </span>
              </div>

              <div className='flex justify-between items-center border-t border-border pt-1'>
                <span className='font-semibold'>Remaining to pay:</span>
                <span className='font-bold text-primary text-base'>
                  ${remainingToPay.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Status Messages */}
            {balanceCoversFull && (
              <div className='mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-2'>
                <Typography variant='body2' className='text-green-700 text-center font-medium text-xs'>
                  ✓ Full payment covered by balance
                </Typography>
              </div>
            )}

            {balancePartial && (
              <div className='mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2'>
                <Typography variant='body2' className='text-amber-700 text-center font-medium text-xs'>
                  Balance + ${remainingToPay.toFixed(2)} via payment gateway
                </Typography>
              </div>
            )}
          </div>

          {/* Info Text */}
          <div className='text-xs text-muted-foreground italic text-center p-2 border-t border-border pt-3'>
            💡 You can combine wallet balance with any payment method
          </div>
        </div>
      )}

      {/* Collapsed Summary */}
      {!isExpanded && walletAmountToUse > 0 && (
        <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-700'>
          <div className='flex justify-between items-center'>
            <span className='font-medium'>Using from balance:</span>
            <span className='font-bold'>${walletAmountToUse.toFixed(2)}</span>
          </div>
          {remainingToPay > 0 && (
            <div className='flex justify-between items-center mt-1'>
              <span className='font-medium'>Still to pay:</span>
              <span className='font-bold'>${remainingToPay.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
