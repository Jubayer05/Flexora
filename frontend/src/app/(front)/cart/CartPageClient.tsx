'use client'

import Cookies from 'js-cookie'
import { Minus, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import useAsync from '@/hooks/useAsync'
import { useActiveSubscriptionDiscount } from '@/hooks/useActiveSubscriptionDiscount'
import requests from '@/services/network/http'
import { useCartStore } from '@/stores/cart-store'

export default function CartPageClient() {
  const items = useCartStore((s) => s.items)
  const hydrated = useCartStore((s) => s.hydrated)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const isRemovingFn = useCartStore((s) => s.isRemoving)
  const isRemoving = typeof isRemovingFn === 'function' ? isRemovingFn : () => false
  const subtotal = useCartStore((s) => s.getSubtotal())

  // Prevent double-firing (e.g. React Strict Mode) — one quantity update per product per tick
  const pendingQuantityRef = useRef<Set<number>>(new Set())

  const [couponCode, setCouponCode] = useState('')
  const [discountPreview, setDiscountPreview] = useState<number>(0)
  const [validating, setValidating] = useState(false)

  const token = typeof document !== 'undefined' ? Cookies.get('token') : null
  const { data: profileResponse } = useAsync<{ success?: boolean; data?: { discountPercent?: number; rank?: string } }>(
    () => (token ? '/customer/profile' : null)
  )
  const profileData = profileResponse?.data
  const rankDiscountPercent = Number(profileData?.discountPercent ?? 0)
  const rankDiscountAmount = useMemo(
    () => (rankDiscountPercent > 0 ? Math.round((subtotal * rankDiscountPercent) / 100 * 100) / 100 : 0),
    [subtotal, rankDiscountPercent]
  )
  const {
    activeSubscription,
    subscriptionDiscountPercent,
    subscriptionDiscountAmount,
    subscriptionDurationDays,
    subscriptionRemainingLabel
  } = useActiveSubscriptionDiscount(subtotal)

  const total = useMemo(
    () => Math.max(0, subtotal - subscriptionDiscountAmount - rankDiscountAmount - discountPreview),
    [subtotal, subscriptionDiscountAmount, rankDiscountAmount, discountPreview]
  )

  // Quantity update — instant optimistic, sync to server debounced in store
  const handleQuantityChange = useCallback(
    (productId: number, newQuantity: number, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (pendingQuantityRef.current.has(productId)) return
      pendingQuantityRef.current.add(productId)
      setQuantity(productId, newQuantity)
      queueMicrotask(() => pendingQuantityRef.current.delete(productId))
    },
    [setQuantity]
  )

  // Handle remove with loading state
  const handleRemove = useCallback(
    async (productId: number) => {
      if (isRemoving(productId)) return
      try {
        await removeItem(productId)
        toast.success('Item removed from your cart.')
      } catch {
        toast.error("We couldn't remove that item. Please try again.")
      }
    },
    [removeItem, isRemoving]
  )

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter a coupon code first.')
      return
    }
    if (items.length === 0) {
      toast.error('Your cart is empty. Add a product before applying a coupon.')
      return
    }

    setValidating(true)
    try {
      const isLoggedIn = !!Cookies.get('token')
      const endpoint = isLoggedIn ? '/customer/coupons/validate' : '/coupons/validate'

      const res = await requests.post<{
        success: boolean
        message: string
        data: { isValid: boolean; canApply: boolean; discountAmount?: number; reason?: string }
      }>(endpoint, {
        code: couponCode.toUpperCase(),
        productIds: items.map((i) => i.productId),
        orderAmount: subtotal
      })

      if (!res.success || !res.data.isValid || !res.data.canApply) {
        setDiscountPreview(0)
        toast.error(res.data.reason || res.message || "That coupon can't be applied to this cart.")
        return
      }

      const discount = res.data.discountAmount || 0
      setDiscountPreview(discount)
      toast.success(`Coupon applied. You saved $${discount.toFixed(2)}.`)
    } catch {
      setDiscountPreview(0)
      toast.error("We couldn't check that coupon right now. Please try again.")
    } finally {
      setValidating(false)
    }
  }

  return (
    <Section variant='xl' className='py-4 sm:py-6 md:py-8 overflow-x-hidden'>
      <Container className='min-w-0'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Typography variant='h3' weight='bold' className='text-xl sm:text-2xl md:text-3xl'>
            Cart
          </Typography>
          <div className='flex flex-col min-[480px]:flex-row gap-2 w-full sm:w-auto'>
            <Button variant='outline' asChild className='w-full sm:w-auto'>
              <Link href='/shop'>Continue shopping</Link>
            </Button>
            <Button
              variant='destructive'
              onClick={() => clear().then(() => toast.success('Your cart has been cleared.'))}
              disabled={!hydrated || items.length === 0}
              className='w-full sm:w-auto'
            >
              Clear cart
            </Button>
          </div>
        </div>

        <Separator className='my-4 sm:my-6' />

        {!hydrated ? (
          <Typography variant='body2' className='text-muted-foreground'>
            Loading your cart...
          </Typography>
        ) : items.length === 0 ? (
          <div className='py-12 text-center space-y-3'>
            <Typography variant='h5' weight='semibold'>
              Your cart is empty
            </Typography>
            <Typography variant='body2' className='text-muted-foreground'>
              Add a product when you are ready to place an order.
            </Typography>
            <Button asChild className='mt-2'>
              <Link href='/shop'>Go to shop</Link>
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6'>
            {/* Items */}
            <div className='lg:col-span-8 space-y-3 sm:space-y-4 min-w-0'>
              {items.map((item) => {
                const unit = Number(item.unitPrice) || 0
                const lineTotal = unit * item.quantity
                const minQuantity = Math.max(1, Number(item.minQuantity ?? 1))
                const stockCount = Math.max(0, Number(item.stockCount ?? 0))
                const rawMaxQuantity = Number(item.maxQuantity ?? 0)
                const effectiveMax =
                  rawMaxQuantity === 0
                    ? stockCount
                    : Math.min(rawMaxQuantity > 0 ? rawMaxQuantity : 1000, stockCount)
                return (
                  <Card
                    key={item.productId}
                    className='overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-shadow'
                  >
                    <CardContent className='p-3 sm:p-4'>
                      <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
                        <div className='relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted self-center sm:self-start'>
                          {item.thumbnail ? (
                            <CustomImage
                              src={item.thumbnail}
                              alt={item.name || 'Product'}
                              fill
                              className='object-cover'
                            />
                          ) : (
                            <div className='h-full w-full bg-muted flex items-center justify-center'>
                              <div className='h-8 w-8 rounded bg-muted-foreground/20' />
                            </div>
                          )}
                        </div>

                        <div className='flex-1 min-w-0 flex flex-col'>
                          <div className='flex flex-col min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3'>
                            <div className='min-w-0 flex-1'>
                              <Typography
                                variant='h6'
                                weight='semibold'
                                className='line-clamp-2 mb-1 text-base sm:text-lg'
                              >
                                {item.name || `Product #${item.productId}`}
                              </Typography>
                              <Typography variant='body2' className='text-muted-foreground text-sm'>
                                Unit:{' '}
                                <span className='font-medium text-foreground'>
                                  ${unit.toFixed(2)}
                                </span>
                              </Typography>
                            </div>

                            <div className='text-left min-[480px]:text-right flex-shrink-0'>
                              <Typography
                                variant='body2'
                                className='text-muted-foreground text-xs mb-1'
                              >
                                Subtotal
                              </Typography>
                              <Typography variant='h6' weight='bold' className='text-primary'>
                                ${lineTotal.toFixed(2)}
                              </Typography>
                            </div>
                          </div>

                          <div className='flex flex-wrap items-center gap-2 sm:gap-3 mt-auto'>
                            <div className='flex items-center gap-1 rounded-lg border border-border bg-background p-1'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 hover:bg-muted'
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleQuantityChange(item.productId, item.quantity - 1, e)
                                }}
                                disabled={item.quantity <= minQuantity}
                              >
                                <Minus className='h-4 w-4' />
                              </Button>
                              <div className='min-w-[2.5rem] text-center text-sm font-semibold text-foreground'>
                                {item.quantity}
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 hover:bg-muted'
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleQuantityChange(item.productId, item.quantity + 1, e)
                                }}
                                disabled={item.quantity >= effectiveMax}
                              >
                                <Plus className='h-4 w-4' />
                              </Button>
                            </div>

                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleRemove(item.productId)}
                              disabled={isRemoving(item.productId)}
                              className='text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20'
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              {isRemoving(item.productId) ? 'Removing...' : 'Remove'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Summary */}
            <div className='lg:col-span-4 min-w-0'>
              <Card className='sticky top-2 sm:top-4 border-border bg-card shadow-sm'>
                <CardContent className='p-4 sm:p-5 space-y-4'>
                  <Typography
                    variant='h6'
                    weight='semibold'
                    className='pb-2 border-b border-border'
                  >
                    Summary
                  </Typography>

                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Subtotal</span>
                    <span className='font-semibold text-foreground'>${subtotal.toFixed(2)}</span>
                  </div>

                  {rankDiscountAmount > 0 && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground'>
                        Rank discount{profileData?.rank ? ` (${profileData.rank})` : ''} ({rankDiscountPercent}%)
                      </span>
                      <Typography
                        variant='body2'
                        className='text-green-600 dark:text-green-400 font-semibold'
                      >
                        -${rankDiscountAmount.toFixed(2)}
                      </Typography>
                    </div>
                  )}

                  {subscriptionDiscountAmount > 0 && (
                    <div className='space-y-1 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm'>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='text-primary'>
                          Subscription discount ({subscriptionDiscountPercent}%)
                        </span>
                        <Typography
                          variant='body2'
                          className='text-green-600 dark:text-green-400 font-semibold'
                        >
                          -${subscriptionDiscountAmount.toFixed(2)}
                        </Typography>
                      </div>
                      <Typography variant='caption' className='block text-muted-foreground'>
                        {activeSubscription?.package?.name || 'Subscription'} discount is valid for{' '}
                        {subscriptionDurationDays} days. {subscriptionRemainingLabel}
                      </Typography>
                    </div>
                  )}

                  <div className='space-y-2'>
                    <Typography
                      variant='body2'
                      className='text-muted-foreground text-sm font-medium'
                    >
                      Coupon code
                    </Typography>
                    <div className='flex flex-col min-[480px]:flex-row gap-2'>
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder='Enter coupon code'
                        disabled={validating}
                        className='flex-1 min-w-0'
                      />
                      <Button onClick={handleValidateCoupon} disabled={validating} size='default' className='w-full min-[480px]:w-auto shrink-0'>
                        Apply
                      </Button>
                    </div>
                    {discountPreview > 0 && (
                      <div className='flex items-center justify-between text-sm pt-1'>
                        <span className='text-muted-foreground'>Discount</span>
                        <Typography
                          variant='body2'
                          className='text-green-600 dark:text-green-400 font-semibold'
                        >
                          -${discountPreview.toFixed(2)}
                        </Typography>
                      </div>
                    )}
                  </div>

                  <Separator className='my-4' />

                  <div className='flex items-center justify-between pt-2'>
                    <Typography variant='h6' weight='semibold'>
                      Total
                    </Typography>
                    <Typography variant='h5' weight='bold' className='text-primary'>
                      ${total.toFixed(2)}
                    </Typography>
                  </div>

                  <Button asChild className='w-full mt-4' size='lg'>
                    <Link href='/checkout'>Continue to checkout</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </Section>
  )
}
