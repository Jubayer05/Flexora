'use client'

import { useSiteConfig } from '@/components/providers/store-provider'
import { cn } from '@/lib/utils'
import SiteLogoClient from './SiteLogoClient'

type SiteLogoWrapperProps = {
  className?: string
  height?: number
}

export default function SiteLogoWrapper({ className, height = 36 }: SiteLogoWrapperProps) {
  const { siteConfig } = useSiteConfig()
  const logo = siteConfig?.logo

  return (
    <SiteLogoClient
      logoDefault={logo?.default}
      logoDark={logo?.dark}
      className={cn(className)}
      height={height}
    />
  )
}
