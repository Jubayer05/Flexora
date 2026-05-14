'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import CustomLink from './CustomLink'

const baseApi = process.env.NEXT_PUBLIC_BASE_API || ''
const defaultLogo = '/images/logo.svg'

type SiteLogoClientProps = {
  logoDefault?: string | null
  logoDark?: string | null
  className?: string
  /** Fixed height in pixels (default 36) */
  height?: number
}

export default function SiteLogoClient({
  logoDefault,
  logoDark,
  className,
  height = 36
}: SiteLogoClientProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Use default (light) logo until mounted to avoid hydration mismatch:
  // server and first client paint must match; theme can differ between them.
  const effectiveTheme =
    !mounted || theme === 'system'
      ? (systemTheme as 'light' | 'dark' | undefined) ?? 'light'
      : (theme as 'light' | 'dark')

  const useDarkLogo = mounted && effectiveTheme === 'dark' && !!logoDark
  const logoPath = useDarkLogo ? logoDark : (logoDefault || defaultLogo)
  const logoSrc =
    logoPath.startsWith('http') || logoPath === defaultLogo
      ? logoPath
      : baseApi + logoPath

  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SiteLogoClient] Logo debug:', {
        logoDefault,
        logoDark,
        useDarkLogo,
        logoPath,
        logoSrc,
        baseApi,
        defaultLogo,
        mounted
      })
    }
  }, [logoDefault, logoDark, useDarkLogo, logoPath, logoSrc, mounted])

  // Handle image error - fallback to default logo
  const [imageError, setImageError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(logoSrc)

  useEffect(() => {
    setCurrentSrc(logoSrc)
    setImageError(false)
  }, [logoSrc])

  const handleImageError = () => {
    console.error('[SiteLogoClient] Image load error, falling back to default:', {
      attemptedSrc: currentSrc,
      defaultLogo
    })
    if (currentSrc !== defaultLogo) {
      setImageError(true)
      setCurrentSrc(defaultLogo)
    }
  }

  // If using default logo (local file), use unoptimized to avoid Next.js Image issues with SVGs
  const isLocalLogo = currentSrc === defaultLogo || currentSrc.startsWith('/images/') || currentSrc.startsWith('/logo')
  
  return (
    <CustomLink href='/' className={cn('flex items-center shrink-0 max-w-[120px] sm:max-w-[160px] lg:max-w-[225px]', className)}>
      <Image
        loading='eager'
        src={currentSrc}
        width={225}
        height={height}
        alt='UHQ Accounts logo'
        priority
        decoding='sync'
        quality={85}
        className='w-auto max-w-full h-auto object-contain object-left'
        style={{ height: `${height}px` }}
        onError={handleImageError}
        unoptimized={isLocalLogo || imageError} // Disable optimization for local SVGs and fallback
      />
    </CustomLink>
  )
}
