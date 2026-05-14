import { getSiteConfig } from '@/action/data'
import { cn } from '@/lib/utils'
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
    const logoDefault = siteConfig?.logo?.default || siteConfig?.siteLogo || '/images/logo.svg'
    const logoDark = siteConfig?.logo?.dark || siteConfig?.siteLogo || '/images/logo.svg'

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
        logoDefault={logoDefault}
        logoDark={logoDark}
        className={cn(className)}
        height={height}
      />
    )
  } catch (error) {
    console.error('[SiteLogo] Error loading site config:', error)
    return (
      <SiteLogoClient
        logoDefault={'/images/logo.svg'}
        logoDark={'/images/logo.svg'}
        className={cn(className)}
        height={height}
      />
    )
  }
}
