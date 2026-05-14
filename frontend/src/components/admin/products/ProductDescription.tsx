'use client'

import CustomImage from '@/components/common/CustomImage'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ProductDescriptionProps {
  product: Product
  className?: string
  compact?: boolean
}

export default function ProductDescription({
  product,
  className,
  compact = false
}: ProductDescriptionProps) {
  const [expandedDescription, setExpandedDescription] = useState(false)

  const maxDescriptionLength = compact ? 150 : 300
  const shouldTruncate = product.description && product.description.length > maxDescriptionLength
  const displayDescription =
    shouldTruncate && !expandedDescription
      ? product.description?.substring(0, maxDescriptionLength) + '...'
      : product.description

  return (
    <div className={cn('flex lg:flex-row flex-col gap-6', className)}>
      <div className='space-y-4 w-full lg:w-1/2'>
        <div className='flex flex-col'>
          <span className='font-semibold'>Product Name</span>
          <span className='font-medium'>{product.name}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Product SKU</span>
          <span className='font-medium'>{product.sku}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Category</span>
          <span className='font-medium'>{product.category?.name}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Type</span>
          <span className='font-medium'>{product.platform}</span>
        </div>

        <div className='flex flex-col'>
          <span className='font-semibold'>Product Description</span>
          <span className='font-medium'>
            {displayDescription}
            {shouldTruncate && (
              <button
                type='button'
                className='ml-2 text-primary text-xs underline'
                onClick={() => setExpandedDescription((prev) => !prev)}
              >
                {expandedDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </span>
        </div>

        {product?.policy && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Return Policy</span>
            <span className='font-medium'>{product?.policy}</span>
          </div>
        )}

        {product?.isPrivate && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Private URL</span>
            <span className='font-medium'>{product?.privateUrl}</span>
          </div>
        )}

        {(product?.tags ?? []).length > 0 && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Tags</span>
            <span className='font-medium'>{product?.tags}</span>
          </div>
        )}

        {product?.seo?.title && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Meta Title</span>
            <span className='font-medium'>{product?.seo?.title}</span>
          </div>
        )}

        {product?.seo?.description && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Meta Description</span>
            <span className='font-medium'>{product?.seo?.description}</span>
          </div>
        )}

        {product?.seo?.keywords && (
          <div className='flex flex-col'>
            <span className='font-semibold'>Meta Keywords</span>
            <span className='font-medium'>{product?.seo?.keywords}</span>
          </div>
        )}
      </div>
      <div className='space-y-10 w-full lg:w-1/2'>
        <div className='space-y-4 lg:col-span-2'>
          {/* Thumbnail */}
          {product.thumbnail && (
            <div>
              <h4 className='mb-2 font-semibold'>Product Icon</h4>
              <div className='border rounded-lg w-20 h-20 overflow-hidden'>
                <CustomImage
                  src={product.thumbnail}
                  alt={product.name}
                  width={80}
                  height={80}
                  className='w-full h-full object-cover'
                />
              </div>
            </div>
          )}

          {/* Images Gallery */}
          {product.images && product.images.length > 0 && (
            <div>
              <h4 className='mb-2 font-semibold'>Product Images</h4>
              <div className='flex flex-wrap gap-3'>
                {product.images.slice(0, 6).map((image, index) => (
                  <div
                    key={index}
                    className='border rounded-lg size-20 aspect-square overflow-hidden'
                  >
                    <CustomImage
                      src={image}
                      alt={`${product.name} - ${index + 1}`}
                      width={80}
                      height={80}
                      className='w-full h-full object-cover'
                    />
                  </div>
                ))}
              </div>
              {product.images.length > 6 && (
                <p className='mt-2 text-muted-foreground text-sm'>
                  +{product.images.length - 6} more images
                </p>
              )}
            </div>
          )}
        </div>

        <div className='space-y-4'>
          <div className='flex flex-col gap-0.5'>
            <span className='font-semibold'>Product Current Price</span>
            <span className='font-medium'>${product.price}</span>
          </div>

          <div className='flex flex-col gap-0.5'>
            <span className='font-semibold'>Previous Price</span>
            <span className='font-medium'>${product.originalPrice}</span>
          </div>

          <div className='flex flex-col gap-0.5'>
            <span className='font-semibold'>Type</span>
            <span className='font-medium'>{product.type}</span>
            <span className='font-medium'>{product.meta?.filePath}</span>
          </div>

          <div className='flex flex-col gap-0.5'>
            <span className='font-semibold'>Minimum Order</span>
            <span className='font-medium'>{product.minQuantity}</span>
          </div>

          <div className='flex flex-col gap-0.5'>
            <span className='font-semibold'>Maximum Order</span>
            <span className='font-medium'>{product.maxQuantity}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
