'use client'

import { defaultImg } from '@/lib/get-image-url'
import { cn } from '@/lib/utils'
import Image, { ImageLoader, ImageProps } from 'next/image'
import React from 'react'

type CustomImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null | undefined
  alt: string
  fallback?: string
  priority?: boolean
}

const apiLoader: ImageLoader = ({ src, width, quality }) => {
  const base = process.env.NEXT_PUBLIC_BASE_API || ''
  const w = width || 100
  const q = quality ? `&q=${quality}` : ''
  const joiner = src.includes('?') ? '&' : '?'
  // Only used for API files like /files/...
  return `${base}${src}${joiner}w=${w}${q}`
}

const CustomImage: React.FC<CustomImageProps> = ({
  src,
  alt,
  width,
  height,
  fallback,
  className,
  priority = false,
  unoptimized,
  ...rest
}) => {
  const w = Number(width) || 100
  const h = Number(height) || 100

  const fallbackImg = defaultImg({ width: w, height: h })

  const srcStr = typeof src === 'string' ? src.trim() : ''
  const isApiFile = srcStr.startsWith('/files')
  const isLocalPublic = srcStr.startsWith('/') && !isApiFile
  const isSvg = /\.svg$/i.test(srcStr)

  const isValidSrc =
    srcStr &&
    !srcStr.startsWith('function') &&
    (srcStr.startsWith('http') || srcStr.startsWith('data:') || srcStr.startsWith('/'))
  const apiBase = process.env.NEXT_PUBLIC_BASE_API || ''
  const apiSrcOk = isApiFile && (apiBase || isLocalPublic)

  const finalSrc = isValidSrc && (isApiFile ? apiSrcOk : true) ? srcStr : fallback || fallbackImg
  // When unoptimized, Next.js uses src as-is (no loader), so API paths must be full URLs
  const imageSrc =
    unoptimized && isApiFile && apiBase ? `${apiBase.replace(/\/$/, '')}${finalSrc}` : finalSrc

  // For local public assets and SVGs, render a plain <img> to avoid hydration/runtime rewrites
  if (isLocalPublic || isSvg) {
    return (
      <Image
        src={finalSrc}
        alt={alt || 'Image'}
        width={width as number | undefined}
        height={height as number | undefined}
        className={cn(className)}
        loading={priority ? 'eager' : 'lazy'}
        decoding='async'
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement
          if (fallback && img.src !== fallback) {
            img.src = fallback
            return
          }
          if (img.src !== fallbackImg) img.src = fallbackImg
        }}
        {...(rest as any)}
      />
    )
  }

  // For API-hosted images (/files/...), use next/image with the API loader; when unoptimized, use full URL so request goes to API
  const useApiLoader = finalSrc.startsWith('/files') && apiBase && !unoptimized
  return (
    <Image
      src={imageSrc}
      alt={alt || 'Image'}
      width={width}
      height={height}
      className={cn(className)}
      placeholder='blur'
      blurDataURL={fallbackImg}
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      {...(useApiLoader ? { loader: apiLoader } : {})}
      unoptimized={unoptimized}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement
        if (fallback && img.src !== fallback) {
          img.srcset = ''
          img.src = fallback
          return
        }
        if (img.src !== fallbackImg) {
          img.srcset = ''
          img.src = fallbackImg
        }
      }}
      {...rest}
    />
  )
}

export default CustomImage
