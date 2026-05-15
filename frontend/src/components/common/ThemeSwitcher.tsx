'use client'

import { useSiteConfig } from '@/components/providers/store-provider'
import {
  dispatchThemeLogoChange,
  getLogoSrcForTheme,
  getLogosForThemeModes,
  preloadLogo
} from '@/lib/themeLogo'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { siteConfig } = useSiteConfig()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'
  const logoUrls = siteConfig?.logo

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    const nextLogo = getLogoSrcForTheme(nextTheme, logoUrls ?? {})
    setTheme(nextTheme)
    preloadLogo(nextLogo)
    dispatchThemeLogoChange(nextTheme, nextLogo)
  }

  useEffect(() => {
    if (!mounted) return
    const { forLightMode, forDarkMode } = getLogosForThemeModes(logoUrls ?? {})
    preloadLogo(forLightMode)
    preloadLogo(forDarkMode)
  }, [mounted, logoUrls])

  if (!mounted) {
    return <div className={cn('size-9 rounded-full bg-transparent shrink-0', className)} />
  }

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center rounded-full border border-outline-variant bg-surface-container/40 hover:bg-surface-variant hover:border-primary/30 size-9 shrink-0 cursor-pointer transition-colors backdrop-blur-md shadow-sm',
        className
      )}
      aria-label='Toggle theme'
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className='relative size-4'>
        <Moon
          className={cn(
            'h-4 w-4 transition-all duration-300 absolute',
            isDark ? 'opacity-100 rotate-0 text-yellow-300' : 'opacity-0 rotate-90'
          )}
        />
        <Sun
          className={cn(
            'h-4 w-4 transition-all duration-300 absolute',
            isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0 text-amber-500'
          )}
        />
      </div>
    </button>
  )
}
