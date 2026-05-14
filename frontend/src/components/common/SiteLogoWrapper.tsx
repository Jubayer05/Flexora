'use client'

import SiteLogoClient from './SiteLogoClient'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'

type SiteLogoWrapperProps = {
  className?: string
  height?: number
}

export default function SiteLogoWrapper({ className, height = 36 }: SiteLogoWrapperProps) {
  const { data } = useAsync<{
    success: boolean
    data: {
      value?: {
        logo?: {
          default?: string | null
          dark?: string | null
        }
      }
    }
  }>(() => '/settings/key/system_site_settings', false, false)

  const logo = data?.data?.value?.logo

  return (
    <SiteLogoClient
      logoDefault={logo?.default}
      logoDark={logo?.dark}
      className={cn(className)}
      height={height}
    />
  )
}

