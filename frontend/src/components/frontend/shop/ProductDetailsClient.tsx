'use client'

import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import useAsync from '@/hooks/useAsync'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { useCartStore } from '@/stores/cart-store'
import { renderStars } from '@/utils/renderStarts'
import parse from 'html-react-parser'
import { CheckCircle2, Headphones, Package, ShieldCheck, ShoppingCart, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type ProductDetailsClientProps = {
  product: Product
}

type ProductFeedbackResponse = {
  success: boolean
  data: {
    feedbacks: any[]
    pagination?: {
      total: number
    }
  }
}

type ProductFeedbackStatsResponse = {
  success: boolean
  data: {
    total: number
    averageRating: number | string
  }
}

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const isUpdating = useCartStore((s) => s.isUpdating)
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === product.id))
  const [isProcessing, setIsProcessing] = useState(false)

  const [selectedImage, setSelectedImage] = useState<string | null>(
    product.thumbnail || product.images?.[0] || null
  )
  const [quantity, setQuantity] = useState(product.minQuantity || 1)

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0
  const originalPrice =
    product.originalPrice && typeof product.originalPrice === 'string'
      ? parseFloat(product.originalPrice)
      : product.originalPrice || null
  const totalPrice = price * quantity
  const quantitySummary = `${quantity}x ${product.name}`

  const deliveryType = isTelegramTransferProduct(product) ? 'Manual' : 'Instant'

  const allImages = useMemo(() => {
    return [
      ...(product.thumbnail ? [product.thumbnail] : []),
      ...(product.images || []).filter((img) => img !== product.thumbnail)
    ]
  }, [product.thumbnail, product.images])

  // Check if product is a Premium subscription
  const isPremiumProduct =
    product.type && ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(product.type)
  const isInStock = Boolean(isPremiumProduct) || (product.stockCount || 0) > 0

  const isTelegramTransfer = isTelegramTransferProduct(product)
  const isTelegramAccount =
    product.platform === 'TELEGRAM' && !isTelegramTransfer && !isPremiumProduct
  // Determine default button text: "Transfer Now" for Telegram Groups/Channels, "Buy Now" for others
  const defaultButtonText = isTelegramTransfer
    ? 'Transfer Now'
    : isPremiumProduct
      ? 'Get Premium'
      : 'Buy Now'
  const buttonText = product.btnText || defaultButtonText

  const handleOrderNow = () => {
    if (!isInStock) return

    const qty = quantity || 1

    // Premium products go to premium checkout
    if (isPremiumProduct) return router.push(`/checkout/premium?id=${product.id}&qty=${qty}`)

    if (isTelegramTransfer)
      return router.push(`/checkout/telegram/transfer?id=${product.id}&qty=${qty}`)
    if (isTelegramAccount)
      return router.push(`/checkout/telegram/account?id=${product.id}&qty=${qty}`)

    router.push(`/checkout/accounts?id=${product.id}&qty=${qty}`)
  }

  const handleAddToCart = async () => {
    if (isProcessing || isUpdating(product.id)) return

    setIsProcessing(true)
    try {
      await addItem(product, quantity || 1)
      toast.success('Added to cart', {
        description: `${quantity}x ${product.name} - Total: $${totalPrice.toFixed(2)}`
      })
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFromCart = async () => {
    if (isProcessing || isUpdating(product.id)) return

    setIsProcessing(true)
    try {
      await removeItem(product.id)
      toast.success('Removed from cart')
    } catch {
      toast.error('Failed to remove from cart')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuantityChange = (delta: number) => {
    const minQ = product.minQuantity || 1
    const stockCount = product.stockCount || 0
    const rawMaxQ = Number(product.maxQuantity ?? 0)
    const next = quantity + delta
    const maxQ = isPremiumProduct ? 1000 : rawMaxQ === 0 ? Infinity : rawMaxQ || 1000
    const effectiveMax = isPremiumProduct
      ? maxQ
      : maxQ === Infinity
        ? stockCount
        : Math.min(maxQ, stockCount)
    if (next >= minQ && next <= effectiveMax) setQuantity(next)
  }

  const handleQuantityInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '')
    const minQ = product.minQuantity || 1

    if (!numericValue) {
      setQuantity(minQ)
      return
    }

    const next = Number(numericValue)
    const clampedQuantity = Math.min(Math.max(next, minQ), remainingQuantity)
    setQuantity(clampedQuantity)
  }

  // Calculate remaining quantity
  const remainingQuantity = useMemo(() => {
    const stockCount = product.stockCount || 0
    const rawMaxQ = Number(product.maxQuantity ?? 0)
    const maxQ = isPremiumProduct ? 1000 : rawMaxQ === 0 ? Infinity : rawMaxQ || 1000
    if (isPremiumProduct) return maxQ
    if (maxQ === Infinity) return stockCount
    return Math.min(maxQ, stockCount)
  }, [isPremiumProduct, product.stockCount, product.maxQuantity])

  const rawTags: unknown = (product as any).tags
  const tagsArray: string[] = Array.isArray(rawTags)
    ? rawTags.filter((t): t is string => typeof t === 'string')
    : typeof rawTags === 'string'
      ? rawTags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : []
  const averageRating = Number((product as any).reviewStats?.averageRating ?? 0)
  const reviewCount = Number((product as any).reviewStats?.reviewCount ?? 0)
  const initialFeedbacks = Array.isArray((product as any).feedbacks)
    ? ((product as any).feedbacks as any[])
    : []
  const { data: liveFeedbackData } = useAsync<ProductFeedbackResponse>(
    product.id ? `/feedbacks/product/${product.id}?page=1&limit=50` : null,
    false,
    true,
    true,
    10000
  )
  const { data: liveStatsData } = useAsync<ProductFeedbackStatsResponse>(
    product.id ? `/feedbacks/statistics?productId=${product.id}` : null,
    false,
    true,
    true,
    10000
  )
  const feedbacks = liveFeedbackData?.data?.feedbacks ?? initialFeedbacks
  const liveReviewCount = Number(
    liveStatsData?.data?.total ?? liveFeedbackData?.data?.pagination?.total ?? reviewCount
  )
  const liveAverageRating = Number(liveStatsData?.data?.averageRating ?? averageRating)

  return (
    <Section variant='xl' className='py-4 sm:py-6 md:py-8 overflow-x-hidden'>
      <Container className='min-w-0'>
        {/* Breadcrumb */}
        <div className='mb-3 sm:mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground min-w-0'>
          <Link href='/shop' className='hover:text-card-foreground transition-colors shrink-0'>
            Shop
          </Link>
          <span className='shrink-0'>/</span>
          {product.category && (
            <>
              <Link
                href='/shop'
                className='hover:text-card-foreground transition-colors truncate min-w-0 max-w-[120px] sm:max-w-none'
              >
                {product.category.name}
              </Link>
              <span className='shrink-0'>/</span>
            </>
          )}
          <span className='text-card-foreground truncate min-w-0' title={product.name}>
            {product.name}
          </span>
        </div>

        {/* Sticky top buy bar (professional package feel) */}
        <div className='sticky top-0 z-30 -mx-3 sm:-mx-4 mb-4 sm:mb-6 border-b bg-background/85 backdrop-blur px-3 py-2 sm:px-4 sm:py-3'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between min-w-0'>
            <div className='min-w-0'>
              <Typography variant='h5' as='h4' weight='bold' className='line-clamp-2 text-base'>
                {product.name}
              </Typography>
              <div className='mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2'>
                <Badge variant={isInStock ? 'secondary' : 'destructive'} className='text-xs'>
                  {isInStock
                    ? `In Stock${remainingQuantity !== Infinity ? ` (${remainingQuantity} available)` : ' (Unlimited)'}`
                    : 'Out of Stock'}
                </Badge>
                <Badge variant='secondary' className='text-xs'>
                  {liveReviewCount > 0 ? (
                    <span className='flex items-center gap-1.5'>
                      {renderStars(liveAverageRating, 14)}
                      <span>
                        {liveAverageRating.toFixed(1)} ({liveReviewCount})
                      </span>
                    </span>
                  ) : (
                    'No reviews yet'
                  )}
                </Badge>
                <Badge variant='secondary' className='text-xs'>
                  <Truck className='mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5' />
                  {deliveryType}
                </Badge>
                {product.category && (
                  <Badge variant='secondary' className='text-xs'>
                    {product.category.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className='flex flex-col gap-2 lg:items-end min-w-0'>
              <div className='flex items-baseline gap-2 sm:gap-3'>
                <Typography
                  variant='h3'
                  as='span'
                  weight='bold'
                  className='text-primary text-xl sm:text-2xl'
                >
                  ${price.toFixed(2)}
                </Typography>
                {originalPrice && originalPrice > price && (
                  <Typography
                    variant='body2'
                    as='span'
                    className='line-through text-muted-foreground text-sm'
                  >
                    ${originalPrice.toFixed(2)}
                  </Typography>
                )}
              </div>
              <div className='text-xs sm:text-sm text-muted-foreground text-left lg:text-right max-w-full lg:max-w-[26rem]'>
                <div title={quantitySummary}>{quantitySummary}</div>
                <div className='font-semibold text-card-foreground'>
                  Cost: ${totalPrice.toFixed(2)}
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2 w-full lg:w-auto'>
                <div className='flex items-center gap-0.5 sm:gap-1 rounded-lg border p-0.5 sm:p-1 shrink-0'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 sm:h-9 sm:w-9'
                    onClick={() => handleQuantityChange(-1)}
                    disabled={!isInStock || quantity <= (product.minQuantity || 1)}
                  >
                    -
                  </Button>
                  <input
                    className='h-8 w-12 bg-transparent text-center text-sm font-semibold outline-none sm:h-9 sm:w-14 focus:bg-primary/10'
                    inputMode='numeric'
                    pattern='[0-9]*'
                    value={quantity}
                    onChange={(e) => handleQuantityInput(e.target.value)}
                    aria-label={`Quantity for ${product.name}`}
                    disabled={!isInStock || isProcessing}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 sm:h-9 sm:w-9'
                    onClick={() => handleQuantityChange(1)}
                    disabled={!isInStock || quantity >= remainingQuantity}
                  >
                    +
                  </Button>
                </div>

                <Button
                  type='button'
                  onClick={handleOrderNow}
                  disabled={!isInStock}
                  className='flex-1 min-w-0 sm:flex-none sm:min-w-[7rem] lg:min-w-44 shrink-0'
                >
                  <ShoppingCart className='mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5 shrink-0' />
                  <span>{isInStock ? buttonText : 'Out of Stock'}</span>
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={inCart ? handleRemoveFromCart : handleAddToCart}
                  disabled={!isInStock || isProcessing || isUpdating(product.id)}
                  className='flex-1 min-w-0 sm:flex-none sm:min-w-[6rem] lg:min-w-32 shrink-0'
                >
                  <span>
                    {isProcessing || isUpdating(product.id)
                      ? inCart
                        ? 'Removing...'
                        : 'Adding...'
                      : inCart
                        ? 'Remove from cart'
                        : 'Add to cart'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className='grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-12 min-w-0'>
          {/* Gallery */}
          <div className='lg:col-span-7 space-y-3 sm:space-y-4 min-w-0'>
            <Card className='overflow-hidden rounded-lg sm:rounded-xl'>
              <CardContent className='p-0'>
                <div className='relative aspect-square w-full bg-muted'>
                  {selectedImage ? (
                    <CustomImage
                      src={selectedImage}
                      alt={product.name}
                      fill
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center'>
                      <Package className='h-16 w-16 text-muted-foreground' />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {allImages.length > 1 && (
              <div className='flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4 md:grid-cols-6 sm:overflow-visible'>
                {allImages.slice(0, 12).map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type='button'
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square w-16 h-16 sm:w-full min-w-[4rem] sm:min-w-0 overflow-hidden rounded-lg border-2 transition-all shrink-0 ${
                      selectedImage === img
                        ? 'border-primary'
                        : 'border-muted hover:border-primary/60'
                    }`}
                    aria-label={`Select image ${idx + 1}`}
                  >
                    <CustomImage
                      src={img}
                      alt={`${product.name} - ${idx + 1}`}
                      fill
                      className='object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right column: trust + specs */}
          <div className='lg:col-span-5 space-y-3 sm:space-y-4 min-w-0'>
            <Card className='rounded-lg sm:rounded-xl'>
              <CardHeader className='pb-2 px-3 sm:px-6 pt-3 sm:pt-6'>
                <CardTitle className='text-base sm:text-lg'>Why buy from us</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm text-muted-foreground px-3 sm:px-6 pb-3 sm:pb-6'>
                <div className='flex items-start gap-2'>
                  <ShieldCheck className='mt-0.5 h-4 w-4 text-primary' />
                  <span>Secure checkout and protected delivery flow.</span>
                </div>
                <div className='flex items-start gap-2'>
                  <CheckCircle2 className='mt-0.5 h-4 w-4 text-green-600' />
                  <span>Verified packages. If an issue occurs, we assist as per policy.</span>
                </div>
                <div className='flex items-start gap-2'>
                  <Headphones className='mt-0.5 h-4 w-4 text-primary' />
                  <span>Responsive support available after purchase.</span>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-lg sm:rounded-xl'>
              <CardHeader className='pb-2 px-3 sm:px-6 pt-3 sm:pt-6'>
                <CardTitle className='text-base sm:text-lg'>Quick specs</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 px-3 sm:px-6 pb-3 sm:pb-6'>
                <div className='grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm'>
                  <div className='rounded-lg bg-muted/50 p-2 sm:p-3'>
                    <div className='text-muted-foreground text-xs'>Platform</div>
                    <div className='font-medium truncate' title={String(product.platform || 'N/A')}>
                      {product.platform || 'N/A'}
                    </div>
                  </div>
                  <div className='rounded-lg bg-muted/50 p-2 sm:p-3'>
                    <div className='text-muted-foreground text-xs'>SKU</div>
                    <div className='break-all font-mono text-xs font-medium'>{product.sku}</div>
                  </div>
                  <div className='rounded-lg bg-muted/50 p-2 sm:p-3'>
                    <div className='text-muted-foreground text-xs'>Delivery</div>
                    <div className='font-medium'>{deliveryType}</div>
                  </div>
                </div>

                <Separator />

                <Accordion type='single' collapsible defaultValue='desc'>
                  <AccordionItem value='desc'>
                    <AccordionTrigger>Description</AccordionTrigger>
                    <AccordionContent>
                      {product.description ? (
                        <div className='prose prose-sm max-w-none text-muted-foreground'>
                          {parse(product.description)}
                        </div>
                      ) : (
                        <div className='text-sm text-muted-foreground'>
                          No description provided.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='policy'>
                    <AccordionTrigger>Refund / Replacement Policy</AccordionTrigger>
                    <AccordionContent>
                      <div className='text-sm text-muted-foreground'>
                        {product.meta?.policy ? (
                          parse(product.meta.policy)
                        ) : (
                          <div className='space-y-2'>
                            <p>Using site default policy.</p>
                            <Link
                              href='/pages/return-policy'
                              className='text-primary hover:underline'
                            >
                              View full return policy →
                            </Link>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  {product.meta?.moreInformation && (
                    <AccordionItem value='moreInfo'>
                      <AccordionTrigger>More Information</AccordionTrigger>
                      <AccordionContent>
                        <div className='prose prose-sm max-w-none text-muted-foreground'>
                          {parse(product.meta.moreInformation)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>

            {tagsArray.length > 0 && (
              <Card className='rounded-lg sm:rounded-xl'>
                <CardHeader className='pb-2 px-3 sm:px-6 pt-3 sm:pt-6'>
                  <CardTitle className='text-base sm:text-lg'>Tags</CardTitle>
                </CardHeader>
                <CardContent className='flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-6 pb-3 sm:pb-6'>
                  {tagsArray.map((tag: string, idx: number) => (
                    <Badge key={`${tag}-${idx}`}>{tag}</Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className='rounded-lg sm:rounded-xl'>
              <CardHeader className='pb-2 px-3 sm:px-6 pt-3 sm:pt-6'>
                <CardTitle className='text-base sm:text-lg'>Product Reviews</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4 px-3 sm:px-6 pb-3 sm:pb-6'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-center gap-3'>
                    {renderStars(liveAverageRating, 18)}
                    <span className='font-medium text-card-foreground'>
                      {liveReviewCount > 0
                        ? `${liveAverageRating.toFixed(1)} / 5`
                        : 'No ratings yet'}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {liveReviewCount} review{liveReviewCount === 1 ? '' : 's'}
                  </p>
                </div>

                {feedbacks.length > 0 ? (
                  <div className='space-y-4'>
                    {feedbacks.map((feedback: any) => (
                      <div
                        key={feedback.id}
                        className='rounded-lg border border-border bg-muted/30 p-4'
                      >
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                          <div>
                            <p className='font-medium text-card-foreground'>{feedback.name}</p>
                            <p className='text-xs text-muted-foreground'>
                              {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>{renderStars(Number(feedback.rating || 0), 16)}</div>
                        </div>
                        <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                          {feedback.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
                    No product reviews have been published for this item yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Optional: Mobile bottom bar (common professional UX) */}
        <div className='fixed bottom-0 left-0 right-0 z-40 border-t bg-background/90 backdrop-blur px-3 py-2.5 sm:p-3 lg:hidden'>
          <div className='flex items-center justify-between gap-2 sm:gap-3 min-w-0'>
            <div className='min-w-0 flex-1'>
              <div
                className='text-xs sm:text-sm font-semibold line-clamp-1 truncate'
                title={quantitySummary}
              >
                {quantitySummary}
              </div>
              <div className='text-[11px] sm:text-xs text-muted-foreground'>
                Unit: ${price.toFixed(2)}
              </div>
              <div className='text-xs sm:text-sm text-primary font-bold'>
                Cost: ${totalPrice.toFixed(2)}
              </div>
            </div>
            <div className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
              <Button
                onClick={inCart ? handleRemoveFromCart : handleAddToCart}
                disabled={!isInStock || isProcessing || isUpdating(product.id)}
                variant='outline'
                type='button'
                size='sm'
                className='min-w-[4rem] sm:min-w-[5rem]'
              >
                {isProcessing || isUpdating(product.id)
                  ? inCart
                    ? '...'
                    : '...'
                  : inCart
                    ? 'Remove'
                    : 'Add'}
              </Button>
              {isInStock ? (
                <Button
                  onClick={handleOrderNow}
                  className='min-w-[4.5rem] sm:min-w-28'
                  type='button'
                  size='sm'
                >
                  <ShoppingCart className='mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5' />
                  Buy
                </Button>
              ) : (
                <Badge
                  variant='secondary'
                  className='min-w-20 sm:min-w-28 justify-center py-2 font-medium text-xs sm:text-sm'
                >
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* spacing so mobile bottom bar doesn't cover content */}
        <div className='h-16 sm:h-14 lg:hidden' />
      </Container>
    </Section>
  )
}

// 'use client'

// import { Container } from '@/components/common/container'
// import { Section } from '@/components/common/section'
// import { Typography } from '@/components/common/typography'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import CustomImage from '@/components/common/CustomImage'
// import { getImgUrl } from '@/lib/get-image-url'
// import { ArrowLeft, Check, Package, ShoppingCart, Truck } from 'lucide-react'
// import Link from 'next/link'
// import { useRouter } from 'next/navigation'
// import { useState } from 'react'
// import parse from 'html-react-parser'

// type ProductDetailsClientProps = {
//   product: Product
// }

// export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
//   const router = useRouter()
//   const [selectedImage, setSelectedImage] = useState<string | null>(
//     product.thumbnail || product.images?.[0] || null
//   )
//   const [quantity, setQuantity] = useState(product.minQuantity || 1)

//   // Calculate price
//   const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0
//   const originalPrice =
//     product.originalPrice && typeof product.originalPrice === 'string'
//       ? parseFloat(product.originalPrice)
//       : product.originalPrice || null
//   const discount = originalPrice && originalPrice > price ? originalPrice - price : 0

//   // Check product type for checkout routing
//   const isTelegramTransfer = product.platform === 'TELEGRAM' && product.type === 'SERVICE'
//   const isTelegramAccount = product.platform === 'TELEGRAM' && product.type !== 'SERVICE'

//   const handleOrderNow = () => {
//     if (isTelegramTransfer) {
//       router.push(`/checkout/telegram/transfer?id=${product.id}`)
//       return
//     }

//     if (isTelegramAccount) {
//       router.push(`/checkout/telegram/account?id=${product.id}`)
//       return
//     }

//     // Default checkout for other products
//     router.push(`/checkout/accounts?id=${product.id}`)
//   }

//   const handleQuantityChange = (delta: number) => {
//     const newQuantity = quantity + delta
//     if (newQuantity >= (product.minQuantity || 1) && newQuantity <= (product.maxQuantity || 1000)) {
//       setQuantity(newQuantity)
//     }
//   }

//   const isInStock = product.stockCount > 0
//   const deliveryType = product.type === 'SERVICE' ? 'Manual' : 'Instant'

//   // Get all images (thumbnail + images array)
//   const allImages = [
//     ...(product.thumbnail ? [product.thumbnail] : []),
//     ...(product.images || []).filter((img) => img !== product.thumbnail)
//   ]

//   // console.log("product", product);
//   return (
//     <Section variant='xl' className='py-8'>
//       <Container>
//         {/* Breadcrumb */}
//         <div className='mb-6 flex items-center gap-2 text-sm text-muted-foreground'>
//           <Link href='/shop' className='hover:text-card-foreground transition-colors'>
//             Shop
//           </Link>
//           <span>/</span>
//           {product.category && (
//             <>
//               <Link
//                 href={`/shop?category=${product.category.id}`}
//                 className='hover:text-card-foreground transition-colors'
//               >
//                 {product.category.name}
//               </Link>
//               <span>/</span>
//             </>
//           )}
//           <span className='text-card-foreground'>{product.name}</span>
//         </div>

//         <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
//           {/* Left Column - Images */}
//           <div className='space-y-4'>
//             {/* Main Image */}
//             <div className='relative aspect-square w-full rounded-lg overflow-hidden bg-muted border'>
//               {selectedImage ? (
//                 <CustomImage
//                   src={selectedImage}
//                   alt={product.name}
//                   fill
//                   className='object-cover'
//                 />
//               ) : (
//                 <div className='flex items-center justify-center w-full h-full bg-muted'>
//                   <Package className='w-16 h-16 text-muted-foreground' />
//                 </div>
//               )}
//             </div>

//             {/* Image Gallery */}
//             {allImages.length > 1 && (
//               <div className='flex gap-2 overflow-x-auto'>
//                 {allImages.map((image, index) => (
//                   <button
//                     key={index}
//                     onClick={() => setSelectedImage(image)}
//                     className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === image
//                         ? 'border-primary ring-2 ring-primary/20'
//                         : 'border-muted hover:border-primary/50'
//                       }`}
//                   >
//                     <CustomImage
//                       src={image}
//                       alt={`${product.name} - ${index + 1}`}
//                       fill
//                       className='object-cover'
//                     />
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Right Column - Product Info */}
//           <div className='space-y-6'>
//             {/* Title and Badges */}
//             <div className='space-y-4'>
//               <div>
//                 <Typography variant='h1' as='h1' weight='bold' className='mb-2'>
//                   {product.name}
//                 </Typography>
//                 {product.category && (
//                   <Link href={`/shop?category=${product.category.id}`}>
//                     <Badge variant='secondary' className='mb-2'>
//                       {product.category.name}
//                     </Badge>
//                   </Link>
//                 )}
//               </div>

//               {/* Price */}
//               <div className='flex items-baseline gap-3'>
//                 <Typography variant='h2' as='span' weight='bold' className='text-primary'>
//                   ${price.toFixed(2)}
//                 </Typography>
//                 {originalPrice && originalPrice > price && (
//                   <>
//                     <Typography
//                       variant='body1'
//                       as='span'
//                       className='line-through text-muted-foreground'
//                     >
//                       ${originalPrice.toFixed(2)}
//                     </Typography>
//                     {discount > 0 && (
//                       <Badge variant='destructive' className='ml-2'>
//                         Save ${discount.toFixed(2)}
//                       </Badge>
//                     )}
//                   </>
//                 )}
//               </div>

//               {/* Stock Status */}
//               <div className='flex items-center gap-2'>
//                 {isInStock ? (
//                   <>
//                     <Check className='w-5 h-5 text-green-500' />
//                     <Typography variant='body1' className='text-green-500 font-medium'>
//                       In Stock ({product.stockCount} available)
//                     </Typography>
//                   </>
//                 ) : (
//                   <>
//                     <Package className='w-5 h-5 text-red-500' />
//                     <Typography variant='body1' className='text-red-500 font-medium'>
//                       Out of Stock
//                     </Typography>
//                   </>
//                 )}
//               </div>
//             </div>

//             {/* Description */}
//             {product.description && (
//               <div className='space-y-2'>
//                 <Typography variant='h4' as='h2' weight='semibold'>
//                   Description
//                 </Typography>
//                 <div className='prose prose-sm max-w-none text-muted-foreground'>
//                   {parse(product.description)}
//                 </div>
//               </div>
//             )}

//             {/* Product Details */}
//             <div className='grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg'>
//               <div>
//                 <Typography variant='body2' className='text-muted-foreground mb-1'>
//                   Delivery Type
//                 </Typography>
//                 <Typography variant='body1' weight='medium'>
//                   {deliveryType}
//                 </Typography>
//               </div>
//               <div>
//                 <Typography variant='body2' className='text-muted-foreground mb-1'>
//                   Platform
//                 </Typography>
//                 <Typography variant='body1' weight='medium'>
//                   {product.platform || 'N/A'}
//                 </Typography>
//               </div>
//               <div>
//                 <Typography variant='body2' className='text-muted-foreground mb-1'>
//                   Type
//                 </Typography>
//                 <Typography variant='body1' weight='medium'>
//                   {product.type || 'N/A'}
//                 </Typography>
//               </div>
//               <div>
//                 <Typography variant='body2' className='text-muted-foreground mb-1'>
//                   SKU
//                 </Typography>
//                 <Typography variant='body1' weight='medium' className='font-mono text-sm'>
//                   {product.sku}
//                 </Typography>
//               </div>
//             </div>

//             {/* Quantity Selector */}
//             {isInStock && (
//               <div className='space-y-2'>
//                 <Typography variant='body1' weight='medium'>
//                   Quantity
//                 </Typography>
//                 <div className='flex items-center gap-4'>
//                   <div className='flex items-center gap-2 border rounded-lg'>
//                     <Button
//                       variant='ghost'
//                       size='icon'
//                       onClick={() => handleQuantityChange(-1)}
//                       disabled={quantity <= (product.minQuantity || 1)}
//                     >
//                       -
//                     </Button>
//                     <Typography variant='body1' weight='semibold' className='min-w-[3rem] text-center'>
//                       {quantity}
//                     </Typography>
//                     <Button
//                       variant='ghost'
//                       size='icon'
//                       onClick={() => handleQuantityChange(1)}
//                       disabled={quantity >= (product.maxQuantity || 1000)}
//                     >
//                       +
//                     </Button>
//                   </div>
//                   <Typography variant='body2' className='text-muted-foreground'>
//                     (Min: {product.minQuantity || 1}, Max: {product.maxQuantity || 1000})
//                   </Typography>
//                 </div>
//               </div>
//             )}

//             {/* Order Button */}
//             <div className='space-y-2'>
//               <Button
//                 size='lg'
//                 className='w-full'
//                 onClick={handleOrderNow}
//                 disabled={!isInStock}
//               >
//                 <ShoppingCart className='w-5 h-5 mr-2' />
//                 {isInStock ? 'Order Now' : 'Out of Stock'}
//               </Button>
//               {!isInStock && (
//                 <Typography variant='body2' className='text-center text-muted-foreground'>
//                   This product is currently out of stock. Please check back later.
//                 </Typography>
//               )}
//             </div>

//             {/* More Info Section */}
//             {product.meta && (
//               <div className='space-y-4 pt-6 border-t'>
//                 <Typography variant='h4' as='h2' weight='semibold'>
//                   More Information
//                 </Typography>

//                 {product.meta.policy && (
//                   <div>
//                     <Typography variant='body1' weight='medium' className='mb-2'>
//                       Return Policy
//                     </Typography>
//                     <Typography variant='body2' className='text-muted-foreground'>
//                       {product.meta.policy}
//                     </Typography>
//                   </div>
//                 )}

//                 {product.tags && product.tags.length > 0 && (
//                   <div>
//                     <Typography variant='body1' weight='medium' className='mb-2'>
//                       Tags
//                     </Typography>
//                     <div className='flex flex-wrap gap-2'>
//                       {product.tags.map((tag, index) => (
//                         <Badge key={index} variant='outline'>
//                           {tag}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Related Products Section - Can be added later */}
//         {/* {relatedProducts && relatedProducts.length > 0 && (
//           <div className='mt-16'>
//             <Typography variant='h2' as='h2' weight='semibold' className='mb-6'>
//               Related Products
//             </Typography>
//             <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
//               {relatedProducts.map((relatedProduct) => (
//                 <ProductCard key={relatedProduct.id} product={relatedProduct} />
//               ))}
//             </div>
//           </div>
//         )} */}
//       </Container>
//     </Section>
//   )
// }
