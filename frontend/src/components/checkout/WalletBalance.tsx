'use client'

import { Typography } from '@/components/common/typography'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet } from 'lucide-react'
import { useState, useEffect } from 'react'

interface WalletBalanceProps {
  balance: number
  onWalletAmountChange: (amount: number, useWallet: boolean) => void
  maxAmount: number
  disabled?: boolean
}

export function WalletBalance({
  balance,
  onWalletAmountChange,
  maxAmount,
  disabled = false
}: WalletBalanceProps) {
  const [useWallet, setUseWallet] = useState(false)
  const [walletAmount, setWalletAmount] = useState(0)

  // When wallet usage is toggled
  useEffect(() => {
    if (!useWallet) {
      setWalletAmount(0)
      onWalletAmountChange(0, false)
    } else {
      // Default to using full balance or max amount, whichever is smaller
      const defaultAmount = Math.min(balance, maxAmount)
      setWalletAmount(defaultAmount)
      onWalletAmountChange(defaultAmount, true)
    }
  }, [useWallet, balance, maxAmount, onWalletAmountChange])

  // When wallet amount changes
  const handleWalletAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    
    // Validate: can't exceed balance or max amount
    const validAmount = Math.min(value, balance, maxAmount)
    
    setWalletAmount(validAmount)
    onWalletAmountChange(validAmount, useWallet)
  }

  // Quick set buttons
  const handleSetAmount = (amount: number) => {
    const validAmount = Math.min(amount, balance, maxAmount)
    setWalletAmount(validAmount)
    onWalletAmountChange(validAmount, useWallet)
  }

  const remainingAfterWallet = maxAmount - walletAmount

  return (
    <div style={{
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      border: '2px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Balance Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderRadius: '8px',
          width: '40px',
          height: '40px'
        }}>
          <Wallet style={{ width: '20px', height: '20px', color: '#6366f1' }} />
        </div>
        <div>
          <Typography variant='body2' style={{ color: '#888' }}>
            Your Wallet Balance
          </Typography>
          <Typography variant='h3' style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
            ${balance.toFixed(2)}
          </Typography>
        </div>
      </div>

      {/* Use Wallet Checkbox */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderTop: '1px solid rgba(99, 102, 241, 0.2)',
        paddingTop: '12px'
      }}>
        <Checkbox
          id='use-wallet'
          checked={useWallet}
          onCheckedChange={(checked) => setUseWallet(checked as boolean)}
          disabled={disabled || balance === 0}
        />
        <Label htmlFor='use-wallet' style={{ cursor: 'pointer', flex: 1, marginBottom: 0 }}>
          <Typography variant='body2'>
            Use wallet balance for this payment
          </Typography>
        </Label>
      </div>

      {/* Wallet Amount Input - Only show when enabled */}
      {useWallet && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          paddingTop: '12px'
        }}>
          {/* Amount Input */}
          <div>
            <Label htmlFor='wallet-amount' style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Amount to use from wallet
            </Label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                id='wallet-amount'
                type='number'
                min={0}
                max={Math.min(balance, maxAmount)}
                step={0.01}
                value={walletAmount}
                onChange={handleWalletAmountChange}
                placeholder='0.00'
                style={{ flex: 1 }}
              />
              <span style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '12px',
                paddingRight: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '6px',
                border: '1px solid #d0d0d0',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                USD
              </span>
            </div>
          </div>

          {/* Quick Set Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type='button'
              onClick={() => handleSetAmount(balance)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)')}
            >
              Use All
            </button>
            <button
              type='button'
              onClick={() => handleSetAmount(Math.min(balance / 2, maxAmount))}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)')}
            >
              Use Half
            </button>
            <button
              type='button'
              onClick={() => handleSetAmount(0)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
            >
              Don't Use
            </button>
          </div>

          {/* Summary */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#888' }}>From wallet:</span>
              <span style={{ fontWeight: '500' }}>${walletAmount.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              paddingTop: '8px'
            }}>
              <span style={{ color: '#888' }}>Remaining to pay:</span>
              <span style={{ fontWeight: '500', color: '#6366f1' }}>${remainingAfterWallet.toFixed(2)}</span>
            </div>
          </div>

          {remainingAfterWallet === 0 && (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px'
            }}>
              <Typography variant='body2' style={{ color: '#6366f1', textAlign: 'center', fontWeight: '500' }}>
                ✓ Wallet covers full amount
              </Typography>
            </div>
          )}
        </div>
      )}

      {/* Info message when wallet not enabled */}
      {!useWallet && balance > 0 && (
        <div style={{
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
          fontStyle: 'italic',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          paddingTop: '12px'
        }}>
          Enable wallet to use your available balance
        </div>
      )}

      {/* No balance message */}
      {balance === 0 && (
        <div style={{
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
          fontStyle: 'italic',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          paddingTop: '12px'
        }}>
          No wallet balance available
        </div>
      )}
    </div>
  )
}

