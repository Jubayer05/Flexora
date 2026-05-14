'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { Check, Loader2, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Typography } from '../common/typography'

interface CouponInputProps {
  productId: number
  orderAmount: number
  onCouponApplied: (discount: number, couponCode: string, couponData?: any) => void
  onCouponRemoved: () => void
  disabled?: boolean
}

export default function CouponInput({
  productId,
  orderAmount,
  onCouponApplied,
  onCouponRemoved,
  disabled = false
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    data?: any
  } | null>(null)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    setIsValidating(true)
    try {
      const isLoggedIn = !!Cookies.get('token')
      const endpoint = isLoggedIn ? '/customer/coupons/validate' : '/coupons/validate'
      const response = await requests.post<{
        success: boolean
        message: string
        data: {
          isValid: boolean
          coupon?: any
          discountAmount?: number
          reason?: string
          canApply: boolean
        }
      }>(endpoint, {
        code: couponCode.toUpperCase(),
        productIds: [productId],
        orderAmount
      })

      if (!response.success || !response.data.isValid || !response.data.canApply) {
        toast.error(response.data.reason || response.message || 'Invalid coupon code')
        return
      }

      const discount = response.data.discountAmount || 0
      const applied = {
        code: couponCode.toUpperCase(),
        discount,
        data: response.data.coupon
      }

      setAppliedCoupon(applied)
      onCouponApplied(discount, applied.code, applied.data)
      toast.success(`Coupon applied! You saved $${discount.toFixed(2)}`)
    } catch (error) {
      showError(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    onCouponRemoved()
    toast.info('Coupon removed')
  }

  if (appliedCoupon) {
    return (
      <div className='space-y-3 bg-primary/10 p-4 border border-primary/30 rounded-lg'>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <Check className='w-5 h-5 text-primary' />
            <div>
              <Typography variant='body2' weight='semibold' className='text-primary'>
                Coupon Applied: {appliedCoupon.code}
              </Typography>
              <Typography variant='caption' className='text-muted-foreground'>
                You saved ${appliedCoupon.discount.toFixed(2)}
              </Typography>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleRemoveCoupon}
            disabled={disabled}
            className='hover:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400'
          >
            <X className='w-4 h-4' />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-3 bg-card text-card-foreground p-4 border border-border rounded-lg'>
      <div className='flex items-center gap-2'>
        <Tag className='w-5 h-5 text-primary' />
        <Typography variant='h6' weight='semibold'>
          Have a Coupon Code?
        </Typography>
      </div>

      <div className='flex gap-2'>
        <div className='flex-1'>
          <Input
            placeholder='Enter coupon code'
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleApplyCoupon()
              }
            }}
            disabled={disabled || isValidating}
            className='uppercase'
          />
        </div>
        <Button
          type='button'
          onClick={handleApplyCoupon}
          disabled={disabled || isValidating || !couponCode.trim()}
          className='shrink-0'
        >
          {isValidating ? (
            <>
              <Loader2 className='mr-2 w-4 h-4 animate-spin' />
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </Button>
      </div>

      <Typography variant='caption' className='text-muted-foreground'>
        Enter your coupon code to get a discount on your order
      </Typography>
    </div>
  )
}
