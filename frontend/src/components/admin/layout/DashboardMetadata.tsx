'use client'

import { generateTitleFromPath } from '@/lib/metadata-utils'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardMetadata() {
  const pathname = usePathname()

  useEffect(() => {
    const title = generateTitleFromPath(pathname)
    document.title = `${title} | Admin Dashboard`
  }, [pathname])

  return null
}
