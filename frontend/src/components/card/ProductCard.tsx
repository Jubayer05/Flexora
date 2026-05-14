import CustomImage from '@/components/common/CustomImage'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { renderStars } from '@/utils/renderStarts'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Minus, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

// Keep cva only for layout spacing — visual styling is handled via inline styles
const productCardVariants = cva(
  'group cursor-pointer rounded-xl overflow-hidden transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'space-y-4',
        compact: 'space-y-2'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

const contentVariants = cva('', {
  variants: {
    variant: {
      default: 'space-y-4',
      compact: 'space-y-2'
    }
  },
  defaultVariants: { variant: 'default' }
})

type TProps = {
  product: Product
} & VariantProps<typeof productCardVariants>

export default function ProductCard({ product, variant = 'default' }: TProps) {
  const { push } = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const isUpdating = useCartStore((s) => s.isUpdating)
  const inCart = useCartStore((s) => s.items.some((i) => i.productId === product.id))
  const [isProcessing, setIsProcessing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const minQuantity = (product as any).minQuantity || 1
  const stockCount = product.stockCount || 0
  const isPremiumProduct =
    product.type && ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(product.type)
  const rawMaxQuantity = Number((product as any).maxQuantity ?? 0)
  const maxQuantity =
    isPremiumProduct
      ? 1000
      : rawMaxQuantity === 0
      ? Infinity
      : rawMaxQuantity || 1000
  const effectiveMax = useMemo(() => {
    if (isPremiumProduct) return 1000
    if (maxQuantity === Infinity) return stockCount
    return Math.min(maxQuantity, stockCount)
  }, [isPremiumProduct, maxQuantity, stockCount])

  const [quantity, setQuantity] = useState(minQuantity)

  const price = parseFloat(product.price as unknown as string)
  const originalPrice = product.originalPrice
    ? parseFloat(product.originalPrice as unknown as string)
    : null
  const hasDiscount =
    typeof originalPrice === 'number' &&
    Number.isFinite(originalPrice) &&
    Number.isFinite(price) &&
    originalPrice > price
  const averageRating = Number((product as any).reviewStats?.averageRating || 0)
  const reviewCount = Number((product as any).reviewStats?.reviewCount || 0)
  const btnText = (product as any)?.btnText
  const defaultButtonText = 'Order Now'

  const isTelegramTransfer = isTelegramTransferProduct(product)
  const isTelegramAccount =
    product.platform === 'TELEGRAM' && !isTelegramTransfer && !isPremiumProduct
  const isInStock = isPremiumProduct || (product.stockCount || 0) > 0

  const handleProductClick = () => {
    if (product.slug) push(`/product/${product.slug}`)
    else push(`/product/${product.id}`)
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= minQuantity && newQuantity <= effectiveMax) setQuantity(newQuantity)
  }

  const handleQuantityInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '')
    if (!numericValue) {
      setQuantity(minQuantity)
      return
    }

    const nextQuantity = Number(numericValue)
    const clampedQuantity = Math.min(Math.max(nextQuantity, minQuantity), effectiveMax)
    setQuantity(clampedQuantity)
  }

  const totalPrice = price * quantity

  const handleOrderNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isInStock) return
    const qty = quantity
    if (isPremiumProduct) {
      push(`/checkout/premium?id=${product.id}&qty=${qty}`)
      return
    }
    if (isTelegramTransfer) {
      push(`/checkout/telegram/transfer?id=${product.id}&qty=${qty}`)
      return
    }
    if (isTelegramAccount) {
      push(`/checkout/telegram/account?id=${product.id}&qty=${qty}`)
      return
    }
    push(`/checkout/accounts?id=${product.id}&qty=${qty}`)
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isInStock || isProcessing || isUpdating(product.id)) return
    setIsProcessing(true)
    try {
      await addItem(product, quantity)
      toast.success('Added to cart', {
        description: `${quantity}x ${product.name} - Total: $${totalPrice.toFixed(2)}`
      })
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFromCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const isCompact = variant === 'compact'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .pc-root { font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif; }

        .pc-card {
          position: relative;
          background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 100%);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.09);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform 0.20s ease, box-shadow 0.20s ease, border-color 0.20s ease;
        }
        .pc-card:hover {
          transform: translateY(-2px);
          border-color: rgba(129,140,248,0.30);
          box-shadow: 0 16px 48px rgba(0,0,0,0.36), 0 0 0 1px rgba(129,140,248,0.15), inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .pc-card::after {
          content: '';
          position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(129,140,248,0.38) 0%, rgba(167,139,250,0.18) 40%, transparent 65%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none;
          opacity: 0; transition: opacity 0.20s;
        }
        .pc-card:hover::after { opacity: 1; }

        /* ── Image container ── */
        .pc-img-wrap {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          overflow: hidden;
        }
        .pc-img-wrap-default { width: 64px; height: 64px; }
        .pc-img-wrap-compact { width: 88px; height: 88px; }

        /* ── Type badge ── */
        .pc-type-badge {
          display: inline-flex; align-items: center;
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.03em;
          color: rgba(190,190,215,0.65);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
        }

        /* ── Stock indicator ── */
        .pc-stock {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 500;
          color: rgba(180,180,210,0.50);
        }
        .pc-stock-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
        }
        .pc-stock-dot-in { background: #34d399; box-shadow: 0 0 6px rgba(52,211,153,0.55); }
        .pc-stock-dot-out { background: rgba(239,68,68,0.70); }

        /* ── Price ── */
        .pc-price {
          font-size: 15px; font-weight: 700;
          background: linear-gradient(90deg, #818cf8, #a78bfa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
        }
        .pc-price-original {
          font-size: 12px; font-weight: 400;
          color: rgba(180,180,210,0.40);
          text-decoration: line-through;
        }

        /* ── Quantity control ── */
        .pc-qty-wrap {
          display: flex; align-items: center; gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 10px;
          overflow: hidden;
        }
        .pc-qty-btn {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px;
          background: transparent;
          border: none; cursor: pointer;
          color: rgba(200,200,230,0.60);
          transition: background 0.14s, color 0.14s;
        }
        .pc-qty-btn:hover:not(:disabled) {
          background: rgba(129,140,248,0.12);
          color: #a78bfa;
        }
        .pc-qty-btn:disabled { opacity: 0.30; cursor: not-allowed; }
        .pc-qty-val {
          width: 40px;
          min-width: 40px;
          height: 30px;
          text-align: center;
          font-size: 13px; font-weight: 600;
          color: rgba(220,220,245,0.90);
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          border-left: 1px solid rgba(255,255,255,0.07);
          border-right: 1px solid rgba(255,255,255,0.07);
          border-top: 0;
          border-bottom: 0;
          background: transparent;
          padding: 0 4px;
          line-height: 30px;
          outline: none;
        }
        .pc-qty-val:focus {
          background: rgba(129,140,248,0.10);
          color: #fff;
        }

        /* ── Action buttons ── */
        .pc-btn-primary {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          height: 36px; border-radius: 10px;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.02em;
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          background: linear-gradient(90deg, #818cf8, #a78bfa);
          color: #fff;
          border: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(129,140,248,0.30);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .pc-btn-primary:hover { opacity: 0.90; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(129,140,248,0.40); }
        .pc-btn-primary:active { transform: translateY(0); }

        .pc-btn-secondary {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          height: 36px; border-radius: 10px;
          font-size: 13px; font-weight: 600;
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          background: rgba(255,255,255,0.05);
          color: rgba(200,200,230,0.75);
          border: 1px solid rgba(255,255,255,0.10);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .pc-btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.09);
          border-color: rgba(167,139,250,0.28);
          color: #c4b5fd;
        }
        .pc-btn-secondary:disabled { opacity: 0.35; cursor: not-allowed; }
        .pc-btn-secondary-danger:hover:not(:disabled) {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.25);
          color: #fca5a5;
        }

        .pc-out-of-stock {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          height: 36px; border-radius: 10px;
          font-size: 12px; font-weight: 600;
          color: rgba(180,180,210,0.45);
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.09);
        }

        /* ── Divider ── */
        .pc-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 0 -1px;
        }

        /* ── Stars ── */
        .pc-stars-wrap { display: flex; align-items: center; gap: 5px; }
        .pc-stars-label {
          font-size: 11px; font-weight: 500;
          color: rgba(180,180,210,0.48);
        }
      `}</style>

      <div
        className={cn('pc-root pc-card', productCardVariants({ variant }))}
        style={{ padding: isCompact ? '14px' : '16px' }}
        onClick={handleProductClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Ambient hover glow */}
        <div
          className='pointer-events-none absolute inset-0 rounded-[16px]'
          style={{
            background: isHovered
              ? 'radial-gradient(380px 180px at 10% 0%, rgba(99,102,241,0.09), transparent 60%)'
              : 'transparent',
            transition: 'background 0.30s ease'
          }}
        />

        {/* ── Header: image + name ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: isCompact ? 14 : 12,
            position: 'relative'
          }}
        >
          {/* Image */}
          <div
            className={`pc-img-wrap ${isCompact ? 'pc-img-wrap-compact' : 'pc-img-wrap-default'}`}
          >
            {product.thumbnail || product.images.length > 0 ? (
              <CustomImage
                src={product?.thumbnail || product.images[0]}
                alt={product.name}
                width={isCompact ? 88 : 64}
                height={isCompact ? 88 : 64}
                sizes={isCompact ? '88px' : '64px'}
                className='object-cover w-full h-full'
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)'
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.10)'
                  }}
                />
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span
              style={{
                fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: isCompact ? 13.5 : 15,
                lineHeight: 1.25,
                color: 'rgba(235,235,255,0.95)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {product.name}
            </span>

            {isCompact && product.description && (
              <span
                style={{
                  fontSize: 11.5,
                  color: 'rgba(180,180,210,0.48)',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {product.description}
              </span>
            )}

            {/* Stars */}
            <div className='pc-stars-wrap'>
              {reviewCount > 0 ? (
                <>
                  {renderStars(averageRating, 12)}
                  <span className='pc-stars-label'>
                    {averageRating.toFixed(1)} ({reviewCount})
                  </span>
                </>
              ) : (
                <span className='pc-stars-label'>No reviews yet</span>
              )}
            </div>

            {/* Stock */}
            <div className='pc-stock'>
              <span
                className={`pc-stock-dot ${isInStock ? 'pc-stock-dot-in' : 'pc-stock-dot-out'}`}
              />
              Stock: {stockCount}
            </div>
          </div>
        </div>

        {/* ── Description (default variant only) ── */}
        {!isCompact && product.description && (
          <span
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: 12.5,
              color: 'rgba(180,180,210,0.48)',
              lineHeight: 1.5,
              fontWeight: 400
            }}
          >
            {product.description}
          </span>
        )}

        <div className='pc-divider' />

        {/* ── Type + Price row ── */}
        <div className={cn(contentVariants({ variant }))}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <span className='pc-type-badge'>{product.type}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span className='pc-price'>${price.toFixed(2)}</span>
              {hasDiscount && (
                <span className='pc-price-original'>${originalPrice.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* ── Quantity selector ── */}
          {isInStock && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(180,180,210,0.55)'
                }}
              >
                Quantity
              </span>
              <div className='pc-qty-wrap' onClick={(e) => e.stopPropagation()}>
                <button
                  className='pc-qty-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(-1)
                  }}
                  disabled={quantity <= minQuantity || isProcessing}
                >
                  <Minus size={13} />
                </button>
                <input
                  className='pc-qty-val'
                  inputMode='numeric'
                  pattern='[0-9]*'
                  value={quantity}
                  onChange={(e) => handleQuantityInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Quantity for ${product.name}`}
                  disabled={isProcessing}
                />
                <button
                  className='pc-qty-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuantityChange(1)
                  }}
                  disabled={quantity >= effectiveMax || isProcessing}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
            {isInStock ? (
              <button className='pc-btn-primary' onClick={handleOrderNow}>
                {btnText || defaultButtonText}
              </button>
            ) : (
              <div className='pc-out-of-stock'>Out of Stock</div>
            )}

            {inCart ? (
              <button
                className='pc-btn-secondary pc-btn-secondary-danger'
                onClick={handleRemoveFromCart}
                disabled={isProcessing || isUpdating(product.id)}
              >
                {isProcessing || isUpdating(product.id) ? 'Removing…' : 'Remove'}
              </button>
            ) : (
              <button
                className='pc-btn-secondary'
                onClick={handleAddToCart}
                disabled={!isInStock || isProcessing || isUpdating(product.id)}
              >
                {isProcessing || isUpdating(product.id) ? 'Adding…' : 'Add to cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
