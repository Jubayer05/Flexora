'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

const VISITOR_ID_KEY = 'uhq_url_tracking_visitor_id'

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
      window.localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
  }
}

function getDeviceInfo() {
  if (typeof window === 'undefined') return undefined
  try {
    const ua = window.navigator?.userAgent || ''
    return {
      screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      userAgent: ua
    }
  } catch {
    return undefined
  }
}

function slugFromPathname(pathname: string): string | null {
  if (!pathname) return null
  if (pathname.startsWith('/admin')) return null

  if (pathname === '/') return 'home'

  if (pathname.startsWith('/pages/')) {
    const s = pathname.slice('/pages/'.length)
    return s || null
  }

  return pathname.startsWith('/') ? pathname.slice(1) : pathname
}

/**
 * Tracks page views across the entire frontend app.
 * It only increments analytics when a UrlTracking entry exists for the computed slug.
 */
export function GlobalRouteTracker() {
  const pathname = usePathname()
  const lastSent = useRef<string | null>(null)

  const slug = useMemo(() => slugFromPathname(pathname), [pathname])

  useEffect(() => {
    if (!slug) return
    if (lastSent.current === slug) return
    lastSent.current = slug

    const baseUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''
    const trackUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/url-tracking/track-page`
      : '/url-tracking/track-page'

    const visitorId = getOrCreateVisitorId()
    const deviceInfo = getDeviceInfo()

    fetch(trackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, visitorId, deviceInfo })
    }).catch(() => {})
  }, [slug])

  return null
}

