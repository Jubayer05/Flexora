'use client'

import { cn } from '@/lib/utils'
import {
  getLogosForThemeModes,
  LOGO_FOR_DARK_MODE,
  LOGO_FOR_LIGHT_MODE,
  resolveLogoSrc,
  type ThemeLogoUrls
} from '@/lib/themeLogo'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import CustomLink from './CustomLink'

type SiteLogoClientProps = {
  logoDefault?: string | null
  logoDark?: string | null
  className?: string
  height?: number
}

function ThemeLogoImage({
  src,
  fallback,
  visibleClassName,
  height,
  priority
}: {
  src: string
  fallback: string
  visibleClassName: string
  height: number
  priority?: boolean
}) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  const resolved = resolveLogoSrc(currentSrc, fallback)
  const isLocalLogo = resolved.startsWith('/images/logo')

  return (
    <Image
      loading={priority ? 'eager' : 'lazy'}
      src={resolved}
      width={225}
      height={height}
      alt='Flexora logo'
      priority={priority}
      decoding='sync'
      quality={85}
      className={cn(
        'w-auto max-w-full h-auto object-contain object-left',
        visibleClassName
      )}
      style={{ height: `${height}px` }}
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback)
      }}
      unoptimized={isLocalLogo}
    />
  )
}

export default function SiteLogoClient({
  logoDefault,
  logoDark,
  className,
  height = 36
}: SiteLogoClientProps) {
  const urls = useMemo<ThemeLogoUrls>(
    () => ({ default: logoDefault, dark: logoDark }),
    [logoDefault, logoDark]
  )
  const { forLightMode, forDarkMode } = useMemo(() => getLogosForThemeModes(urls), [urls])

  return (
    <CustomLink
      href='/'
      className={cn(
        'relative flex items-center shrink-0 max-w-[120px] sm:max-w-[160px] lg:max-w-[225px]',
        className
      )}
    >
      <ThemeLogoImage
        src={forLightMode}
        fallback={LOGO_FOR_LIGHT_MODE}
        visibleClassName='dark:hidden'
        height={height}
        priority
      />
      <ThemeLogoImage
        src={forDarkMode}
        fallback={LOGO_FOR_DARK_MODE}
        visibleClassName='hidden dark:block'
        height={height}
        priority
      />
    </CustomLink>
  )
}
