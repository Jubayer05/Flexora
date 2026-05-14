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
    const logo = siteConfig?.logo

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
        logoDefault={logo?.default || '/logo.png'}
        logoDark={logo?.dark || '/logo.png'}
        className={cn(className)}
        height={height}
      />
    )
  } catch (error) {
    console.error('[SiteLogo] Error loading site config:', error)
    // Fallback to default logo if config fails
    return (
      <SiteLogoClient
        logoDefault={null}
        logoDark={null}
        className={cn(className)}
        height={height}
      />
    )
  }
}
