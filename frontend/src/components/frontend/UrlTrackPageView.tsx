'use client'

import { useEffect, useRef } from 'react'

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

/**
 * Fires a single track request when the page is viewed.
 * Use on /pages/[slug] so that direct visits to /pages/about are counted
 * under the same tracking entry as /go/about (slug "about").
 */
export function UrlTrackPageView({ slug }: { slug: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (!slug || sent.current) return
    sent.current = true

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
    })
      .then((res) => res.json().catch(() => ({})))
      .then(() => {
        // Do not redirect; we're already on the destination page.
      })
      .catch(() => {})
  }, [slug])

  return null
}
