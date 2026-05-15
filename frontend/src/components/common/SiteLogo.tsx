import { getSiteConfig } from '@/action/data'
import { cn } from '@/lib/utils'
import { getLogosForThemeModes } from '@/lib/themeLogo'
import SiteLogoClient from './SiteLogoClient'

const LOGO_HEIGHT = 36

type SiteLogoProps = {
  className?: string
  /** Logo height in pixels (default 36) */
  height?: number
}

export default async function SiteLogo({ className, height = LOGO_HEIGHT }: SiteLogoProps) {
  try {
    const siteConfig = await getSiteConfig()
    // Handle both possible structures: { logo: { default, dark } } or { siteLogo }
    const { forLightMode, forDarkMode } = getLogosForThemeModes({
      default: siteConfig?.logo?.default || siteConfig?.siteLogo,
      dark: siteConfig?.logo?.dark || siteConfig?.siteLogo
    })

    // Ensure SiteLogoClient is properly imported and available
    if (!SiteLogoClient) {
      console.error('[SiteLogo] SiteLogoClient is undefined')
      return (
        <div className={cn('flex items-center shrink-0', className)} style={{ height: `${height}px`, width: '225px' }}>
          <span className='text-white'>Logo</span>
        </div>
      )
    }

    return (
      <SiteLogoClient
        logoDefault={forLightMode}
        logoDark={forDarkMode}
        className={cn(className)}
        height={height}
      />
    )
  } catch (error) {
    console.error('[SiteLogo] Error loading site config:', error)
    return (
      <SiteLogoClient className={cn(className)} height={height} />
    )
  }
}
